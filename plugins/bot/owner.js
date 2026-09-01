// plugins/bot/owner.js

import { config } from '../../settings.js'

export default {
  command: 'owner',
  alias: ['creator'],
  category: 'bot',
  description: `> Mengirim kontak card (vCard) owner bot ke chat saat ini.

contoh penggunaan:
> \`.owner\``,

  async execute(m) {
    const number = String(config.owner).replace(/\D/g, '')
    const name = config.ownerName
    const vcard = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${name}`,
      `TEL;type=CELL;type=VOICE;waid=${number}:+${number}`,
      'END:VCARD'
    ].join('\n')

    await m.reply({
      contactMessage: {
        displayName: name,
        vcard
      }
    })
  }
}
