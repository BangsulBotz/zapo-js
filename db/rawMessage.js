// db/rawMessage.js

import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import chalk from 'chalk'
import { proto } from 'zapo-js'
import { filterEncNodes } from '../lib/rawMessageUtils.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const STORE_DIR = path.join(__dirname, '..', 'store')
const dbPath = path.join(STORE_DIR, 'raw_message.db')

if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true })

const db = new Database(dbPath)

db.pragma('journal_mode = WAL')
db.pragma('synchronous = NORMAL')
db.pragma('wal_autocheckpoint = 1000')
db.pragma('journal_size_limit = 67108864')
db.pragma('page_size = 4096')
db.pragma('cache_size = -16000')
db.pragma('temp_store = MEMORY')
db.pragma('mmap_size = 268435456')

db.exec(`
    CREATE TABLE IF NOT EXISTS chats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        jid TEXT UNIQUE NOT NULL
    )
`)

db.exec(`
    CREATE TABLE IF NOT EXISTS raw_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id INTEGER NOT NULL,
        msg_id TEXT UNIQUE NOT NULL,
        sender_jid TEXT NOT NULL DEFAULT 'unknown',
        push_name TEXT DEFAULT NULL,
        msg_type TEXT DEFAULT 'unknown',
        timestamp INTEGER NOT NULL,
        is_group INTEGER DEFAULT 0,
        is_from_me INTEGER DEFAULT 0,
        prefix TEXT DEFAULT NULL,
        command TEXT DEFAULT NULL,
        text TEXT DEFAULT NULL,
        is_media INTEGER DEFAULT 0,
        media_type TEXT DEFAULT NULL,
        device_id INTEGER DEFAULT 0,
        nodes TEXT DEFAULT NULL,
        attributes TEXT DEFAULT NULL,
        FOREIGN KEY (chat_id) REFERENCES chats(id)
    )
`)

const blobTableExists = !!db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='raw_messages_blob'`).get()

if (!blobTableExists) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS raw_messages_blob (
            msg_id TEXT PRIMARY KEY,
            raw_json TEXT DEFAULT NULL,
            raw_bin BLOB DEFAULT NULL
        )
    `)
} else if (!db.prepare(`PRAGMA table_info(raw_messages_blob)`).all().some(c => c.name === 'raw_bin')) {
    db.transaction(() => {
        db.exec(`
            CREATE TABLE raw_messages_blob_new (
                msg_id TEXT PRIMARY KEY,
                raw_json TEXT DEFAULT NULL,
                raw_bin BLOB DEFAULT NULL
            )
        `)
        db.exec(`INSERT INTO raw_messages_blob_new (msg_id, raw_json) SELECT msg_id, raw_json FROM raw_messages_blob`)
        db.exec(`DROP TABLE raw_messages_blob`)
        db.exec(`ALTER TABLE raw_messages_blob_new RENAME TO raw_messages_blob`)
    })()
}

for (const sql of [
    `ALTER TABLE raw_messages ADD COLUMN is_media INTEGER DEFAULT 0`,
    `ALTER TABLE raw_messages ADD COLUMN media_type TEXT DEFAULT NULL`,
    `ALTER TABLE raw_messages ADD COLUMN device_id INTEGER DEFAULT 0`,
    `ALTER TABLE raw_messages ADD COLUMN nodes TEXT DEFAULT NULL`,
    `ALTER TABLE raw_messages ADD COLUMN attributes TEXT DEFAULT NULL`,
]) {
    try { db.exec(sql) } catch { }
}

db.exec(`CREATE INDEX IF NOT EXISTS idx_chat_ts ON raw_messages(chat_id, timestamp DESC)`)
db.exec(`CREATE INDEX IF NOT EXISTS idx_sender  ON raw_messages(chat_id, sender_jid)`)
db.exec(`CREATE INDEX IF NOT EXISTS idx_ts      ON raw_messages(timestamp)`)

const stmtInsertChat = db.prepare(`INSERT OR IGNORE INTO chats (jid) VALUES (?)`)
const stmtSelectChat = db.prepare(`SELECT id FROM chats WHERE jid = ?`)

const stmtInsertMeta = db.prepare(`
    INSERT OR IGNORE INTO raw_messages
        (chat_id, msg_id, sender_jid, push_name, msg_type, timestamp, is_group, is_from_me, prefix, command, text, is_media, media_type, device_id, nodes, attributes)
    VALUES (@chat_id, @msg_id, @sender_jid, @push_name, @msg_type, @timestamp, @is_group, @is_from_me, @prefix, @command, @text, @is_media, @media_type, @device_id, @nodes, @attributes)
`)
const stmtInsertBlob = db.prepare(`INSERT OR IGNORE INTO raw_messages_blob (msg_id, raw_bin) VALUES (?, ?)`)

