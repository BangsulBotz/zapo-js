// plugins/bot/help.js

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

  async execute(m, { plugins }) {
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

    return m.reply(
      `*Informasi Fitur*\n\n` +
      `*Command:* \`${m.prefix}${plugin.command}\`\n` +
      `*Alias:* ${aliases}\n` +
      `*Deskripsi:*\n${description}\n` +
      `*Directory:* \`${source}\``
    )
  }
}
