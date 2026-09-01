// lib/thumbAutoRefresh.js
//fungsi untuk auto refresh thumbnail jika terdeteksi >7 hari.


import chalk from 'chalk'
import { listThumbs, getThumb, saveThumb } from '../db/thumbnails.js'
import { getUrlExpiry, getMediaAgeMs, waMediaUrl } from './utils.js'

export const REFRESH_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000

const START_DELAY_MS = 15_000
const ITEM_DELAY_MS = 2_000

const inProgress = new Set()

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

function thumbKey(row) {
    return `${row.jenis}:${row.name}`
}

export async function refreshThumbRow(sock, row) {
    const key = thumbKey(row)
    if (inProgress.has(key)) {
        return { ok: false, name: row.name, jenis: row.jenis, reason: 'sedang di-refresh proses lain.' }
    }
    inProgress.add(key)

    try {
        const oldMeta = row.metadata || {}
        if (!oldMeta.mediaKey || !oldMeta.thumbnailDirectPath) {
            return { ok: false, name: row.name, jenis: row.jenis, reason: 'metadata lama tidak lengkap (mediaKey/directPath hilang).' }
        }

        const oldCdnUrl = oldMeta.url || waMediaUrl(oldMeta.thumbnailDirectPath)
        const ageMs = await getMediaAgeMs(oldCdnUrl)
        const ageNote = ageMs !== null ? ` *(umur sumber lama ~${Math.floor(ageMs / 86400000)} hari)*` : ''

        const downloaded = await sock.downloadThumbnail({
            mediaKey: oldMeta.mediaKey,
            thumbnailDirectPath: oldMeta.thumbnailDirectPath,
            thumbnailSha256: oldMeta.thumbnailSha256,
            thumbnailEncSha256: oldMeta.thumbnailEncSha256,
            mimetype: oldMeta.mimetype
        })

        const fresh = await sock.uploadThumbnail(downloaded.buffer, { favicon: row.jenis === 'favicon' })

        const cdnUrl = fresh.url || waMediaUrl(fresh.thumbnailDirectPath)
        const expiry = getUrlExpiry(cdnUrl)

        saveThumb({
            name: row.name,
            jenis: row.jenis,
            status: row.status,
            metadata: fresh,
            expired: expiry ? Math.floor(expiry.getTime() / 1000) : null
        })

        return {
            ok: true,
            name: row.name,
            jenis: row.jenis,
            ageNote,
            expired: expiry ? expiry.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : 'tidak terdeteksi'
        }
    } catch (err) {
        return { ok: false, name: row.name, jenis: row.jenis, reason: err.message }
    } finally {
        inProgress.delete(key)
    }
}

async function sweep(sock) {
    const rows = []
    for (const jenis of ['thumbnail', 'favicon']) {
        for (const item of listThumbs(jenis)) {
            const row = getThumb(item.name, jenis)
            if (row) rows.push(row)
        }
    }

    if (!rows.length) {
        console.log(chalk.gray('[THUMB-AUTO] Database thumbnail kosong — tidak ada yang dicek.'))
        return
    }

    console.log(chalk.gray(`[THUMB-AUTO] Mengecek umur ${rows.length} entri thumbnail/favicon...`))

    const stale = []
    for (const row of rows) {
        const meta = row.metadata || {}
        if (!meta.mediaKey || !meta.thumbnailDirectPath) continue

        const cdnUrl = meta.url || waMediaUrl(meta.thumbnailDirectPath)
        const ageMs = await getMediaAgeMs(cdnUrl)
        if (ageMs !== null && ageMs > REFRESH_THRESHOLD_MS) {
            stale.push({ row, ageDays: Math.floor(ageMs / 86400000) })
        }
    }

    if (!stale.length) {
        console.log(chalk.gray('[THUMB-AUTO] Semua thumbnail masih segar (<7 hari), tidak ada yang di-refresh.'))
        return
    }

    console.log(chalk.yellow(`[THUMB-AUTO] ${stale.length} entri berumur >7 hari — refresh berjalan di background.`))

    let ok = 0
    let fail = 0
    for (let i = 0; i < stale.length; i++) {
        const { row, ageDays } = stale[i]
        const res = await refreshThumbRow(sock, row)
        if (res.ok) {
            ok++
            console.log(chalk.green(`[THUMB-AUTO] ✓ ${res.jenis}:${res.name} (~${ageDays} hari -> segar)`))
        } else {
            fail++
            console.log(chalk.red(`[THUMB-AUTO] ✗ ${row.jenis}:${row.name}: ${res.reason}`))
        }
        if (i < stale.length - 1) await delay(ITEM_DELAY_MS)
    }

    console.log(chalk.gray(`[THUMB-AUTO] Selesai — ${ok} sukses, ${fail} gagal.`))
}

export function startThumbAutoRefresh(sock) {
    setTimeout(() => {
        sweep(sock).catch(err => {
            console.error(chalk.red('[THUMB-AUTO] Gagal:'), err?.stack || err?.message)
        })
    }, START_DELAY_MS)
}
