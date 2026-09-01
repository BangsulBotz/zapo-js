// plugins/grup/linkgc.js

export default {
  command: 'linkgc',
  alias: ['linkgrup', 'linkgroup', 'grouplink', 'gruplink', 'gclink'],
  category: 'grup',
  description: 'Dapatkan link undangan grup.',
  onlyGroup: true,
  onlyAdmin: true,
  onlyBotAdmin: true,
  typing: true,

  async execute(m, { sock }) {
    const meta = await sock.group.queryGroupMetadata(m.chat)
    const code = await sock.group.queryInviteCode(m.chat)
    return m.reply(`*Grup:* ${meta.subject}\n*Link:* https://chat.whatsapp.com/${code}`)
  }
}
