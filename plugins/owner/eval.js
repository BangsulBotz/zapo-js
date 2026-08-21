import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { buildEvalContext } from '../../handler.js'
import { transformImports, createFakeConsole, formatEvalResult, formatEvalError, executeAsyncCode } from '../../lib/utils.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
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
    const code = transformImports(m.text.slice(m.prefix.length + m.command.length).trim())
    if (!code) return m.reply('*Masukkan kode setelah prefix eval!*')

    const { consoleOutput, fakeConsole } = createFakeConsole()
    const ctx = { ...buildEvalContext(m, sock), console: fakeConsole, __dirname, __filename }
    try {
      const result = await executeAsyncCode(code, ctx)

      const isPlainJson =
        result !== null &&
        typeof result === 'object' &&
        !(result instanceof Error) &&
        !Buffer.isBuffer(result)

      if (isPlainJson) {
        let pretty
        try {
          pretty = JSON.stringify(result, null, 2)
        } catch {
          pretty = null
        }

        if (pretty) {
          return m.reply('```json\n' + pretty + '\n```')
        }
      }

      return m.reply('```' + formatEvalResult(result, consoleOutput) + '```')
    } catch (err) {
      return m.reply(`Error:\n\`\`\`js\n${formatEvalError(err)}\n\`\`\``)
    }
  }
}
