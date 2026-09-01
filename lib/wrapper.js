// lib/wrapper.js

import { Readable } from 'stream'
import crypto from 'crypto'
import { WaMediaTransferClient } from 'zapo-js'
import { fileTypeFromBuffer } from 'file-type'
import fs from 'fs'
import sharp from 'sharp'
import { convertToSticker, extractStillFrame } from './exif.js'

async function resolveDimensions(buffer) {
  const meta = await sharp(buffer).metadata()
  return { width: meta.width, height: meta.height }
}

async function streamToBuffer(stream) {
  if (typeof stream.getReader === 'function') {
    const reader = stream.getReader()
    const chunks = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }
    return Buffer.concat(chunks.map(c => Buffer.from(c)))
  }
  const chunks = []
  for await (const chunk of stream) chunks.push(chunk)
  return Buffer.concat(chunks)
}

async function resolveToBuffer(input) {
  if (input instanceof Promise) input = await input
  if (Buffer.isBuffer(input)) return input
  if (input instanceof Uint8Array) return Buffer.from(input)
  if (input instanceof Readable || typeof input?.pipe === 'function' || typeof input?.getReader === 'function') return streamToBuffer(input)
  if (input && typeof input === 'object') {
    if (Buffer.isBuffer(input.buffer)) return input.buffer
    if (input.buffer instanceof Uint8Array) return Buffer.from(input.buffer)
    if (Buffer.isBuffer(input.data)) return input.data
    if (input.data instanceof Uint8Array) return Buffer.from(input.data)
    if (typeof input.arrayBuffer === 'function') return Buffer.from(await input.arrayBuffer())
  }
  if (typeof input === 'string') {
    if (/^https?:\/\//i.test(input)) {
      const res = await fetch(input)
      if (!res.ok) throw new Error(`Gagal mengunduh: ${res.status} ${res.statusText}`)
      return Buffer.from(await res.arrayBuffer())
    }
    if (fs.existsSync(input)) return fs.readFileSync(input)
    throw new Error(`String bukan URL maupun file path yang valid: ${input}`)
  }
  throw new Error(`Input tidak dikenali (tipe: ${typeof input}, ctor: ${input?.constructor?.name || '-'}). Harus Buffer, Uint8Array, Readable stream, URL, atau file path.`)
}

async function detectMimetype(buffer) {
  const detected = await fileTypeFromBuffer(buffer)
  return detected?.mime || 'image/jpeg'
}

function toBase64(x) { return Buffer.from(x).toString('base64') }
function toBuffer(x) {
  if (Buffer.isBuffer(x)) return x
  if (x instanceof Uint8Array) return Buffer.from(x)
  if (typeof x === 'string') return Buffer.from(x, 'base64')
  throw new Error('Field harus Buffer, Uint8Array, atau base64 string.')
}

