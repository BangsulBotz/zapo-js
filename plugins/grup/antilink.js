// plugins/grup/antilink.js
import { getEffectiveGroupSettings, updateGroupSettings } from '../../lib/groupAndBot.js'

const actions = new Set(['delete', 'kick', 'both'])

export default {
  command: 'antilink',
  alias: ['antilinkgc', 'antilinkgrup', 'antilinkall'],
  category: 'grup',
  description: `> Mengatur anti-link grup. Mendeteksi link WhatsApp dan mengeksekusi sesuai opsi.

*Keterangan Format:*
\`on\` = mengaktifkan fitur.
\`off\` = menonaktifkan fitur.

*Pilihan sanksi/option:*
\`delete\` = menghapus pesan pengirim.
\`kick\` = mengeluarkan user dari grup.
\`both\` = menghapus & mengeluarkan user.

contoh penggunaan:
\`.antilink on delete\`
\`.antilink on kick\`
\`.antilink off\`

*Catatan:*
> tautan undangan grup ini sendiri tidak akan terkena sanksi. (diizinkan)
> fitur ini hanya bisa digunakan oleh owner.`,
  help: '<on/off> <delete/kick/both>',
  onlyOwner: true,
  onlyGroup: true,

  async execute(m, { args }) {
    const value = args[0]?.toLowerCase()
    const action = args[1]?.toLowerCase()

    if (!['true', 'false', 'on', 'off'].includes(value) || args.length > 2) {
      const settings = getEffectiveGroupSettings(m.chat)
      const mode = settings.antilink.kick && settings.antilink.delete
        ? 'both'
        : settings.antilink.kick ? 'kick' : settings.antilink.delete ? 'delete' : 'off'
      return m.reply(`Format salah! Gunakan:\n\`${m.prefix}${m.command} <on/off> <option>\`\n\nContoh:\n${m.prefix}${m.command} on kick\n> (tendang anggota yang mengirim link)\n\n${m.prefix}${m.command} on delete\n> (hapus pesan berisi link)\n\n${m.prefix}${m.command} on both\n> (hapus pesan dan tendang anggota)\n\n${m.prefix}${m.command} off\n> (nonaktifkan fitur antilinkall)`)
    }

    const enabled = value === 'true' || value === 'on'
    if (enabled && !actions.has(action)) {
      return m.reply(`Format salah! Gunakan: \`${m.prefix}${m.command} <on/off> <option>\``)
    }
    if (!enabled && action) return m.reply(`Saat mematikan anti-link, cukup gunakan: ${m.prefix}${m.command} false`)

    const settings = updateGroupSettings(m.chat, {
      antilink: {
        kick: enabled && (action === 'kick' || action === 'both'),
        delete: enabled && (action === 'delete' || action === 'both')
      }
    })
    const mode = settings.antilink.kick && settings.antilink.delete
      ? 'both'
      : settings.antilink.kick ? 'kick' : 'delete'

    return m.reply(`✅ Antilink ${enabled ? `diaktifkan (${mode})` : 'dinonaktifkan'} untuk grup ini.`)
  }
}
