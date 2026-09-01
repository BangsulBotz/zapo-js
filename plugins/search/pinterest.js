// plugins/search/pinterest.js

import axios from 'axios'

export default {
  command: 'pinterest',
  alias: ['pin', 'pint'],
  category: 'search',
  description: `> Mencari gambar di Pinterest. Hasil 5 gambar dikirim dalam bentuk album.

*Keterangan Format:*
> \`<query>\` = kata kunci pencarian.

contoh penggunaan:
> \`.pin <query>\`
> \`.pin furina genshin\``,
  help: '<query>',
  typing: true,
  wait: true,

  async execute(m, { sock, args }) {
    const query = args.join(' ').trim()

    if (!query) {
      return m.reply(`Masukkan query pencarian!\nContoh: ${m.prefix}${m.command} furina`)
    }

    try {
      const res = await axios.get('https://wolep.dev/pinterest-search-lite', {
        params: { query },
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        }
      })

      const urls = res.data?.data
      if (!Array.isArray(urls) || !urls.length) {
        return m.reply('Tidak ada hasil ditemukan.')
      }

      const medias = urls.slice(0, 5).map(url => ({ image: url }))
      await sock.sendAlbum(m.chat, medias, { quote: m.raw })
    } catch (err) {
      return m.reply(`Gagal mencari gambar: ${err.response?.status || ''} ${err.message}`)
    }
  }
}
