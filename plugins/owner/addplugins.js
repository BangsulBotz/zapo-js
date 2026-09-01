// plugins/owner/addplugins.js

import fs from 'fs/promises'
import path from 'path'
import {
  extractPluginInfo,
  extractSourcePath,
  findMatchingPlugin,
  readPluginSource,
  reloadPlugins,
  resolvePluginPath,
  savePluginSource,
  sourceInputError,
  pluginUsage
} from './updateplugins.js'

export default {
  command: 'addplugins',
  alias: ['addplugin', 'newplugin'],
  category: 'owner',
  description: `> Menyimpan source plugin baru ke directory plugins.

*Keterangan Format:*
> (reply text/document plugin) = reply source code plugin.
> \`<nama file.js>\` = nama file plugin.

contoh penggunaan:
> \`.addplugins <nama file.js>\` (reply source plugin)
> \`.addplugins\` (jika baris pertama punya path)`,
  help: '(reply text/document)',
  onlyOwner: true,

  async execute(m, { args, plugins }) {
    let source

    try {
      source = await readPluginSource(m)
    } catch (err) {
      return m.reply(`Gagal membaca source plugin: ${err.message}\n\n${pluginUsage(m)}`)
    }

    if (!source?.trim()) return m.reply(sourceInputError(m))

    const info = extractPluginInfo(source)
    if (!info.command) {
      return m.reply(`Source plugin tidak valid karena property \`command\` tidak ditemukan.\n\n${pluginUsage(m)}`)
    }
    if (findMatchingPlugin(plugins, info)) {
      return m.reply('Command atau alias plugin sudah terdaftar. Gunakan updateplugins untuk memperbarui plugin tersebut.')
    }

    const requestedPath = extractSourcePath(source) || args.join(' ').trim()
    if (!requestedPath) {
      return m.reply(`Tentukan nama file. Contoh: ${m.prefix}${m.command} tes.js`)
    }

    const target = resolvePluginPath(requestedPath)
    if (!target) {
      return m.reply('Format path salah. Path harus berupa file .js di dalam directory plugins/.\nContoh: // plugins/bot/tes.js')
    }

    try {
      if (await fs.access(target).then(() => true).catch(() => false)) {
        return m.reply('File plugin sudah ada. Gunakan updateplugins untuk memperbaruinya.')
      }

      await savePluginSource(target, source)
      const directory = `./${path.relative(process.cwd(), target).replaceAll(path.sep, '/')}`
      try {
        const result = await reloadPlugins()
        return m.reply(`Plugin baru berhasil ditambahkan dan semua plugin berhasil di-reload.\nDirectory: \`${directory}\`\nLoaded: ${result.loaded}`)
      } catch (err) {
        return m.reply(`Plugin berhasil disimpan, tetapi reload gagal: ${err.message}`)
      }
    } catch (err) {
      return m.reply(`Gagal menyimpan plugin: ${err.message}`)
    }
  }
}
