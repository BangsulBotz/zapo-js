// plugins/bot/rss.js
import { formatBytes } from '../../lib/utils.js'

export default {
  command: 'memory',
  alias: ['mem', 'ram', 'rss'],
  category: 'bot',
  description: 'Menampilkan detail penggunaan memory bot.',
  typing: true,
  async execute(m) {
    const mem = process.memoryUsage()
    const lines = Object.entries(mem)
      .map(([key, value]) => `◦ *${key}:* ${formatBytes(value)}`)
      .join('\n')

    await m.reply(`*── 「 MEMORY USAGE 」 ──*\n\n${lines}`)
  }
}
