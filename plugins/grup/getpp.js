// plugins/grup/getpp.js

export default {
  command: 'getpp',
  alias: ['fotoprofil', 'profilepic'],
  category: 'grup',
  typing:true,
  description: `> Mengambil foto profil dari user atau grup. Mendukung multiple target.

*Keterangan Format:*
\`<@mention>\` = mention target.
\`<JID>\` = JID target (format: 628xxxx@s.whatsapp.net atau 628xxxx@lid).
(reply) = reply pesan target.
pisah koma untuk multiple target.

contoh penggunaan:
\`.getpp\` (reply pesan target)
\`.getpp @mention\`
\`.getpp 628xxxx@s.whatsapp.net\`
\`.getpp 628xxxx@lid, 628yyyy@s.whatsapp.net\``,

  async execute(m, { sock, args }) {
    const targets = resolveTargets(m, args.join(' ').trim())
    if (!targets.length) return m.reply('❌ Target tidak ditemukan. Reply, mention, atau ketik JID manual (contoh: 628xxx@s.whatsapp.net atau 628xxx@lid).')

    const results = []
    for (const jid of targets) {
      try {
        const pp = await sock.profile.getProfilePicture(jid, 'image')
        if (!pp?.url) throw new Error('Foto profil tidak ada atau diprivasi')
        results.push({ jid, ...pp, mimetype: 'image/jpeg' })
      } catch (err) {
        results.push({ jid, error: err?.message || 'Gagal ambil foto profil' })
      }
    }

    const valid = results.filter(r => !r.error)
    if (!valid.length) return m.reply(results.map(r => `❌ ${r.jid}: ${r.error}`).join('\n'))

    if (valid.length === 1) {
      const { url } = valid[0]
      let buffer
      try {
        const res = await fetch(url)
        if (!res.ok) return m.reply(`❌ Gagal mengambil foto profil (${res.status}).`)
        buffer = Buffer.from(await res.arrayBuffer())
      } catch (err) {
        return m.reply(`❌ Gagal mengambil foto profil: ${err?.message || 'koneksi gagal.'}`)
      }
      await sock.message.send(m.chat, { type: 'image', media: buffer, mimetype: 'image/jpeg', caption: '✅ Berhasil mengambil foto profil' }, { quoted: m })
      return
    }

    const albumItems = []
    for (const v of valid) {
      try {
        const res = await fetch(v.url)
        if (!res.ok) continue
        const buffer = Buffer.from(await res.arrayBuffer())
        if (buffer.length) albumItems.push({ image: buffer })
      } catch { }
    }
    if (!albumItems.length) return m.reply('❌ Semua foto profil gagal diambil.')
    await sock.sendAlbum(m.chat, albumItems, { caption: `✅ Berhasil mengambil foto profil ${valid.length} target`, quote: m })
  }
}

function resolveTargets(m, rawArgs) {
  const targets = new Set()

  if (m.quoted?.sender && !m.quoted.sender.endsWith('@g.us') && !m.quoted.sender.endsWith('@newsletter')) {
    targets.add(m.quoted.sender)
  }

  const mentioned = (m.mentionedJid || []).filter(j => !j.endsWith('@g.us') && !j.endsWith('@newsletter'))
  for (const jid of mentioned) targets.add(jid)

  if (rawArgs) {
    const parts = rawArgs.split(',').map(s => s.trim()).filter(Boolean)
    for (const part of parts) {
      const cleaned = part.replace(/^@/, '')
      if (/^\d+@(s\.whatsapp\.net|lid)$/.test(cleaned)) {
        targets.add(cleaned)
      } else if (/^\d{8,20}$/.test(cleaned)) {
        targets.add(`${cleaned}@s.whatsapp.net`)
      }
    }
  }

  return [...targets]
}
