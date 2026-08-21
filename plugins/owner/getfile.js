// plugins/owner/getfile.js

import fs from 'fs'
import path from 'path'

const MIME_MAP = {
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.cjs': 'application/javascript',
  '.ts': 'application/typescript',
  '.json': 'application/json',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.html': 'text/html',
  '.css': 'text/css',
  '.csv': 'text/csv',
  '.log': 'text/plain',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.rar': 'application/vnd.rar',
  '.7z': 'application/x-7z-compressed',
  '.tar': 'application/x-tar',
  '.gz': 'application/gzip',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.sqlite': 'application/vnd.sqlite3',
  '.db': 'application/vnd.sqlite3',
  '.env': 'text/plain',
  '.yml': 'text/yaml',
  '.yaml': 'text/yaml',
  '.xml': 'application/xml'
}

function detectMime(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  return MIME_MAP[ext] || 'application/octet-stream'
}

export default {
  command: 'getfile',
  alias: ['gf', 'ambilfile', 'sendfile'],
  category: 'owner',
  description: 'Mengirim file dari server bot sebagai document.\n\n' +
    '*Format Penggunaan:*\n' +
    '> `Mengirim file dari path tertentu`\n> .getfile <path file>',
  help: '`<path file>`',
  typing: true,
  onlyOwner: true,

  async execute(m, { args }) {

    const filePathInput = args.join(' ').trim()
    if (!filePathInput) {
      return m.reply(`*Format salah!*\nGunakan: ${m.prefix}${m.command} <path file>\nContoh: ${m.prefix}${m.command} ./plugins/owner/getfile.js`)
    }

    try {
      const fullPath = path.resolve(process.cwd(), filePathInput)

      if (!fs.existsSync(fullPath)) {
        return m.reply(`❌ Path tidak ditemukan: ${filePathInput}`)
      }

      const stat = await fs.promises.stat(fullPath)
      if (!stat.isFile()) {
        return m.reply(`❌ Bukan file: ${filePathInput}`)
      }

      const fileName = path.basename(fullPath)
      const detectedMime = detectMime(fullPath)
      const buffer = await fs.promises.readFile(fullPath)

      await m.reply({
        type: 'document',
        media: buffer,
        mimetype: detectedMime,
        fileName
      })

    } catch (err) {
      let errMsg = 'Terjadi error saat mengambil file'
      if (err.code === 'ENOENT') {
        errMsg = `File tidak ditemukan: ${filePathInput}`
      } else if (err.code === 'EACCES') {
        errMsg = `Tidak punya izin akses file: ${filePathInput}`
      } else {
        errMsg += `\n${err.message}`
      }
      await m.reply(`❌ ${errMsg}`)
    }
  }
}
