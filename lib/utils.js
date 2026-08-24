// lib/utils.js

import util from 'util'
import path from 'path'
import chalk from 'chalk'
import { parsePhoneJid } from 'zapo-js'
import { config } from '../settings.js'

export function formatBytes(bytes, decimals = 2) {
  if (!bytes) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB']
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}
export function formatDuration(ms) {
  if (typeof ms !== 'number' || ms < 0) return 'Baru saja'
  const units = [[86_400_000, 'hari'], [3_600_000, 'jam'], [60_000, 'menit'], [1000, 'detik']]
  const parts = []
  let rem = Math.floor(ms)
  for (const [unitMs, label] of units) {
    const val = Math.floor(rem / unitMs)
    if (val > 0) { parts.push(`${val} ${label}`); rem %= unitMs }
  }
  return parts.join(', ') || '0 detik'
}

export function formatDate(date, locale = 'id-ID', tz = 'Asia/Jakarta') {
  return date.toLocaleString(locale, { timeZone: tz })
}

export const debounce = (fn, wait) => {
  let timeout
  return (...args) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), wait)
  }
}

export function getCommandAliases(command) {
  const aliases = []
  for (const [key, plugin] of global.plugins ?? []) {
    if (plugin.command === command && key !== command) aliases.push(key)
  }
  return aliases
}

export function extractTargetJid(m, args = []) {
  const mentioned = (m.mentionedJid || []).find(jid => !jid.endsWith('@g.us') && !jid.endsWith('@newsletter'))
  if (mentioned) return mentioned

  if (m.quoted?.sender && !m.quoted.sender.endsWith('@g.us')) return m.quoted.sender

  const raw = args.find(arg => /^@?\d{8,20}$/.test(arg) || /^\d+@(s\.whatsapp\.net|lid)$/.test(arg))
  if (!raw) return null

  const cleaned = raw.replace(/^@/, '')
  return cleaned.includes('@') ? cleaned : parsePhoneJid(cleaned)
}

export function extractFeatureTarget(m, args = []) {
  const featureName = args[0]?.toLowerCase()

  if (!featureName || featureName.startsWith('-')) {
    return { error: `Masukkan nama fitur dan targetnya.\nContoh: \`${m.prefix}${m.command} safelinku 628xxx\`\n\nTarget bisa lewat @mention, reply pesan, atau ketik nomor langsung.` }
  }

  const target = extractTargetJid(m, args.slice(1))
  if (!target) return { error: '❌ Target tidak terdeteksi. Mention, reply pesan dia, atau ketik nomornya langsung.' }

  const plugin = global.plugins?.get(featureName)
  if (!plugin) return { error: `❌ Fitur \`${featureName}\` tidak ditemukan.` }

  return { featureName, target, plugin }
}

const MAX_OUTPUT_LENGTH = 20000
const MAX_ERROR_LENGTH = 3000

export function transformImports(code) {
  let result = code

  result = result.replace(
    /import\s*\*\s*as\s+(\w+)\s+from\s+['"]([^'"]+)['"];?/g,
    `const $1 = await importModule('$2');`
  )

  result = result.replace(
    /import\s+(\w+)\s*,\s*\{([^}]+)\}\s*from\s+['"]([^'"]+)['"];?/g,
    `const { default: $1, $2 } = await importModule('$3');`
  )

  result = result.replace(
    /import\s+(\w+)\s+from\s+['"]([^'"]+)['"];?/g,
    `const $1 = (await importModule('$2')).default;`
  )

  result = result.replace(
    /import\s*\{\s*([^}]+)\s*\}\s*from\s+['"]([^'"]+)['"];?/g,
    `const { $1 } = await importModule('$2');`
  )

  result = result.replace(/^export\s+(default\s+)?/gm, '')
  result = result.replace(/^export\s+\{[^}]*\};?\s*$/gm, '')

  return result
}

export function createFakeConsole() {
  const consoleOutput = []

  const format = (...args) =>
    args
      .map((arg) =>
        typeof arg === 'object' && arg !== null
          ? util.inspect(arg, { depth: 3, colors: false })
          : String(arg)
      )
      .join(' ')

  const fakeConsole = {
    log: (...a) => { consoleOutput.push(format(...a)); console.log(...a) },
    error: (...a) => { consoleOutput.push(format(...a)); console.error(...a) },
    warn: (...a) => { consoleOutput.push(format(...a)); console.warn(...a) }
  }

  return { consoleOutput, fakeConsole }
}

