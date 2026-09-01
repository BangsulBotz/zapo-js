// plugins/owner/setppbot.js

import sharp from 'sharp'

export default {
  command: 'setppbot',
  alias: ['botsetpp', 'setpp'],
  category: 'owner',
  description: `> Ganti foto profil bot.

*Keterangan Format:*
> (reply gambar) = reply gambar yang ingin dijadikan foto profil.
> \`<url gambar>\` = URL gambar.

contoh penggunaan:
> \`.setppbot\` (reply gambar)
> \`.setppbot <url gambar>\``,
  help: '(reply gambar) / <url>',
  onlyOwner: true,
  typing: true,

  async execute(m, { sock, args }) {
    let buffer

    if (m.quoted?.isMedia && m.quoted.mediaType === 'image') {
      buffer = await m.quoted.download()
    } else if (m.isMedia && m.mediaType === 'image') {
      buffer = await sock.message.downloadBytes(m.raw)
    } else {
      const url = args[0]
      if (!url || !/^https?:\/\//i.test(url)) {
        return m.reply(`❌ Format salah.\n\n*Contoh:*\n> ${m.prefix}${m.command} (reply gambar)\n> ${m.prefix}${m.command} <url gambar>\n> kirim gambar dengan caption ${m.prefix}${m.command}`)
      }
      const res = await fetch(url)
      if (!res.ok) return m.reply(`❌ Gagal mengunduh gambar: ${res.status} ${res.statusText}`)
      buffer = Buffer.from(await res.arrayBuffer())
    }

    let compressed
    try {
      const meta = await sharp(buffer).metadata()
      const exceeds = (meta.width || 0) > 720 || (meta.height || 0) > 720
      compressed = await sharp(buffer)
        .resize(exceeds ? { width: 720, height: 720, fit: 'inside' } : null)
        .jpeg({ quality: 80 })
        .toBuffer()
    } catch (err) {
      return m.reply(`❌ File bukan gambar yang valid: ${err.message}`)
    }

    try {
      await sock.profile.setProfilePicture(compressed)
    } catch (err) {
      return m.reply(`❌ Gagal mengganti foto profil bot: ${err.message}`)
    }

    return m.reply('✅ Foto profil bot berhasil diganti.')
  }
}