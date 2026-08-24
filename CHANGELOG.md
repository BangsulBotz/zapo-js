# Changelog

## v1.3.0 - 2026-08-24

Rilis kumulatif vs repository GitHub (github.com/BangsulBotz/zapo-js): sistem trust, sistem koleksi thumbnail & favicon, migrasi storage raw message ke protobuf, dan banyak perbaikan handler/utilitas.

### Ditambahkan

- **Sistem trust (whitelist)** - grup/user tertentu boleh memakai fitur tertentu tanpa pembatasan. Data SQLite (`store/trusted_features.db`) + cache memori write-through (`Map<jid, Set<command>>`), lookup O(1).
    - `.trustgc <fitur/alias>` trust fitur grup saat ini; `-del <fitur>` hapus; `-list` daftar. Wajib di grup.
    - `.trust <fitur/alias> <target>` / `.untrust <fitur/alias> <target>` - trust/hapus user via @mention, reply, atau nomor; identifier LID + nomor disimpan dobel bila kontak dikenal.
    - `.listtrust [target]` daftar fitur terpercaya user; tanpa target = cek diri sendiri.
    - `db/trustedFeatures.js` - tabel `(jid, command)` PK komposit mode WAL; fallback counterpart LID↔PN lewat `db/contacts.js`; negative-cache TTL 30 detik; alias di-resolve ke nama command kanonik sebelum disimpan.
    - Plugin: `plugins/owner/trustgc.js`, `trust.js`, `untrust.js`, `listtrust.js`.
- **Sistem koleksi thumbnail & favicon** - database `store/thumbnail.db` (nama | metadata | jenis | status | expired) + wrapper + command.
    - `.addthumb [-private] <nama>` / `.addfavicon <nama>` - simpan metadata via reply gambar, caption gambar, URL, atau reply link-preview (metadata dipanen langsung dari raw message, tanpa upload ulang). Nama `random` ditolak; favicon selalu random & bebas jpegThumbnail.
    - `.cekthumb <nama>[, <favicon>]` - info lengkap semua status + kirim live preview via `sendThumbnail`.
    - `.listthumb` - daftar tergrouping: thumbnail random / private / favicon.
    - `.rthumb <nama>[, <nama>] | all` - download ulang media sumber lama lalu simpan metadata & expiry baru; alias `refreshthumb`, `rthumbnail`, `thumbrefresh`.
    - Auto-refresh startup - 15 detik setelah bot online, entri berumur media >7 hari (cek header `last-modified`) di-refresh berurutan di background dengan guard `inProgress`.
    - Pool random murni: hanya status `random` yang masih hidup; private & favicon tidak masuk pool.
- `db/thumbnails.js` - tabel `thumbnails(name, jenis, status, metadata, expired)` PK komposit upsert; API save/get/random/list/delete; filter status + expiry di level SQL.
- `lib/thumbAutoRefresh.js` - inti refresh `refreshThumbRow()` (download -> upload -> save ulang) + job `startThumbAutoRefresh(sock)` untuk sweep umur media saat startup.
- `lib/rawMessageUtils.js` - utilitas shared: `filterEncNodes()`, `extractReplayableAttrs()`, formatter pesan, `buildReplayCode()`.
- `db/rawMessage.js` - blob raw message kini protobuf `WebMessageInfo` (`BLOB`) bukan JSON teks.
    - Hemat ±52% per pesan (blob 218MB -> 111,5MB; file DB 565MB -> 157MB setelah VACUUM).
    - Quote bersarang depth >= 2 dibuang saat simpan; quote level-1 dipertahankan agar replay tetap render quote.
    - `decodeRow()` dual-format: baris lama JSON tetap terbaca; tanpa migrasi paksa.
    - Rebuild tabel `raw_messages_blob` sekali (transaksional + guard kolom); kolom baru `attributes` (+ ALTER TABLE) untuk raw node attrs.
    - Log per-save dihapus (konsol ±16rb baris/hari lebih tenang); `optimizeDatabase()` kini menjalankan `VACUUM`.
