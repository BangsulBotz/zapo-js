// plugins/bot/memory.js
import { formatBytes } from '../../lib/utils.js'

export default {
  command: 'memory',
  alias: ['mem', 'ram', 'rss'],
  description: `Tampilkan detail penggunaan *RAM* bot.

\`Cara Penggunaan:\`
> langsung kirim perintah: \`.memory\``,
  typing: true,
  category: 'bot',
  async execute(m) {
    const mem = process.memoryUsage()
    const lines = Object.entries(mem)
      .map(([key, value]) => `◦ *${key}:* ${formatBytes(value)}`)
      .join('\n')

    await m.reply(`*── 「 MEMORY USAGE 」 ──*\n\n${lines}`)
  }
}