// handler.js

import chalk from 'chalk'
import util from 'util'
import { createRequire } from 'module'
import { isLidJid, getContentType, parsePhoneJid } from 'zapo-js'
import { config } from './settings.js'
import { getContactByJid } from './db/contacts.js'
import { getDeviceIdByMsgId, getRawMessageById } from './db/rawMessage.js'
import {
  getGroupMetadata,
  getCachedGroupMetadata,
  isAdminInGroup,
  isSuperAdminInGroup
} from './db/groupCache.js'
import {
  lazy,
  trimRawReplacer,
  cloneStripQuoted,
  detectMediaType
} from './lib/utils.js'

const require = createRequire(import.meta.url)

const IGNORED_NODE_TAGS = ['enc', 'reporting', 'verified_name']
const OWNER_NUMBER = config.owner.replace(/[^0-9]/g, '')

const SPECIAL_TEXT_EXTRACTORS = {
  interactiveResponseMessage(msgContent, fallback) {
    try {
      const params = JSON.parse(msgContent?.nativeFlowResponseMessage?.paramsJson || '{}')
      return params?.id || params?.selected_id || fallback
    } catch {
      return msgContent?.nativeFlowResponseMessage?.name || fallback
    }
  },
  templateButtonReplyMessage(msgContent, fallback) {
    return msgContent?.selectedId || msgContent?.selectedDisplayText || fallback
  },
  buttonsResponseMessage(msgContent, fallback) {
    return msgContent?.selectedButtonId || fallback
  },
  listResponseMessage(msgContent, fallback) {
    return msgContent?.singleSelectReply?.selectedRowId || fallback
  }
}

export function normalizeJid(jid) {
  if (!jid) return jid
  const cleaned = jid.split('/')[0].split(':')[0]
  return cleaned.includes('@') ? cleaned : `${cleaned}@s.whatsapp.net`
}

function extractPhoneNumber(jid) {
  if (!jid || isLidJid(jid)) return null
  return jid.split('@')[0] || null
}

function getRealSender(key) {
  if (key?.participantAlt) return normalizeJid(key.participantAlt)
  if (key?.participant) return normalizeJid(key.participant)
  return normalizeJid(key?.remoteJid)
}

export function extractIdentityPair(key) {
  const primary = normalizeJid(key?.participant ?? key?.remoteJid)
  const alt = normalizeJid(key?.participantAlt ?? key?.remoteJidAlt)

  if (!primary || !alt) return { lidJid: null, pnJid: null }

  const primaryIsLid = isLidJid(primary)
  return {
    lidJid: primaryIsLid ? primary : alt,
    pnJid: primaryIsLid ? alt : primary
  }
}

function buildContact(jid, fallbackPushName) {
  const row = getContactByJid(jid)

  if (!row) {
    return {
      pushName: fallbackPushName || 'Unknown',
      jid,
      lid: isLidJid(jid) ? jid : null,
      phoneNumber: extractPhoneNumber(jid),
      lastUpdatedMs: null,
      isSaved: false
    }
  }

  return {
    pushName: row.push_name || fallbackPushName || 'Unknown',
    jid: row.pn_jid || jid,
    lid: row.lid_jid ?? null,
    phoneNumber: extractPhoneNumber(row.pn_jid),
    lastUpdatedMs: row.updated_at ? row.updated_at * 1000 : null,
    isSaved: true
  }
}

function attachContactGetters(target, jidGetter, fallbackPushName) {
  lazy(target, 'contact', (self) => buildContact(jidGetter(self), fallbackPushName))
  Object.defineProperty(target, 'pushName', {
    get() { return this.contact.pushName },
    enumerable: true,
    configurable: true
  })
}

export function extractCommand(text) {
  if (!text) return { prefix: '', command: '' }

  const matchedPrefix = config.prefixes.find((p) => text.startsWith(p))

  if (matchedPrefix) {
    const command = text.slice(matchedPrefix.length).trim().split(/\s+/)[0]?.toLowerCase() || ''
    return { prefix: matchedPrefix, command }
  }

  if (config.noprefix) {
    const command = text.trim().split(/\s+/)[0]?.toLowerCase() || ''
    return { prefix: '', command }
  }

  return { prefix: '', command: '' }
}

