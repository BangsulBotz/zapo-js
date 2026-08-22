# Changelog

## v1.2.0 - 2026-08-22

Penyempurnaan sistem settings dinamis, penambahan fitur manajemen prefix tanpa restart, dan penyelarasan plugin tools dengan pola base.

### Ditambahkan

- Manajemen prefix dinamis yang langsung berlaku tanpa restart dan otomatis tersimpan ke `settings.js`.
- `plugins/owner/addprefix.js` untuk menambah prefix baru lengkap dengan validasi kosong, spasi, panjang maksimal, dan duplikat.
- `plugins/owner/delprefix.js` untuk menghapus prefix lewat nama atau nomor urut, termasuk proteksi agar prefix terakhir tidak bisa dihapus.
- `plugins/owner/listprefix.js` untuk menampilkan daftar prefix bernomor beserta status mode tanpa prefix.
- Alias pendukung `tambahprefix`, `hapusprefix`, dan `daftarprefix`.
- `plugins/tools/c2i.js` untuk mengubah reply teks atau document berisi code menjadi gambar bergaya carbon.
- Mode `.c2i -ct` untuk mengirim hasil sebagai link preview thumbnail memakai `sock.uploadThumbnail()`.
- Pengujian perilaku terisolasi untuk fungsi `updateSetting()`, plugin prefix, dan plugin c2i.

### Diperbarui

- `settings.js` diperbarui pada fungsi `updateSetting()`: perbaikan bug regex yang memotong value array sehingga berpotensi korup file, kini mengganti satu baris properti utuh dan serialisasi value menggunakan `JSON.stringify`.
- `settings.js` mendapatkan pelindung tambahan: menolak value bertipe object, menolak key yang tidak ada atau nested, serta commit RAM dan file dilakukan bersamaan setelah validasi lolos.
- Komentar inline pada `settings.js` dipindah ke atas barisnya agar selamat dari proses tulis ulang file.
- `sessionId` dan `logLevel` dihapus dari `settings.js` karena bukan bagian konfigurasi pengguna.
- `src/createSocket.js` kini memakai konstanta lokal `SESSION_ID = 'default'` dan import config yang tidak terpakai dihapus.

### Catatan Rilis

- Fokus rilis adalah keamanan data settings saat diedit runtime, fleksibilitas prefix untuk pengguna akhir, dan konsistensi gaya code antar plugin.
- Session, database lokal, credential, dan konfigurasi pribadi tetap harus disimpan secara lokal.

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