- `plugins/bot/owner.js` - kirim kontak owner (vcard).
- `plugins/grup/swgc.js` - kirim ulang pesan yang di-reply sebagai status grup; input `nama|emoji` meng-inject `statusAudienceMetadata` ke contextInfo otomatis.
- `plugins/search/pinterest.js` - cari gambar Pinterest (`.pin`/`.pint`/`.pinterest <query>`), 5 hasil dikirim sebagai album via `sock.sendAlbum`.
- `plugins/owner/delthumb.js` & `delfavicon.js` - hapus entri thumbnail/favicon dari koleksi via nama, dukung multi-nama.
- `lib/wrapper.js` - wrapper baru `sock.sendAlbum(jid, [{image|video}, ...], {quoted, caption})`: upload tiap media -> kirim container `albumMessage` -> kirim anak-anaknya terhubung via `messageAssociation`.

### Diperbarui

- `handler.js`:
    - Custom inspect untuk `m` & `m.quoted`: property lazy tampil `[lazy]`, tidak ikut di-resolve.
    - Tambah `m.key`; `quoted.download()` membungkus payload dengan `reviveBase64Fields()`; hapus `quoted.toJSON`.
    - Fungsi baru `runUserCode(code, m, sock)` - pipeline eksekusi code user terpusat (dipakai plugin `eval` & `run`).
- `lib/utils.js`:
    - `transformImports()` support 4 pola ESM + strip `export`.
    - Helper baru: `reviveBase64Fields()`, `getCommandAliases()`, `extractTargetJid()`, `extractFeatureTarget()` (validasi fitur+target terpusat), `getUrlExpiry()`, `waMediaUrl()`, `getMediaAgeMs()`, `cloneStripQuoted()`.
    - `parseMs()` & `formatDuration()` digabung jadi satu `formatDuration(ms)` (input milidetik).
    - `isLongLike()` deteksi struktur `{low, high, unsigned}`; `cloneStripQuoted()` konversi byte-array & objek Buffer mati ke base64 string.
