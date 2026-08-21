// plugins/grup/idgc.js
import { buildQuoteContext } from '../../lib/utils.js'

export default {
  command: 'idgc',
  alias: ['idgrup', 'idgroup', 'grupid', 'groupid'],
  category: 'grup',
  description: `Tampilkan *ID Grup* dalam bentuk tombol copy.

\`Cara Penggunaan:\`
> langsung kirim perintah: \`.idgc\` (hanya di dalam grup)`,
  groupOnly: true,
  typing: true,

  async execute(m) {
    await m.reply({
      interactiveMessage: {
        header: { title: '📍 Info Group ID', hasMediaAttachment: false },
        body: {
          text: `📌 *ID Grup:*\n\`\`\`${m.chat}\`\`\``
        },
        footer: { text: 'Gunakan tombol di bawah untuk menyalin ID' },
        nativeFlowMessage: {
          buttons: [
            {
              name: 'cta_copy',
              buttonParamsJson: JSON.stringify({
                display_text: '📋 Salin ID Grup',
                copy_code: m.chat
              })
            }
          ],
          messageVersion: 1
        },
        contextInfo: buildQuoteContext(m)
      }
    })
  }
}
