// plugins/chanel/followch.js
import { parseChannelTarget } from '../../lib/utils.js'

export default {
  command: 'followch',
  alias: ['followchanel', 'followchannel', 'fch'],
  category: 'chanel',
  description: `> Mengikuti channel WhatsApp dari link atau JID.

*Keterangan Format:*
> \`<url channel>\` = link undangan channel.
> \`<jid channel>\` = JID channel (format: 120363xxx@newsletter).
> (reply) = reply pesan yang berisi link channel.

contoh penggunaan:
> \`.followch <url channel>\`
> \`.followch <jid channel>\`
> \`.followch\` (reply pesan berisi link channel)

*Catatan:*
> fitur ini hanya bisa digunakan oleh owner.`,
  help: '<url/jid>/(reply)',
  ownerOnly: true,
  typing: true,

  async execute(m, { sock, args }) {

    const raw = args.join(' ') || m.quoted?.text || ''
    const { invite, jid: parsedJid } = parseChannelTarget(raw)

    if (!invite && !parsedJid) {
      return m.reply(`Kirim link atau JID channel yang valid!\n\nContoh:\n> \`${m.prefix}${m.command} <url chanel>\`\n> \`${m.prefix}${m.command} <jid chanel>\`\n\natau reply pesan berisi link channel lalu ketik:\n> \`${m.prefix}${m.command}\``)
    }

    let jid = parsedJid
    let name = null

    try {
      if (!jid) {
        const metadata = await sock.newsletter.fetchByInvite(invite)
        jid = metadata.jid
        name = metadata.name
      }

      await sock.newsletter.follow(jid)
    } catch {
      return m.reply('Gagal follow channel, link/JID tidak valid atau channel tidak ditemukan.')
    }

    await m.reply(`✅ Berhasil follow channel${name ? `:\n*${name}*` : ''}\n\`\`\`${jid}\`\`\``)
  }
}
