// plugins/owner/addthumb.js

import { addThumbFlow, harvestPreviewMeta } from '../../lib/thumbnail.js'
export { addThumbFlow, harvestPreviewMeta }

export default {
  command: 'addthumb',
  alias: ['addthumbnail', 'addthumbail'],
  category: 'owner',
  description: `> Menyimpan metadata thumbnail ke database dengan nama tertentu.

*Keterangan Format:*
> \`<nama>\` = nama unik untuk thumbnail.
> \`[-private]\` = simpan sebagai thumbnail private.
> \`[url]\` = URL gambar (opsional jika reply gambar).

contoh penggunaan:
> \`.addthumb <nama>\` (reply gambar)
> \`.addthumb -private <nama> <url>\``,
  help: '<nama> <url>',
  ownerOnly: true,
  typing: true,
  wait: true,

  async execute(m, ctx) {
    return addThumbFlow(m, ctx, 'thumbnail')
  }
}