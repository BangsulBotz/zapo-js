// plugins/tools/qwa.js

import { getRawMessageById } from '../../db/rawMessage.js'
import { getContactByJid } from '../../db/contacts.js'
import { normalizeJid } from '../../handler.js'
import { reviveBase64Fields } from '../../lib/utils.js'

const API_URL = 'https://qwa.eeq.my.id/api/generate'

function getMessageContent(message) {
  if (!message || typeof message !== 'object') return null

  const type = Object.keys(message).find(key => key.endsWith('Message')) ||
    (message.conversation ? 'conversation' : null)
  if (!type) return null

  const content = type === 'conversation' ? message : message[type]
  const text = type === 'conversation'
    ? message.conversation
    : content?.text || content?.caption || ''

  return { type, content, text }
}

function getQuotedContent(rawMessage) {
  const content = getMessageContent(rawMessage)
  const context = content?.content?.contextInfo
  if (!context?.quotedMessage) return null

  return {
    message: context.quotedMessage,
    jid: normalizeJid(context.participant)
  }
}

function getContactData(contact, fallbackJid) {
  const jid = contact?.jid || fallbackJid || ''
  const number = contact?.phoneNumber || jid.split('@')[0]

  return {
    name: contact?.pushName || 'Unknown',
    number: number ? `+${number.replace(/^\+/, '')}` : '',
    jid
  }
}

function getContactForJid(jid, fallbackPushName) {
  const row = getContactByJid(jid)
  if (!row) {
    return jid
      ? {
          jid,
          pushName: fallbackPushName || 'Unknown',
          phoneNumber: jid.endsWith('@lid') ? '' : jid.split('@')[0]
        }
      : null
  }

  return {
    jid: row.pn_jid || jid,
    pushName: fallbackPushName || row.push_name || 'Unknown',
    phoneNumber: row.pn_jid?.split('@')[0] || ''
  }
}

function formatMentions(message, text) {
  if (!text) return ''

  const content = getMessageContent(message)
  const mentionedJid = content?.content?.contextInfo?.mentionedJid || []
  if (!mentionedJid.length) return text

  return text.replace(/@(\d+)/g, (match, number) => {
    const mentionJid = mentionedJid.find((jid) => {
      const normalized = normalizeJid(jid)
      return normalized?.split('@')[0] === number
    })
    if (!mentionJid) return match

    const contact = getContactByJid(normalizeJid(mentionJid))
    const pushName = contact?.push_name?.trim()
    return pushName ? `[@${pushName.replace(/^@+/, '')}]` : match
  })
}

function getDisplayText(message, includePreviewMetadata = false) {
  const content = getMessageContent(message)
  if (!content) return ''

  const { title, description } = content.content || {}
  const text = content.text || ''

  if (!includePreviewMetadata || (!title && !description)) {
    if (text) return text
    if (content.type === 'imageMessage' || content.content?.jpegThumbnail) return '[Foto]'
    if (content.type.endsWith('Message')) {
      const typeLabels = {
        videoMessage: 'Video',
        audioMessage: 'audio',
        documentMessage: 'Dokumen',
        stickerMessage: 'Stiker',
        locationMessage: 'Lokasi',
        contactMessage: 'Kontak'
      }
      const label = typeLabels[content.type] || content.type.replace(/Message$/, '')
      return `[${label}]`
    }
    return ''
  }

  return [
    title,
    description ? `> ${description}` : '',
    text
  ].filter(Boolean).join('\n') || '[Foto]'
}

function toDataUrl(buffer, mimetype) {
  if (!buffer) return ''
  return `data:${mimetype || 'image/jpeg'};base64,${Buffer.from(buffer).toString('base64')}`
}

function normalizeLong(value) {
  if (typeof value === 'number' || value == null) return value
  if (typeof value.toNumber === 'function') return value
  if (typeof value.low !== 'number' || typeof value.high !== 'number') return value

  return (value.low >>> 0) + (value.high >>> 0) * 0x100000000
}