- `lib/wrapper.js` - wrapper baru `sock.sendThumbnail()` (link preview dari koleksi DB / URL / pool random; favicon opsional; auto-trim url/title/body/text + validasi URL http(s)) + resolver bersama `sock.resolveThumbMeta()`; import `crypto` diperbaiki; `uploadThumbnail` membawa field `url`.
- `lib/backupExclude.js` - hapus `contoh.js` dari daftar exclude backup.
- `lib/notifRestart.js` - ikut API `formatDuration(ms)` yang baru.
- `patch.js` - PATCH 2: album `albumMessage` dikenali sebagai enc mediatype `collection` (idempotent via marker).
- `index.js` - hapus cek `instanceof Promise` redundan; panggil `startThumbAutoRefresh(sock)` setelah connect (fire-and-forget).
- `db/contacts.js` - paritas pragma SQLite (journal_size_limit, cache_size, mmap_size); standardisasi, bukan perbaikan dramatis.
- `plugins/bot/menu.js` & `help.js` - output dikirim via `sock.sendThumbnail` (thumbnail & favicon acak dari pool DB); import `sharp` & fetch foto profil dihapus.
- `plugins/bot/ping.js` - diringkas jadi satu ekspresi.
- `plugins/bot/runtime.js` - argumen uptime dikonversi detik -> milidetik, mengikuti `formatDuration(ms)` baru.
- `plugins/chanel/followch.js` / `unfollowch.js` - balasan sukses disederhanakan ke string biasa (quote bawaan `m.reply()`).
- `plugins/owner/addfile.js` - bungkus `q.full` dengan `reviveBase64Fields()` sebelum ekstrak media.
- `plugins/owner/eval.js` - hasil object selalu lewat `formatEvalResult()` (util.inspect) sehingga lazy property tampil `[lazy]`; pipeline eksekusi pindah ke `runUserCode()`.
- `plugins/owner/getthumbnail.js` - `jpegThumbnail` base64 string dikonversi otomatis ke Buffer.
- `plugins/owner/run.js` - download dokumen via `q.download()`; safety check `sock?.message`; pipeline eksekusi pindah ke `runUserCode()`.
- `plugins/owner/trust.js` / `untrust.js` - validasi fitur + target pakai helper bersama `extractFeatureTarget()`.
- `plugins/tools/c2i.js` - timeout request 60 detik via `AbortController`.
- `plugins/tools/get.js` - deteksi mimetype pakai `file-type`; hapus `detectFromMagicBytes` manual.
- `plugins/tools/qwa.js` - label media untuk konten non-teks; preview hanya untuk imageMessage ber-thumbnail; download dibungkus `reviveBase64Fields()`.
- `src/groupEventHandler.js` - refetch penuh hanya untuk event `subject`, `photo`, `group_code`, `group_description`; log bedakan Refetch vs Update.
- `src/messageHandler.js`:
    - Pesan newsletter disimpan & dilog tanpa diproses command.
    - `logPesanMasuk()` + `saveRawMessage()` ditunda ke `.finally()` agar respons lebih cepat.
    - Setup typing interval pindah keluar blok `try` + reset null.
    - Enforcement flag `adminOnly`/`onlyAdmin` di `processCommand` (sebelumnya tidak pernah dicek).
    - Bypass semua larangan plugin untuk owner/bot (`m.isOwner` termasuk `fromMe`): bebas `ownerOnly`, `privateOnly`, `adminOnly`. Lock tetap blokir semua kecuali `.lock`/`.unlock`.
    - Hook sistem trust: grup/user ter-trust melewati gate mode `self` serta flag owner/private/admin. Trust hanya berlaku di grup.
    - Semantik `groupOnly`/`onlyGroup` berubah: gerbang lokasi berlaku untuk semua orang termasuk owner (dicek sebelum bypass owner). Terdampak: `idgc.js`, `swgc.js`.

### Diperbaiki

- Menu/help gagal saat pool thumbnail kosong - kini fallback ke teks biasa tanpa thumbnail.
- Flag `onlyAdmin` tidak ditegakkan - plugin bisa dipakai semua anggota; kini dicek di `processCommand`.
- `reviveBase64Fields` tidak diimport di `addfile.js` - fallback path crash ReferenceError.
- `fileTypeFromBuffer()` tanpa await di `get.js` - deteksi mimetype selalu gagal; semua hasil fetch terkirim document generik.
- Sisa waktu salah satuan di cekthumb/addthumb - kirim detik ke `formatDuration()` yang ekspektasinya milidetik.
- `sendThumbnail` dengan url berawal spasi merusak render preview - matchedText ikut kotor; kini auto-trim + validasi URL.
- `.addfavicon` menolak pesan yang metadata favicon-nya ada - panen kini murni dari raw message dengan alasan spesifik per jenis kegagalan.
- `crypto` tidak diimport di `wrapper.js` - `crypto.randomBytes()` crash runtime.
- Eval me-resolve lazy getter via `JSON.stringify` - diganti util.inspect yang hormati custom inspect `[lazy]`.
- ESM/CJS mismatch - `rawMessageUtils.js` dikonversi ke `export {}`.
- Duplicate import di `get.js` - baris duplikat + badan fungsi orphan dihapus.
- Long object serialization - `isLongLike()` & `reviveBase64Fields()` menangani Long objects dengan benar.
- Group metadata over-fetching - refetch hanya untuk event yang butuh update metadata.

### Catatan Rilis

- Perilaku `config.self` tidak berubah - tetap pembatas global chat pribadi untuk non-owner di luar sistem trust.
- Normalisasi EOF newline di `index.js`, `notifRestart.js`, `c2i.js`.
- `settings.js` hanya berbeda nilai konfigurasi personal (owner, botNumber, jidGroup).

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
