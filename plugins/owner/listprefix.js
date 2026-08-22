// plugins/owner/listprefix.js

import { config } from '../../settings.js'

export default {
  command: 'listprefix',
  alias: ['daftarprefix', 'prefixlist'],
  category: 'owner',
  description: 'Menampilkan daftar prefix aktif beserta status mode tanpa prefix.',
  onlyOwner: true,

  async execute(m) {
    const mode = config.noprefix
      ? 'Aktif — semua command bisa dipanggil tanpa prefix'
      : 'Nonaktif — command wajib pakai prefix'

    const list = config.prefixes.map((p, i) => `${i + 1}. \`${p}\``).join('\n')

    return m.reply(
      `📋 *Daftar Prefix*\n\n` +
      `${list}\n\n` +
      `Total: ${config.prefixes.length}\n` +
      `Mode tanpa prefix: ${mode}`
    )
  }
}
