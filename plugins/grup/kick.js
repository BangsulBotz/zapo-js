// plugins/grup/kick.js

import { executeParticipantAction } from '../../lib/utils.js'

export default {
  command: 'kick',
  alias: ['kickuser','kickmember','dor'],
  category: 'grup',
  description: `Keluarkan anggota dari grup.

*Format:*
> \`.kick @mention\`
> \`.kick\` (reply pesan)`,
  help: '(@mention/reply)',
  onlyGroup: true,
  onlyBotAdmin: true,
  onlyAdmin: true,
  typing: true,

  async execute(m, { sock, args }) {
    return executeParticipantAction(m, { sock, args }, {
      method: 'removeParticipants',
      action: 'remove',
      successTitle: '✅ *Berhasil dikick:*',
      failureTitle: '❌ *Gagal:*',
      args
    })
  }
}
