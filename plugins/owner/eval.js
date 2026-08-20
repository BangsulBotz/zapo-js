import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { buildEvalContext } from '../../handler.js'
import { transformImports, createFakeConsole, formatEvalResult, formatEvalError } from '../../lib/utils.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor

export default {
  command: '>',
  alias: ['eval', 'ev', '=>', '!!'],
  category: 'owner',
  description: 'Jalankan kode JavaScript (owner only)',
  help: '`<code>`',
  onlyOwner: true,

  async execute(m, { sock }) {
    const code = transformImports(m.text.slice(m.prefix.length + m.command.length).trim())
    if (!code) return m.reply('*Masukkan kode setelah prefix eval!*')

    const { consoleOutput, fakeConsole } = createFakeConsole()
    const ctx = { ...buildEvalContext(m, sock), console: fakeConsole, __dirname, __filename }
    const names = Object.keys(ctx)
    const values = Object.values(ctx)

    try {
      let fn
      try {
        fn = new AsyncFunction(...names, `return (\n${code}\n)`)
      } catch {
        fn = new AsyncFunction(...names, code)
      }
      const result = await fn(...values)

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