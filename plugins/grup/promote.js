// plugins/grup/promote.js

import { executeParticipantAction } from '../../lib/utils.js'

export default {
  command: 'promote',
  alias: ['jadikanadmin','jadiadmin'],
  category: 'grup',
  description: `Jadikan admin grup.

*Format:*
> \`.promote @mention\`
> \`.promote 628xxxx@s.whatsapp.net\`
> \`.promote 628xxxx@lid\`
> \`.promote\` (reply pesan target)`,
  help: '(@mention/reply/JID)',
  onlyGroup: true,
  onlyBotAdmin: true,
  onlyAdmin: true,
  typing: true,

  async execute(m, { sock, args }) {
    return executeParticipantAction(m, { sock, args }, {
      method: 'promoteParticipants',
      action: 'promote',
      successTitle: '✅ *Berhasil dipromosikan jadi admin:*',
      failureTitle: '❌ *Gagal:*',
      args
    })
  }
}