export function attachWrappers(sock) {

  sock.sendVoiceNote = async (jid, input, options = {}) => {
    const { quote, mentions, ...rest } = options
    const quoteKey = quote?.raw ?? quote

    const buffer = await resolveToBuffer(input)

    return sock.message.send(jid, {
      type: 'audio',
      media: buffer,
      ptt: true,
      ...rest
    }, {
      ...(quoteKey ? { quote: quoteKey } : {}),
      ...(mentions ? { mentions } : {})
    })
  }

  sock.uploadThumbnail = async (image, options = {}) => {
    const { favicon = false, mimetype: mimetypeOverride } = options

    const buffer = await resolveToBuffer(image)
    const mimetype = mimetypeOverride || await detectMimetype(buffer)

    const [uploaded, dims] = await Promise.all([
      sock.message.upload(buffer, { type: 'thumbnail-link', mimetype }),
      resolveDimensions(buffer)
    ])

    const result = {
      thumbnailDirectPath: uploaded.directPath,
      thumbnailSha256: toBase64(uploaded.fileSha256),
      thumbnailEncSha256: toBase64(uploaded.fileEncSha256),
      mediaKey: toBase64(uploaded.mediaKey),
      mediaKeyTimestamp: uploaded.mediaKeyTimestamp,
      thumbnailWidth: dims.width,
      thumbnailHeight: dims.height,
      mimetype
    }

    if (uploaded.url) result.url = uploaded.url

    if (!favicon) {
      const jpeg = await sharp(buffer)
        .resize({ width: 120, withoutEnlargement: true })
        .jpeg({ quality: 40 })
        .toBuffer()
      result.jpegThumbnail = toBase64(jpeg)
    }

    return result
  }

  sock.downloadThumbnail = async (fields, options = {}) => {
    if (!fields?.mediaKey || !fields?.thumbnailDirectPath) {
      throw new Error('Field thumbnail tidak lengkap, butuh minimal mediaKey dan thumbnailDirectPath.')
    }

    const transfer = new WaMediaTransferClient()

    const { plaintext } = await transfer.downloadAndDecryptStream({
      directPath: fields.thumbnailDirectPath,
      mediaType: 'thumbnail-link',
      mediaKey: toBuffer(fields.mediaKey),
      fileSha256: toBuffer(fields.thumbnailSha256),
      fileEncSha256: toBuffer(fields.thumbnailEncSha256),
      timeoutMs: options.timeoutMs,
      signal: options.signal,
      maxBytes: options.maxBytes
    })

    const buffer = await resolveToBuffer(plaintext)
    const mimetype = fields.mimetype || await detectMimetype(buffer)

    let jpegThumbnail = null
    try {
      jpegThumbnail = await sharp(buffer)
        .resize({ width: 60, withoutEnlargement: true })
        .jpeg({ quality: 10 })
        .toBuffer()
    } catch (err) {
      console.error('[downloadThumbnail] gagal generate jpegThumbnail:', err.message)
    }

    return {
      buffer,
      mimetype,
      jpegThumbnail
    }
  }

  sock.resolveThumbMeta = async (value, jenis = 'thumbnail') => {
    if (value && typeof value === 'object') {
      return { name: null, jenis, status: 'inline', metadata: value }
    }

    const input = String(value ?? '').trim()
    if (!input) throw new Error(`${jenis}: isi dengan nama db, URL gambar, "random", atau objek metadata.`)

    const { getThumb, getRandomThumb } = await import('../db/thumbnails.js')

    if (/^random$/i.test(input)) {
      const row = getRandomThumb(jenis)
      if (!row) throw new Error(`Tidak ada ${jenis} random yang tersedia di database.`)
      return row
    }

    if (/^https?:\/\//i.test(input)) {
      const metadata = await sock.uploadThumbnail(input, { favicon: jenis === 'favicon' })
      return { name: null, jenis, status: 'upload', metadata }
    }

    const row = getThumb(input, jenis)
    if (!row) throw new Error(`${jenis} \`${input}\` tidak ditemukan di database.`)
    return row
  }

  sock.sendThumbnail = async (jid, options = {}) => {
    const { thumbnail, favicon, title, body, url, text, quote, ...rest } = options

    const cleanUrl = String(url ?? '').trim()
    if (!cleanUrl) throw new Error('sendThumbnail: parameter `url` wajib ada.')
    if (!/^https?:\/\//i.test(cleanUrl)) throw new Error(`sendThumbnail: \`url\` tidak valid ("${cleanUrl}") — harus diawali http:// atau https://.`)
    if (!thumbnail) throw new Error('sendThumbnail: parameter `thumbnail` wajib ada (nama db / url / "random").')

    const thumbRow = await sock.resolveThumbMeta(thumbnail, 'thumbnail')
    const faviconRow = favicon ? await sock.resolveThumbMeta(favicon, 'favicon') : null

    const payload = {
      extendedTextMessage: {
        title: String(title ?? '').trim() || undefined,
        description: String(body ?? '').trim() || undefined,
        text: `${cleanUrl}${text ? `\n${String(text).trim()}` : ''}`,
        matchedText: cleanUrl,
        previewType: 0,
        inviteLinkGroupTypeV2: 0,
        ...thumbRow.metadata
      }
    }

    if (faviconRow) payload.extendedTextMessage.faviconMmsMetadata = { ...faviconRow.metadata }

    const quoteKey = quote?.raw ?? quote
    return sock.message.send(jid, payload, {
      ...(quoteKey ? { quote: quoteKey } : {}),
      ...rest
    })
  }

  sock.sendReact = async (jid, emoji, target) => {
    if (!target) return

    const reactionTarget = typeof target === 'string'
      ? { remoteJid: jid, id: target, fromMe: false }
      : target

    return sock.message.send(jid, {
      type: 'reaction',
      emoji,
      target: reactionTarget
    })
  }

  sock.sendAlbum = async (jid, medias, options = {}) => {
    const { quote, caption, ...rest } = options

    let list = medias
    if (!Array.isArray(list) && list && typeof list === 'object' && (list.images || list.videos)) {
      const { images = [], videos = [] } = list
      list = [
        ...images.map((v) => (typeof v === 'object' && !Buffer.isBuffer(v) ? v : { image: v })),
        ...videos.map((v) => (typeof v === 'object' && !Buffer.isBuffer(v) ? v : { video: v }))
      ]
    }

    const items = (Array.isArray(list) ? list : [list]).filter(Boolean)

    if (!items.length) throw new Error('sendAlbum: media kosong. pakai array: sendAlbum(jid, [url1, url2]) atau sendAlbum(jid, { images: [url1, url2] })')

    const uploaded = []
    for (const item of items) {
      const source = typeof item === 'string' ? item : item.image ?? item.video
      const kind = typeof item === 'object' && item.video && !item.image ? 'video' : 'image'
      if (!source) throw new Error('sendAlbum: tiap item butuh key `image` atau `video`.')

      const buffer = await resolveToBuffer(source)
      const mimetype = item?.mimetype || await detectMimetype(buffer) || (kind === 'video' ? 'video/mp4' : 'image/jpeg')
      const up = await sock.message.upload(buffer, { type: kind, mimetype })

      uploaded.push({ up, kind, mimetype })
    }

    const album = await sock.message.send(jid, {
      albumMessage: {
        expectedImageCount: uploaded.filter(v => v.kind === 'image').length,
        expectedVideoCount: uploaded.filter(v => v.kind === 'video').length
      }
    }, {
      ...(quote ? { quote: quote.raw ?? quote } : {}),
      ...rest
    })

    const parentKey = {
      remoteJid: jid,
      fromMe: true,
      id: album.id
    }

    let i = 0
    for (const { up, kind, mimetype } of uploaded) {
      i++
      const sub = kind === 'video' ? 'videoMessage' : 'imageMessage'

      const transfer = new WaMediaTransferClient()
      const { plaintext } = await transfer.downloadAndDecryptStream({
        directPath: up.directPath,
        mediaType: kind,
        mediaKey: toBuffer(up.mediaKey),
        fileSha256: toBuffer(up.fileSha256),
        fileEncSha256: toBuffer(up.fileEncSha256),
      })

      const buffer = await resolveToBuffer(plaintext)
      const jpegThumbnail = await sharp(buffer)
        .resize({ width: 120, withoutEnlargement: true })
        .jpeg({ quality: 10 })
        .toBuffer()
        .then(toBase64)

      await sock.message.send(jid, {
        [sub]: {
          url: up.url,
          directPath: up.directPath,
          mediaKey: up.mediaKey,
          fileSha256: up.fileSha256,
          fileEncSha256: up.fileEncSha256,
          fileLength: up.fileLength,
          mediaKeyTimestamp: up.mediaKeyTimestamp,
          mimetype,
          jpegThumbnail,
          ...(i === 1 && caption ? { caption } : {})
        },
        messageContextInfo: {
          messageAssociation: {
            associationType: 1,
            parentMessageKey: parentKey
          }
        }
      })
    }

    return album
  }

  sock.sendStickerPack = async (jid, name, entries, options = {}) => {
    const { quoted, publisher = '', perPack = 60, ...rest } = options
    const quoteKey = quoted?.raw ?? quoted

    if (!Array.isArray(entries) || !entries.length) {
      throw new Error('sendStickerPack: entries harus array url/buffer/raw entry, minimal 1')
    }

    const totalPacks = Math.ceil(entries.length / perPack)
    const results = []

    for (let i = 0; i < entries.length; i += perPack) {
      const chunk = entries.slice(i, i + perPack)
      const stickers = []
      const failed = []

      for (let j = 0; j < chunk.length; j++) {
        const entry = chunk[j]
        const source = entry.url || entry.media || entry
        const emojis = entry.emojis || []

        try {
          const buffer = await resolveToBuffer(source)
          const converted = await convertToSticker(buffer)

          stickers.push({
            media: converted.buffer,
            fileName: `sticker_${i + j}.webp`,
            emojis,
            isAnimated: converted.isAnimated
          })
        } catch (err) {
          failed.push({ index: i + j, error: err.message })
        }
      }

      if (!stickers.length) continue

      const trayBuffer = await extractStillFrame(stickers[0].media)

      const partLabel = totalPacks > 1 ? ` (${Math.floor(i / perPack) + 1}/${totalPacks})` : ''
      const packName = totalPacks > 1 ? `${name}${partLabel}` : name

      const sent = await sock.message.send(jid, {
        type: 'sticker-pack',
        stickerPackId: crypto.randomBytes(16).toString('hex'),
        name: packName,
        publisher,
        stickers,
        trayIcon: { media: trayBuffer, fileName: 'tray.webp' },
        coverThumbnail: trayBuffer
      }, {
        ...(quoteKey ? { quote: quoteKey } : {}),
        ...rest
      })
      results.push({ result: sent, name: packName, count: stickers.length, failed })
    }

    if (!results.length) throw new Error('Semua sticker gagal diproses, tidak ada pack terkirim')

    return results
  }

  return sock
}

export { detectMimetype }
