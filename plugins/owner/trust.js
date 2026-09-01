// plugins/owner/trust.js

import { addTrustedUser } from '../../db/group.js'
import { extractTarget } from '../../lib/utils.js'

export default {
  command: 'trust',
  alias: ['trustuser'],
  category: 'owner',
  description: `> Memberi izin user tertentu menggunakan fitur tanpa pembatasan di dalam grup.

*Keterangan Format:*
> \`<fitur>\` = nama fitur atau alias.
> \`<@mention/reply/nomor>\` = target user.

contoh penggunaan:
> \`.trust <fitur> @mention\`
> \`.trust <fitur> 628xxxx\``,
  help: '<fitur> <@tag/reply/nomor>',
  onlyOwner: true,
  typing: true,

  async execute(m, { args }) {
    const result = extractTarget(m, args, { requireFeature: true })
    if (result.error) return m.reply(result.error)
    const { target, plugin } = result
    if (!target) return m.reply('❌ Target tidak terdeteksi. Reply pesan, mention, atau masukkan nomor.')

    const { added, identifiers } = addTrustedUser(target, plugin.command, m.sender)
    const label = `@${target.split('@')[0]}`

    let text = added
      ? `🔓 *Trust Berhasil!*\n\n👤 *User:* ${label}\n🔧 *Fitur:* \`${plugin.command}\``
      : `⚠️ User ini sudah ter-trust untuk fitur \`${plugin.command}\`.`

    if (added && identifiers.length < 2) {
      text += `\n\nℹ️ Baru tersimpan sebagai ${target.endsWith('@lid') ? 'LID' : 'nomor HP'} saja — akan otomatis melengkapi setelah kontaknya dikenal bot.`
    }

    text += `\n\n📌 Berlaku di dalam grup saja — chat pribadi tetap khusus owner & bot.`

    try {
      return await m.reply(m.chat, text, { mentions: [target] })
    } catch (err) {
      console.warn('[TRUST] Setting tersimpan, tetapi konfirmasi gagal dikirim:', err?.message || err)
      return null
    }
  }
}
