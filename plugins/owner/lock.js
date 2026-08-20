// plugins/owner/lock.js

import { setLocked, isLocked } from '../../lib/lockState.js'
import {config} from '../../settings.js'
export default {
  command: 'lock',
  alias: ['unlock'],
  category: 'owner',
  description: 'Lock the bot temporarily (in-memory), only lock/unlock will work.',
  onlyOwner: true,

  async execute(m, { args }) {
    const action = m.command === 'unlock' ? 'unlock' : 'lock'
    const keyword = args?.[0]?.toLowerCase()

    if (keyword !== config.botName ) {
      const status = isLocked() ? '🔒 Locked' : '🔓 Unlocked'
      return m.reply(`${status}\n\nUse \`${m.prefix}lock ${config.botName}\` or \`${m.prefix}unlock ${config.botName}\` to toggle.`)
    }

    if (action === 'lock') {
      if (isLocked()) return m.reply('🔒 Bot is already locked.')
      setLocked(true)
      return m.reply('🔒 Bot locked.')
    }

    if (!isLocked()) return m.reply('🔓 Bot is already unlocked.')
    setLocked(false)
    return m.reply('🔓 Bot unlocked.')
  }
}