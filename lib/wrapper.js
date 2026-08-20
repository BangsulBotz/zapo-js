// lib/wrapper.js

import { Readable } from 'stream'
import { WaMediaTransferClient } from 'zapo-js'
import { fileTypeFromBuffer } from 'file-type'
import fs from 'fs'
import sharp from 'sharp'

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

  if (input instanceof Readable || typeof input?.pipe === 'function' || typeof input?.getReader === 'function') {
    return streamToBuffer(input)
  }

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

function toBase64(x) {
  return Buffer.from(x).toString('base64')
}

function toBuffer(x) {
  if (Buffer.isBuffer(x)) return x
  if (x instanceof Uint8Array) return Buffer.from(x)
  if (typeof x === 'string') return Buffer.from(x, 'base64')
  throw new Error('Field harus Buffer, Uint8Array, atau base64 string.')
}

export function attachWrappers(sock) {

  //send voice note
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

  //upload gambar ke thumbnail
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

    if (!favicon) {
      const jpeg = await sharp(buffer)
        .resize({ width: 120, withoutEnlargement: true })
        .jpeg({ quality: 40 })
        .toBuffer()
      result.jpegThumbnail = toBase64(jpeg)
    }

    return result
  }

  //download thumbnail
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
        .resize({ width: 120, withoutEnlargement: true })
        .jpeg({ quality: 40 })
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

  //send reaction
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

  return sock
}

export { detectMimetype }

/*
CONTOH PENGGUNAAN (di dalam command, m = hasil serializeMessage, sock sudah di-attachWrappers)

// sendVoiceNote
await sock.sendVoiceNote(m.chat, './audio.mp3')
await sock.sendVoiceNote(m.chat, 'https://example.com/audio.mp3')
await sock.sendVoiceNote(m.chat, bufferAudio, { quote: m })

// uploadThumbnail -> dipakai untuk link preview / linkPreview di message content lain
const thumb = await sock.uploadThumbnail('./cover.jpg')
const thumbNoJpeg = await sock.uploadThumbnail('https://example.com/cover.png', { favicon: true })
const thumbCustomMime = await sock.uploadThumbnail(bufferImg, { mimetype: 'image/webp' })
const thumbFromQuoted = await sock.uploadThumbnail(m.quoted.download()) // langsung passing Promise<Buffer>, gak perlu await dulu
// hasil thumb bisa dipakai contoh:
await sock.message.send(m.chat, {
  extendedTextMessage: {
    text: 'lihat link ini',
    matchedText: 'https://example.com',
    title: 'Judul Link',
    ...thumb
  }
})

// downloadThumbnail -> kebalikan dari uploadThumbnail, ambil ulang gambar dari field WA
const dl = await sock.downloadThumbnail({
  mediaKey: fieldsDariMessage.mediaKey,
  thumbnailDirectPath: fieldsDariMessage.thumbnailDirectPath,
  thumbnailSha256: fieldsDariMessage.thumbnailSha256,
  thumbnailEncSha256: fieldsDariMessage.thumbnailEncSha256,
  mimetype: fieldsDariMessage.mimetype
})
// dl.buffer -> Buffer gambar asli
// dl.mimetype -> mimetype
// dl.jpegThumbnail -> base64 thumbnail kecil (atau null kalau gagal)

// sendReact
await sock.sendReact(m.chat, '👍', m.id)
await sock.sendReact(m.chat, '❤️', m.quoted?.key?.id)
await sock.sendReact(m.chat, '', m.id) // emoji kosong = hapus reaksi
*/