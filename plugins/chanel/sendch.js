// plugins/chanel/sendch.js
import { getRawMessageById } from '../../db/rawMessage.js'
import { parseChannelTarget } from '../../lib/utils.js'

const MEDIA_TYPE_MAP = {
  imageMessage: 'image',
  videoMessage: 'video',
  audioMessage: 'audio',
  documentMessage: 'document',
  stickerMessage: 'sticker'
}

function stripUnsendable(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj
  delete obj.messageContextInfo
  return obj
}

export default {
  command: 'sendch',
  alias: ['sendchanel', 'sendchannel', 'sch'],
  category: 'chanel',
  description: `> Mengirim ulang pesan yang di-reply ke channel WhatsApp.

*Keterangan Format:*
> \`<url channel>\` = link undangan channel tujuan.
> \`<jid channel>\` = JID channel tujuan (format: 120363xxx@newsletter).

contoh penggunaan:
> \`.sendch <url channel>\` (reply pesan)
> \`.sendch <jid channel>\` (reply pesan)

*Catatan:*
> fitur ini hanya bisa digunakan oleh owner. wajib reply pesan yang ingin dikirim.`,
  help: '<url/jid> (reply)',
  ownerOnly: true,
  typing: true,

  async execute(m, { sock, args }) {

    if (!m.quoted) return m.reply('❌ Reply pesan yang mau dikirim ke channel dulu ya kak.')

    const raw = args.join(' ')
    const { invite, jid } = parseChannelTarget(raw)

    if (!invite && !jid) {
      return m.reply(`Kirim link atau JID channel tujuan!\n\nContoh:\n> \`${m.prefix}${m.command} <url chanel>\`\n> \`${m.prefix}${m.command} <jid chanel>\``)
    }

    let targetJid = jid
    let channelName = null

    try {
      const metadata = targetJid
        ? await sock.newsletter.fetch(targetJid)
        : await sock.newsletter.fetchByInvite(invite)
      targetJid = metadata.jid
      channelName = metadata.name
    } catch {
      return m.reply('❌ Link/JID channel tidak valid atau channel tidak ditemukan.')
    }

    const quotedId = m.quoted.key?.id
    const stored = quotedId ? getRawMessageById(quotedId) : null
    const msgContent = stored?.raw?.message ?? m.quoted.full

    if (!msgContent || Object.keys(msgContent).length === 0) {
      return m.reply('❌ Isi pesan kosong, gak ada yang bisa dikirim.')
    }

    stripUnsendable(msgContent)

    const msgType = Object.keys(msgContent)[0]
    const mediaKind = MEDIA_TYPE_MAP[msgType]

    let uploadContent

    if (mediaKind) {
      const mediaField = msgContent[msgType]

      let mediaBuffer
      try {
        mediaBuffer = await m.quoted.download()
      } catch (err) {
        return m.reply(`❌ Gagal download media: ${err.message}`)
      }

      uploadContent = {
        type: mediaKind,
        media: mediaBuffer,
        mimetype: mediaField.mimetype,
        caption: mediaField.caption || undefined,
        jpegThumbnail: mediaField.jpegThumbnail || undefined,
        contextInfo: mediaField.contextInfo || undefined
      }
    } else {
      uploadContent = msgContent
    }

    let sendResult
    try {
      sendResult = await sock.newsletter.send(targetJid, uploadContent)
    } catch (err) {
      return m.reply(`❌ Gagal kirim ke channel: ${err.message}`)
    }

    const serverMessageId = sendResult.ackNode?.attrs?.server_id ?? sendResult.ack?.server_id ?? sendResult.id

    if (!msgContent[msgType].contextInfo) {
      msgContent[msgType].contextInfo = {
        mentionedJid: [],
        groupMentions: [],
        statusAttributions: []
      }
    }

    msgContent[msgType].contextInfo.forwardingScore = 1
    msgContent[msgType].contextInfo.isForwarded = true
    msgContent[msgType].contextInfo.forwardedNewsletterMessageInfo = {
      newsletterJid: targetJid,
      serverMessageId: parseInt(serverMessageId, 10) || 0,
      newsletterName: channelName
    }
    msgContent[msgType].contextInfo.forwardOrigin = 0

    return sock.message.send(m.chat, msgContent)
  }
}
