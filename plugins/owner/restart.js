// plugins/owner/restart.js

import fs from 'fs'
import path from 'path'

export default {
  command: 'restart',
  alias: ['restartbot', 'botrs', 'botres', 'resbot'],
  category: 'owner',
  description: `> Memulai ulang process bot.

contoh penggunaan:
> \`.restart\``,
  onlyOwner: true,

  async execute(m) {
    const trashPath = path.join(process.cwd(), 'sampah')
    const restartFile = path.join(trashPath, 'restart_info.json')

    if (!fs.existsSync(trashPath)) {
      fs.mkdirSync(trashPath, { recursive: true })
    }

    const restartData = {
      jid: m.chat,
      sender: m.sender,
      id: m.id,
      text: m.text || m.body || '.restart',
      time: Date.now()
    }

    try {
      fs.writeFileSync(restartFile, JSON.stringify(restartData, null, 2))
      await m.reply('🔄 *Bot sedang restart...*\nMohon tunggu sekitar 5-10 detik.')

      setTimeout(() => {
        process.exit(0)
      }, 1000)
    } catch (err) {
      console.error('[RESTART ERROR]', err)
      await m.reply('❌ Gagal menyiapkan file restart.')
    }
  }
}
