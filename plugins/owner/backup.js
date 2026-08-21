// plugins/owner/backup.js

import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { config } from '../../settings.js'
import { excludeFolders, excludeFiles } from '../../lib/backupExclude.js'

const execPromise = promisify(exec)

const HARD_EXCLUDES = ['backup-tmp']

function normalizePattern(p) {
  return p.replace(/^\.\//, '').replace(/\/+$/, '')
}

function buildExcludeArgs() {
  const all = [
    ...HARD_EXCLUDES,
    ...excludeFolders.map(normalizePattern),
    ...excludeFiles.map(normalizePattern)
  ]
  return all.map((e) => `--exclude='${e}'`).join(' ')
}

export default {
  command: 'backup',
  alias: ['getsc', 'getscript', 'backupproject'],
  category: 'owner',
  description: 'Membuat backup project dan mengirimkannya ke grup tujuan.',
  help: '`(tanpa argumen)`',
  onlyOwner: true,
  typing: true,
  wait: true,

  async execute(m, { sock }) {
    if (!config.jidGroup) {
      return m.reply('❌ `config.jidGroup` belum dikonfigurasi di settings.js')
    }

    const projectRoot = process.cwd()
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const fileName = `backup-${config.botName || 'bot'}-${timestamp}.tar.gz`
    const outPath = path.join(os.tmpdir(), fileName)

    const cmd = `cd "${projectRoot}" && tar ${buildExcludeArgs()} -czf "${outPath}" $(ls -A)`

    try {
      try {
        await execPromise(cmd)
      } catch (err) {
        if (err.code !== 1) throw err
        console.warn('[BACKUP] tar warning (exit 1), lanjut cek hasil:', err.message)
      }

      const stat = await fs.promises.stat(outPath)
      if (!stat.size) {
        throw new Error('Hasil backup 0 byte, kemungkinan tar gagal diam-diam.')
      }

      const sizeMB = (stat.size / 1024 / 1024).toFixed(2)

      const caption =
        `*── 「 BACKUP PROJECT 」 ──*\n\n` +
        `👤 Pengirim: ${m.pushName || 'Owner'}\n` +
        `📄 File: ${fileName}\n` +
        `📦 Ukuran: ${sizeMB} MB\n` +
        `📅 Waktu: ${new Date().toLocaleString('id-ID')}`

      await sock.message.send(config.jidGroup, {
        type: 'document',
        media: outPath,
        mimetype: 'application/gzip',
        fileName,
        caption
      })

      await m.reply(`✅ *Backup Berhasil!*\n\n📄 ${fileName} (${sizeMB} MB)\n📤 Dikirim ke: \`${config.jidGroup}\``)
    } catch (err) {
      console.error('[BACKUP] gagal:', err?.stack || err)
      return m.reply(`❌ *Gagal membuat backup:*\n\n${err.message || err}`)
    } finally {
      fs.promises.unlink(outPath).catch(() => {})
    }
  }
}
