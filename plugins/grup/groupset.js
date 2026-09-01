// plugins/grup/groupset.js
import { getEffectiveGroupSettings } from '../../lib/groupAndBot.js'

export default {
  command: 'groupset',
  alias: ['grupset', 'grupsetting', 'grupseting'],
  category: 'grup',
  description: `> Menampilkan pengaturan grup saat ini meliputi antilink dan selfgc.

contoh penggunaan:
\`.groupset\`

*Catatan:*
> fitur ini hanya bisa digunakan oleh owner.`,
  help: '(tanpa argumen)',
  onlyOwner: true,
  onlyGroup: true,

  async execute(m) {
    const settings = getEffectiveGroupSettings(m.chat)
    const antilink = settings.antilink.kick && settings.antilink.delete
      ? 'both'
      : settings.antilink.kick ? 'kick' : settings.antilink.delete ? 'delete' : 'off'
    const mark = (active) => active ? '✅' : '❌'
    const groupName = m.groupName || 'Nama grup tidak tersedia'
    return m.reply(
      `*PENGATURAN GRUP*\n` +
      `*Grup:* ${groupName}\n` +
      `*JID:* ${settings.jid_group}\n` +
      `──────────────────\n\n` +
      `🛡️ *FITUR KEAMANAN (SANKSI)*\n` +
      `\`antilink\`\n` +
      `> [${mark(antilink === 'delete' || antilink === 'both')} delete] [${mark(antilink === 'kick' || antilink === 'both')} kick]\n\n` +
      `⚙️ *FITUR ON/OFF*\n` +
      `\`selfgc\` : ${mark(settings.selfgc)} ${settings.selfgc ? 'Aktif' : 'Non-Aktif'}\n\n` +
      `──────────────────\n` +
      `*Ubah:* \`${m.prefix}antilink on kick\``
    )
  }
}
