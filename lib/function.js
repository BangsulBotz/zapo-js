import util from 'util'
import path from 'path'
import chalk from 'chalk'
import { parsePhoneJid } from 'zapo-js'
import { config } from '../settings.js'

const MAX_OUTPUT_LENGTH = 20000
const MAX_ERROR_LENGTH = 3000

function formatEvalObject(value) {
  return util.inspect(value, {
    colors: false,
    depth: 4,
    getters: false,
    compact: false,
    maxArrayLength: 100,
    maxStringLength: 2000
  })
}

export function transformImports(code) {
  let result = code

  result = result.replace(/import\s*\*\s*as\s+(\w+)\s+from\s+['"]([^'"]+)['"];?/g, `const $1 = await importModule('$2');`)
  result = result.replace(/import\s+(\w+)\s*,\s*\{([^}]+)\}\s*from\s+['"]([^'"]+)['"];?/g, `const { default: $1, $2 } = await importModule('$3');`)
  result = result.replace(/import\s+(\w+)\s+from\s+['"]([^'"]+)['"];?/g, `const $1 = (await importModule('$2')).default;`)
  result = result.replace(/import\s*\{\s*([^}]+)\s*\}\s*from\s+['"]([^'"]+)['"];?/g, `const { $1 } = await importModule('$2');`)
  result = result.replace(/^export\s+(default\s+)?/gm, '')
  result = result.replace(/^export\s+\{[^}]*\};?\s*$/gm, '')

  return result
}

export function createFakeConsole() {
  const consoleOutput = []
  const format = (...args) => args.map((arg) =>
    typeof arg === 'object' && arg !== null
      ? util.inspect(arg, { depth: 3, colors: false })
      : String(arg)
  ).join(' ')
  const write = (method, args) => {
    consoleOutput.push(format(...args))
    console[method](...args)
  }
  return {
    consoleOutput,
    fakeConsole: {
      log: (...args) => write('log', args),
      error: (...args) => write('error', args),
      warn: (...args) => write('warn', args)
    }
  }
}

export function formatEvalResult(evaled, consoleOutput) {
  let output = ''
  if (consoleOutput.length > 0) output += `📜 Console:\n${consoleOutput.join('\n')}\n\n`
  if (evaled === undefined) {
    if (consoleOutput.length === 0) output += 'undefined'
  } else if (evaled === null) output += 'null'
  else if (Buffer.isBuffer(evaled)) output += `<Buffer ${evaled.length} bytes>\n${evaled.slice(0, 200).toString('utf8')}`
  else if (typeof evaled === 'object') output += formatEvalObject(evaled)
  else if (typeof evaled === 'function') output += util.inspect(evaled, { depth: 4, colors: false })
  else output += String(evaled)
  if (!output.trim()) output = 'Selesai (No Output)'
  return output.length > MAX_OUTPUT_LENGTH ? output.slice(0, MAX_OUTPUT_LENGTH) + '\n... (truncated)' : output
}

export function formatEvalError(err) {
  let errText = err?.stack || err?.message || String(err)
  if (errText.length > MAX_ERROR_LENGTH) errText = errText.slice(0, MAX_ERROR_LENGTH) + '\n... (truncated)'
  return errText
}

export async function executeAsyncCode(code, context) {
  const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor
  const names = Object.keys(context)
  const values = Object.values(context)
  let fn
  try {
    fn = new AsyncFunction(...names, `return (\n${code}\n)`)
  } catch {
    fn = new AsyncFunction(...names, code)
  }
  return fn(...values)
}

function extractErrorDetail(error) {
  const detail = Array.isArray(error)
    ? error.map((e) => String(e)).join('\n')
    : error?.stack || error?.message || String(error || 'Unknown Error')
  return detail.length > MAX_ERROR_LENGTH ? `${detail.slice(0, MAX_ERROR_LENGTH)}\n... (terpotong)` : detail
}

function extractErrorLocation(error) {
  const stack = error?.stack
  if (typeof stack !== 'string') return null
  const match = stack.split('\n').slice(1)
    .map((line) => line.match(/\(?((?:file:\/\/)?\/[^\s():]+):(\d+):(\d+)\)?/))
    .find(([, filePath]) => !filePath.includes('node_modules'))
  if (!match) return null
  const [, rawPath, lineNo, colNo] = match
  const cleanPath = rawPath.replace('file://', '').split('?')[0]
  return `${path.relative(process.cwd(), cleanPath) || cleanPath}:${lineNo}:${colNo}`
}

export async function sendErrorToOwner(sock, error, m, commandName = 'tidak diketahui') {
  const ownerJid = config.jidGroup
  const senderJid = m?.sender || 'unknown'
  const errorLocation = extractErrorLocation(error)
  const errorDetail = extractErrorDetail(error)
  const reportToOwner = `⚠️ *REPORT ERROR FITUR* ⚠️\n\n` +
    `👤 *Pengirim:* ${m?.pushName || 'Unknown'} (@${senderJid.split('@')[0]})\n` +
    `📂 *Lokasi Chat:* ${m?.isGroup ? `Grup: ${m.groupName || m.chat}` : 'Private Chat'}\n` +
    `🛠️ *Fitur:* ${commandName}\n` +
    `💬 *Isi Pesan:* "${m?.text || m?.body || '[Tidak ada teks/media]'}"\n` +
    `${errorLocation ? `📁 *Lokasi File:* ${errorLocation}\n` : ''}` +
    `❌ *Error Detail:*\n\`\`\`${errorDetail}\`\`\``

  console.error(chalk.bgRed.white(' ERROR '), chalk.red(`command=.${commandName} chat=${m?.chat || '-'} sender=${senderJid}`))
  if (errorLocation) console.error(chalk.yellow('Lokasi   :'), errorLocation)
  console.error(error?.stack || error?.message || String(error))

  await Promise.resolve(m?.reply?.(`${config.pesan.error || 'Terjadi kesalahan'}\n\n❌ *Masalah:* \`${error?.message || 'Internal Error'}\`\n\nLaporan otomatis telah dikirim ke owner.`)).catch(() => {})
  if (!ownerJid) return
  await sock.message.send(ownerJid, reportToOwner, {
    mentions: [parsePhoneJid(config.owner), senderJid].filter(Boolean)
  }).then(() => console.log(chalk.bgRed.black(' ERROR REPORTED & OWNER NOTIFIED '))).catch((sendErr) => {
    console.error(chalk.red('Gagal kirim laporan error ke owner:'), sendErr?.message || sendErr)
  })
}
