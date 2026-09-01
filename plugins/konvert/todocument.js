// plugins/konvert/todocument.js

const MIME_BY_EXTENSION = {
  txt: 'text/plain',
  md: 'text/markdown',
  csv: 'text/csv',
  html: 'text/html',
  css: 'text/css',
  json: 'application/json',
  js: 'application/javascript',
  mjs: 'application/javascript',
  cjs: 'application/javascript',
  ts: 'application/typescript',
  xml: 'application/xml',
  yaml: 'application/yaml',
  yml: 'application/yaml',
  pdf: 'application/pdf',
  zip: 'application/zip',
  rar: 'application/vnd.rar',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
  mp4: 'video/mp4',
  webm: 'video/webm',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp'
}

const MIME_BY_MESSAGE_TYPE = {
  imageMessage: 'image/jpeg',
  videoMessage: 'video/mp4',
  audioMessage: 'audio/mpeg',
  documentMessage: 'application/octet-stream'
}

function extensionOf(fileName) {
  return fileName.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() || ''
}

function mimeFromName(fileName) {
  return MIME_BY_EXTENSION[extensionOf(fileName)] || ''
}

function normalizeFileName(input) {
  const name = input.trim().replace(/[\\/]/g, '_')
  if (!name || name === '.' || name === '..') return null
  return name
}

function resolveMime(quoted, fileName) {
  const mime = quoted.mime?.split(';')[0]?.trim().toLowerCase()
  if (mime) return mime

  const fromName = mimeFromName(fileName)
  if (fromName) return fromName

  return MIME_BY_MESSAGE_TYPE[quoted.type] || 'text/plain'
}

export default {
  command: 'todoc',
  alias: ['todocument', 'todokument', 'todok'],
  category: 'konvert',
  description: `> Mengirim ulang reply teks atau media sebagai dokumen dengan nama file tertentu.

*Keterangan Format:*
> \`<nama-file>\` = nama file beserta ekstensinya.

contoh penggunaan:
> \`.todoc <nama-file>\` (reply pesan)`,
  help: '<nama-file> (reply)',
  typing: true,
  wait: true,

  async execute(m) {
    if (!m.quoted) return m.reply('Reply teks, gambar, video, atau audio terlebih dahulu.')

    const fileName = normalizeFileName(m.args?.join(' ') || '')
    if (!fileName) return m.reply(`Masukkan nama file. Contoh: \`${m.prefix}${m.command} agus.js\``)

    const mime = resolveMime(m.quoted, fileName)
    let buffer

    try {
      if (m.quoted.isMedia) {
        buffer = await m.quoted.download()
      } else if (m.quoted.text != null) {
        buffer = Buffer.from(String(m.quoted.text), 'utf8')
      } else {
        return m.reply('Reply teks atau media yang bisa diunduh.')
      }
    } catch (err) {
      console.error('[TODOC] Gagal mengambil isi reply:', err?.message || err)
      return m.reply('Gagal mengambil isi pesan yang di-reply.')
    }

    if (!buffer?.length) return m.reply('Isi file kosong atau gagal diunduh.')

    return m.reply({
      type: 'document',
      media: buffer,
      mimetype: mime,
      fileName
    })
  }
}
