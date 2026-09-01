// src/messageHandler.js

import chalk from 'chalk'
import path from 'path'
import { fileURLToPath } from 'url'
import { getContentType } from 'zapo-js'
import {
  serializeMessage,
  logPesanMasuk,
  logRawDebug,
  extractIdentityPair,
  normalizeJid,
  extractCommand
} from '../handler.js'
import { detectMediaType, isLocked } from '../lib/utils.js'
import { getBotSettingValue, isGroupSelf, isSilentLog } from '../lib/groupAndBot.js'
import { enforceGroupPolicies } from '../lib/groupDetection.js'
import { loadPlugins } from '../lib/loadPlugins.js'
import { sendErrorToOwner } from '../lib/function.js'
import { config } from '../settings.js'
import { saveRawMessage } from '../db/rawMessage.js'
import { saveOrUpdateContact } from '../db/contacts.js'
import { isTrustedFeature } from '../db/group.js'
import { getGroupMetadata, getCachedGroupMetadata } from '../db/groupCache.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PLUGINS_DIR = path.join(__dirname, '..', 'plugins')

const TYPING_REFRESH = 8_000
const PROCESS_STARTED_AT = Math.floor(Date.now() / 1000)

const handledCommandIds = new Set()
const MAX_HANDLED_COMMANDS = 4096

function claimCommand(id) {
  if (!id || handledCommandIds.has(id)) return false
  handledCommandIds.add(id)
  if (handledCommandIds.size > MAX_HANDLED_COMMANDS) {
    handledCommandIds.delete(handledCommandIds.values().next().value)
  }
  return true
}

function isHistoricalMessage(m) {
  const offline = m.raw?.offline === true ||
    m.raw?.offline === '1' ||
    m.raw?.rawNode?.attrs?.offline === '1'
  if (offline) return true

  const timestamp = Number(m.raw?.messageTimestamp)
  return Number.isFinite(timestamp) && timestamp > 0 && timestamp < PROCESS_STARTED_AT
}

function extractArgs(m) {
  if (!m.command) return []
  const stripped = m.text.slice(m.prefix.length + m.command.length).trim()
  return stripped ? stripped.split(/\s+/) : []
}

function serializeOutgoing(sendEvent, sock) {
  if (!sendEvent?.id || !sendEvent?.to) return null

  const messageType = getContentType(sendEvent.message)
  if (!messageType) return null

  const content = sendEvent.message[messageType]

  const text =
    sendEvent.message.conversation ??
    content?.text ??
    content?.caption ??
    null

  const mime = content?.mimetype || ''
  const creds = sock.getCredentials?.()
  const senderJid = normalizeJid(creds?.meJid)
  const { prefix, command } = extractCommand(text)

  return {
    raw: sendEvent,
    id: sendEvent.id,
    chat: sendEvent.to,
    sender: senderJid,
    pushName: creds?.pushName || 'Bot',
    isGroup: sendEvent.to?.endsWith('@g.us') ?? false,
    isFromMe: true,
    type: messageType,
    prefix,
    command,
    text,
    isMedia: !!mime,
    mediaType: detectMediaType(mime)
  }
}

async function processCommand(m, sock) {
  if (!m.command) return

  const plugin = global.plugins?.get(m.command)
  if (!plugin) return

  const trusted = m.isGroup && (isTrustedFeature(m.chat, plugin.command) || isTrustedFeature(m.sender, plugin.command))

  const selfMode = getBotSettingValue('self') || (m.isGroup && isGroupSelf(m.chat))
  if (selfMode && !m.isOwner && !trusted) return
  if (isLocked() && plugin.command !== 'lock') return

  const isGroupOnly = plugin.groupOnly || plugin.onlyGroup
  const isAdminOnly = plugin.adminOnly || plugin.onlyAdmin
  const isBotAdminOnly = plugin.botAdminOnly || plugin.onlyBotAdmin

  if (m.isGroup && (isAdminOnly || isBotAdminOnly) && !getCachedGroupMetadata(m.chat)) {
    await getGroupMetadata(m.chat, sock).catch(() => null)
  }

  if (isGroupOnly && !m.isGroup) return m.reply(config.pesan.groupOnly)

  if (!m.isOwner && !trusted) {
    const isOwnerOnly = plugin.ownerOnly || plugin.onlyOwner
    const isPrivateOnly = plugin.privateOnly || plugin.onlyPrivate

    if (isOwnerOnly && !m.isOwner) return m.reply(config.pesan.ownerOnly)
    if (isPrivateOnly && m.isGroup) return m.reply(config.pesan.privateOnly)
    if (isAdminOnly && !m.isGroup) return m.reply(config.pesan.groupOnly)
    if (isAdminOnly && !m.isAdmin) return m.reply(config.pesan.adminOnly)
    if (isBotAdminOnly && !m.isBotAdmin) return m.reply(config.pesan.botAdmin)
  }

  const args = extractArgs(m)
  m.args = args

  console.log(chalk.magenta(`[CMD] -> .${m.command} ${args.join(' ')}`.trim()))

  if (plugin.wait) {
    await sock.message.send(m.chat, config.pesan.wait, { quote: m.raw })
  }

  const context = { sock, args, plugins: global.plugins }

  let typingInterval = null

  if (plugin.typing) {
    await sock.presence.sendChatstate(m.chat, { state: 'composing' }).catch(() => { })
    typingInterval = setInterval(() => {
      sock.presence.sendChatstate(m.chat, { state: 'composing' }).catch(() => { })
    }, TYPING_REFRESH)
  }

  try {
    await plugin.execute(m, context)
  } finally {
    if (typingInterval) {
      clearInterval(typingInterval)
      typingInterval = null
      await sock.presence.sendChatstate(m.chat, { state: 'paused' }).catch(() => { })
    }
  }
}

export async function messageHandler(sock) {
  const { temp: loadedPlugins } = await loadPlugins(PLUGINS_DIR)
  global.plugins = loadedPlugins

  sock.on('message', async (event) => {
    if (config.eventMessage || config.eventAll) {
      logRawDebug(event)
    }

    const m = serializeMessage(event, sock)
    if (!m) return

    if (m.command && !isHistoricalMessage(m) && claimCommand(m.id)) {
      await processCommand(m, sock)
        .catch((err) => sendErrorToOwner(sock, err, m, m.command))
    }

    //bagian deteksi pesan anti anti
    if (m.isGroup && !isHistoricalMessage(m)) {
      await enforceGroupPolicies(m, sock).catch(() => { })
    }

    const { lidJid, pnJid } = extractIdentityPair(event.key)
    const contactResult = saveOrUpdateContact({ lidJid, pnJid, pushName: event.pushName })

    if (m.isNewsletter) {
      logPesanMasuk(m, contactResult)
      saveRawMessage(m)
      return
    }

    if (m.isGroup) {
      getGroupMetadata(m.chat, sock).catch(() => { })
    }

    if (!isSilentLog(m.chat)) {
      logPesanMasuk(m, contactResult)
    }
    saveRawMessage(m)
  })

  sock.on('message_send', (sendEvent) => {
    const outgoing = serializeOutgoing(sendEvent, sock)
    if (!outgoing) return

    saveRawMessage(outgoing)
  })
}