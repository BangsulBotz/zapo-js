// plugins/owner/eval.js

import { runUserCode } from '../../handler.js'

export default {
  command: '>',
  alias: ['eval', 'ev', '=>', '!!'],
  category: 'owner',
  description: `> Menjalankan kode JavaScript secara langsung dari chat.

*Keterangan Format:*
> \`<code>\` = kode JavaScript yang ingin dijalankan.

contoh penggunaan:
> \`.eval 1 + 1\``,
  help: '<code>',
  onlyOwner: true,

  async execute(m, { sock }) {
    const code = m.text.slice(m.prefix.length + m.command.length).trim()
    if (!code) return m.reply('*Masukkan kode setelah prefix eval!*')

    try {
      return m.reply(await runUserCode(code, m, sock))
    } catch (err) {
      return m.reply(`❌ Kode gagal dijalankan: ${err?.message || err}`)
    }
  }
}
