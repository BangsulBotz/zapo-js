// plugins/owner/trust.js

import { addTrustedUser } from '../../db/trustedFeatures.js'
import { getPushNameByJid } from '../../db/contacts.js'
import { extractFeatureTarget } from '../../lib/utils.js'

export default {
  command: 'trust',
  alias: ['trustuser'],
  category: 'owner',
  description: 'Memberi izin user tertentu menggunakan fitur tanpa pembatasan di dalam grup.\n\n' +
    '*Format Penggunaan:*\n' +
    '> `.trust <fitur/alias> <target>`\n\n' +
    '*Target bisa berupa:* @mention, reply pesan dia, atau ketik nomornya langsung',
  help: '`<fitur>` `<@mention/reply/nomor>`',
  onlyOwner: true,
  typing: true,

  async execute(m, { args }) {
    const { error, target, plugin } = extractFeatureTarget(m, args)
    if (error) return m.reply(error)

    const { added, identifiers } = addTrustedUser(target, plugin.command, m.sender)
    const label = getPushNameByJid(target) || target

    let text = added
      ? `🔓 *Trust Berhasil!*\n\n👤 *User:* ${label}\n🔧 *Fitur:* \`${plugin.command}\`\n🆔 *Tersimpan:* ${identifiers.map(id => `\`${id}\``).join(', ')}`
      : `⚠️ User ini sudah ter-trust untuk fitur \`${plugin.command}\`.`

    if (added && identifiers.length < 2) {
      text += `\n\nℹ️ Baru tersimpan sebagai ${target.endsWith('@lid') ? 'LID' : 'nomor HP'} saja — akan otomatis melengkapi setelah kontaknya dikenal bot.`
    }

    text += `\n\n📌 Berlaku di dalam grup saja — chat pribadi tetap khusus owner & bot.`

    m.reply(text)
  }
}
