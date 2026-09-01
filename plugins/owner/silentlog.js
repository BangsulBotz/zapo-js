// plugins/owner/silentlog.js

import {
  getBotSettingValue,
  isSilentLog,
  updateBotSetting,
  updateGroupSettings
} from '../../lib/groupAndBot.js'

const SILENT_LOG_ALL = 'ALL_GROUPS'

export default {
  command: 'silentlog',
  alias: ['sl'],
  category: 'owner',
  description: `> Toggle silent logging untuk grup. Nonaktifkan log otomatis di grup tertentu atau semua grup.

*Keterangan Format:*
> \`<true/false>\` = aktifkan/nonaktifkan silent log.
> \`[jid]\` = JID grup (opsional, default: grup saat ini).
> \`all\` = berlaku untuk semua grup.

contoh penggunaan:
> \`.silentlog\` (lihat status)
> \`.silentlog true\` (matikan log di grup ini)
> \`.silentlog 123@g.us true\` (matikan log grup tertentu)
> \`.silentlog all true\` (matikan log semua grup)`,
  help: '<true/false>',
  onlyOwner: true,
  typing: true,

  async execute(m, { args }) {
    const first = args[0]?.toLowerCase()
    const isAll = first === 'all'
    const hasTarget = isAll || (args.length > 1 && first?.endsWith('@g.us'))
    const targetJid = isAll ? SILENT_LOG_ALL : (hasTarget ? args[0] : m.chat)
    const action = (hasTarget ? args[1] : args[0])?.toLowerCase()

    if (!action) {
      const status = isSilentLog(m.chat) ? '🔇 Silent ON' : '🔊 Silent OFF'
      const allStatus = getBotSettingValue('silentlog_all') ? ' (ALL)' : ''
      return m.reply(`*Status Silent Log:*\nGrup ini: ${status}${allStatus}`)
    }

    const enable = ['true', 'on', '1', 'yes', 'ya'].includes(action)
    const disable = ['false', 'off', '0', 'no', 'tidak'].includes(action)
    if (!enable && !disable) {
      return m.reply('Format action harus `true/false` (atau `on/off`).')
    }

    if (isAll) {
      updateBotSetting('silentlog_all', enable)
    } else {
      if (!targetJid.endsWith('@g.us')) return m.reply('Target silent log harus berupa JID grup.')
      updateGroupSettings(targetJid, { silentlog: enable })
    }

    const label = targetJid === SILENT_LOG_ALL ? 'SEMUA GRUP' : targetJid
    return m.reply(`${enable ? '🔇' : '🔊'} Silent log ${enable ? 'diaktifkan' : 'dinonaktifkan'} untuk: ${label}`)
  }
}
