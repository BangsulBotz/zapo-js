// plugins/owner/run.js

import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { buildEvalContext } from '../../handler.js'
import { transformImports, createFakeConsole, formatEvalResult, formatEvalError, executeAsyncCode } from '../../lib/utils.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const require = createRequire(import.meta.url)

const LOOKS_LIKE_TEXT = /^(text\/|application\/(javascript|json|x-javascript|typescript))/i

async function getCodeFromQuoted(m, sock) {
  const q = m.quoted
  if (!q) return { error: 'Reply pesan atau file yang mau di-run dulu ya kak.' }

  if (q.mediaType === 'document' || q.type === 'documentMessage') {
    const mime = q.mime || ''
    if (mime && !LOOKS_LIKE_TEXT.test(mime)) {
      console.warn(`[RUN] mimetype "${mime}" gak biasa buat code, tetap dicoba dibaca sebagai teks.`)
    }

    let bytes
    try {
      bytes = await sock.message.downloadBytes(q.full)
    } catch (err) {
      return { error: `Gagal download document: ${err?.message || err}` }
    }

    const text = Buffer.from(bytes).toString('utf8')
    if (!text.trim()) return { error: 'File yang di-reply kosong setelah di-download.' }
    return { code: text }
  }

  if (q.isMedia) {
    return { error: `Tipe media \`${q.mediaType}\` gak didukung buat di-run. Reply teks atau file document aja.` }
  }

  const text = q.text
  if (!text || !text.trim()) return { error: 'Pesan yang di-reply gak ada teks/code-nya.' }
  return { code: text }
}

export default {
  command: 'run',
  alias: ['runcode', 'runfile', 'execfile'],
  category: 'owner',
  description: 'Menjalankan kode JavaScript dari pesan atau document yang di-reply.\n\n' +
    '*Format Penggunaan:*\n' +
    '> `Reply pesan atau document berisi code lalu ketik:`\n> .run',
  help: '`(reply pesan/document)`',
  onlyOwner: true,

  async execute(m, { sock }) {
    const { code: rawCode, error } = await getCodeFromQuoted(m, sock)
    if (error) return m.reply(`❌ ${error}`)

    const code = rawCode.trim()
    if (!code) return m.reply('❌ Code kosong.')

    const { consoleOutput, fakeConsole } = createFakeConsole()

    try {
      const ctx = {
        ...buildEvalContext(m, sock),
        console: fakeConsole,
        require,
        __dirname,
        __filename
      }

      const transformed = transformImports(code)
      let evaled = await executeAsyncCode(transformed, ctx)
      if (evaled instanceof Promise) evaled = await evaled

      const output = formatEvalResult(evaled, consoleOutput)
      return m.reply('```' + output + '```')
    } catch (err) {
      return m.reply(`Error:\n\`\`\`js\n${formatEvalError(err)}\n\`\`\``)
    }
  }
}
