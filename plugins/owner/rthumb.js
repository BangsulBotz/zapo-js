// plugins/owner/rthumb.js

import { getThumb, listThumbs } from '../../db/thumbnails.js'
import { refreshThumbRow } from '../../lib/thumbAutoRefresh.js'

function usage(m) {
    return (
        `*Format Penggunaan:*\n` +
        `> \`Refresh satu entri\`\n> \`${m.prefix}${m.command} <nama>\`\n\n` +
        `> \`Refresh beberapa\` (pemisah \`,\` atau \`|\`)\n> \`${m.prefix}${m.command} <nama>, <nama>\`\n\n` +
        `> \`Refresh semua thumbnail & favicon\`\n> \`${m.prefix}${m.command} all\`\n\n` +
        `Media didownload ulang dari sumber lama lalu di-upload ulang, metadata & expiry baru otomatis disimpan. Status (random/private) tetap dipertahankan.`
    )
}

export default {
    command: 'rthumb',
    alias: ['refreshthumb', 'rthumbnail', 'thumbrefresh'],
    category: 'owner',
    description: `> Refresh metadata thumbnail/favicon: download ulang media dari sumber lama, upload ulang ke server, lalu simpan metadata baru.

*Keterangan Format:*
> \`<nama>\` = nama thumbnail/favicon.
> \`all\` = refresh semua thumbnail.

contoh penggunaan:
> \`.rthumb <nama>\`
> \`.rthumb all\``,
    help: '<nama>/all',
    ownerOnly: true,
    typing: true,
    wait: true,

    async execute(m, { args, sock }) {
        const raw = args.join(' ').trim()
        if (!raw) return m.reply(usage(m))

        const targets = []

        if (/^all$/i.test(raw)) {
            for (const jenis of ['thumbnail', 'favicon']) {
                for (const item of listThumbs(jenis)) {
                    const row = getThumb(item.name, jenis)
                    if (row) targets.push(row)
                }
            }
        } else {
            const names = raw.split(/[|,]/).map(p => p.trim()).filter(Boolean)
            for (const name of names) {
                const row = getThumb(name, 'thumbnail') || getThumb(name, 'favicon')
                if (row) targets.push(row)
                else targets.push({ missing: name })
            }
        }

        if (!targets.length) return m.reply('❌ Database thumbnail kosong, tidak ada yang bisa di-refresh.')

        const lines = []
        let ok = 0

        for (let i = 0; i < targets.length; i++) {
            const target = targets[i]

            if (target.missing) {
                lines.push(`❌ \`${target.missing}\` — tidak ditemukan di database.`)
                continue
            }

            const res = await refreshThumbRow(sock, target)
            if (res.ok) {
                ok++
                lines.push(`✅ \`${res.name}\` *(${res.jenis})*${res.ageNote}\n   Expired baru: ${res.expired}`)
            } else {
                lines.push(`❌ \`${res.name}\` *(${res.jenis})* — ${res.reason}`)
            }

            if (i < targets.length - 1) await new Promise(r => setTimeout(r, 1000))
        }

        return m.reply(
            `╾─「 *REFRESH THUMBNAIL* 」─╼\n\n` +
            lines.join('\n') +
            `\n\n*Total:* ${ok}/${targets.length} sukses`
        )
    }
}
