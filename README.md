# Zapo Bot

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/vinikjkkj/zapo/master/.github/assets/logo.png" />
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/vinikjkkj/zapo/master/.github/assets/logo-light.png" />
    <img src="https://raw.githubusercontent.com/vinikjkkj/zapo/master/.github/assets/logo-light.png" alt="Zapo Bot" width="400" />
  </picture>
</p>

<p align="center"><b>Base bot WhatsApp yang ringan, fleksibel, dan siap dikembangkan.</b></p>

Bot WhatsApp berbasis [Zapo-JS](https://github.com/vinikjkkj/zapo). Project ini dibuat sebagai base bot yang simpel, gampang dikembangkan, dan tetap punya akses ke fitur low-level WhatsApp kalau memang dibutuhkan.

> Ini adalah bot base, bukan pengganti Zapo-JS.

<p align="center">
  <a href="https://zapo.to">Dokumentasi Zapo</a> |
  <a href="https://www.npmjs.com/package/zapo-js">NPM</a> |
  <a href="https://whatsapp.com/channel/0029VbACHzn4inokBZqMsq2W">Channel WhatsApp</a> |
  <a href="CHANGELOG.md">Changelog</a>
</p>

## Fitur

- Plugin system dengan command dan alias
- Reload plugin tanpa restart penuh
- Penyimpanan session memakai SQLite
- Handler pesan, koneksi, grup, dan contact
- Dukungan media, thumbnail, voice note, dan reaction
- Raw message database untuk kebutuhan plugin
- Dukungan custom nodes melalui `patch.js`
- Isolasi error antar-plugin

## Kelebihan

- **Ringan:** hanya memproses hal yang memang diperlukan.
- **Fast response:** handler dan plugin dibuat supaya alur pesan tetap singkat.
- **Tahan banting:** error pada satu plugin tidak langsung menjatuhkan seluruh bot.
- **Tidak overlimit:** helper, cache, dan database dipakai seperlunya agar tidak melakukan kerja berulang.
- **Fleksibel:** bisa memakai API Zapo-JS biasa maupun custom nodes saat dibutuhkan.
- **Mudah di-maintenance:** koneksi, handler, database, helper, dan plugin dipisahkan dengan jelas.
- **Siap dikembangkan:** struktur folder dibuat agar fitur baru tidak perlu mengacak-acak core bot.

## Visi

Project ini dibuat dengan beberapa tujuan utama:

- Mengejar efisiensi tanpa mengorbankan fleksibilitas.
- Menjaga bot tetap cepat, ringan, dan stabil dalam pemakaian panjang.
- Membuat struktur yang mudah dipahami, dirawat, dan dikembangkan.
- Mengurangi proses berulang yang tidak perlu pada jalur pesan.
- Memberi ruang untuk fitur sederhana sampai kebutuhan low-level WhatsApp.
- Membuat base bot yang bisa terus disegarkan tanpa harus membongkar semuanya dari awal.

## Instalasi

Yang perlu disiapkan:

- Node.js 20 atau lebih baru
- npm
- FFmpeg dan FFprobe untuk fitur media
- Terminal yang bisa menampilkan QR code

```bash
git clone https://github.com/BangsulBotz/zapo-js.git
cd zapo-js
npm install
npm start
```

`npm install` otomatis menjalankan `node patch.js` melalui script `postinstall`.

Saat pertama kali jalan, scan QR yang muncul di terminal.

## Konfigurasi

Konfigurasi utama ada di:

```text
settings.js
```

Sesuaikan prefix, nomor owner, dan pengaturan bot lainnya. Jangan upload file yang berisi credential, session, database, atau konfigurasi pribadi.

## Struktur Project

```text
.
├── index.js
├── settings.js
├── patch.js
├── package.json
├── src/
│   ├── createSocket.js
│   ├── connectionHandler.js
│   ├── messageHandler.js
│   └── groupEventHandler.js
├── lib/
├── db/
├── session/
└── plugins/
    ├── bot/
    ├── chanel/
    ├── grup/
    ├── konvert/
    ├── owner/
    └── tools/
```

Folder `session/`, database lokal, dan credential sebaiknya tidak masuk Git.

## Membuat Plugin

Buat file JavaScript di dalam `plugins/<kategori>/`.

```js
export default {
  command: 'halo',
  alias: ['hi'],
  category: 'bot',
  description: 'Menyapa user',

  async execute(m) {
    await m.reply(`Halo ${m.pushName || 'kak'}!`)
  }
}
```

Plugin minimal harus punya:

- `command`
- `execute(m, context)`

Context yang umum dipakai:

```js
const { sock, args, plugins } = context
```

Object pesan `m` juga menyediakan beberapa properti seperti `m.chat`, `m.sender`, `m.text`, `m.quoted`, `m.isGroup`, `m.type`, dan `m.reply()`.

<details>
<summary>Contoh reply media</summary>

```js
await m.reply({
  type: 'image',
  media: buffer,
  mimetype: 'image/jpeg',
  caption: 'Ini gambar'
})
```

</details>

## API Dasar

Kirim pesan biasa:

```js
await sock.message.send(m.chat, 'Halo dunia')
```

Reply pesan:

```js
await m.reply('Pong')
```

Reaction:

```js
await sock.sendReact(m.chat, '👍', m.id)
```

Untuk struktur pesan Zapo-JS yang lebih lengkap, gunakan [dokumentasi resminya](https://zapo.to).

<details>
<summary>Voice note</summary>

```js
await sock.sendVoiceNote(m.chat, './audio.mp3')
```

Input yang didukung mengikuti wrapper project, seperti `Buffer`, stream, URL, path file, dan Promise.

</details>

<details>
<summary>Thumbnail dan link preview</summary>

```js
const thumb = await sock.uploadThumbnail('./cover.jpg')

await sock.message.send(m.chat, {
  extendedTextMessage: {
    text: 'https://example.com',
    matchedText: 'https://example.com',
    title: 'Example',
    description: 'Contoh link preview',
    ...thumb
  }
})
```

</details>

## Custom Nodes

`patch.js` dijalankan otomatis setelah `npm install`. Patch ini memungkinkan penggunaan `customNodes` pada pengiriman pesan tertentu.

```js
await sock.message.send(m.chat, message, {
  customNodes: [
    {
      tag: 'contoh',
      attrs: {},
      content: []
    }
  ]
})
```

Custom nodes bergantung pada struktur internal WhatsApp dan versi Zapo-JS. Pakai hanya saat API biasa belum cukup.

## Troubleshooting

<details>
<summary>Plugin tidak terbaca</summary>

- Pastikan file berada di dalam `plugins/`
- Pastikan memakai `export default`
- Pastikan ada `command` dan `execute`
- Pastikan ekstensi file `.js`
- Cek syntax JavaScript

</details>

<details>
<summary>Session selalu minta scan QR</summary>

Pastikan folder `session/` tidak dihapus dan proses punya izin baca/tulis ke folder tersebut.

</details>

<details>
<summary>FFmpeg tidak ditemukan</summary>

```bash
ffmpeg -version
ffprobe -version
```

Pastikan keduanya sudah terinstall dan tersedia di `PATH`.

</details>

## Riwayat Perubahan

Detail update project tersedia di [CHANGELOG.md](CHANGELOG.md).

## Disclaimer

Zapo-JS adalah implementasi independen untuk kebutuhan engineering dan interoperability research. Project ini tidak berafiliasi dengan atau didukung oleh WhatsApp.

Gunakan bot secara bertanggung jawab dan sesuai aturan layanan yang berlaku.

## Kredit

- [Zapo-JS](https://zapo.to)
- [@zapo-js/media-utils](https://www.npmjs.com/package/@zapo-js/media-utils)
- [@zapo-js/store-sqlite](https://www.npmjs.com/package/@zapo-js/store-sqlite)
- `better-sqlite3`
- `sharp`
- FFmpeg dan FFprobe
