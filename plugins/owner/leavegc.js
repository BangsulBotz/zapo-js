// plugins/owner/leavegc.js

export default {
  command: 'leavegc',
  alias: ['leavegroup'],
  category: 'owner',
  description: `> Keluar dari grup saat ini.

contoh penggunaan:
> \`.leavegc\``,
  onlyOwner: true,
  onlyGroup: true,

  async execute(m, { sock }) {
    await m.reply('see u, bot akan keluar dari grup. jangan rinduin aku ya🥺.')
    await sock.group.leaveGroup([m.chat])
    
  }
}
