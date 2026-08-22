// plugins/owner/delprefix.js

import { config, updateSetting } from '../../settings.js'

export default {
  command: 'delprefix',
  alias: ['hapusprefix'],
  category: 'owner',
  description: 'Menghapus prefix dari daftar berdasarkan nama atau nomor urut.\n\n' +
    '*Format Penggunaan:*\n' +
    '> `Hapus berdasarkan prefix`\n> .delprefix <prefix>\n\n' +
    '> `Hapus berdasarkan nomor urut`\n> .delprefix <nomor>',
  onlyOwner: true,

  async execute(m, { args }) {
    const input = args?.[0]?.trim()

    if (!input) {
      return m.reply(
        `Usage: \`${m.prefix}delprefix <prefix|nomor>\`\n\n` +
        `Daftar prefix:\n${config.prefixes.map((p, i) => `${i + 1}. \`${p}\``).join('\n')}`
      )
    }

    const list = config.prefixes

    if (list.length <= 1) {
      return m.reply('❌ Tidak bisa menghapus satu-satunya prefix yang tersisa.')
    }

    let target

    if (/^\d+$/.test(input)) {
      const num = parseInt(input)

      if (num < 1 || num > list.length) {
        return m.reply(`❌ Nomor urut tidak valid. Rentang yang tersedia: 1-${list.length}.`)
      }

      target = list[num - 1]
    } else if (list.includes(input)) {
      target = input
    } else {
      return m.reply(`❌ Prefix \`${input}\` tidak ada dalam daftar.`)
    }

    if (!updateSetting('prefixes', list.filter((p) => p !== target))) {
      return m.reply('❌ Gagal menyimpan perubahan ke settings.js.')
    }

    return m.reply(
      `🗑️ Prefix \`${target}\` berhasil dihapus.\n\n` +
      `Prefix aktif sekarang:\n${config.prefixes.map((p, i) => `${i + 1}. \`${p}\``).join('\n')}`
    )
  }
}