export function formatEvalResult(evaled, consoleOutput) {
  let output = ''
  if (consoleOutput.length > 0) output += `📜 Console:\n${consoleOutput.join('\n')}\n\n`

  if (evaled === undefined) {
    if (consoleOutput.length === 0) output += 'undefined'
  } else if (evaled === null) {
    output += 'null'
  } else if (Buffer.isBuffer(evaled)) {
    output += `<Buffer ${evaled.length} bytes>\n${evaled.slice(0, 200).toString('utf8')}`
  } else if (typeof evaled === 'object' || typeof evaled === 'function') {
    output += util.inspect(evaled, { depth: 4, colors: false })
  } else {
    output += String(evaled)
  }

  if (!output.trim()) output = 'Selesai (No Output)'
  if (output.length > MAX_OUTPUT_LENGTH) output = output.slice(0, MAX_OUTPUT_LENGTH) + '\n... (truncated)'

  return output
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

export function buildQuoteContext(m) {
  return {
    stanzaId: m.id,
    participant: m.sender,
    remoteJid: m.chat,
    quotedMessage: m.raw?.message
  }
}

export function lazy(obj, key, compute) {
  let cached
  let resolved = false
  Object.defineProperty(obj, key, {
    get() {
      if (!resolved) {
        cached = compute.call(obj, obj)
        resolved = true
      }
      return cached
    },
    enumerable: true,
    configurable: true
  })
}

export function isByteArrayLike(value) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const keys = Object.keys(value)
  if (keys.length < 8) return false
  return keys.every((k, i) => k === String(i) && Number.isInteger(value[k]) && value[k] >= 0 && value[k] <= 255)
}

export function trimRawReplacer(key, value) {
  if (isByteArrayLike(value)) {
    return `<Buffer ${Object.keys(value).length} bytes>`
  }
  return value
}

export function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    !Buffer.isBuffer(value) &&
    !(value instanceof Uint8Array)
  )
}

export function isLongLike(value) {
  if (!value || typeof value !== 'object') return false
  if (typeof value.toNumber === 'function') return true
  return typeof value.low === 'number' && typeof value.high === 'number' && typeof value.unsigned === 'boolean'
}

export function cloneStripQuoted(value, depth = 0) {
  if (depth > 40) return undefined

  if (Array.isArray(value)) {
    return value.map((item) => cloneStripQuoted(item, depth + 1))
  }
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    return Buffer.from(value).toString('base64')
  }
  if (isLongLike(value)) {
    return value
  }
  if (value !== null && typeof value === 'object' &&
      (value.type === 'Buffer' || value.__type === 'Buffer') && Array.isArray(value.data)) {
    try { return Buffer.from(value.data).toString('base64') } catch { }
  }

  if (isPlainObject(value)) {
    const out = {}
    for (const [key, val] of Object.entries(value)) {
      if (key === 'contextInfo' && isPlainObject(val)) {
        const { quotedMessage, ...restContext } = val
        out[key] = cloneStripQuoted(restContext, depth + 1)
        continue
      }
      out[key] = cloneStripQuoted(val, depth + 1)
    }
    return out
  }

  return value
}

const MEDIA_BYTE_FIELDS = ['mediaKey', 'fileSha256', 'fileEncSha256']

function looksLikeBase64(value) {
  return value.length > 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(value)
}

export function reviveBase64Fields(value) {
  if (!value || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(reviveBase64Fields)
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) return value
  if (isLongLike(value)) return value
  const out = {}
  for (const [key, val] of Object.entries(value)) {
    out[key] =
      typeof val === 'string' && MEDIA_BYTE_FIELDS.includes(key) && looksLikeBase64(val)
        ? Buffer.from(val, 'base64')
        : reviveBase64Fields(val)
  }
  return out
}

export function detectMediaType(mime) {
  if (!mime) return null
  if (mime.startsWith('image/')) return mime === 'image/webp' ? 'sticker' : 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  if (/pdf|msword|officedocument/.test(mime)) return 'document'
  return 'file'
}

export function parseChannelTarget(value) {
  const text = String(value || '').trim()
  const invite = text.match(/whatsapp\.com\/channel\/([a-zA-Z0-9]+)/i)?.[1] || null
  const jid = text.match(/^\d+@newsletter$/i)?.[0] || null
  return { invite, jid }
}

