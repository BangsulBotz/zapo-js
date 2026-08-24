// plugins/owner/addfavicon.js

import { addThumbFlow } from './addthumb.js'

export default {
    command: 'addfavicon',
    alias: ['addfav', 'addfavico'],
    category: 'owner',
    description: 'Menyimpan metadata favicon ke database dengan nama tertentu.\n\n' +
        '*Format Penggunaan:*\n' +
        '> `Reply gambar`\n> .addfavicon <nama>\n\n' +
        '> `Kirim gambar dengan caption`\n> .addfavicon <nama>\n\n' +
        '> `Dari URL gambar`\n> .addfavicon <nama> <url>',
    help: '`<nama>` `[url]`',
    ownerOnly: true,
    typing: true,
    wait: true,

    async execute(m, ctx) {
        return addThumbFlow(m, ctx, 'favicon')
    }
}