const stmtGetByOrder = db.prepare(`
    SELECT rm.*, c.jid, b.raw_bin, b.raw_json
    FROM raw_messages rm
    JOIN chats c ON rm.chat_id = c.id
    LEFT JOIN raw_messages_blob b ON rm.msg_id = b.msg_id
    WHERE rm.id = ?
`)
const stmtGetById = db.prepare(`
    SELECT rm.*, c.jid, b.raw_bin, b.raw_json
    FROM raw_messages rm
    JOIN chats c ON rm.chat_id = c.id
    LEFT JOIN raw_messages_blob b ON rm.msg_id = b.msg_id
    WHERE rm.msg_id = ?
`)
const stmtGetDeviceId = db.prepare(`
    SELECT device_id FROM raw_messages WHERE msg_id = ?
`)
const stmtGetByJid = db.prepare(`
    SELECT id, timestamp, msg_id, sender_jid, push_name, msg_type, is_group, is_from_me, prefix, command, text
    FROM raw_messages
    WHERE chat_id = ?
    ORDER BY timestamp DESC
    LIMIT ?
`)
const stmtGetByChatBlob = db.prepare(`
    SELECT rm.*, b.raw_bin, b.raw_json
    FROM raw_messages rm
    LEFT JOIN raw_messages_blob b ON rm.msg_id = b.msg_id
    WHERE rm.chat_id = ?
    ORDER BY rm.timestamp DESC
    LIMIT ?
`)
const stmtGetBySenderBlob = db.prepare(`
    SELECT rm.*, b.raw_bin, b.raw_json
    FROM raw_messages rm
    LEFT JOIN raw_messages_blob b ON rm.msg_id = b.msg_id
    WHERE rm.chat_id = ? AND rm.sender_jid = ?
    ORDER BY rm.timestamp DESC
    LIMIT ?
`)
const stmtTopActive = db.prepare(`
    SELECT sender_jid, COUNT(*) as total
    FROM raw_messages
    WHERE chat_id = ?
    GROUP BY sender_jid
    ORDER BY total DESC
    LIMIT ?
`)
const stmtTotalPerSender = db.prepare(`
    SELECT sender_jid, COUNT(*) as total
    FROM raw_messages
    WHERE chat_id = ?
    GROUP BY sender_jid
`)
const stmtLastActivePerSender = db.prepare(`
    SELECT sender_jid, MAX(timestamp) as last_ts
    FROM raw_messages
    WHERE chat_id = ?
    GROUP BY sender_jid
`)
const stmtPruneBlob = db.prepare(`DELETE FROM raw_messages_blob WHERE msg_id IN (SELECT msg_id FROM raw_messages WHERE timestamp < ?)`)
const stmtPruneMeta = db.prepare(`DELETE FROM raw_messages WHERE timestamp < ?`)

const jidCache = new Map()

function getChatId(jid) {
    if (jidCache.has(jid)) return jidCache.get(jid)
    stmtInsertChat.run(jid)
    const row = stmtSelectChat.get(jid)
    if (row) {
        jidCache.set(jid, row.id)
        return row.id
    }
    return null
}

function jsonReplacer(_key, value) {
    if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
        return { __type: 'Buffer', data: Buffer.from(value).toString('base64') }
    }
    if (value && typeof value === 'object' &&
        (value.type === 'Buffer' || value.__type === 'Buffer') && Array.isArray(value.data)) {
        try { return { __type: 'Buffer', data: Buffer.from(value.data).toString('base64') } } catch { }
    }
    return value
}
function jsonReviver(_key, value) {
    if (value && typeof value === 'object' && value.__type === 'Buffer') {
        return Buffer.from(value.data, 'base64')
    }
    return value
}

const MAX_QUOTE_DEPTH = 1

function stripDeepQuotes(value, quoteDepth = 0) {
    if (!value || typeof value !== 'object') return
    if (Array.isArray(value)) {
        for (const item of value) stripDeepQuotes(item, quoteDepth)
        return
    }
    let removeQuoted = false
    for (const [key, val] of Object.entries(value)) {
        if (key === 'quotedMessage' && val && typeof val === 'object') {
            if (quoteDepth >= MAX_QUOTE_DEPTH) {
                removeQuoted = true
                continue
            }
            stripDeepQuotes(val, quoteDepth + 1)
        } else {
            stripDeepQuotes(val, quoteDepth)
        }
    }
    if (removeQuoted) delete value.quotedMessage
}

function encodeRawEvent(event) {
    let payload = event
    try {
        payload = structuredClone(event)
        if (payload?.message) stripDeepQuotes(payload.message)
    } catch { }

    try {
        return Buffer.from(proto.WebMessageInfo.encode(payload).finish())
    } catch {
        return Buffer.from(JSON.stringify(payload, jsonReplacer))
    }
}

const saveTransaction = db.transaction((meta, msgId, rawBin) => {
    const metaResult = stmtInsertMeta.run(meta)
    stmtInsertBlob.run(msgId, rawBin)
    return { changes: metaResult.changes, id: metaResult.lastInsertRowid }
})

