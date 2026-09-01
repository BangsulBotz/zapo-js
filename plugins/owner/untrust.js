// plugins/owner/untrust.js

import { removeTrustedUser } from '../../db/group.js'
import { extractTarget } from '../../lib/utils.js'

export default {
  command: 'untrust',
  alias: ['untrustuser'],
  category: 'owner',
  description: `> Menghapus izin user tertentu untuk fitur yang sudah di-trust.

*Keterangan Format:*
> \`<fitur>\` = nama fitur atau alias.
> \`<@mention/reply/nomor>\` = target user.

contoh penggunaan:
\`.untrust <fitur> @mention\`
\`.untrust <fitur> 628xxxx\``,
  help: '<fitur> <@tag/reply/nomor>',
  onlyOwner: true,
  typing: true,

  async execute(m, { args }) {
    const result = extractTarget(m, args, { requireFeature: true })
    if (result.error) return m.reply(result.error)
    const { target, plugin } = result
    if (!target) return m.reply('❌ Target tidak terdeteksi. Reply pesan, mention, atau masukkan nomor.')

    const { removed } = removeTrustedUser(target, plugin.command)
    const label = `@${target.split('@')[0]}`

    const text = removed
      ? `✅ Trust dihapus.\n\n👤 *User:* ${label}\n🔧 *Fitur:* \`${plugin.command}\``
      : `⚠️ User ini memang tidak pernah di-trust untuk fitur \`${plugin.command}\`.`

    try {
      return await m.reply(m.chat, text, { mentions: [target] })
    } catch (err) {
      console.warn('[UNTRUST] Perubahan tersimpan, tetapi konfirmasi gagal dikirim:', err?.message || err)
      return null
    }
  }
}
