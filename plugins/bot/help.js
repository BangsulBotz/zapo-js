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
  return aliases.map(alias => `- ${alias}`).join('\n')
}

function getAccessLevel(plugin) {
  const access = []
  if (plugin.onlyOwner) access.push('Owner Only')
  if (plugin.onlyGroup) access.push('Group Only')
  if (plugin.onlyAdmin) access.push('Admin Only')
  if (plugin.onlyBotAdmin) access.push('Bot Admin Only')
  return access.length ? access.join(' & ') : 'Semua Orang'
}

function formatCategoryName(category) {
  if (!category || category === 'root') return 'Lainnya'
  return category
    .split(/[-_/]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export default {
  command: 'help',
  alias: ['command'],
  category: 'bot',
  description: `> Menampilkan informasi detail tentang command atau alias plugin.

contoh penggunaan:
> \`.help <command/alias>\`
> \`.help ping\`
> \`.help antilink\``,
  help: '<command/alias>',

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
    const description = plugin.description || 'Tidak ada deskripsi.'
    const cat = formatCategoryName(plugin.category)
    const access = getAccessLevel(plugin)
    const helpText = plugin.help ? `${m.prefix}${plugin.command} ${plugin.help.replace(/`/g, '')}` : null

    const info =
      `📋 BANTUAN COMMAND:\n` +
      `\`\`\`\n` +
      `Kategori : ${cat}\n` +
      `Akses    : ${access}\`\`\`\n\n` +
      `\`Nama Command :\`\n` +
      `- ${plugin.command}\n\n` +
      `\`Alias:\`\n` +
      `${aliases}\n\n` +
      `\`Deskripsi:\`\n` +
      `${description}` +
      (helpText ? `\n\n\`Contoh Format:\`\n> ${helpText}` : '')

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
