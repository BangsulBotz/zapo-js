// db/trustedFeatures.js

import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import { getContactByJid } from './contacts.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(__dirname, '..', 'store', 'trusted_features.db')

const db = new Database(dbPath)

db.pragma('journal_mode = WAL')
db.pragma('synchronous = NORMAL')
db.pragma('wal_autocheckpoint = 1000')
db.pragma('journal_size_limit = 67108864')
db.pragma('cache_size = -8000')
db.pragma('temp_store = MEMORY')
db.pragma('mmap_size = 268435456')

db.exec(`
    CREATE TABLE IF NOT EXISTS trusted_features (
        jid TEXT NOT NULL,
        command TEXT NOT NULL,
        added_by TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        PRIMARY KEY (jid, command)
    )
`)

const stmtLoadAll = db.prepare(`SELECT jid, command FROM trusted_features`)
const stmtAdd = db.prepare(`INSERT OR IGNORE INTO trusted_features (jid, command, added_by) VALUES (?, ?, ?)`)
const stmtRemove = db.prepare(`DELETE FROM trusted_features WHERE jid = ? AND command = ?`)
const stmtRemoveJid = db.prepare(`DELETE FROM trusted_features WHERE jid = ?`)

const trustCache = new Map()

for (const { jid, command } of stmtLoadAll.all()) {
    if (!trustCache.has(jid)) trustCache.set(jid, new Set())
    trustCache.get(jid).add(command)
}

function hasDirectTrust(jid, command) {
    return trustCache.get(jid)?.has(command) ?? false
}

const CONTACT_MISS_TTL = 30_000
const contactMissCache = new Map()

function getCounterpart(jid) {
    const cachedUntil = contactMissCache.get(jid)
    if (cachedUntil && cachedUntil > Date.now()) return null

    const contact = getContactByJid(jid)
    if (!contact) {
        contactMissCache.set(jid, Date.now() + CONTACT_MISS_TTL)
        return null
    }

    contactMissCache.delete(jid)
    return contact.lid_jid === jid ? contact.pn_jid : contact.lid_jid
}

export function isTrustedFeature(jid, command) {
    if (!jid) return false
    if (hasDirectTrust(jid, command)) return true
    if (jid.endsWith('@g.us')) return false

    const other = getCounterpart(jid)
    return !!other && hasDirectTrust(other, command)
}

export function resolvePersonIdentifiers(jid) {
    const identifiers = new Set([jid])
    if (jid && !jid.endsWith('@g.us')) {
        const contact = getContactByJid(jid)
        if (contact?.lid_jid) identifiers.add(contact.lid_jid)
        if (contact?.pn_jid) identifiers.add(contact.pn_jid)
    }
    return [...identifiers]
}

function cacheTrust(jid, command) {
    if (!trustCache.has(jid)) trustCache.set(jid, new Set())
    trustCache.get(jid).add(command)
}

function uncacheTrust(jid, command) {
    const commands = trustCache.get(jid)
    if (commands?.delete(command) && commands.size === 0) trustCache.delete(jid)
}

export function addTrustedFeature(jid, command, addedBy = null) {
    const added = stmtAdd.run(jid, command, addedBy).changes > 0
    cacheTrust(jid, command)
    return added
}

export function addTrustedUser(jid, command, addedBy = null) {
    const identifiers = resolvePersonIdentifiers(jid)
    let added = false
    for (const id of identifiers) {
        if (stmtAdd.run(id, command, addedBy).changes > 0) added = true
        cacheTrust(id, command)
    }
    return { added, identifiers }
}

export function removeTrustedFeature(jid, command) {
    const removed = stmtRemove.run(jid, command).changes > 0
    uncacheTrust(jid, command)
    return removed
}

export function removeTrustedUser(jid, command) {
    const identifiers = resolvePersonIdentifiers(jid)
    let removed = false
    for (const id of identifiers) {
        if (stmtRemove.run(id, command).changes > 0) removed = true
        uncacheTrust(id, command)
    }
    return { removed, identifiers }
}

export function getTrustedUserCommands(jid) {
    const found = new Set()
    for (const id of resolvePersonIdentifiers(jid)) {
        for (const command of trustCache.get(id) ?? []) found.add(command)
    }
    return found
}

export function removeGroupTrust(jid) {
    const removed = stmtRemoveJid.run(jid).changes > 0
    trustCache.delete(jid)
    return removed
}

export function getTrustedFeatures() {
    return trustCache
}
