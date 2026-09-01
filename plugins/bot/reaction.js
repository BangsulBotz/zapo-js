// plugins/bot/react.js

export default {
  command: 'react',
  alias: ['reaction'],
  category: 'bot',
  description: `> Memberikan reaction (emoji) pada pesan. Jika di-reply, akan bereaksi ke pesan yang di-reply. Jika tidak, bereaksi ke pesan command itu sendiri.

contoh penggunaan:
> \`.react 👍\`
> \`.react ❤️\``,
  help: '<emoji>',
  typing: true,

  async execute(m, { sock, args }) {
    const emoji = args[0]
    if (!emoji) return m.reply(`❌ Kasih emoji-nya. Contoh: \`${m.prefix}${m.command} 👍\``)

    const target = m.quoted ? m.quoted.key : m.key

    await sock.sendReact(m.chat, emoji, target)
  }
}