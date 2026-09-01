// plugins/owner/setppbot.js

import sharp from 'sharp'
import dns from 'node:dns'
import net from 'node:net'

function isPrivateOrReservedIp(ip) {
  if (net.isIP(ip) === 4) {
    const [a, b] = ip.split('.').map(Number)
    return a === 10 || a === 127 || a === 0 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254)
  }
  if (net.isIP(ip) === 6) {
    const lower = ip.toLowerCase()
    return lower === '::1' || lower === '::' || lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80') || lower.startsWith('::ffff:127.') || lower.startsWith('::ffff:10.')
  }
  return true
}

async function isSafeImageUrl(url) {
  let hostname
  try {
    hostname = new URL(url).hostname
  } catch {
    return false
  }
  if (/^localhost$/i.test(hostname)) return false
  try {
    const addresses = await dns.promises.lookup(hostname, { all: true })
    return addresses.length > 0 && addresses.every(({ address }) => !isPrivateOrReservedIp(address))
  } catch {
    return false
  }
}

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
      if (!(await isSafeImageUrl(url))) {
        return m.reply(`❌ URL tidak diizinkan.`)
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