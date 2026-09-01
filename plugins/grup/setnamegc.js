// plugins/grup/setnamegc.js

export default {
  command: 'setnamegc',
  alias: ['setnamegrup', 'setnamegroup', 'grupsetname', 'groupsetname'],
  category: 'grup',
  description: 'Ganti nama grup.',
  help: '<nama grup>',
  onlyGroup: true,
  onlyAdmin: true,
  onlyBotAdmin: true,
  typing: true,

  async execute(m, { sock, args }) {
    const name = args.join(' ').trim()
    if (!name) return m.reply(`❌ Format salah.\n\n*Contoh:*\n> ${m.prefix}${m.command} Nama Grup Baru`)

    await sock.group.setSubject(m.chat, name)
    return m.reply(`✅ Nama grup diganti jadi *${name}*`)
  }
}