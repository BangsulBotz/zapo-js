// plugins/grup/selfgc.js
import { getEffectiveGroupSettings, updateGroupSettings } from '../../lib/groupAndBot.js'

export default {
  command: 'selfgc',
  category: 'grup',
  description: 'Mengatur mode self bot khusus grup ini.',
  help: '`<true|false>` atau `<on|off>`',
  onlyOwner: true,
  onlyGroup: true,

  async execute(m, { args }) {
    const value = args[0]?.toLowerCase()
    if (!['true', 'false', 'on', 'off'].includes(value)) {
      const settings = getEffectiveGroupSettings(m.chat)
      return m.reply(`Status selfgc: ${settings.selfgc ? 'ON' : 'OFF'}\nGunakan: ${m.prefix}${m.command} <true|false>`)
    }

    const settings = updateGroupSettings(m.chat, {
      selfgc: value === 'true' || value === 'on'
    })

    return m.reply(`✅ SelfGC ${settings.selfgc ? 'diaktifkan' : 'dinonaktifkan'} untuk grup ini.`)
  }
}
