// db/thumbnails.js

import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const STORE_DIR = path.join(__dirname, '..', 'store')
const dbPath = path.join(STORE_DIR, 'thumbnail.db')

if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true })

const db = new Database(dbPath)

db.pragma('journal_mode = WAL')
db.pragma('synchronous = NORMAL')
db.pragma('wal_autocheckpoint = 1000')
db.pragma('journal_size_limit = 8388608')
db.pragma('cache_size = -1000')
db.pragma('mmap_size = 8388608')

db.exec(`
    CREATE TABLE IF NOT EXISTS thumbnails (
        name TEXT NOT NULL,
        jenis TEXT NOT NULL CHECK (jenis IN ('thumbnail', 'favicon')),
        status TEXT NOT NULL DEFAULT 'random' CHECK (status IN ('random', 'private')),
        metadata TEXT NOT NULL,
        expired INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (name, jenis)
    )
`)

const stmtUpsert = db.prepare(`
    INSERT INTO thumbnails (name, jenis, status, metadata, expired, created_at, updated_at)
    VALUES (@name, @jenis, @status, @metadata, @expired, @now, @now)
    ON CONFLICT(name, jenis) DO UPDATE SET
        status = @status,
        metadata = @metadata,
        expired = @expired,
        updated_at = @now
`)
const stmtGetByName = db.prepare(`SELECT * FROM thumbnails WHERE name = ? AND jenis = ?`)
const stmtRandom = db.prepare(`
    SELECT * FROM thumbnails
    WHERE jenis = ? AND status = 'random' AND (expired IS NULL OR expired > strftime('%s', 'now'))
    ORDER BY RANDOM() LIMIT 1
`)
const stmtListByJenis = db.prepare(`SELECT * FROM thumbnails WHERE jenis = ? ORDER BY updated_at DESC`)
const stmtDelete = db.prepare(`DELETE FROM thumbnails WHERE name = ? AND jenis = ?`)

export function saveThumb({ name, jenis, status = 'random', metadata, expired = null }) {
    if (!name || !jenis || !metadata) return null
    const safeStatus = jenis === 'favicon' ? 'random' : (status === 'private' ? 'private' : 'random')
    const info = stmtUpsert.run({
        name: String(name).trim(),
        jenis,
        status: safeStatus,
        metadata: typeof metadata === 'string' ? metadata : JSON.stringify(metadata),
        expired,
        now: Math.floor(Date.now() / 1000)
    })
    return { name: String(name).trim(), jenis, status: safeStatus, changes: info.changes }
}

export function getThumb(name, jenis) {
    const row = stmtGetByName.get(String(name).trim(), jenis)
    if (!row) return null
    row.metadata = JSON.parse(row.metadata)
    return row
}

export function getRandomThumb(jenis) {
    const row = stmtRandom.get(jenis)
    if (!row) return null
    row.metadata = JSON.parse(row.metadata)
    return row
}

export function listThumbs(jenis) {
    return stmtListByJenis.all(jenis).map(row => ({ ...row, metadata: undefined }))
}

export function deleteThumb(name, jenis) {
    return stmtDelete.run(String(name).trim(), jenis).changes > 0
}

export { db as thumbnailsDb }