async function getImageData(message, download, sock) {
  const parsed = getMessageContent(message)
  const content = parsed?.content
  if (!content) return ''

  const isImage = parsed.type === 'imageMessage'
  const isLinkPreview = parsed.type === 'extendedTextMessage' && content.jpegThumbnail
  if (!isImage && !isLinkPreview) return ''

  const hasThumbnailMetadata = Boolean(content.thumbnailDirectPath && content.mediaKey)
  const hasMediaMetadata = Boolean(
    content.directPath && content.mediaKey && content.fileEncSha256
  )

  if (hasThumbnailMetadata) {
    try {
      const result = await sock.downloadThumbnail({
        thumbnailDirectPath: content.thumbnailDirectPath,
        mediaKey: content.mediaKey,
        thumbnailSha256: content.thumbnailSha256,
        thumbnailEncSha256: content.thumbnailEncSha256
      })
      if (result?.buffer?.length) {
        return toDataUrl(result.buffer, result.mimetype || 'image/jpeg')
      }
    } catch {
      return toDataUrl(content.jpegThumbnail, 'image/jpeg')
    }

    return toDataUrl(content.jpegThumbnail, 'image/jpeg')
  }

  if (!content.mimetype?.startsWith('image/')) {
    return toDataUrl(content.jpegThumbnail, 'image/jpeg')
  }

  if (hasMediaMetadata) {
    try {
      const downloadMessage = {
        ...message,
        [parsed.type]: {
          ...content,
          fileLength: normalizeLong(content.fileLength),
          mediaKeyTimestamp: normalizeLong(content.mediaKeyTimestamp)
        }
      }
      const buffer = await download(downloadMessage)
      if (buffer?.length) {
        return toDataUrl(buffer, content.mimetype)
      }
    } catch {
      return toDataUrl(content.jpegThumbnail, content.mimetype)
    }
  }

  return toDataUrl(content.jpegThumbnail, content.mimetype)
}

async function getProfileUrl(sock, jid) {
  if (!jid) return ''

  try {
    return (await sock.profile.getProfilePicture(jid, 'image'))?.url || ''
  } catch {
    return ''
  }
}

function buildMessageData(message, contact, fallbackJid, includePreviewMetadata = false) {
  const sender = getContactData(contact, fallbackJid)
  const text = getDisplayText(message, includePreviewMetadata)

  return {
    sender,
    message: formatMentions(message, text)
  }
}

export default {
  command: 'qwa',
  alias: ['quotedwa', 'waquoted'],
  category: 'tools',
  description: `> Membuat gambar percakapan WhatsApp dari pesan yang di-reply.

contoh penggunaan:
> \`.qwa\` (reply pesan)`,
  help: '(reply)',
  typing: true,
  wait: true,

  async execute(m, { sock }) {
    if (!m.quoted) {
      return m.reply(
        'Format salah.\n\n' +
        '*Format Penggunaan:*\n' +
        '> `Reply pesan yang ingin dibuat menjadi gambar lalu ketik:`\n' +
        `> ${m.prefix}${m.command}`
      )
    }
    if (!m.quoted.full) {
      return m.reply('Data pesan yang di-reply tidak tersedia. Coba reply pesan lain.')
    }

    const quotedId = m.quoted.key?.id
    const stored = quotedId ? getRawMessageById(quotedId) : null
    const rawMessage = stored?.raw?.message || m.quoted.full
    const nested = getQuotedContent(rawMessage)
    const main = buildMessageData(m.quoted.full, m.quoted.contact, m.quoted.sender, true)

    if (!main.message) {
      return m.reply('Pesan yang di-reply tidak memiliki teks yang bisa dibuat menjadi gambar.')
    }

    const nestedJid = nested?.jid
    const nestedContact = nested
      ? getContactForJid(nestedJid)
      : null
    const nestedData = nested
      ? buildMessageData(nested.message, nestedContact, nestedJid, false)
      : null
    const mainProfileJid = main.sender.jid
    const senderAvatar = await getProfileUrl(sock, mainProfileJid)
    const senderImage = await getImageData(
      m.quoted.full,
      (source) => sock.message.downloadBytes(reviveBase64Fields(source)),
      sock
    )
    const quotedImage = nested
      ? await getImageData(
          nested.message,
          (source) => sock.message.downloadBytes(reviveBase64Fields(source)),
          sock
        )
      : ''

    const payload = {
      sender_name: main.sender.name,
      sender_number: main.sender.number,
      sender_avatar: senderAvatar,
      sender_image: senderImage,
      message: main.message,
      time: new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }),
      background: true
    }

    if (nestedData) {
      payload.quoted = {
        name: nestedData.sender.name,
        number: nestedData.sender.number,
        message: nestedData.message,
        image: quotedImage
      }
    }

    let response
    try {
      response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
    } catch (err) {
      return m.reply(`Gagal terhubung ke API QWA: ${err.message}`)
    }

    if (!response.ok) {
      return m.reply(`API QWA mengembalikan error (${response.status}).`)
    }

    try {
      const image = Buffer.from(await response.arrayBuffer())
      return m.reply({
        type: 'image',
        media: image,
        mimetype: response.headers.get('content-type') || 'image/png',
        caption: '✅ QWA berhasil dibuat.'
      })
    } catch (err) {
      return m.reply(`Gagal membaca hasil gambar QWA: ${err.message}`)
    }
  }
}
