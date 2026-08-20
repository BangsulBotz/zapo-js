// plugins/owner/run.js

import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { buildEvalContext } from '../../handler.js'
import { transformImports, createFakeConsole, formatEvalResult, formatEvalError } from '../../lib/utils.js'

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
  category:'owner',
  description: `Jalankan kode JavaScript dari *pesan* atau *file document* yang di-reply (owner only).

\`Cara Penggunaan:\`
> reply pesan/document berisi code, lalu ketik: \`.run\``,
  help: '`(reply pesan/document)` lalu ketik `.run`',
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

      const header = `
        const { m, sock, quoted, q, jid, from, sender, me, console, process, Buffer, require, importModule, __dirname, __filename, util, config } = ctx;
      `

      let fn
      try {
        fn = new Function('ctx', `${header}\nreturn (async () => { return (\n${transformed}\n) })();`)
      } catch (buildErr) {
        if (!(buildErr instanceof SyntaxError)) throw buildErr
        fn = new Function('ctx', `${header}\nreturn (async () => {\n${transformed}\n})();`)
      }

      let evaled = await fn(ctx)
      if (evaled instanceof Promise) evaled = await evaled

      const output = formatEvalResult(evaled, consoleOutput)
      return m.reply('```' + output + '```')
    } catch (err) {
      return m.reply(`Error:\n\`\`\`js\n${formatEvalError(err)}\n\`\`\``)
    }
  }
}