// plugins/grup/swgc.js

export default {
  command: 'swgc',
  category: 'grup',
  description: 'Kirim pesan sebagai status grup.\n\n*Format:* .swgc [teks|emoji]\n*Wajib:* Reply pesan',
  help: '[teks|emoji] (reply pesan)',
  onlyAdmin: true,
  onlyGroup: true,

  async execute(m, { sock, args }) {
    if (!m.quoted) return m.reply('Reply pesan yang mau dijadikan status grup!')
    if (!m.quoted.full) return m.reply('Data pesan tidak ditemukan!')

    const full = m.quoted.full

    let msgType
    let raw

    if (typeof full.conversation === 'string') {
      msgType = 'extendedTextMessage'
      raw = { text: full.conversation }
    } else {
      msgType = Object.keys(full).find(k => k.endsWith('Message') && k !== 'messageContextInfo')
      if (!msgType) return m.reply('Tipe pesan tidak dikenali atau tidak didukung!')
      raw = { ...full[msgType] }
    }

    const input = args.join(' ').trim()

    if (input) {
      const [listName = '', listEmoji = ''] = input.split('|').map(s => s.trim())
      raw.contextInfo = {
        ...(raw.contextInfo || {}),
        statusAudienceMetadata: {
          audienceType: 2,
          ...(listName ? { listName } : {}),
          ...(listEmoji ? { listEmoji } : {})
        }
      }
    }

    await sock.message.send(m.chat, {
      groupStatusMessageV2: { message: { [msgType]: raw } }
    }, {
      customNodes: [{ tag: 'meta', attrs: { is_group_status: 'true' } }],
      additionalAttributes: { type: 'text' }
    })

    await sock.sendReact(m.chat, '✅', m.id)
  }
}