export function saveRawMessage(m) {
    if (!m?.chat || !m?.id) return null

    const chatId = getChatId(m.chat)
    const ts = Number(m.raw?.messageTimestamp) || Math.floor(Date.now() / 1000)

    let nodesJson = null
    if (m.nodes) {
        try {
            const filteredNodes = filterEncNodes(m.nodes)
            nodesJson = filteredNodes ? JSON.stringify(filteredNodes, jsonReplacer) : null
        } catch (err) {
            console.error('[DB] gagal serialize nodes:', err.message)
            nodesJson = null
        }
    }

    let attrsJson = null
    const rawAttrs = m.raw?.rawNode?.attrs
    if (rawAttrs && typeof rawAttrs === 'object') {
        try {
            attrsJson = JSON.stringify(rawAttrs, jsonReplacer)
        } catch (err) {
            console.error('[DB] gagal serialize attributes:', err.message)
            attrsJson = null
        }
    }

    const meta = {
        chat_id: chatId,
        msg_id: m.id,
        sender_jid: m.sender ?? 'unknown',
        push_name: m.pushName ?? null,
        msg_type: m.type ?? 'unknown',
        timestamp: ts,
        is_group: m.isGroup ? 1 : 0,
        is_from_me: m.isFromMe ? 1 : 0,
        prefix: m.prefix || null,
        command: m.command || null,
        text: m.text ?? null,
        is_media: m.isMedia ? 1 : 0,
        media_type: m.mediaType ?? null,
        device_id: Number.isFinite(m.deviceId) ? m.deviceId : 0,
        nodes: nodesJson,
        attributes: attrsJson,
    }

    const rawBin = encodeRawEvent(m.raw)

    try {
        const { changes, id: insertedId } = saveTransaction(meta, m.id, rawBin)

        if (changes === 0) {
            return { id: null, duplicate: true }
        }
        return { id: insertedId, duplicate: false }
    } catch (err) {
        console.error(chalk.red(`[DB FATAL SAVE ERROR] ${m.id}:`), err.message)
        return null
    }
}

function decodeRow(row) {
    try {
        if (row?.raw_bin) {
            try {
                const decoded = proto.WebMessageInfo.decode(row.raw_bin)
                return JSON.parse(JSON.stringify(decoded, jsonReplacer), jsonReviver)
            } catch { }
        }
        if (row?.raw_json) {
            return JSON.parse(row.raw_json, jsonReviver)
        }
    } catch { }
    return null
}

function decodeNodes(row) {
    if (!row?.nodes) return null
    try {
        return JSON.parse(row.nodes, jsonReviver)
    } catch {
        return null
    }
}

function decodeAttributes(row) {
    if (!row?.attributes) return null
    try {
        return JSON.parse(row.attributes, jsonReviver)
    } catch {
        return null
    }
}

export function getMessageByOrder(orderNumber) {
    const row = stmtGetByOrder.get(orderNumber)
    if (!row) return null
    return { meta: row, raw: decodeRow(row), nodes: decodeNodes(row), attributes: decodeAttributes(row) }
}

export function getRawMessageById(msgId) {
    const row = stmtGetById.get(msgId)
    if (!row) return null
    return { meta: row, raw: decodeRow(row), nodes: decodeNodes(row), attributes: decodeAttributes(row), chatJid: row.jid, orderNumber: row.id }
}

export function getDeviceIdByMsgId(msgId) {
    if (!msgId) return 0
    const row = stmtGetDeviceId.get(msgId)
    return row?.device_id ?? 0
}

export function getMessagesByJid(jid, limit = 1000) {
    const chatId = getChatId(jid)
    if (!chatId) return []
    return stmtGetByJid.all(chatId, limit)
}

export function getMessagesByChatWithRaw(jid, limit = 100) {
    const chatId = getChatId(jid)
    if (!chatId) return []
    return stmtGetByChatBlob.all(chatId, limit).map((row) => ({ meta: row, raw: decodeRow(row), nodes: decodeNodes(row) }))
}

export function getMessagesBySenderWithRaw(jid, senderJid, limit = 100) {
    const chatId = getChatId(jid)
    if (!chatId) return []
    return stmtGetBySenderBlob.all(chatId, senderJid, limit).map((row) => ({ meta: row, raw: decodeRow(row), nodes: decodeNodes(row), attributes: decodeAttributes(row) }))
}

export function getTopActive(jid, limit = 10) {
    const chatId = getChatId(jid)
    if (!chatId) return []
    return stmtTopActive.all(chatId, limit)
}

export function getTotalMessagesPerSender(jid) {
    const chatId = getChatId(jid)
    if (!chatId) return []
    return stmtTotalPerSender.all(chatId)
}

export function getLastActivePerSender(jid) {
    const chatId = getChatId(jid)
    if (!chatId) return []
    return stmtLastActivePerSender.all(chatId)
}

export function pruneMessages(days = 30) {
    const cutoff = Math.floor(Date.now() / 1000) - days * 24 * 60 * 60
    stmtPruneBlob.run(cutoff)
    const result = stmtPruneMeta.run(cutoff)
    db.pragma('wal_checkpoint(TRUNCATE)')
    return result.changes
}

export function optimizeDatabase() {
    try {
        db.pragma('wal_checkpoint(TRUNCATE)')
        db.pragma('optimize')
        db.exec('VACUUM')
        console.log('[DB] Database Optimized.')
    } catch (err) {
        console.error('[DB OPTIMIZE ERROR]', err.message)
    }
}

export { db }
