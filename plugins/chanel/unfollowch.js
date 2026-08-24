// plugins/chanel/unfollowch.js
import { parseChannelTarget } from '../../lib/utils.js'

export default {
  command: 'unfollowch',
  alias: ['unfollowchanel', 'unfollowchannel', 'ufch', 'unfollch', 'unfolch'],
  category: 'chanel',
  description: 'Berhenti mengikuti channel WhatsApp dari link atau JID.\n\n' +
    '*Format Penggunaan:*\n' +
    '> `Menggunakan URL channel`\n> .unfollowch <url channel>\n\n' +
    '> `Menggunakan JID channel`\n> .unfollowch <jid channel>\n\n' +
    '> `Menggunakan link channel dari pesan yang di-reply`\n> .unfollowch',
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

      await sock.newsletter.unfollow(jid)
    } catch {
      return m.reply('Gagal unfollow channel, link/JID tidak valid atau channel tidak ditemukan.')
    }

    await m.reply(`✅ Berhasil unfollow channel${name ? `:\n*${name}*` : ''}\n\`\`\`${jid}\`\`\``)
  }
}
