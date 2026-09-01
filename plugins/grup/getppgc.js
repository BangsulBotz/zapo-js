// plugins/grup/getppgc.js

export default {
  command: 'getppgc',
  alias: ['ppgc', 'ppgroup', 'ppgrup'],
  category: 'grup',
  groupOnly: true,
  typing: true,
  description: `> Mengambil foto profil dari grup ini.

contoh penggunaan:
\`.getppgc\``,

  async execute(m, { sock }) {
    const pp = await sock.profile.getProfilePicture(m.chat, 'image')
    if (!pp?.url) return m.reply('❌ Foto profil grup tidak ada atau diprivasi.')

    const res = await fetch(pp.url)
    const buffer = Buffer.from(await res.arrayBuffer())
    await sock.message.send(m.chat, { type: 'image', media: buffer, mimetype: 'image/jpeg', caption: '✅ Foto profil grup' }, { quoted: m })
  }
}
