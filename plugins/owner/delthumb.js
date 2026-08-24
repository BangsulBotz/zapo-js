// plugins/owner/delthumb.js

import { deleteThumb } from '../../db/thumbnails.js'

export default {
    command: 'delthumb',
    alias: ['deletethumb', 'hapusthumb', 'delthumbnail'],
    category: 'owner',
    description: `Menghapus thumbnail dari koleksi database.

*Format Penggunaan:*
> \`Hapus satu thumbnail\`
> .delthumb <nama>

> \`Hapus beberapa thumbnail\`
> .delthumb <nama1>, <nama2>

*Contoh:*
> .delthumb anime
> .delthumb anime, kartun`,
    help: '<nama>[, <nama>]',
    ownerOnly: true,
    typing: true,

    async execute(m, { args }) {
        const input = args.join(' ').trim()

        if (!input) {
            return m.reply(`Sebutkan nama thumbnail-nya!\nContoh: ${m.prefix}${m.command} anime`)
        }

        const names = [...new Set(input.split(',').flatMap(part => part.trim().split(/\s+/)).filter(Boolean))]

        const lines = []
        let deleted = 0

        for (const name of names) {
            if (/^random$/i.test(name)) {
                lines.push(`⚠️ \`${name}\` - kata kunci khusus, tidak bisa dihapus`)
                continue
            }

            if (deleteThumb(name, 'thumbnail')) {
                deleted++
                lines.push(`✅ \`${name}\` - terhapus`)
            } else {
                lines.push(`⚠️ \`${name}\` - tidak ditemukan`)
            }
        }

        return m.reply(
            `╾─「 *HAPUS THUMBNAIL* 」─╼\n\n` +
            `${lines.join('\n')}\n\n` +
            `*Total terhapus:* ${deleted}/${names.length}`
        )
    }
}
