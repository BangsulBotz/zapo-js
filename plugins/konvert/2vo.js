// plugins/konvert/2vo.js

export default {
  command: '2vo',
  alias: ['toviewonce', 'tovo'],
  category: 'konvert',
  description: `> Mengubah pesan media menjadi view once. Media akan otomatis hilang setelah dilihat.

contoh penggunaan:
> \`.2vo\` (reply pesan media)`,
  help: '(reply media)',
  typing: true,

  async execute(m, { sock }) {
    if (!m.quoted) return m.reply('Reply pesan media yang mau dijadikan view once.')
    if (!m.quoted.isMedia) return m.reply('Itu bukan pesan media.')

    const type = m.quoted.type
    const full = m.quoted.full
    const msg = { ...full[type] }

    msg.viewOnce = true

    return sock.message.send(m.chat, { [type]: msg }, { quoted: m.raw })
  }
}
