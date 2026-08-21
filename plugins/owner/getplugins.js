// plugins/owner/getplugins.js

import fs from 'fs/promises'
import path from 'path'

export default {
  command: 'getplugins',
  alias: ['gp'],
  category: 'owner',
  description: `Mengambil source plugin berdasarkan command atau alias.

*Format Penggunaan:*
> \`Mengirim source sebagai file\`
> .gp <command/alias>

> \`Menampilkan source langsung\`
> .gp -cat <command/alias>`,
  help: '`<command/alias>` atau `-cat <command/alias>`',
  onlyOwner: true,

  async execute(m, { plugins }) {
    const isCat = m.args[0]?.toLowerCase() === '-cat'
    const requested = (isCat ? m.args[1] : m.args[0])?.toLowerCase()

    if (!requested) {
      return m.reply(
        `Format salah.\n\n` +
        `*Format Penggunaan:*\n` +
        `> Kirim sebagai file: ${m.prefix}${m.command} <command/alias>\n` +
        `> Tampilkan source: ${m.prefix}${m.command} -cat <command/alias>`
      )
    }

    const plugin = plugins.get(requested)
    if (!plugin) {
      return m.reply(`Plugin dengan command atau alias \`${requested}\` tidak ditemukan.`)
    }

    if (!plugin.source) {
      return m.reply('Directory source plugin tidak tersedia. Plugin perlu di-reload terlebih dahulu.')
    }

    let source
    try {
      source = await fs.readFile(plugin.source, 'utf8')
    } catch (err) {
      return m.reply(`Gagal membaca source plugin: ${err.message}`)
    }

    if (isCat) {
      return m.reply(`\`\`\`js\n${source}\n\`\`\``)
    }

    return m.reply({
      type: 'document',
      media: Buffer.from(source, 'utf8'),
      mimetype: 'application/javascript',
      fileName: path.basename(plugin.source)
    })
  }
}
