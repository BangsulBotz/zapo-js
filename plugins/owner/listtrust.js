// plugins/owner/listtrust.js

import { getTrustedUserCommands } from '../../db/trustedFeatures.js'
import { getPushNameByJid } from '../../db/contacts.js'
import { getCommandAliases, extractTargetJid } from '../../lib/utils.js'

export default {
  command: 'listtrust',
  alias: ['trustlist'],
  category: 'owner',
  description: 'Menampilkan daftar fitur yang sudah di-trust untuk user tertentu.\n\n' +
    '*Format Penggunaan:*\n' +
    '> `.listtrust <target>` untuk cek user lain\n\n' +
    '> `.listtrust` untuk cek diri sendiri\n\n' +
    '*Target bisa berupa:* @mention, reply pesan, atau ketik nomor langsung',
  help: '`[@mention/reply/nomor]`',
  typing: true,

  async execute(m, { args }) {
    const target = extractTargetJid(m, args) || m.sender
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
    m.reply(text.trim())
  }
}
