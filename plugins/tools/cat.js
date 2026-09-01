// plugins/tools/cat.js

import sharp from 'sharp'
import { extractStillFrame } from '../../lib/exif.js'

const TEXT_EXTENSIONS = new Set([
  'txt', 'js', 'mjs', 'cjs', 'ts', 'tsx', 'jsx',
  'json', 'jsonc', 'xml', 'yaml', 'yml', 'toml', 'ini',
  'env', 'md', 'mdx', 'html', 'htm', 'css', 'scss', 'sass',
  'sh', 'bash', 'zsh', 'fish', 'py', 'rb', 'php', 'java',
  'c', 'cpp', 'h', 'hpp', 'cs', 'go', 'rs', 'swift', 'kt',
  'sql', 'graphql', 'prisma', 'dockerfile', 'log', 'csv'
])

const TEXT_LIMIT = 60000

function isTextFile(mime, fileName) {
  if (/^text\/|json|xml|javascript|typescript|markdown/i.test(mime)) return true
  const ext = fileName?.split('.').pop()?.toLowerCase()
  return ext ? TEXT_EXTENSIONS.has(ext) : false
}

async function buildThumbnail(source) {
  return sharp(source)
    .resize({ width: 120, withoutEnlargement: true })
    .jpeg({ quality: 40 })
    .toBuffer()
}

export default {
  command: 'cat',
  category: 'tools',
  description: `> Konversi dokumen menjadi teks, atau kirim ulang media sebagai media biasa (bukan dokumen).

contoh penggunaan:
> \`.cat\` (reply dokumen/media)`,
  help: '(reply dokumen/media)',
  typing: true,

  async execute(m) {
    if (!m.quoted) return m.reply('Reply dokumen atau media yang mau dikonversi!')
    if (!m.quoted.isMedia) return m.reply('Pesan yang di-reply bukan dokumen/media.')

    let buffer
    try {
      buffer = await m.quoted.download()
    } catch (err) {
      return m.reply(`Gagal mengunduh file: ${err?.message || 'file tidak tersedia.'}`)
    }
    if (!buffer?.length) return m.reply('Gagal mengunduh file atau file kosong.')

    const mime = m.quoted.mime || ''
    const fileName = m.quoted.fileName || `file_${Date.now()}`

    if (/^image\//i.test(mime)) {
      const jpegThumbnail = await buildThumbnail(buffer)
      return m.reply({
        type: 'image',
        media: buffer,
        mimetype: mime || 'image/jpeg',
        jpegThumbnail
      })
    }

    if (/^video\//i.test(mime)) {
      const stillFrame = await extractStillFrame(buffer)
      const jpegThumbnail = await buildThumbnail(stillFrame)
      return m.reply({
        type: 'video',
        media: buffer,
        mimetype: mime || 'video/mp4',
        jpegThumbnail
      })
    }

    if (/^audio\//i.test(mime)) {
      return m.reply({
        type: 'audio',
        media: buffer,
        mimetype: mime || 'audio/mpeg'
      })
    }

    if (isTextFile(mime, fileName)) {
      const content = Buffer.from(buffer).toString('utf-8')
      if (!content.trim()) return m.reply('File kosong atau tidak berisi teks yang bisa dibaca.')
      if (content.length > TEXT_LIMIT) {
        return m.reply(content.slice(0, TEXT_LIMIT) + '\n\n... (terpotong)')
      }
      return m.reply(content)
    }

    return m.reply({
      type: 'document',
      media: buffer,
      fileName,
      mimetype: mime || 'application/octet-stream'
    })
  }
}
