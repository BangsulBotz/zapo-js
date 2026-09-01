import os from 'os'
import fs from 'fs/promises'
import { formatBytes, formatDuration } from '../../lib/utils.js'

export default {
  command: 'runtime',
  alias: ['rt', 'uptime', 'status'],
  category: 'bot',
  description: `> Menampilkan status aktif bot (uptime), versi Node.js, platform, penggunaan memori, RAM, swap, dan info CPU.

contoh penggunaan:
> \`.runtime\`
> \`.uptime\``,
  typing: true,

  async execute(m) {
    const uptimeStr = formatDuration(process.uptime() * 1000)
    const mem = process.memoryUsage()

    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const cpuCores = os.cpus().length
    const load = os.loadavg()

    let swapTotal = 'N/A', swapUsed = 'N/A', swapFree = 'N/A', swapUsagePercent = '0%'
    try {
      const swapData = await fs.readFile('/proc/meminfo', 'utf8')
      const totalKB = parseInt(swapData.match(/SwapTotal:\s+(\d+)/)?.[1] || 0)
      const freeKB = parseInt(swapData.match(/SwapFree:\s+(\d+)/)?.[1] || 0)
      const usedKB = totalKB - freeKB
      swapTotal = formatBytes(totalKB * 1024)
      swapUsed = formatBytes(usedKB * 1024)
      swapFree = formatBytes(freeKB * 1024)
      swapUsagePercent = totalKB > 0 ? ((usedKB / totalKB) * 100).toFixed(1) + '%' : '0%'
    } catch {}

    await m.reply(`\`\`\`〔 𝙎𝙩𝙖𝙩𝙪𝙨 𝘽𝙤𝙩 〕

Uptime Bot : ${uptimeStr}
◦ Node.js  : ${process.version}
◦ Platform : ${os.platform()} (${os.arch()})
◦ PID      : ${process.pid}

𝙈𝙚𝙢𝙤𝙧𝙮 𝙐𝙨𝙖𝙜𝙚 (𝙉𝙤𝙙𝙚.𝙟𝙨)
◦ RSS (total)   : ${formatBytes(mem.rss)}
◦ Heap Total    : ${formatBytes(mem.heapTotal)}
◦ Heap Used     : ${formatBytes(mem.heapUsed)}
◦ External      : ${formatBytes(mem.external)}
◦ ArrayBuffers  : ${formatBytes(mem.arrayBuffers)}

𝙎𝙮𝙨𝙩𝙚𝙢 𝙈𝙚𝙢𝙤𝙧𝙮
◦ Total RAM : ${formatBytes(totalMem)}
◦ Used RAM  : ${formatBytes(totalMem - freeMem)}
◦ Free RAM  : ${formatBytes(freeMem)}

𝙎𝙬𝙖𝙥 𝙈𝙚𝙢𝙤𝙧𝙮
◦ Total Swap : ${swapTotal}
◦ Used Swap  : ${swapUsed}
◦ Free Swap  : ${swapFree}
◦ Usage      : ${swapUsagePercent}

𝘾𝙋𝙐 𝙄𝙣𝙛𝙤
◦ Cores        : ${cpuCores}
◦ Load Average : ${load.map(l => l.toFixed(2)).join(', ')}
◦ Usage (est.) : ${((load[0] / cpuCores) * 100).toFixed(1)}%\`\`\``)
  }
}