function serializeQuoted(context, chatJid, isGroup, sock) {
  if (!context?.quotedMessage) return null

  const qMsg = context.quotedMessage
  const qType = getContentType(qMsg)
  const rawContent = qMsg[qType]

  const quoted = {
    key: {
      id: context.stanzaId ?? null,
      remoteJid: context.remoteJid ?? null,
      participant: normalizeJid(context.participant) ?? null,
      fromMe: false
    },
    sender: normalizeJid(context.participant),
    type: qType
  }

  Object.defineProperties(quoted, {
    text: {
      get() { return rawContent?.text ?? rawContent?.caption ?? qMsg.conversation ?? null },
      enumerable: true, configurable: true
    },
    mime: {
      get() { return rawContent?.mimetype || '' },
      enumerable: true, configurable: true
    },
    isMedia: {
      get() { return !!this.mime },
      enumerable: true, configurable: true
    },
    mediaType: {
      get() { return detectMediaType(this.mime) },
      enumerable: true, configurable: true
    },
    caption: {
      get() { return rawContent?.caption ?? null },
      enumerable: true, configurable: true
    },
    full: {
      get() { return { [this.type]: cloneStripQuoted(rawContent) } },
      enumerable: true, configurable: true
    },
    json: {
      get() { return JSON.stringify(this.full, trimRawReplacer, 2) },
      enumerable: true, configurable: true
    },
    mentionJid: {
      get() { return context?.mentionedJid || [] },
      enumerable: true, configurable: true
    }
  })

  attachContactGetters(quoted, (self) => self.sender, null)
  lazy(quoted, 'deviceId', () => getDeviceIdByMsgId(context.stanzaId))
  lazy(quoted, 'nodes', () => getRawMessageById(context.stanzaId)?.nodes ?? null)

  if (isGroup) {
    Object.defineProperty(quoted, 'isAdmin', {
      get() { return isAdminInGroup(chatJid, this.sender) },
      enumerable: true, configurable: true
    })
  }

  quoted.download = async () => sock.message.downloadBytes(quoted.full)
  quoted.toJSON = function () { return JSON.parse(JSON.stringify(this.full, trimRawReplacer)) }

  return quoted
}

export function serializeMessage(event, sock) {
  if (!event?.message) return null

  const messageType = getContentType(event.message)
  if (!messageType) return null

  const msgContent = event.message[messageType]
  const sender = getRealSender(event.key)
  const senderNumber = sender.split('@')[0]
  const isOwner = senderNumber === OWNER_NUMBER || event.key?.fromMe === true

  let text =
    event.message.conversation ??
    event.message.extendedTextMessage?.text ??
    msgContent?.caption ??
    null

  const extractSpecialText = SPECIAL_TEXT_EXTRACTORS[messageType]
  if (extractSpecialText) text = extractSpecialText(msgContent, text)

  const mime = msgContent?.mimetype || ''
  const context = event.message.extendedTextMessage?.contextInfo ?? msgContent?.contextInfo
  const { prefix, command } = extractCommand(text)

  const m = {
    raw: event,
    id: event.key?.id ?? null,
    chat: event.key?.remoteJid ?? null,
    sender,
    deviceId: event.key?.senderDevice ?? 0,
    isGroup: event.key?.isGroup ?? false,
    isBroadcast: event.key?.isBroadcast ?? false,
    isNewsletter: event.key?.isNewsletter ?? false,
    isOwner,
    isFromMe: event.key?.fromMe ?? false,

    type: messageType,
    text,
    body: text,
    isMedia: !!mime,
    mediaType: detectMediaType(mime),
    caption: msgContent?.caption ?? null,

    prefix,
    command,

    mentionedJid: context?.mentionedJid || []
  }

  attachContactGetters(m, (self) => self.sender, event.pushName || null)
  lazy(m, 'quoted', () => serializeQuoted(context, m.chat, m.isGroup, sock))
  lazy(m, 'nodes', () => {
    const rawNodes = event.rawNode?.content || []
    const filtered = rawNodes.filter((node) => !IGNORED_NODE_TAGS.includes(node?.tag))
    return filtered.length ? filtered : null
  })

  m.groupMetadata = (jid = m.chat) => getGroupMetadata(jid, sock)

  if (m.isGroup) {
    if (!getCachedGroupMetadata(m.chat)) {
      getGroupMetadata(m.chat, sock).catch(() => { })
    }

    Object.defineProperties(m, {
      groupMetadataCached: {
        get() { return getCachedGroupMetadata(this.chat) },
        enumerable: true, configurable: true
      },
      groupName: {
        get() { return this.groupMetadataCached?.subject || 'Grup Tanpa Nama' },
        enumerable: true, configurable: true
      },
      participants: {
        get() { return this.groupMetadataCached?.participants || [] },
        enumerable: true, configurable: true
      },
      isAdmin: {
        get() { return isAdminInGroup(this.chat, this.sender) },
        enumerable: true, configurable: true
      },
      isBotAdmin: {
        get() { return isAdminInGroup(this.chat, normalizeJid(sock.user?.id)) },
        enumerable: true, configurable: true
      },
      isOwnerGroup: {
        get() { return isSuperAdminInGroup(this.chat, this.sender) },
        enumerable: true, configurable: true
      }
    })
  }

  m.reply = (...args) => {
    let targetJid = m.chat
    let content
    let options = {}

    if (args.length <= 1) {
      content = args[0]
    } else {
      targetJid = args[0] || m.chat
      content = args[1]
      options = args[2] || {}
    }

    let payload = content

    if (typeof content === 'string') {
      const trimmed = content.trim()
      const looksLikeJson =
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))

      if (looksLikeJson) {
        try {
          const parsed = JSON.parse(trimmed)
          if (parsed && typeof parsed === 'object') payload = parsed
        } catch {
        }
      }
    }

    const mentionSource = typeof payload === 'string' ? payload : ''
    const autoMentions = [...mentionSource.matchAll(/@(\d{5,16})/g)].map((match) => parsePhoneJid(match[1]))
    const mentions = options.mentions ? [...options.mentions, ...autoMentions] : autoMentions

    return sock.message.send(targetJid, payload, {
      quote: m.raw,
      ...(mentions.length ? { mentions } : {}),
      ...options
    })
  }

  return m
}

