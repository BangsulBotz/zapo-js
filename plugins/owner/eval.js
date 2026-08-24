// plugins/owner/eval.js

import { runUserCode } from '../../handler.js'

export default {
  command: '>',
  alias: ['eval', 'ev', '=>', '!!'],
  category: 'owner',
  description: 'Menjalankan kode JavaScript secara langsung.\n\n' +
    '*Format Penggunaan:*\n' +
    '> `Menjalankan kode JavaScript`\n> .eval <code>',
  help: '`<code>`',
  onlyOwner: true,

  async execute(m, { sock }) {
    const code = m.text.slice(m.prefix.length + m.command.length).trim()
    if (!code) return m.reply('*Masukkan kode setelah prefix eval!*')

    return m.reply(await runUserCode(code, m, sock))
  }
}
