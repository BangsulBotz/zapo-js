// plugins/owner/addfavicon.js

import { addThumbFlow } from './addthumb.js'

export default {
    command: 'addfavicon',
    alias: ['addfav', 'addfavico'],
    category: 'owner',
    description: `> Menyimpan metadata favicon ke database dengan nama tertentu.

*Keterangan Format:*
> \`<nama>\` = nama unik untuk favicon.
> \`[url]\` = URL gambar (opsional jika reply gambar).

contoh penggunaan:
> \`.addfavicon <nama>\` (reply gambar)
> \`.addfavicon <nama> <url>\``,
    help: '<nama> <url>',
    ownerOnly: true,
    typing: true,
    wait: true,

    async execute(m, ctx) {
        return addThumbFlow(m, ctx, 'favicon')
    }
}
