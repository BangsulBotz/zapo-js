// plugins/owner/self.js
import { getBotSettingValue, updateBotSetting } from '../../lib/groupAndBot.js'

export default {
  command: 'self',
  alias: ['selfbot', 'modebot'],
  category: 'owner',
  description: `> Mengaktifkan atau menonaktifkan mode self bot. Hanya owner yang bisa mengontrol bot.

*Keterangan Format:*
> \`on\` = aktifkan self mode.
> \`off\` = nonaktifkan self mode.

contoh penggunaan:
> \`.self on\`
> \`.self off\``,
  help:'<on/false>',
  onlyOwner: true,

  async execute(m, { args }) {
    const arg = args ? args[0]?.toLowerCase() : undefined

    if (!arg) {
      const status = getBotSettingValue('self') ? '🔒 *ON* (private)' : '🔓 *OFF* (public)'
      return m.reply(
        `Self Mode: ${status}\n\n` +
        `Use \`${m.prefix}self on\` or \`${m.prefix}self off\` to change.`
      )
    }

    if (['on', 'true'].includes(arg)) {
      updateBotSetting('self', true)
      return m.reply('🔒 Self Mode is now *ON*. Only the owner can use commands.')
    }

    if (['off', 'false'].includes(arg)) {
      updateBotSetting('self', false)
      return m.reply('🔓 Self Mode is now *OFF*. Everyone can use commands.')
    }

    return m.reply(`Usage: \`${m.prefix}self on\` or \`${m.prefix}self off\``)
  }
}
