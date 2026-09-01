// plugins/tools/contact.js

import { buildContact, normalizeJid } from '../../handler.js'

export default {
  command: 'contact',
  alias: ['cekcontact', 'getcontact'],
  category: 'tools',
  description: `> Cek data kontak yang tersimpan di database.

*Keterangan Format:*
> (reply) = reply pesan target.
> \`<@mention>\` = mention target.
> \`<jid/lid>\` = JID atau LID target.

contoh penggunaan:
> \`.contact\` (reply pesan)
> \`.contact @mention\`
> \`.contact 628xxxx@s.whatsapp.net\``,
  help: '(reply/@tag)',
  typing: true,

  async execute(m, { args }) {
    let contact = null

    if (m.quoted) {
      contact = m.quoted.contact
    } else if (m.mentionedJid?.length > 0) {
      const mentionMatch = m.text?.match(/@(\d+)/)
      const mentionedJid = m.mentionedJid[0]
      const mentionDigits = mentionMatch?.[1]
      const jidDigits = mentionedJid.split('@')[0]

      if (mentionMatch && mentionDigits !== jidDigits) {
        return m.reply('Mention tidak valid, silakan coba lagi.')
      }

      contact = buildContact(mentionedJid, null)
    } else if (args[0]) {
      contact = buildContact(normalizeJid(args[0]), null)
    } else {
      return m.reply(`Reply pesan, mention, atau kirim jid/lid.\nContoh: ${m.prefix}${m.command} 6283175676190@s.whatsapp.net`)
    }

    if (!contact?.isSaved) {
      return m.reply('User tersebut belum ada di database/belum pernah berinteraksi.')
    }

    const buttons = []

    if (contact.phoneNumber) {
      buttons.push({
        name: 'cta_copy',
        buttonParamsJson: JSON.stringify({
          display_text: 'Salin Nomor',
          copy_code: contact.phoneNumber
        })
      })
    }

    if (contact.jid) {
      buttons.push({
        name: 'cta_copy',
        buttonParamsJson: JSON.stringify({
          display_text: 'Salin JID',
          copy_code: contact.jid
        })
      })
    }

    if (contact.lid) {
      buttons.push({
        name: 'cta_copy',
        buttonParamsJson: JSON.stringify({
          display_text: 'Salin LID',
          copy_code: contact.lid
        })
      })
    }

    await m.reply({
      interactiveMessage: {
        header: { title: '\`Get Contact User\`', hasMediaAttachment: false },
        body: {
          text: `\`\`\`name: ${contact.pushName}\nlid : ${contact.lid || '-'}\`\`\``
        },
        footer: { text: 'Gunakan tombol di bawah untuk menyalin data' },
        nativeFlowMessage: {
          buttons,
          messageVersion: 1
        }
      }
    })
  }
}