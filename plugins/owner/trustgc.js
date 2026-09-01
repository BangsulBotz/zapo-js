// plugins/owner/trustgc.js

import { addTrustedFeature, removeTrustedFeature, getTrustedFeatures } from '../../db/group.js'
import { getCommandAliases } from '../../lib/utils.js'

export default {
  command: 'trustgc',
  alias: ['trustgroup', 'trustgrup'],
  category: 'owner',
  description: `> Mengizinkan grup ini menggunakan fitur tertentu tanpa pembatasan.

*Keterangan Format:*
> \`<fitur>\` = nama fitur atau alias.
> \`-del <fitur>\` = hapus trust fitur.
> \`-list\` = lihat fitur yang di-trust.

contoh penggunaan:
> \`.trustgc <fitur>\` (trust fitur)
> \`.trustgc -del <fitur>\` (hapus trust)
> \`.trustgc -list\` (lihat daftar)`,
  help: '<fitur>',
  onlyOwner: true,
  groupOnly: true,
  typing: true,

  async execute(m, { args }) {
    const flag = args[0]?.toLowerCase()

    if (flag === '-list') {
      const commands = getTrustedFeatures().get(m.chat)

      if (!commands?.size) {
        return m.reply('Belum ada fitur yang di-trust di grup ini.')
      }

      let text = '*📋 Fitur Terpercaya di Grup Ini:*\n\n'
      for (const command of commands) {
        const aliases = getCommandAliases(command)
        text += `\`${command}\`\n`
        text += `alias: ${aliases.length ? '_' + aliases.join(', ') + '_' : '-'}\n\n`
      }
      return m.reply(text.trim())
    }

    const name = (flag === '-del' ? args.slice(1).join(' ') : args.join(' ')).trim()

    if (!name) {
      return m.reply(`Masukkan nama fitur atau aliasnya.\nContoh: \`${m.prefix}${m.command} safelinku\``)
    }

    const plugin = global.plugins?.get(name.toLowerCase())
    if (!plugin) {
      return m.reply(`❌ Fitur \`${name}\` tidak ditemukan.`)
    }

    const command = plugin.command

    if (flag === '-del') {
      const removed = removeTrustedFeature(m.chat, command)
      return m.reply(removed
        ? `✅ Trust dihapus.\n📌 *Grup:* \`${m.chat}\`\n🔧 *Fitur:* \`${command}\``
        : `⚠️ Fitur \`${command}\` memang tidak ada di daftar trust grup ini.`)
    }

    const added = addTrustedFeature(m.chat, command, m.sender)
    return m.reply(added
      ? `🔓 *Trust Berhasil!*\n\n📌 *Grup:* \`${m.chat}\`\n🔧 *Fitur:* \`${command}\`\n\nSekarang semua anggota grup bisa pakai fitur ini tanpa batasan.`
      : `⚠️ Fitur \`${command}\` sudah ter-trust di grup ini.`)
  }
}
