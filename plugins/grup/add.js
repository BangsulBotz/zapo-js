// plugins/grup/add.js

import { executeParticipantAction } from '../../lib/utils.js'

export default {
  command: 'add',
  alias: ['addmember', 'invitemember'],
  category: 'grup',
  description: `> Menambahkan anggota baru ke grup.

*Keterangan Format:*
\`<nomor HP>\` = nomor HP tanpa spasi.
\`<@mention>\` = mention anggota yang sudah ada di grup.
(reply) = reply pesan target.

contoh penggunaan:
\`.add 628xxxx\`
\`.add 628xxxx@s.whatsapp.net\`
\`.add 628xxxx@lid\`
\`.add\` (reply pesan target)
\`.add @mention\`

*Catatan:*
> bot harus admin grup dan target belum terdaftar di WhatsApp.`,
  help: '<nomor/@mention/reply>',
  onlyGroup: true,
  onlyBotAdmin: true,
  onlyAdmin: true,
  typing: true,

  async execute(m, { sock, args }) {
    return executeParticipantAction(m, { sock, args }, {
      method: 'addParticipants',
      action: 'add',
      successTitle: '✅ *Berhasil ditambah:*',
      failureTitle: '❌ *Gagal:*',
      args
    })
  }
}
