// db/contacts.js

import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import chalk from 'chalk'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const STORE_DIR = path.join(__dirname, '..', 'store')
const dbPath = path.join(STORE_DIR, 'contacts.db')

if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true })

const db = new Database(dbPath)

db.pragma('journal_mode = WAL')
db.pragma('synchronous = NORMAL')
db.pragma('wal_autocheckpoint = 1000')
db.pragma('temp_store = MEMORY')

db.exec(`
    CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lid_jid TEXT UNIQUE NOT NULL,
        pn_jid TEXT UNIQUE NOT NULL,
        push_name TEXT DEFAULT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
    )
`)

const stmtFindByLid = db.prepare(`SELECT * FROM contacts WHERE lid_jid = ?`)
const stmtFindByPn = db.prepare(`SELECT * FROM contacts WHERE pn_jid = ?`)
const stmtInsert = db.prepare(`
    INSERT INTO contacts (lid_jid, pn_jid, push_name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
`)
const stmtUpdateName = db.prepare(`UPDATE contacts SET push_name = ?, updated_at = ? WHERE id = ?`)

function findContactRaw(jid) {
    if (!jid) return null
    return (jid.endsWith('@lid') ? stmtFindByLid.get(jid) : stmtFindByPn.get(jid)) ?? null
}

export function saveOrUpdateContact({ lidJid, pnJid, pushName }) {
    if (!lidJid || !pnJid) return null

    const cleanName = pushName?.trim() || null
    const now = Math.floor(Date.now() / 1000)

    const existing = stmtFindByLid.get(lidJid) ?? stmtFindByPn.get(pnJid)

    if (!existing) {
        try {
            const info = stmtInsert.run(lidJid, pnJid, cleanName, now, now)
            console.log(chalk.green(`[CONTACT] Baru disimpan: ${cleanName || '(tanpa nama)'} — ${pnJid}`))
            return { id: info.lastInsertRowid, created: true, updated: false }
        } catch (err) {
            console.error(chalk.red('[CONTACT INSERT ERROR]'), err.message)
            return null
        }
    }

    if (cleanName && cleanName !== existing.push_name) {
        stmtUpdateName.run(cleanName, now, existing.id)
        console.log(chalk.cyan(`[CONTACT] Nama diupdate: "${existing.push_name ?? '-'}" -> "${cleanName}" (${pnJid})`))
        return { id: existing.id, created: false, updated: true }
    }

    return { id: existing.id, created: false, updated: false }
}

export function getPushNameByJid(jid) {
    return findContactRaw(jid)?.push_name ?? null
}

export function getContactByJid(jid) {
    return findContactRaw(jid)
}

export { db as contactsDb }
