// plugins/tools/rvo.js

export default {
  command: 'rvo',
  alias: ['readviewonce'],
  category: 'tools',
  description: `> Membaca pesan view once. Media akan dikirim ulang tanpa batasan view once.

contoh penggunaan:
> \`.rvo\` (reply pesan view once)`,
  help: '(reply view once)',
  typing: true,

  async execute(m, { sock }) {
    if (!m.quoted) return m.reply('Reply pesan view once.')
    if (!m.quoted.isMedia) return m.reply('Itu bukan pesan media.')

    const type = m.quoted.type
    const full = m.quoted.full
    const msg = { ...full[type] }

    if (!msg.viewOnce) return m.reply('Pesan ini bukan view once.')
    delete msg.viewOnce

    return sock.message.send(m.chat, { [type]: msg }, { quoted: m.raw })
  }
}
