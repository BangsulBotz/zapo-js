// lib/notifRestart.js

import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import { parsePhoneJid } from 'zapo-js'
import { config } from '../settings.js'
import { formatDuration } from './utils.js'

export async function handleRestartNotification(sock) {
  const restartFile = path.join(process.cwd(), 'sampah', 'restart_info.json')
  if (!fs.existsSync(restartFile)) return

  setTimeout(async () => {
    try {
      if (!fs.existsSync(restartFile)) return

      const data = JSON.parse(fs.readFileSync(restartFile, 'utf8'))
      const now = Date.now()
      const downtimeMs = now - data.time
      const uptimeMs = process.uptime() * 1000

      const dateTimeOptsJakarta = { timeZone: 'Asia/Jakarta' }
      const matiDate = new Date(data.time)
      const nyalaDate = new Date(now)

      const dateMati = matiDate.toLocaleDateString('id-ID', dateTimeOptsJakarta)
      const timeMati = matiDate.toLocaleTimeString('id-ID', dateTimeOptsJakarta).replace(/\./g, ':')
      const dateNyala = nyalaDate.toLocaleDateString('id-ID', dateTimeOptsJakarta)
      const timeNyala = nyalaDate.toLocaleTimeString('id-ID', dateTimeOptsJakarta).replace(/\./g, ':')

      const targetJid = data.sender || (config.owner ? parsePhoneJid(config.owner) : null)
      const targetNum = targetJid ? targetJid.split('@')[0] : String(config.owner).replace(/\D/g, '')

      const restartCaption = `🚀 *Bot Kembali Online!*

\`Waktu Mati\`
\`\`\`Tanggal : ${dateMati}
Jam     : ${timeMati} WIB\`\`\`

\`Waktu Nyala\`
\`\`\`Tanggal : ${dateNyala}
Jam     : ${timeNyala} WIB\`\`\`

\`Durasi Offline\`
> Waktu : ${formatDuration(downtimeMs)}

⏱️ *Uptime Saat Ini:*
> ${formatDuration(uptimeMs)} (${uptimeMs.toFixed(0)}ms)

👤 *User:* @${targetNum}`

      if (data.jid) {
        const contextInfo = {}

        if (data.id && data.sender) {
          contextInfo.stanzaId = data.id
          contextInfo.participant = data.sender
          contextInfo.quotedMessage = {
            conversation: data.text || '.restart'
          }
        }

        if (targetJid) {
          contextInfo.mentionedJid = [targetJid]
        }

        const rawMessage = {
          extendedTextMessage: {
            text: restartCaption,
            contextInfo
          }
        }

        await sock.message.send(data.jid, rawMessage, {
          quote: data.id && data.sender ? { key: { id: data.id, remoteJid: data.jid, participant: data.sender } } : undefined,
          mentions: targetJid ? [targetJid] : undefined
        })

        console.log(chalk.green(`\n✅ [RESTART] Notifikasi restart + reply berhasil dikirim!\n`))
      }
    } catch (err) {
      console.error(chalk.red('[RESTART ERROR] Gagal mengirim notifikasi restart:'), err?.message || err)
    } finally {
      if (fs.existsSync(restartFile)) {
        fs.unlinkSync(restartFile)
      }
    }
  }, 3000)
}