// lib/groupAndBot.js
import { ensureGroupSettingColumns, getGroupSettings, saveGroupSettings } from '../db/group.js'
import { getBotSetting, saveBotSetting } from '../db/botConfig.js'
import { LRU } from './lru.js'

//settingan default untuk bot
export const DEFAULT_BOT_SETTINGS = {
  self: true,
  silentlog_all: false
}


//settingan default untuk grup
export const DEFAULT_GROUP_SETTINGS = {
  selfgc: false,
  silentlog: false,
  antilink: {
    kick: false,
    delete: false
  }
}

const GROUP_LINK_REGEX = /https:\/\/chat\.whatsapp\.com\/[a-zA-Z0-9]+/

function detectGroupLink(text) {
  if (!text) return null
  const match = text.match(GROUP_LINK_REGEX)
  return match ? match[0] : null
}

ensureGroupSettingColumns(DEFAULT_GROUP_SETTINGS)
for (const [key, value] of Object.entries(DEFAULT_BOT_SETTINGS)) {
  if (getBotSetting(key) === undefined) saveBotSetting(key, value)
}

const groupSettingsCache = new LRU(100)
const botSettingsCache = new Map()

function mergeSettings(current, changes) {
  const merged = { ...current }
  for (const [key, value] of Object.entries(changes)) {
    merged[key] = value && typeof value === 'object' && !Array.isArray(value)
      ? mergeSettings(current[key] || {}, value)
      : value
  }
  return merged
}

function hydrateSettings(defaults, stored, prefix = '') {
  const settings = {}
  for (const [key, value] of Object.entries(defaults)) {
    const column = prefix ? `${prefix}_${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      settings[key] = hydrateSettings(value, stored, column)
    } else {
      settings[key] = stored
        ? typeof value === 'boolean' ? Boolean(stored[column]) : (stored[column] ?? value)
        : value
    }
  }
  return settings
}

export function getEffectiveGroupSettings(jid) {
  if (!jid?.endsWith('@g.us')) return null
  if (groupSettingsCache.has(jid)) return groupSettingsCache.get(jid)

  const stored = getGroupSettings(jid, DEFAULT_GROUP_SETTINGS)
  const settings = {
    jid_group: jid,
    ...hydrateSettings(DEFAULT_GROUP_SETTINGS, stored)
  }

  groupSettingsCache.set(jid, settings)
  return settings
}

export function updateGroupSettings(jid, changes) {
  const current = getEffectiveGroupSettings(jid)
  if (!current) return null

  const next = { ...mergeSettings(current, changes), jid_group: jid }
  const saved = saveGroupSettings(next, DEFAULT_GROUP_SETTINGS)
  const settings = {
    jid_group: jid,
    ...hydrateSettings(DEFAULT_GROUP_SETTINGS, saved)
  }

  groupSettingsCache.set(jid, settings)
  return settings
}

export function getBotSettings() {
  if (botSettingsCache.size === Object.keys(DEFAULT_BOT_SETTINGS).length) {
    return Object.fromEntries(botSettingsCache)
  }

  for (const [key, fallback] of Object.entries(DEFAULT_BOT_SETTINGS)) {
    botSettingsCache.set(key, getBotSetting(key) ?? fallback)
  }
  return Object.fromEntries(botSettingsCache)
}

export function getBotSettingValue(key) {
  if (!botSettingsCache.has(key)) {
    botSettingsCache.set(key, getBotSetting(key) ?? DEFAULT_BOT_SETTINGS[key])
  }
  return botSettingsCache.get(key)
}

export function updateBotSetting(key, value) {
  if (!(key in DEFAULT_BOT_SETTINGS)) return null
  botSettingsCache.set(key, value)
  return saveBotSetting(key, value)
}

export function isSilentLog(jid) {
  return getBotSettingValue('silentlog_all') || Boolean(getEffectiveGroupSettings(jid)?.silentlog)
}

export function isGroupSelf(jid) {
  return Boolean(getEffectiveGroupSettings(jid)?.selfgc)
}

export { detectGroupLink, GROUP_LINK_REGEX }
