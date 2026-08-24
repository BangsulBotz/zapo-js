// plugins/owner/addthumb.js

import { saveThumb } from '../../db/thumbnails.js'
import { getRawMessageById } from '../../db/rawMessage.js'
import { formatDuration, getUrlExpiry, getMediaAgeMs, waMediaUrl } from '../../lib/utils.js'

const REFRESH_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000
const THUMB_FIELDS = [
    'thumbnailDirectPath', 'thumbnailSha256', 'thumbnailEncSha256',
    'mediaKey', 'mediaKeyTimestamp',
    'thumbnailWidth', 'thumbnailHeight', 'mimetype', 'jpegThumbnail'
]

function toBase64Field(value) {
    if (Buffer.isBuffer(value) || value instanceof Uint8Array) return Buffer.from(value).toString('base64')
    if (typeof value === 'object' && Array.isArray(value.data)) {
        try { return Buffer.from(value.data).toString('base64') } catch { return value }
    }
    return value
}

function pickFields(src, jenis) {
    const out = {}
    for (const key of THUMB_FIELDS) {
        const val = src[key]
        if (val == null) continue
        out[key] = toBase64Field(val)
    }
    if (jenis === 'favicon') delete out.jpegThumbnail
    return out
}

function usage(m) {
    return (
        `*Format Penggunaan:*\n` +
        `> \`Reply gambar\`\n> \`${m.prefix}${m.command} [-private] <nama>\`\n\n` +
        `> \`Reply pesan link-preview\` (metadata diambil dari database, tanpa upload ulang)\n> \`${m.prefix}${m.command} [-private] <nama>\`\n\n` +
        `> \`Kirim gambar dengan caption\`\n> \`${m.prefix}${m.command} [-private] <nama>\`\n\n` +
        `> \`Dari URL gambar\`\n> \`${m.prefix}${m.command} [-private] <nama> <url>\`\n\n` +
        `\`-private\` = tidak ikut pool random. Tanpa flag, default *random*.`
    )
}

export function harvestPreviewMeta(q, jenis) {
    const stored = q?.key?.id ? getRawMessageById(q.key.id) : null

    if (!stored) {
        return { ok: false, reason: 'pesan ini tidak ditemukan di database raw message.' }
    }

    const etm = stored.raw?.message?.extendedTextMessage
    if (!etm) {
        return { ok: false, reason: `pesan #${stored.orderNumber} ada di database, tapi bukan pesan link-preview.` }
    }

    const container = jenis === 'favicon'
        ? (etm.faviconMmsMetadata || null)
        : (etm.thumbnailDirectPath ? etm : null)

    if (container?.thumbnailDirectPath && container?.mediaKey) {
        return { ok: true, meta: pickFields(container, jenis), cdnUrl: container.url || waMediaUrl(container.thumbnailDirectPath), from: 'database' }
    }

    if (jenis === 'favicon' && etm.thumbnailDirectPath && etm.mediaKey) {
        return { ok: false, reason: 'metadata thumbnail utamanya ada, tapi pesan ini tidak menyimpan faviconMmsMetadata.' }
    }

    return { ok: false, reason: `pesan link-preview ditemukan, tapi metadata ${jenis}-nya (directPath/mediaKey) tidak lengkap.` }
}

