// plugins/bot/rss.js
import { formatBytes } from '../../lib/utils.js'

export default {
  command: 'memory',
  alias: ['mem', 'ram', 'rss'],
  category: 'bot',
  description: `> Menampilkan detail penggunaan memori bot meliputi RSS, heap total, heap used, external, dan array buffers.

contoh penggunaan:
> \`.memory\`
> \`.ram\``,
  typing: true,
  async execute(m) {
    const mem = process.memoryUsage()
    const lines = Object.entries(mem)
      .map(([key, value]) => `◦ *${key}:* ${formatBytes(value)}`)
      .join('\n')

    await m.reply(`*── 「 MEMORY USAGE 」 ──*\n\n${lines}`)
  }
}
