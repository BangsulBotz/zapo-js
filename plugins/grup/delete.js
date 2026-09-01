// plugins/grup/delete.js

export default {
  command: 'delete',
  alias: ['del', 'hapus'],
  category: 'grup',
  description: `> Menghapus pesan yang di-reply. Admin grup bisa menghapus pesan dari member lain.

contoh penggunaan:
\`.delete\` (reply pesan yang ingin dihapus)`,
  help: '(reply pesan)',
  onlyGroup: true,
  onlyAdmin: true,
  typing: true,

  async execute(m, { sock }) {
    if (!m.quoted) return m.reply('❌ Reply pesan yang mau dihapus dulu.')
    const target = m.quoted.key
    if (!target?.id) return m.reply('❌ Tidak bisa menemukan ID pesan.')
    const isFromBot = m.quoted.fromMe === true
    if (!isFromBot && !m.isBotAdmin) {
      return m.reply('❌ Bot harus jadi admin grup untuk hapus pesan orang lain.')
    }
    try {
      await sock.message.send(m.chat, {
        type: 'revoke',
        target: {
          remoteJid: m.chat,
          id: target.id,
          fromMe: isFromBot,
          participant: isFromBot ? undefined : target.participant
        }
      })
    } catch (err) {
      return m.reply('❌ Gagal hapus pesan: ' + (err?.message || 'unknown error'))
    }
  }
}