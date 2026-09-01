// plugins/grup/demote.js

import { executeParticipantAction, extractTarget, formatTargetUsage } from '../../lib/utils.js'

export default {
  command: 'demote',
  alias: ['hapusadmin','unadmin'],
  category: 'grup',
  description: `> Mencabut hak admin dari anggota grup.

*Keterangan Format:*
\`<@mention>\` = mention target.
\`<JID>\` = JID target (format: 628xxxx@s.whatsapp.net atau 628xxxx@lid).
(reply) = reply pesan target.

contoh penggunaan:
\`.demote @mention\`
\`.demote 628xxxx@s.whatsapp.net\`
\`.demote 628xxxx@lid\`
\`.demote\` (reply pesan target)

*Catatan:*
> bot harus admin grup.`,
  help: '<@mention/JID/reply>',
  onlyGroup: true,
  onlyBotAdmin: true,
  onlyAdmin: true,
  typing: true,

  async execute(m, { sock, args }) {
    const targets = extractTarget(m, args, { multiple: true })
    if (!targets.length) return m.reply(formatTargetUsage(m))

    const creds = sock.getCredentials?.()
    const botJid = creds?.meJid
    const filtered = targets.filter(t => t !== botJid)
    if (filtered.length !== targets.length) {
      await m.reply('⚠️ Tidak bisa demote bot sendiri.')
    }
    if (!filtered.length) return

    return executeParticipantAction(m, { sock }, {
      method: 'demoteParticipants',
      action: 'demote',
      successTitle: '✅ *Berhasil diturunkan dari admin:*',
      failureTitle: '❌ *Gagal:*',
      targets: filtered
    })
  }
}
