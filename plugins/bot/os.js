//plugins/bot/os.js

import os from 'os'
import fs from 'fs/promises'
import { formatBytes, formatDuration } from '../../lib/utils.js'

export default {
  command: 'os',
  alias: ['.os'],
  category: 'bot',
  description: `> Menampilkan informasi lengkap tentang sistem operasi dan penggunaan resource server meliputi OS, CPU, RAM, storage, swap, dan jaringan.

contoh penggunaan:
> \`.os\``,
  typing: true,

  async execute(m) {
    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const usedMem = totalMem - freeMem
    const ramUsage = Number(((usedMem / totalMem) * 100).toFixed(1))

    const mem = process.memoryUsage()
    const cpus = os.cpus()
    const cpuCores = cpus.length
    const load = os.loadavg()

    const cpuUsage = Math.min(
      100,
      Number(((load[0] / cpuCores) * 100).toFixed(1))
    )

    let storageTotal = 0
    let storageFree = 0
    let storageUsed = 0
    let storageUsage = 0

    try {
      const stat = await fs.statfs(process.cwd())

      storageTotal = Number(stat.blocks) * Number(stat.bsize)
      storageFree = Number(stat.bavail) * Number(stat.bsize)
      storageUsed = Math.max(0, storageTotal - storageFree)

      storageUsage = storageTotal > 0
        ? Number(((storageUsed / storageTotal) * 100).toFixed(1))
        : 0
    } catch {}

    let swapTotal = 0
    let swapUsed = 0
    let swapFree = 0
    let swapUsage = 0

    try {
      const swapData = await fs.readFile('/proc/meminfo', 'utf8')

      const totalKB = parseInt(
        swapData.match(/SwapTotal:\s+(\d+)/)?.[1] || 0
      )

      const freeKB = parseInt(
        swapData.match(/SwapFree:\s+(\d+)/)?.[1] || 0
      )

      swapTotal = totalKB * 1024
      swapFree = freeKB * 1024
      swapUsed = swapTotal - swapFree

      swapUsage = swapTotal > 0
        ? Number(((swapUsed / swapTotal) * 100).toFixed(1))
        : 0
    } catch {}

    const cpuModel =
      cpus[0]?.model?.replace(/\s+/g, ' ').trim() || 'Unknown'

    const hostname = os.hostname()
    const uptime = formatDuration(process.uptime() * 1000)
    const systemUptime = formatDuration(os.uptime() * 1000)

    const networkInterfaces = os.networkInterfaces()
    const networks = []

    for (const [name, addresses] of Object.entries(networkInterfaces)) {
      for (const address of addresses || []) {
        if (!address.internal && address.address) {
          networks.push({
            name,
            address: address.address,
            family: address.family
          })
        }
      }
    }

    const primaryNetwork =
      networks.find(network => network.family === 'IPv4') ||
      networks[0]

    let username = 'Unknown'

    try {
      username = os.userInfo().username || 'Unknown'
    } catch {}

    const isBun = typeof Bun !== 'undefined'
    const runtimeName = isBun ? 'Bun' : 'Node.js'
    const runtimeVersion = isBun ? Bun.version : process.version
    const nodeCompatibility = process.version
    const engine = isBun ? 'JavaScriptCore' : 'V8'
    const executable = process.execPath || 'N/A'

    const surfaceId = `starcore-os=${Date.now()}`

    const components = [
      {
        id: 'root',
        component: 'Column',
        children: [
          'hero',
          'system',
          'resources',
          'node_memory',
          'swap',
          'network',
          'runtime'
        ]
      },

      {
        id: 'hero',
        component: 'Card',
        child: 'hero_content'
      },
      {
        id: 'hero_content',
        component: 'Column',
        children: [
          'hero_title',
          'hero_subtitle',
          'hero_status'
        ]
      },
      {
        id: 'hero_title',
        component: 'Text',
        text: 'Server Inspector',
        variant: 'h1'
      },
      {
        id: 'hero_subtitle',
        component: 'Text',
        text: 'Live operating system information',
        variant: 'caption'
      },
      {
        id: 'hero_status',
        component: 'Text',
        text: `● ${hostname}`,
        variant: 'body'
      },

      {
        id: 'system',
        component: 'Card',
        child: 'system_content'
      },
      {
        id: 'system_content',
        component: 'Column',
        children: [
          'system_title',
          'system_divider',
          'os_info',
          'kernel',
          'architecture',
          'cpu_model',
          'cpu_cores',
          'hostname',
          'username',
          'endianness'
        ]
      },
      {
        id: 'system_title',
        component: 'Text',
        text: 'System Information',
        variant: 'h2'
      },
      {
        id: 'system_divider',
        component: 'Divider'
      },
      {
        id: 'os_info',
        component: 'Text',
        text: `OS · ${os.platform()} ${os.version()}`,
        variant: 'body'
      },
      {
        id: 'kernel',
        component: 'Text',
        text: `Kernel · ${os.release()}`,
        variant: 'body'
      },
      {
        id: 'architecture',
        component: 'Text',
        text: `Architecture · ${os.arch()}`,
        variant: 'body'
      },
      {
        id: 'cpu_model',
        component: 'Text',
        text: `CPU · ${cpuModel}`,
        variant: 'body'
      },
      {
        id: 'cpu_cores',
        component: 'Text',
        text: `CPU Cores · ${cpuCores}`,
        variant: 'body'
      },
      {
        id: 'hostname',
        component: 'Text',
        text: `Hostname · ${hostname}`,
        variant: 'body'
      },
      {
        id: 'username',
        component: 'Text',
        text: `User · ${username}`,
        variant: 'body'
      },
      {
        id: 'endianness',
        component: 'Text',
        text: `Endianness · ${os.endianness()}`,
        variant: 'body'
      },

      {
        id: 'resources',
        component: 'Card',
        child: 'resources_content'
      },
      {
        id: 'resources_content',
        component: 'Column',
        children: [
          'resources_title',
          'resources_divider',
          'cpu_slider',
          'ram_slider',
          'storage_slider',
          'resource_details'
        ]
      },
      {
        id: 'resources_title',
        component: 'Text',
        text: 'System Resources',
        variant: 'h2'
      },
      {
        id: 'resources_divider',
        component: 'Divider'
      },
      {
        id: 'cpu_slider',
        component: 'Slider',
        label: `CPU · ${cpuUsage}%`,
        min: 0,
        max: 100,
        value: cpuUsage
      },
      {
        id: 'ram_slider',
        component: 'Slider',
        label: `RAM · ${ramUsage}%`,
        min: 0,
        max: 100,
        value: ramUsage
      },
      {
        id: 'storage_slider',
        component: 'Slider',
        label: `SSD Storage · ${storageUsage}%`,
        min: 0,
        max: 100,
        value: storageUsage
      },
      {
        id: 'resource_details',
        component: 'Text',
        text:
          `CPU Load · ${load.map(value => value.toFixed(2)).join(' · ')}\n` +
          `RAM · ${formatBytes(usedMem)} / ${formatBytes(totalMem)}\n` +
          `SSD · ${formatBytes(storageUsed)} / ${formatBytes(storageTotal)}`,
        variant: 'caption'
      },

      {
        id: 'node_memory',
        component: 'Card',
        child: 'node_memory_content'
      },
      {
        id: 'node_memory_content',
        component: 'Column',
        children: [
          'node_memory_title',
          'node_memory_divider',
          'rss',
          'heap_total',
          'heap_used',
          'external',
          'array_buffers'
        ]
      },
      {
        id: 'node_memory_title',
        component: 'Text',
        text: 'Node.js Memory',
        variant: 'h2'
      },
      {
        id: 'node_memory_divider',
        component: 'Divider'
      },
      {
        id: 'rss',
        component: 'Text',
        text: `RSS · ${formatBytes(mem.rss)}`,
        variant: 'body'
      },
      {
        id: 'heap_total',
        component: 'Text',
        text: `Heap Total · ${formatBytes(mem.heapTotal)}`,
        variant: 'body'
      },
      {
        id: 'heap_used',
        component: 'Text',
        text: `Heap Used · ${formatBytes(mem.heapUsed)}`,
        variant: 'body'
      },
      {
        id: 'external',
        component: 'Text',
        text: `External · ${formatBytes(mem.external)}`,
        variant: 'body'
      },
      {
        id: 'array_buffers',
        component: 'Text',
        text: `ArrayBuffers · ${formatBytes(mem.arrayBuffers)}`,
        variant: 'body'
      },

      {
        id: 'swap',
        component: 'Card',
        child: 'swap_content'
      },
      {
        id: 'swap_content',
        component: 'Column',
        children: [
          'swap_title',
          'swap_divider',
          'swap_slider',
          'swap_total',
          'swap_used',
          'swap_free'
        ]
      },
      {
        id: 'swap_title',
        component: 'Text',
        text: 'Swap Memory',
        variant: 'h2'
      },
      {
        id: 'swap_divider',
        component: 'Divider'
      },
      {
        id: 'swap_slider',
        component: 'Slider',
        label: `Swap Usage · ${swapUsage}%`,
        min: 0,
        max: 100,
        value: swapUsage
      },
      {
        id: 'swap_total',
        component: 'Text',
        text: `Total · ${swapTotal ? formatBytes(swapTotal) : 'N/A'}`,
        variant: 'body'
      },
      {
        id: 'swap_used',
        component: 'Text',
        text: `Used · ${swapTotal ? formatBytes(swapUsed) : 'N/A'}`,
        variant: 'body'
      },
      {
        id: 'swap_free',
        component: 'Text',
        text: `Free · ${swapTotal ? formatBytes(swapFree) : 'N/A'}`,
        variant: 'body'
      },

      {
        id: 'network',
        component: 'Card',
        child: 'network_content'
      },
      {
        id: 'network_content',
        component: 'Column',
        children: [
          'network_title',
          'network_divider',
          'primary_ip',
          'network_count',
          'network_list'
        ]
      },
      {
        id: 'network_title',
        component: 'Text',
        text: 'Network',
        variant: 'h2'
      },
      {
        id: 'network_divider',
        component: 'Divider'
      },
      {
        id: 'primary_ip',
        component: 'Text',
        text: `Primary IP · ${primaryNetwork?.address || 'N/A'}`,
        variant: 'body'
      },
      {
        id: 'network_count',
        component: 'Text',
        text: `Interfaces · ${networks.length}`,
        variant: 'body'
      },
      {
        id: 'network_list',
        component: 'Text',
        text: networks.length
          ? networks
              .slice(0, 6)
              .map(network => `${network.name} · ${network.address}`)
              .join('\n')
          : 'No network interface detected',
        variant: 'caption'
      },

      {
        id: 'runtime',
        component: 'Card',
        child: 'runtime_content'
      },
      {
        id: 'runtime_content',
        component: 'Column',
        children: [
          'runtime_title',
          'runtime_divider',
          'runtime_name',
          'runtime_version',
          'node_compat',
          'engine',
          'pid',
          'bot_uptime',
          'system_uptime',
          'executable'
        ]
      },
      {
        id: 'runtime_title',
        component: 'Text',
        text: 'Runtime',
        variant: 'h2'
      },
      {
        id: 'runtime_divider',
        component: 'Divider'
      },
      {
        id: 'runtime_name',
        component: 'Text',
        text: `Runtime · ${runtimeName}`,
        variant: 'body'
      },
      {
        id: 'runtime_version',
        component: 'Text',
        text: `${runtimeName} Version · ${runtimeVersion}`,
        variant: 'body'
      },
      {
        id: 'node_compat',
        component: 'Text',
        text: `Node Compatibility · ${nodeCompatibility}`,
        variant: 'body'
      },
      {
        id: 'engine',
        component: 'Text',
        text: `JavaScript Engine · ${engine}`,
        variant: 'body'
      },
      {
        id: 'pid',
        component: 'Text',
        text: `PID · ${process.pid}`,
        variant: 'body'
      },
      {
        id: 'bot_uptime',
        component: 'Text',
        text: `Bot Uptime · ${uptime}`,
        variant: 'body'
      },
      {
        id: 'system_uptime',
        component: 'Text',
        text: `System Uptime · ${systemUptime}`,
        variant: 'body'
      },
      {
        id: 'executable',
        component: 'Text',
        text: `Executable · ${executable}`,
        variant: 'caption'
      }
    ]

    await m.reply({
      interactiveMessage: {
        body: {
          text: '​'
        },
        nativeFlowMessage: {
          buttons: [{ name: '' }],
          messageParamsJson: JSON.stringify({})
        },
        bloksWidget: {
          uuid: '5c9e3a72-8b4d-4f6a-9c1e-7d3b5a8f2c64',
          data: JSON.stringify({
            version: 'v0.9',
            createSurface: {
              surfaceId,
              catalogId:
                'https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json',
              components
            }
          }),
          type: 'im_a2ui'
        }
      }
    })
  }
}