// plugins/owner/listthumb.js

import { listThumbs } from '../../db/thumbnails.js'

export default {
    command: 'listthumb',
    alias: ['listthumbnail', 'lt', 'thumblist', 'thumbnaillist'],
    category: 'owner',
    description: `> Menampilkan daftar semua thumbnail & favicon tersimpan, dikelompokkan per status.

contoh penggunaan:
> \`.listthumb\``,
    ownerOnly: true,
    typing: true,

    async execute(m) {
        const thumbs = listThumbs('thumbnail')
        const favicons = listThumbs('favicon')

        const randoms = thumbs.filter(t => t.status === 'random').map(t => `- \`${t.name}\``)
        const privates = thumbs.filter(t => t.status === 'private').map(t => `- \`${t.name}\``)
        const favLines = favicons.map(t => `- \`${t.name}\``)

        const section = (title, lines) =>
            `*${title}* (${lines.length}):\n${lines.length ? lines.join('\n') : '- _kosong_'}`

        const text = [
            `╾─「 *DAFTAR THUMBNAIL* 」─╼`,
            ``,
            section('🖼️ Thumbnail random', randoms),
            ``,
            section('🔒 Thumbnail private', privates),
            ``,
            section('🌐 Favicon', favLines)
        ].join('\n')

        return m.reply(text)
    }
}
