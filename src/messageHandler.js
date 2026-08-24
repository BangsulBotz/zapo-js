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
import { detectMediaType } from '../lib/utils.js'
import { loadPlugins } from '../lib/loadPlugins.js'
import { sendErrorToOwner } from '../lib/utils.js'
import { config } from '../settings.js'
import { saveRawMessage } from '../db/rawMessage.js'
import { saveOrUpdateContact } from '../db/contacts.js'
import { isLocked } from '../lib/lockState.js'
import { isTrustedFeature } from '../db/trustedFeatures.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PLUGINS_DIR = path.join(__dirname, '..', 'plugins')

const TYPING_REFRESH = 8_000

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
  const senderJid = normalizeJid(sock.user?.id)
  const { prefix, command } = extractCommand(text)

  return {
    raw: sendEvent,
    id: sendEvent.id,
    chat: sendEvent.to,
    sender: senderJid,
    pushName: sock.user?.name || sock.user?.pushName || 'Bot',
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

  if (config.self && !m.isOwner && !trusted) return
  if (isLocked() && plugin.command !== 'lock') return

  const isGroupOnly = plugin.groupOnly || plugin.onlyGroup
  if (isGroupOnly && !m.isGroup) return m.reply(config.pesan.groupOnly)

  if (!m.isOwner && !trusted) {
    const isOwnerOnly = plugin.ownerOnly || plugin.onlyOwner
    const isPrivateOnly = plugin.privateOnly || plugin.onlyPrivate
    const isAdminOnly = plugin.adminOnly || plugin.onlyAdmin

    if (isOwnerOnly && !m.isOwner) return m.reply(config.pesan.ownerOnly)
    if (isPrivateOnly && m.isGroup) return m.reply(config.pesan.privateOnly)
    if (isAdminOnly && !m.isGroup) return m.reply(config.pesan.groupOnly)
    if (isAdminOnly && !m.isAdmin) return m.reply(config.pesan.adminOnly)
  }

  const args = extractArgs(m)
  m.args = args

  console.log(chalk.magenta(`[CMD] -> .${m.command} ${args.join(' ')}`.trim()))

  if (plugin.wait) await m.reply(config.pesan.wait)

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

  sock.on('message', (event) => {
    if (config.eventMessage) {
      logRawDebug(event)
    }

    const m = serializeMessage(event, sock)
    if (!m) return

    const { lidJid, pnJid } = extractIdentityPair(event.key)
    const contactResult = saveOrUpdateContact({ lidJid, pnJid, pushName: event.pushName })

    if (m.isNewsletter) {
      logPesanMasuk(m, contactResult)
      saveRawMessage(m)
      return
    }

    processCommand(m, sock)
      .catch((err) => sendErrorToOwner(sock, err, m, m.command))
      .finally(() => {
        logPesanMasuk(m, contactResult)
        saveRawMessage(m)
      })
  })

  sock.on('message_send', (sendEvent) => {
    const outgoing = serializeOutgoing(sendEvent, sock)
    if (!outgoing) return

    saveRawMessage(outgoing)
  })
}
