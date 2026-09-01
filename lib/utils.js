// lib/utils.js

import { parsePhoneJid } from 'zapo-js'
import { confirmParticipantAction } from '../db/groupCache.js'

const JID_RE = /^\d+@(s\.whatsapp\.net|lid)$/

function isJid(value) {
  return JID_RE.test(String(value || ''))
}

function isValidTargetJid(jid) {
  const value = String(jid || '')
  return !!value && !value.endsWith('@g.us') && !value.endsWith('@newsletter')
}

function normalizeTarget(value) {
  const target = String(value || '').trim().replace(/^@/, '')
  if (!target) return null
  if (isJid(target)) return target
  if (/^\d+$/.test(target)) return parsePhoneJid(target)
  return null
}

export function extractTarget(m, args = [], { multiple = false, requireFeature = false } = {}) {
  const targets = new Set()
  let featureName
  let plugin
  const mentionedNumbers = new Set((m.mentionedJid || []).map(jid => String(jid).split('@')[0]))

  const quoted = normalizeTarget(m.quoted?.sender)
  if (quoted && isValidTargetJid(quoted)) targets.add(quoted)
  for (const mentioned of m.mentionedJid || []) {
    const target = normalizeTarget(mentioned)
    if (target && isValidTargetJid(target)) targets.add(target)
  }

  if (requireFeature) {
    featureName = args[0]?.toLowerCase()
    if (!featureName || featureName.startsWith('-')) {
      return { error: `Masukkan nama fitur dan targetnya.\nContoh: \`${m.prefix}${m.command} safelinku 628xxx\`\n\nTarget bisa lewat @mention, reply pesan, atau ketik nomor langsung.` }
    }
    plugin = global.plugins?.get(featureName)
    if (!plugin) return { error: `❌ Fitur \`${featureName}\` tidak ditemukan.` }
  }

  const startIdx = requireFeature ? 1 : 0
  args.slice(startIdx).join(' ').trim().split(/[\s,]+/).filter(Boolean).forEach(part => {
    if (part.startsWith('@') && mentionedNumbers.has(part.slice(1))) return
    const target = normalizeTarget(part)
    if (target && isValidTargetJid(target)) targets.add(target)
  })

  const result = [...targets]
  if (requireFeature) return { featureName, target: result[0] ?? null, plugin }
  if (multiple) return result
  return result[0] ?? null
}

export function formatBytes(bytes, decimals = 2) {
  if (!Number.isFinite(bytes) || bytes === 0) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB']
  const i = Math.min(Math.floor(Math.log(Math.abs(bytes)) / Math.log(k)), sizes.length - 1)
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

const PARTICIPANT_ACTION_STATUS = {
  403: 'Tidak diizinkan atau dibatasi pengaturan privasi.',
  404: 'Nomor tidak ditemukan atau sudah tidak tersedia.',
  408: 'Aksi tidak diizinkan untuk anggota ini.',
  409: 'Status anggota tidak sesuai dengan aksi yang diminta.',
  500: 'Server WhatsApp sedang bermasalah, coba lagi nanti.'
}

const PARTICIPANT_ACTION_CONFLICTS = {
  add: 'Anggota sudah berada di grup.',
  remove: 'Anggota sudah tidak berada di grup.',
  promote: 'Anggota sudah menjadi admin.',
  demote: 'Anggota bukan admin grup.'
}

export function getParticipantActionStatus(code, action) {
  if (code === 409 && PARTICIPANT_ACTION_CONFLICTS[action]) {
    return PARTICIPANT_ACTION_CONFLICTS[action]
  }
  return PARTICIPANT_ACTION_STATUS[code] || 'Gagal memproses aksi untuk anggota ini.'
}

export function formatActionResults(results, successTitle, failureTitle, action, { mention = false } = {}) {
  const display = (jid) => mention ? `@${String(jid).split('@')[0]}` : jid
  const success = results.filter(({ status }) => status === 'ok').map(({ jid }) => display(jid))
  const failed = results
    .filter(({ status }) => status !== 'ok')
    .map(({ jid, code }) => `${display(jid)}: ${getParticipantActionStatus(code, action)}`)
  const section = (title, values) => values.length
    ? `${title} ${values.length}\n${values.map(value => `• ${value}`).join('\n')}`
    : ''
  return [section(successTitle, success), section(failureTitle, failed)].filter(Boolean).join('\n\n')
}

export function formatTargetUsage(m) {
  return `Format Salah!\nContoh pakai:\n> ${m.prefix}${m.command} @mention\n\natau reply:\n> ${m.prefix}${m.command}`
}

export async function executeParticipantAction(m, { sock }, options) {
  const targets = options.targets ?? extractTarget(m, options.args ?? [], { multiple: true })
  if (!targets.length) return m.reply(formatTargetUsage(m))

  let results
  try {
    results = await sock.group[options.method](m.chat, targets)
  } catch (err) {
    const isIq500 = /\(500:\s*internal-server-error\)/i.test(err?.message || '')
    const confirmed = isIq500 && await confirmParticipantAction(m.chat, sock, targets, options.action).catch(() => false)
    if (!confirmed) throw err

    const text = `${options.successTitle} ${targets.length}\n${targets.map(target => `• @${target.split('@')[0]}`).join('\n')}`
    return m.reply(m.chat, text, { mentions: targets })
  }

  const text = formatActionResults(results, options.successTitle, options.failureTitle, options.action, { mention: true })
  return m.reply(m.chat, text, {
    mentions: [...new Set(results.map(result => result.jid).filter(Boolean))]
  })
}

export function getCommandAliases(command) {
  const aliases = []
  for (const [key, plugin] of global.plugins ?? []) {
    if (plugin.command === command && key !== command) aliases.push(key)
  }
  return aliases
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

function isByteArrayLike(value) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const keys = Object.keys(value)
  if (keys.length < 8) return false
  return keys.every((k, i) => k === String(i) && Number.isInteger(value[k]) && value[k] >= 0 && value[k] <= 255)
}

export function trimRawReplacer(key, value) {
  if (isByteArrayLike(value)) {
    return `<Buffer ${Object.keys(value).length} bytes>`
  }
  if (isLongLike(value)) {
    if (typeof value.toNumber === 'function') return value.toNumber()
    return value.low + value.high * 4294967296
  }
  return value
}

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    !Buffer.isBuffer(value) &&
    !(value instanceof Uint8Array)
  )
}

function isLongLike(value) {
  if (!value || typeof value !== 'object') return false
  if (typeof value.toNumber === 'function') return true
  return typeof value.low === 'number' && typeof value.high === 'number' && typeof value.unsigned === 'boolean'
}

export function cloneStripQuoted(value, depth = 0) {
  if (depth > 20) return undefined

  if (Array.isArray(value)) {
    const len = value.length
    const out = new Array(len)
    for (let i = 0; i < len; i++) out[i] = cloneStripQuoted(value[i], depth + 1)
    return out
  }
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    return Buffer.from(value).toString('base64')
  }
  if (isLongLike(value)) {
    return typeof value.toNumber === 'function' ? value.toNumber() : value.low + value.high * 4294967296
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
  if (Array.isArray(value)) {
    const len = value.length
    const out = new Array(len)
    for (let i = 0; i < len; i++) out[i] = reviveBase64Fields(value[i])
    return out
  }
  if (Buffer.isBuffer(value) || value instanceof Uint8Array || isLongLike(value)) return value
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

const WA_MEDIA_HOST = 'https://mmg.whatsapp.net'

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

let locked = false

export function isLocked() {
  return locked
}

export function setLocked(value) {
  locked = value
  return locked
}
