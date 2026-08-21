# Changelog

## v1.1.0 - 2026-08-22

Pembaruan besar untuk menyegarkan base bot, menambah beberapa fitur publik, dan merapikan cara kerja plugin supaya lebih efisien serta mudah dirawat.

### Ditambahkan

- `plugins/bot/help.js` untuk bantuan command.
- `plugins/chanel/followch.js` untuk mengikuti channel.
- `plugins/chanel/unfollowch.js` untuk berhenti mengikuti channel.
- `plugins/chanel/sendch.js` untuk mengirim pesan ke channel.
- `plugins/chanel/idch.js` untuk mengambil informasi ID channel.
- `plugins/owner/addplugins.js`, `plugins/owner/getplugins.js`, dan `plugins/owner/updateplugins.js` untuk mengelola plugin.
- `plugins/tools/get.js` untuk mengambil resource atau URL.
- `plugins/tools/gitclone.js` untuk clone repository.
- `plugins/tools/qwa.js` untuk membuat gambar percakapan dari pesan yang di-reply.
- Dukungan QWA untuk teks, mention valid, quoted message, gambar, link preview, profile picture, dan fallback thumbnail.
- Placeholder media QWA seperti `[Foto]`, `[Video]`, `[audio]`, `[Dokumen]`, dan `[Stiker]`.
- `CHANGELOG.md` sebagai tempat khusus untuk riwayat perubahan project.

### Diperbarui

- Semua plugin publik di folder `plugins/bot/`, `plugins/chanel/`, `plugins/grup/`, `plugins/konvert/`, `plugins/owner/`, dan `plugins/tools/` mendapatkan penyegaran untuk menjaga efisiensi, mengurangi redundansi, dan merapikan struktur code.
- `plugins/bot/menu.js`, `ping.js`, `rss.js`, dan `runtime.js` disesuaikan agar lebih ringkas dan konsisten.
- `plugins/grup/idgc.js`, `plugins/konvert/tovn.js`, dan `plugins/konvert/upload.js` disesuaikan dengan pola plugin yang lebih rapi.
- Plugin owner seperti `eval.js`, `run.js`, `backup.js`, `debug.js`, `reload.js`, `restart.js`, `self.js`, `lock.js`, `noprefix.js`, dan plugin terkait lainnya dirapikan serta diseragamkan.
- `db/contacts.js` diperbarui dengan cache berbasis `Map` di RAM untuk mengurangi query SQLite berulang, mengurangi blocking, dan membantu mencegah beban atau race yang tidak perlu saat contact sering dibaca.
- `lib/utils.js` ditambahkan helper `executeAsyncCode()` dan helper pendukung raw message, quote, media, serta normalisasi data.
- `lib/loadPlugins.js` dirapikan besar-besaran untuk membuat pemuatan plugin, alias, kategori, validasi, duplicate protection, dan reload lebih konsisten.
- `README.md` ditulis ulang dalam Bahasa Indonesia, dibuat lebih singkat, dan memakai bagian buka-tutup untuk dokumentasi panjang.

### Catatan Rilis

- Semua fitur dan plugin mendapatkan pembaruan serta penyegaran untuk mencegah fungsi duplikat, mengurangi kerja berulang, meningkatkan fleksibilitas, dan membuat struktur code lebih mudah dipahami.
- Fokus pembaruan adalah efisiensi, respons cepat, penggunaan resource yang wajar, dan maintenance jangka panjang.
- Session, database lokal, credential, dan konfigurasi pribadi tetap harus disimpan secara lokal.
