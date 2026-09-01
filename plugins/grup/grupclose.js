// plugins/grup/grupclose.js

export default {
  command: 'grupclose',
  alias: [ 'groupclose', 'closegrup', 'closegroup'],
  category: 'grup',
  description: 'Tutup grup, cuma admin yang bisa kirim pesan.',
  onlyGroup: true,
  onlyAdmin: true,
  onlyBotAdmin: true,
  typing: true,

  async execute(m, { sock }) {
    await sock.group.setSetting(m.chat, 'announcement', true)
    return m.reply('🔒 Grup ditutup, cuma admin yang bisa kirim pesan.')
  }
}