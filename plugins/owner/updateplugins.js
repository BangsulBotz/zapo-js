// plugins/owner/updateplugins.js

import fs from 'fs/promises'
import path from 'path'
import { reloadGlobalPlugins } from '../../lib/loadPlugins.js'

const PLUGINS_ROOT = path.resolve(process.cwd(), 'plugins')

export async function readPluginSource(m) {
  const quoted = m.quoted
  if (!quoted) return null

  if (quoted.mediaType === 'document' || quoted.type === 'documentMessage') {
    const buffer = await quoted.download()
    return buffer ? Buffer.from(buffer).toString('utf8') : null
  }

  if (!quoted.isMedia && quoted.text) return quoted.text
  return null
}

export function extractPluginInfo(source) {
  const command = source.match(/\bcommand\s*:\s*['"`]([^'"`]+)['"`]/i)?.[1]?.trim().toLowerCase()
  const aliasBlock = source.match(/\balias(?:es)?\s*:\s*(\[[\s\S]*?\]|['"`][^'"`]+['"`])/i)?.[1] || ''
  const aliases = [...aliasBlock.matchAll(/['"`]([^'"`]+)['"`]/g)]
    .map(([, alias]) => alias.trim().toLowerCase())
    .filter(Boolean)

  return { command, aliases }
}

export function extractSourcePath(source) {
  const firstLine = source.split(/\r?\n/, 1)[0]
  return firstLine.match(/^\s*\/\/\s*(plugins\/[^\s]+\.js)\s*$/i)?.[1] || null
}

export function resolvePluginPath(input) {
  const normalized = String(input || '').trim().replaceAll('\\', '/')
  if (!normalized) return null

  const relative = normalized.replace(/^\.\//, '')
  const pluginPath = relative.startsWith('plugins/')
    ? relative
    : `plugins/owner/${relative}`
  const withExtension = path.extname(pluginPath) ? pluginPath : `${pluginPath}.js`
  const fullPath = path.resolve(process.cwd(), withExtension)
  const relativeToRoot = path.relative(PLUGINS_ROOT, fullPath)

  if (!relativeToRoot || relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) return null
  if (!fullPath.endsWith('.js')) return null

  return fullPath
}

export function findMatchingPlugin(plugins, info) {
  for (const key of [info.command, ...info.aliases]) {
    if (key && plugins.get(key)) return plugins.get(key)
  }
  return null
}

export function pluginUsage(m, command = m.command) {
  return `*Format Penggunaan:*\n> Reply pesan teks/document berisi source plugin lalu ketik: ${m.prefix}${command}`
}

export function sourceInputError(m) {
  if (!m.quoted) {
    return `Reply pesan teks atau document berisi source plugin terlebih dahulu.\n\n${pluginUsage(m)}`
  }

  if (m.quoted.isMedia && m.quoted.mediaType !== 'document' && m.quoted.type !== 'documentMessage') {
    return `Format salah. Media yang didukung hanya pesan teks atau document.\n\n${pluginUsage(m)}`
  }

  return `Source plugin kosong atau tidak dapat dibaca.\n\n${pluginUsage(m)}`
}

export async function savePluginSource(fullPath, source) {
  await fs.mkdir(path.dirname(fullPath), { recursive: true })
  await fs.writeFile(fullPath, source, 'utf8')
}

export async function reloadPlugins() {
  const result = await reloadGlobalPlugins(PLUGINS_ROOT)
  if (result.errors) {
    throw new Error(`Reload menemukan ${result.errors} plugin error.`)
  }
  return result
}

export default {
  command: 'updateplugins',
  alias: ['pluginsupdate', 'updateplugin'],
  category: 'owner',
  description: `Memperbarui plugin berdasarkan command atau alias dari source code.

*Format Penggunaan:*
> \`Reply pesan source plugin, lalu ketik:\`
> .updateplugins`,
  help: '`(reply text/document plugin)`',
  onlyOwner: true,

  async execute(m, { plugins }) {
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
    const matched = findMatchingPlugin(plugins, info)

    if (matched) {
      const target = resolvePluginPath(matched.source)
      if (!target) return m.reply('Lokasi plugin yang cocok tidak valid.')

      try {
        await savePluginSource(target, source)
        try {
          const result = await reloadPlugins()
          return m.reply(`Plugin \`${info.command || matched.command}\` berhasil diperbarui dan semua plugin berhasil di-reload.\nDirectory: \`${matched.source}\`\nLoaded: ${result.loaded}`)
        } catch (err) {
          return m.reply(`Plugin berhasil disimpan, tetapi reload gagal: ${err.message}`)
        }
      } catch (err) {
        return m.reply(`Gagal menyimpan plugin: ${err.message}`)
      }
    }

    const sourcePath = extractSourcePath(source)
    if (!sourcePath) {
      return m.reply(
        'Plugin belum terdaftar dan komentar path pada baris pertama tidak ditemukan.\n' +
        `Jika ingin menyimpannya, gunakan ${m.prefix}addplugins <nama file>.`
      )
    }

    const target = resolvePluginPath(sourcePath)
    if (!target) {
      return m.reply('Format path salah. Path harus berupa file .js di dalam directory plugins/.\nContoh: // plugins/bot/tes.js')
    }

    try {
      if (await fs.access(target).then(() => true).catch(() => false)) {
        return m.reply('Plugin belum terdaftar, tetapi file pada path tersebut sudah ada. Gunakan updateplugins dengan command/alias yang sesuai.')
      }

      await savePluginSource(target, source)
      try {
        const result = await reloadPlugins()
        return m.reply(`Plugin baru berhasil disimpan dan semua plugin berhasil di-reload.\nDirectory: \`${sourcePath}\`\nLoaded: ${result.loaded}`)
      } catch (err) {
        return m.reply(`Plugin berhasil disimpan, tetapi reload gagal: ${err.message}`)
      }
    } catch (err) {
      return m.reply(`Gagal menyimpan plugin: ${err.message}`)
    }
  }
}
