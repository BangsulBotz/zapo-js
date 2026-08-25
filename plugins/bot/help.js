// plugins/bot/help.js

import { getRandomThumb } from '../../db/thumbnails.js'

const HELP_URL = 'https://github.com/bangsulbotz/zapo-js'

function formatAliases(plugin) {
  const rawAliases = plugin.alias ?? plugin.aliases
  const aliases = Array.isArray(rawAliases)
    ? rawAliases
    : rawAliases
      ? [rawAliases]
      : []

  if (!aliases?.length) return '-'
  return aliases.map(alias => `\`${alias}\``).join(', ')
}

export default {
  command: 'help',
  alias: ['command'],
  category: 'bot',
  description: `Menampilkan detail command atau alias plugin.

*Format Penggunaan:*
> \`Menampilkan informasi plugin\`
> .help <command/alias>`,
  help: '`<command/alias>`',

  async execute(m, { plugins, sock }) {
    const requested = m.args?.[0]?.toLowerCase()

    if (!requested) {
      return m.reply(`Gunakan: ${m.prefix}${m.command} <command atau alias>\nContoh: ${m.prefix}${m.command} stele`)
    }

    const plugin = plugins.get(requested)
    if (!plugin) {
      return m.reply(`Fitur \`${requested}\` tidak ditemukan.\nGunakan ${m.prefix}menu untuk melihat daftar fitur.`)
    }

    const aliases = formatAliases(plugin)
    const source = plugin.source || 'Tidak diketahui'
    const description = plugin.description || 'Tidak ada deskripsi.'

    const info =
      `*Informasi Fitur*\n\n` +
      `*Command:* \`${m.prefix}${plugin.command}\`\n` +
      `*Alias:* ${aliases}\n` +
      `*Deskripsi:*\n${description}\n` +
      `*Directory:* \`${source}\``

    try {
      const opts = {
        url: HELP_URL,
        title: `Fitur ${m.prefix}${plugin.command}`,
        body: 'Detail informasi command & alias',
        text: info,
        thumbnail: 'random',
        quote: m
      }

      if (getRandomThumb('favicon')) opts.favicon = 'random'

      return await sock.sendThumbnail(m.chat, opts)
    } catch {
      return m.reply(info)
    }
  }
}
