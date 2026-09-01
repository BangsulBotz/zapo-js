// plugins/owner/delplugins.js

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { reloadGlobalPlugins } from '../../lib/loadPlugins.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PLUGINS_DIR = path.resolve(__dirname, '..')

function resolvePluginFullPath(source) {
  if (!source) return null
  const relPath = source.replace(/^\.\/plugins\//, '')
  return path.join(PLUGINS_DIR, relPath)
}

function findMatchingPlugin(plugins, key) {
  return plugins?.get(key.toLowerCase().trim()) || null
}

export default {
  command: 'delplugins',
  alias: ['delplugin', 'deleteplugin', 'removeplugin'],
  category: 'owner',
  description: `> Menghapus plugin dari directory plugins berdasarkan command atau alias.

*Keterangan Format:*
> \`<command/alias>\` = nama command atau alias plugin.

contoh penggunaan:
> \`.delplugins <command/alias>\``,
  help: '<command/alias>',
  onlyOwner: true,

  async execute(m, { args, plugins }) {
    const key = args[0]?.trim()

    if (!key) {
      return m.reply(`Tentukan command atau alias plugin yang mau dihapus.\nContoh: ${m.prefix}${m.command} ping`)
    }

    const plugin = findMatchingPlugin(plugins, key)

    if (!plugin) {
      return m.reply(`Plugin dengan command/alias \`${key}\` tidak ditemukan.`)
    }

    const target = resolvePluginFullPath(plugin.source)

    if (!target) {
      return m.reply('Gagal menentukan lokasi file plugin.')
    }

    try {
      if (!(await fs.access(target).then(() => true).catch(() => false))) {
        return m.reply(`File plugin tidak ditemukan di disk: \`${plugin.source}\``)
      }

      await fs.unlink(target)

      try {
        const result = await reloadGlobalPlugins(PLUGINS_DIR)
        return m.reply(`Plugin \`${plugin.command}\` berhasil dihapus dan semua plugin berhasil di-reload.\nDirectory: \`${plugin.source}\`\nLoaded: ${result.loaded}`)
      } catch (err) {
        return m.reply(`Plugin berhasil dihapus, tetapi reload gagal: ${err.message}`)
      }
    } catch (err) {
      return m.reply(`Gagal menghapus plugin: ${err.message}`)
    }
  }
}