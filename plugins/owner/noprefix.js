// plugins/owner/noprefix.js

import { config, updateConfig } from '../../settings.js'

export default {
  command: 'noprefix',
  alias: ['nopref'],
  category: 'owner',
  description: `> Mengaktifkan atau menonaktifkan mode tanpa prefix.

*Keterangan Format:*
> \`on\` = aktifkan mode tanpa prefix.
> \`off\` = nonaktifkan mode tanpa prefix.

contoh penggunaan:
> \`.noprefix on\`
> \`.noprefix off\``,
  onlyOwner: true,

  async execute(m, { args }) {
    const arg = args ? args[0]?.toLowerCase() : undefined

    if (!arg) {
      const status = config.noprefix ? 'ON' : 'OFF'
      return m.reply(
        `No-Prefix Mode: *${status}*\n\n` +
        `Usage: \`${m.prefix}noprefix on\` or \`${m.prefix}noprefix off\``
      )
    }

    if (['on', 'true'].includes(arg)) {
      updateConfig('noprefix', true)
      return m.reply('✅ No-Prefix Mode is now *ON*. Commands can be executed without a prefix.')
    }

    if (['off', 'false'].includes(arg)) {
      updateConfig('noprefix', false)
      return m.reply('❌ No-Prefix Mode is now *OFF*. Commands require a prefix.')
    }

    return m.reply(`Usage: \`${m.prefix}noprefix on\` or \`${m.prefix}noprefix off\``)
  }
}