function formatTs(unixSeconds) {
  if (!unixSeconds) return '-'
  return new Date(unixSeconds * 1000).toLocaleString('id-ID')
}

export function logPesanMasuk(m, contactResult) {
  const divider = chalk.gray('────────────────────────────────────────────────────')
  const lines = [divider]

  lines.push(`${chalk.cyan('Username        :')} ${chalk.white(m.pushName || '~HUMAN~')}`)
  lines.push(`${chalk.cyan('📱 Nomor        :')} ${chalk.white(m.sender)}`)

  if (m.isGroup) {
    lines.push(`${chalk.cyan('🗂️  Dari         :')} ${chalk.green(`Grup: ${m.groupName}`)}`)
    lines.push(`${chalk.gray('└─ JID Grup     :')} ${chalk.gray(m.chat)}`)

    if (m.isOwnerGroup) {
      lines.push(`${chalk.gray('└─ Role Grup    :')} ${chalk.red('Super Admin')}`)
    } else if (m.isAdmin) {
      lines.push(`${chalk.gray('└─ Role Grup    :')} ${chalk.yellow('Admin')}`)
    }
  } else {
    lines.push(`${chalk.cyan('🗂️  Dari         :')} ${chalk.green('Private Chat')}`)
  }

  if (m.isOwner) {
    lines.push(`${chalk.cyan('👑 Role         :')} ${chalk.yellow('Owner')}`)
  }

  if (contactResult?.created || contactResult?.updated) {
    const lastUpdatedSeconds = m.contact.lastUpdatedMs ? Math.floor(m.contact.lastUpdatedMs / 1000) : null
    lines.push(`${chalk.cyan('Kontak          :')} ${chalk.gray(`${contactResult.created ? 'baru disimpan' : 'nama diupdate'}, update terakhir ${formatTs(lastUpdatedSeconds)}`)}`)
  }

  if (m.quoted) {
    lines.push(chalk.yellow('─── Balasan ke:'))
    lines.push(`${chalk.gray('├─ Pengirim     :')} ${chalk.white(m.quoted.pushName)}`)

    if (m.isGroup && m.quoted.isAdmin) {
      lines.push(`${chalk.gray('├─ Role Grup    :')} ${chalk.yellow('Admin')}`)
    }

    if (m.quoted.isMedia) {
      lines.push(`${chalk.gray('└─ Media        :')} ${chalk.yellow(`[${m.quoted.mediaType}]`)}`)
    } else {
      lines.push(`${chalk.gray('└─ Isi          :')} ${chalk.gray(m.quoted.text || '[tanpa teks]')}`)
    }
  }

  if (m.isMedia) {
    lines.push(`${chalk.cyan('🖼️  Media        :')} ${chalk.yellow(`[${m.mediaType}]`)}`)
    if (m.caption) lines.push(`${chalk.cyan('Caption         :')} ${chalk.white(m.caption)}`)
  } else {
    lines.push(`${chalk.cyan('💬 Isi Pesan    :')} ${chalk.whiteBright(m.text ?? `[${m.type}]`)}`)
  }

  lines.push(divider)

  console.log(lines.join('\n'))
}

export function logRawDebug(event) {
  console.log('[RAW]', JSON.stringify(event, trimRawReplacer, 2))
}

export function buildEvalContext(m, sock) {
  return {
    m,
    sock,
    quoted: m.quoted,
    q: m.quoted,
    jid: m.chat,
    from: m.chat,
    sender: m.sender,
    me: sock?.user?.id || sock?.user?.jid || null,
    process,
    Buffer,
    require,
    importModule: (spec) => import(spec),
    util,
    config
  }
}