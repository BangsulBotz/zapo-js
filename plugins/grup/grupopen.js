// plugins/grup/grupopen.js

export default {
  command: 'grupopen',
  alias: ['groupopen', 'opengrup', 'opengroup'],
  category: 'grup',
  description: 'Buka grup, semua member bisa kirim pesan.',
  onlyGroup: true,
  onlyAdmin: true,
  onlyBotAdmin: true,
  typing: true,

  async execute(m, { sock }) {
    await sock.group.setSetting(m.chat, 'announcement', false)
    return m.reply('🔓 Grup dibuka, semua member bisa kirim pesan.')
  }
}