export const WA_MEDIA_HOST = 'https://mmg.whatsapp.net'

export function waMediaUrl(directPath) {
  if (!directPath) return null
  if (/^https?:\/\//i.test(directPath)) return directPath
  return `${WA_MEDIA_HOST}${directPath.startsWith('/') ? '' : '/'}${directPath}`
}

export function getUrlExpiry(url) {
  try {
    const oe = new URLSearchParams(String(url).split('?')[1]).get('oe')
    return oe ? new Date(parseInt(oe, 16) * 1000) : null
  } catch {
    return null
  }
}

export async function getMediaAgeMs(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' })
    const lastModified = res.headers.get('last-modified')
    if (!lastModified) return null
    return Date.now() - new Date(lastModified).getTime()
  } catch {
    return null
  }
}

function extractErrorDetail(error) {
  let detail

  if (Array.isArray(error)) {
    detail = error.map((e) => String(e)).join('\n')
  } else {
    detail = error?.stack || error?.message || String(error || 'Unknown Error')
  }

  return detail.length > MAX_ERROR_LENGTH ? `${detail.slice(0, MAX_ERROR_LENGTH)}\n... (terpotong)` : detail
}

function extractErrorLocation(error) {
  const stack = error?.stack
  if (typeof stack !== 'string') return null

  const match = stack
    .split('\n')
    .slice(1)
    .map((line) => line.match(/\(?((?:file:\/\/)?\/[^\s():]+):(\d+):(\d+)\)?/))
    .filter(Boolean)
    .find(([, filePath]) => !filePath.includes('node_modules'))

  if (!match) return null

  const [, rawPath, lineNo, colNo] = match
  const cleanPath = rawPath.replace('file://', '').split('?')[0]
  const relativePath = path.relative(process.cwd(), cleanPath) || cleanPath

  return `${relativePath}:${lineNo}:${colNo}`
}

export async function sendErrorToOwner(sock, error, m, commandName = 'tidak diketahui') {
  const ownerJid = config.jidGroup
  const senderJid = m?.sender || 'unknown'
  const senderNumber = senderJid.split('@')[0]
  const senderName = m?.pushName || 'Unknown'
  const chatType = m?.isGroup ? `Grup: ${m.groupName || m.chat}` : 'Private Chat'
  const isiPesan = m?.text || m?.body || '[Tidak ada teks/media]'
  const errorDetail = extractErrorDetail(error)
  const errorLocation = extractErrorLocation(error)

  console.error(chalk.bgRed.white(' ERROR '), chalk.red(`command=.${commandName} chat=${m?.chat || '-'} sender=${senderJid}`))
  if (errorLocation) console.error(chalk.yellow('Lokasi   :'), chalk.white(errorLocation))
  console.error(chalk.red(error?.stack || error?.message || String(error)))

  const reportToOwner = `⚠️ *REPORT ERROR FITUR* ⚠️

👤 *Pengirim:* ${senderName} (@${senderNumber})
📂 *Lokasi Chat:* ${chatType}
🛠️ *Fitur:* ${commandName}
💬 *Isi Pesan:* "${isiPesan}"
${errorLocation ? `📁 *Lokasi File:* ${errorLocation}\n` : ''}
❌ *Error Detail:*
\`\`\`${errorDetail}\`\`\``

  const errorMsgToUser = `${config.pesan.error || 'Terjadi kesalahan'}\n\n❌ *Masalah:* \`${error?.message || 'Internal Error'}\`\n\nLaporan otomatis telah dikirim ke owner.`

  if (m?.reply) {
    try {
      await m.reply(errorMsgToUser)
    } catch (replyErr) {
      console.error(chalk.red('[REPLY ERROR] Gagal kirim pesan error ke user:'), replyErr?.message || replyErr)
    }
  }

  if (!ownerJid) return

  try {
    await sock.message.send(ownerJid, reportToOwner, {
      mentions: [parsePhoneJid(config.owner), senderJid].filter(Boolean)
    })
    console.log(chalk.bgRed.black(' ERROR REPORTED & OWNER NOTIFIED '))
  } catch (sendErr) {
    console.error(chalk.red('Gagal kirim laporan error ke owner:'), sendErr?.message || sendErr)
  }
}
