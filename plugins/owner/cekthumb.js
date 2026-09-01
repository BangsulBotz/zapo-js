// plugins/owner/cekthumb.js

import { formatDuration } from '../../lib/utils.js'

const PREVIEW_URL = 'https://github.com/bangsulbotz/zapo-js'

function formatTs(epoch) {
    return epoch ? new Date(epoch * 1000).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : '-'
}

function describe(row, label) {
    const meta = row.metadata || {}
    const lines = [
        `${label} \`${row.name}\``,
        `• Status  : ${row.status}`,
        `• Ukuran  : ${meta.thumbnailWidth && meta.thumbnailHeight ? `${meta.thumbnailWidth} × ${meta.thumbnailHeight}` : '-'}`,
        `• Mime    : ${meta.mimetype || '-'}`,
        `• Preview : ${meta.jpegThumbnail ? 'ada' : 'tidak ada'}`
    ]

    const expired = row.expired ? new Date(row.expired * 1000) : null
    if (expired) {
        const sisaMs = expired.getTime() - Date.now()
        lines.push(`• Expired : ${formatTs(row.expired)} *(sisa ${sisaMs > 0 ? formatDuration(sisaMs) : 'sudah lewat'})*`)
        lines.push(`• Kondisi : ${sisaMs > 0 ? '✅ aktif' : '⚠️ lewat estimasi oe — biasanya masih bisa diakses'}`)
    } else {
        lines.push('• Expired : tidak terdeteksi')
    }

    lines.push(`• Dibuat  : ${formatTs(row.created_at)}`)
    lines.push(`• Update  : ${formatTs(row.updated_at)}`)
    return lines.join('\n')
}

export default {
    command: 'cekthumb',
    alias: ['cekthumbnail', 'thumbnailcek', 'thumbcek'],
    category: 'owner',
    description: `> Menampilkan info thumbnail/favicon dari database — semua status (private maupun random).

*Keterangan Format:*
> \`<nama>\` = nama thumbnail.
> \`<nama>, <nama favicon>\` = cek thumbnail + favicon (pemisah pakai \`|\`).
> \`random\` = pakai data acak dari pool random.

contoh penggunaan:
> \`.cekthumb <nama>\`
> \`.cekthumb <nama>, <nama favicon>\`
> \`.cekthumb random | random\``,
    help: '<nama thumb> | <nama favicon>',
    ownerOnly: true,
    typing: true,

    async execute(m, { args, sock }) {
        let parts = args.join(' ').split(/[|,]/).map(p => p.trim()).filter(Boolean)

        if (parts.length === 1 && args.length > 1) parts = [args[0].trim(), args.slice(1).join(' ').trim()]

        const [thumbName, favName] = parts.map(p => p.replace(/^["']+|["']+$/g, '')).filter(Boolean)

        if (!thumbName) {
            return m.reply(
                `Gunakan: \`${m.prefix}${m.command} <nama thumbnail>[, <nama favicon>]\`\n\n` +
                `Contoh:\n` +
                `> \`${m.prefix}${m.command} utama\`\n` +
                `> \`${m.prefix}${m.command} utama | fav1\`\n` +
                `> \`${m.prefix}${m.command} random\``
            )
        }

        async function safeResolve(value, jenis) {
            try {
                return await sock.resolveThumbMeta(value, jenis)
            } catch {
                return null
            }
        }

        const thumbRow = await safeResolve(thumbName, 'thumbnail')
        const favRow = favName ? await safeResolve(favName, 'favicon') : null

        const blocks = [
            thumbRow ? describe(thumbRow, '🖼️ *Thumbnail:*') : `❌ Thumbnail \`${thumbName}\` tidak ditemukan.`
        ]
        if (favName) {
            blocks.push(favRow ? describe(favRow, '🌐 *Favicon:*') : `❌ Favicon \`${favName}\` tidak ditemukan.`)
        }

        await m.reply(`╾─「 *CEK THUMBNAIL* 」─╼\n\n${blocks.join('\n\n')}`)

        if (!thumbRow) return

        try {
            await sock.sendThumbnail(m.chat, {
                url: PREVIEW_URL,
                title: 'ini adalah title',
                body: 'ini adalah body',
                text: 'thumbnail zapo-js',
                thumbnail: thumbRow.metadata,
                ...(favRow ? { favicon: favRow.metadata } : {}),
                quote: m
            })
        } catch (err) {
            console.error('[CEKTHUMB] preview gagal:', err.message)
            await m.reply(`⚠️ Info di atas valid, tapi preview gagal dikirim: ${err.message}`)
        }
    }
}