export async function addThumbFlow(m, { sock, args }, jenis) {
    const isPrivate = args.some(a => a.toLowerCase() === '-private')
    const positional = args.filter(a => !a.toLowerCase().startsWith('-'))
    const name = positional[0]?.trim()
    const urlInput = positional.slice(1).join(' ').trim()

    if (!name) return m.reply(usage(m))
    if (/^https?:\/\//i.test(name)) return m.reply('Nama harus di depan, URL-nya di belakang.\n\n' + usage(m))

    if (/^random$/i.test(name)) {
        return m.reply(`❌ Nama \`random\` dipakai sebagai kata kunci khusus untuk ambil data acak.\nPakai nama lain ya.`)
    }

    const status = jenis === 'favicon' ? 'random' : (isPrivate ? 'private' : 'random')

    const q = m.quoted
    let meta, expiredEpoch = null, refreshNote = false, sourceAgeText = '', viaUpload = true

    if (q && (q.type === 'extendedTextMessage' || /preview/i.test(q.mediaType || ''))) {
        const harvested = harvestPreviewMeta(q, jenis)

        if (!harvested.ok) {
            return m.reply(
                `❌ Metadata *${jenis}* gagal dipanen: ${harvested.reason}\n\n` +
                `Coba reply gambar biasa, atau kirim URL gambar langsung.`
            )
        }

        const expiry = getUrlExpiry(harvested.cdnUrl)
        if (expiry && expiry.getTime() <= Date.now()) {
            return m.reply(
                `❌ *Gagal:* metadata sudah expired (${expiry.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}).\n` +
                `Cari sumber yang lebih segar.`
            )
        }

        meta = harvested.meta
        expiredEpoch = expiry ? Math.floor(expiry.getTime() / 1000) : null
        viaUpload = false
    } else {
        let input, sourceUrl = null

        const isImageLike = (mt, mime) => ['image', 'sticker'].includes(mt) || (mime || '').startsWith('image/')

        if (q && isImageLike(q.mediaType, q.mime)) {
            input = () => q.download()
            sourceUrl = q.full?.[q.type]?.url || null
        } else if (!q && m.isMedia && m.type === 'imageMessage') {
            const content = m.raw?.message?.[m.type]
            input = () => sock.message.downloadBytes(m.raw.message)
            sourceUrl = content?.url || null
        } else if (urlInput) {
            if (!/^https?:\/\//i.test(urlInput)) return m.reply('URL tidak valid.')
            input = () => urlInput
        } else {
            return m.reply('Reply gambar / pesan ber-preview, atau sertakan URL gambar.\n\n' + usage(m))
        }

        if (sourceUrl) {
            const expiry = getUrlExpiry(sourceUrl)
            if (expiry && expiry.getTime() <= Date.now()) {
                return m.reply(
                    `❌ *Gagal:* metadata media sudah expired (${expiry.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}).\n` +
                    `Coba kirim ulang gambarnya atau pakai URL lain.`
                )
            }

            const ageMs = await getMediaAgeMs(sourceUrl)
            if (ageMs !== null) {
                const days = ageMs / 86400000
                sourceAgeText = `\n• Umur sumber : ~${Math.floor(days)} hari`
                if (ageMs > REFRESH_THRESHOLD_MS) refreshNote = true
            }
        }

        try {
            meta = await sock.uploadThumbnail(await input(), { favicon: jenis === 'favicon' })
        } catch (err) {
            return m.reply(`❌ Gagal upload thumbnail: ${err.message}`)
        }

        const cdnUrl = meta.url || waMediaUrl(meta.thumbnailDirectPath)
        const newExpiry = getUrlExpiry(cdnUrl)
        expiredEpoch = newExpiry ? Math.floor(newExpiry.getTime() / 1000) : null
    }

    saveThumb({ name, jenis, status, metadata: meta, expired: expiredEpoch })

    const sisaText = expiredEpoch
        ? `${new Date(expiredEpoch * 1000).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} *(sisa ${formatDuration(expiredEpoch * 1000 - Date.now())})*`
        : 'tidak terdeteksi'

    return m.reply(
        `✅ *${jenis === 'favicon' ? 'Favicon' : 'Thumbnail'} tersimpan!*\n` +
        `• Nama    : \`${name}\`\n` +
        `• Jenis   : ${jenis}\n` +
        `• Status  : ${status}\n` +
        `• Sumber  : ${viaUpload ? 'upload baru' : 'metadata pesan'}\n` +
        `• Expired : ${sisaText}` +
        sourceAgeText +
        (refreshNote ? `\n\n🔄 Media sumber sudah >7 hari — otomatis *di-refresh* (re-upload) ke server biar metadatanya baru lagi.` : '')
    )
}

export default {
    command: 'addthumb',
    alias: ['addthumbnail', 'addthumbail'],
    category: 'owner',
    description: 'Menyimpan metadata thumbnail ke database dengan nama tertentu.\n\n' + usage({ prefix: '.', command: 'addthumb' }),
    help: '`[-private] <nama>` `[url]`',
    ownerOnly: true,
    typing: true,
    wait: true,

    async execute(m, ctx) {
        return addThumbFlow(m, ctx, 'thumbnail')
    }
}
