// plugins/konvert/tovn.js

export default {
  command: 'tovn',
  alias: ['tovoice', 'vn'],
  category: 'konvert',
  description: `> Mengubah audio, video, atau document menjadi voice note.

contoh penggunaan:
> \`.tovn\` (reply audio/video/document)`,
  help: '(reply)',
  typing: true,
  wait: true,

  async execute(m, { sock }) {
    if (!m.quoted) {
      return m.reply('Balas audio, video, atau dokumen audio yang ingin diubah menjadi voice note.')
    }

    const mime = m.quoted.mime || ''
    const validMime = /^(audio|video)\/|application\/(octet-stream|pdf|msword|vnd\.|x-)/

    if (!validMime.test(mime)) {
      return m.reply(`Format tidak didukung: ${mime || 'unknown'}`)
    }

    try {
      const buffer = await m.quoted.download()

      if (!buffer || buffer.length < 1024) {
        return m.reply('Download gagal atau file terlalu kecil.')
      }

      await sock.sendVoiceNote(m.chat, buffer, { quote: m })
    } catch (e) {
      console.error('[TOVN] error:', e)
      return m.reply('Gagal mengonversi media menjadi voice note.')
    }
  }
}
