// plugins/owner/listfile.js

import fs from 'fs'
import path from 'path'
import { formatBytes } from '../../lib/utils.js'

async function getFolderSize(folderPath) {
  let total = 0
  const entries = await fs.promises.readdir(folderPath, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(folderPath, entry.name)
    if (entry.isDirectory()) {
      total += await getFolderSize(full)
    } else if (entry.isFile()) {
      total += (await fs.promises.stat(full)).size
    }
  }
  return total
}

export default {
  command: 'listfile',
  alias: ['ls', 'dir', 'listdir', 'cekfolder'],
  category: 'owner',
  description: 'Menampilkan daftar file dan folder beserta ukurannya.\n\n' +
    '*Format Penggunaan:*\n' +
    '> `Menampilkan isi directory tertentu`\n> .listfile <path>\n\n' +
    '> `Menampilkan isi root project`\n> .listfile',
  help: '`<directory>`',
  onlyOwner: true,

  async execute(m, { sock, args }) {
    let directoryPath = args.join(' ').trim()
    if (!directoryPath) directoryPath = process.cwd()

    const fullPath = path.resolve(process.cwd(), directoryPath)
    const relative = path.relative(process.cwd(), fullPath)
    const relativeParts = relative.split(path.sep)
    const upCount = relativeParts.filter((part) => part === '..').length

    if (upCount > 2) {
      return m.reply('⛔ Maksimal hanya boleh naik 2 folder ke atas (../../ )!')
    }

    const statusMsg = await m.reply('🔍 Sedang membaca direktori...')

    const finish = async (text) => {
      try {
        if (!statusMsg?.id) throw new Error('Tidak ada stanza id dari pesan status untuk di-edit')
        await sock.message.send(m.chat, text, { editKey: { id: statusMsg.id } })
      } catch (err) {
        console.warn('[LISTFILE] gagal edit pesan status, fallback kirim baru:', err.message)
        await m.reply(text)
      }
    }

    try {
      const items = await fs.promises.readdir(fullPath)

      let folders = []
      let files = []
      let totalSize = 0

      for (const item of items) {
        const itemPath = path.join(fullPath, item)
        const stat = await fs.promises.stat(itemPath)

        if (stat.isDirectory()) {
          const size = await getFolderSize(itemPath)
          folders.push({ name: item, size: formatBytes(size) })
          totalSize += size
        } else if (stat.isFile()) {
          const size = stat.size
          files.push({ name: item, size: formatBytes(size) })
          totalSize += size
        }
      }

      let text = `*DAFTAR ISI DIREKTORI*\n${fullPath}\n\n`
      text += `📁 *Folder* \`(${folders.length})\`\n`
      if (folders.length === 0) {
        text += 'Tidak ada folder\n'
      } else {
        folders.forEach((f) => {
          text += `> ${f.name} \`(${f.size})\`\n`
        })
      }

      text += `\n📄 *File* \`(${files.length})\`\n`
      if (files.length === 0) {
        text += 'Tidak ada file\n'
      } else {
        files.forEach((f) => {
          text += `> ${f.name} \`(${f.size})\`\n`
        })
      }

      text += `\n📊 *Total ukuran directory*: ${formatBytes(totalSize)}\n`

      await finish(text)
    } catch (err) {
      let errMsg = 'Terjadi error saat membaca direktori'
      if (err.code === 'ENOENT') {
        errMsg = `Direktori tidak ditemukan: ${directoryPath}`
      } else if (err.code === 'EACCES') {
        errMsg = `Tidak punya izin akses ke: ${directoryPath}`
      } else {
        errMsg += `\n${err.message}`
      }

      await finish(`❌ ${errMsg}`)
    }
  }
}
