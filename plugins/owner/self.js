// plugins/owner/self.js
import { config, updateSetting } from '../../settings.js'

export default {
  command: 'self',
  alias: ['selfbot', 'modebot'],
  category:'owner',
  description: 'Toggle self mode - restrict the bot to owner only.',
  onlyOwner: true,

  async execute(m, { args }) {
    const arg = args ? args[0]?.toLowerCase() : undefined

    if (!arg) {
      const status = config.self ? '🔒 *ON* (private)' : '🔓 *OFF* (public)'
      return m.reply(
        `Self Mode: ${status}\n\n` +
        `Use \`${m.prefix}self on\` or \`${m.prefix}self off\` to change.`
      )
    }

    if (['on', 'true'].includes(arg)) {
      updateSetting('self', true)
      return m.reply('🔒 Self Mode is now *ON*. Only the owner can use commands.')
    }

    if (['off', 'false'].includes(arg)) {
      updateSetting('self', false)
      return m.reply('🔓 Self Mode is now *OFF*. Everyone can use commands.')
    }

    return m.reply(`Usage: \`${m.prefix}self on\` or \`${m.prefix}self off\``)
  }
}