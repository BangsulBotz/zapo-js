// plugins/owner/debug.js

import { config, updateSetting } from '../../settings.js'
import { buildQuoteContext } from '../../lib/utils.js'

export default {
  command: 'debug',
  alias: ['debuglog', 'eventlog'],
  category:'owner',
  description: 'Pengaturan event logger debug',
  onlyOwner: true,

  async execute(m, { args }) {
    const target = args ? args[0]?.toLowerCase() : undefined
    const value = args ? args[1]?.toLowerCase() : undefined

    if (!target || !['message', 'all'].includes(target)) {
      const statusMessage = config.eventMessage ? '🟢 *ON*' : '🔴 *OFF*'
      const statusAll = config.eventAll ? '🟢 *ON*' : '🔴 *OFF*'

      const bodyText = `🛠️ *DEBUG LOGGER PANEL*\n\n` +
                       `📌 *Event Message:* ${statusMessage}\n` +
                       `📌 *Event All:* ${statusAll}\n\n` +
                       `_Pilih tombol di bawah untuk mengubah status toggle:_`

      return await m.reply({
        interactiveMessage: {
          header: { title: '⚙️ Status Debug Logger', hasMediaAttachment: false },
          body: { text: bodyText },
          footer: { text: 'Klik tombol di bawah untuk aksi cepat' },
          nativeFlowMessage: {
            buttons: [
              {
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({
                  display_text: config.eventMessage ? '🔴 Turn OFF Message' : '🟢 Turn ON Message',
                  id: `.debug message ${!config.eventMessage}`
                })
              },
              {
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({
                  display_text: config.eventAll ? '🔴 Turn OFF All' : '🟢 Turn ON All',
                  id: `.debug all ${!config.eventAll}`
                })
              }
            ],
            messageVersion: 1
          },
          contextInfo: buildQuoteContext(m)
        }
      })
    }

    if (!value || !['true', 'false', 'on', 'off', '1', '0'].includes(value)) {
      return m.reply(`⚠️ *Format Salah!* Gunakan true/false.`)
    }

    const boolValue = ['true', 'on', '1'].includes(value)

    if (target === 'message') {
      updateSetting('eventMessage', boolValue)
      return m.reply(`✅ *Event Message Debug* diubah menjadi: *${boolValue ? 'ON' : 'OFF'}*`)
    }

    if (target === 'all') {
      updateSetting('eventAll', boolValue)
      return m.reply(`✅ *Event All Debug* diubah menjadi: *${boolValue ? 'ON' : 'OFF'}*`)
    }
  }
}