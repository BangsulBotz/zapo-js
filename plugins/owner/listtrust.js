// plugins/owner/listtrust.js

import { getTrustedUserCommands } from '../../db/group.js'
import { getPushNameByJid } from '../../db/contacts.js'
import { getCommandAliases, extractTarget } from '../../lib/utils.js'

export default {
  command: 'listtrust',
  alias: ['trustlist'],
  category: 'owner',
  description: `> Menampilkan daftar fitur yang sudah di-trust untuk user tertentu.

*Keterangan Format:*
> \`[@mention/reply/nomor]\` = target user (opsional, default: diri sendiri).

contoh penggunaan:
> \`.listtrust\` (cek diri sendiri)
> \`.listtrust @mention\` (cek user lain)`,
  help: '<@tag/reply/nomor>',
  typing: true,

  async execute(m, { args }) {
    const target = extractTarget(m, args) || m.sender
    const commands = getTrustedUserCommands(target)
    const label = getPushNameByJid(target) || target

    if (!commands.size) {
      return m.reply(`⚠️ ${label} belum memiliki fitur yang di-trust.`)
    }

    let text = `*📋 Fitur Terpercaya untuk ${label}:*\n\n`
    for (const command of commands) {
      const aliases = getCommandAliases(command)
      text += `\`${command}\`\n`
      text += `alias: ${aliases.length ? '_' + aliases.join(', ') + '_' : '-'}\n\n`
    }
    return m.reply(text.trim())
  }
}
