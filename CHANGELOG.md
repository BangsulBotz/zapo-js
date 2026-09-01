# Changelog

## v1.4.0 - 2026-08-28

Penyempurnaan file publik, optimasi pemrosesan event, konsolidasi database, optimasi memori, dan perapian penggunaan API zapo-js.

### Ditambahkan

- **db/group.js** - Database gabungan untuk setting grup dan trust user/grup, menggantikan `db/groupDatabase.js` dan `db/trustedFeatures.js` dalam satu file `store/group.db`.
- **db/botConfig.js** - Pengaturan bot berbasis JSON (`store/bot_settings.json`), menggantikan `db/botDatabase.js` yang menggunakan SQLite.
- **lib/lru.js** - Utility class LRU cache untuk pembatasan jumlah item di memori.
- **lib/function.js** - Helper function untuk eval/run code (`transformImports`, `createFakeConsole`, `formatEvalResult`, `formatEvalError`, `executeAsyncCode`, `sendErrorToOwner`), dipindahkan dari `lib/utils.js`.
- **lib/groupDetection.js** - Deteksi pelanggaran grup (link detection, kick sender, delete message, `enforceGroupPolicies`).
- **lib/thumbnail.js** - Utility untuk save dan refresh metadata thumbnail ke database.
- **plugins/bot/os.js** - Plugin untuk menampilkan informasi sistem dan penggunaan resource server.
- **plugins/bot/reaction.js** - Plugin untuk memberikan reaction ke pesan.
- **plugins/grup/add.js** - Plugin untuk menambah anggota ke grup.
- **plugins/grup/antilink.js** - Plugin untuk mengatur anti-link grup (on/off dengan aksi delete/kick/both).
- **plugins/grup/delete.js** - Plugin untuk menghapus pesan yang di-reply (admin only).
- **plugins/grup/demote.js** - Plugin untuk mencabut admin grup dari anggota tertentu.
- **plugins/grup/getpp.js** - Plugin untuk mengambil foto profil user atau grup.
- **plugins/grup/getppgc.js** - Plugin untuk mengambil foto profil grup ini.
- **plugins/grup/groupset.js** - Plugin untuk menampilkan pengaturan grup saat ini.
- **plugins/grup/grupclose.js** - Plugin untuk menutup grup (hanya admin yang bisa kirim pesan).
- **plugins/grup/grupopen.js** - Plugin untuk membuka grup (semua member bisa kirim pesan).
- **plugins/grup/kick.js** - Plugin untuk mengeluarkan anggota dari grup.
- **plugins/grup/linkgc.js** - Plugin untuk mendapatkan link undangan grup.
- **plugins/grup/promote.js** - Plugin untuk menjadikan anggota sebagai admin grup.
- **plugins/grup/selfgc.js** - Plugin untuk mengatur mode self bot khusus grup ini.
- **plugins/grup/setnamegc.js** - Plugin untuk mengganti nama grup.
- **plugins/grup/setppgc.js** - Plugin untuk mengganti foto profil grup.
- **plugins/konvert/2vo.js** - Plugin untuk mengubah pesan media menjadi view once.
- **plugins/konvert/todocument.js** - Plugin untuk mengirim ulang reply teks/media sebagai dokumen.
- **plugins/owner/delplugins.js** - Plugin untuk menghapus plugin dari directory plugins.
- **plugins/owner/leavegc.js** - Plugin untuk keluar dari grup saat ini.
- **plugins/owner/setppbot.js** - Plugin untuk mengganti foto profil bot.
- **plugins/owner/silentlog.js** - Plugin untuk toggle silent logging untuk grup (per-group atau all groups).
- **plugins/tools/cat.js** - Plugin untuk mengkonversi dokumen menjadi teks atau kirim ulang media sebagai media biasa.
- **plugins/tools/cekdevice.js** - Plugin untuk mengecek perkiraan perangkat pengirim pesan.
- **plugins/tools/contact.js** - Plugin untuk mengecek data kontak yang tersimpan di database.
- **plugins/tools/rvo.js** - Plugin untuk membaca pesan view once.

### Diperbarui

- **index.js** - Import dan inisialisasi `startThumbAutoRefresh(sock)` setelah connect.
- **handler.js** - Mengekspor `buildContact()`, memindahkan `transformImports`, `createFakeConsole`, `formatEvalResult`, `formatEvalError`, `executeAsyncCode` ke `lib/function.js`, menambahkan `NOISY_MESSAGE_FIELDS` untuk membersihkan field protobuf bising, menambahkan `attachCompactJsonInspect()` untuk inspeksi objek yang lebih rapi, menambahkan `stripDeviceId()` dan `isJidFromBot()` untuk deteksi JID bot, menggunakan `sock.getCredentials()` untuk `me` di eval context, membersihkan field bising dari `logRawDebug()`, serta menghapus auto-parse JSON pada `m.reply()`.
- **src/messageHandler.js** - Menambahkan deduplikasi command dengan `handledCommandIds` (Set, max 4096), melewati pesan history/offline sebelum bot aktif dengan `isHistoricalMessage()`, menggunakan `sock.getCredentials()` untuk sender/pushName, menjadikan `self` sebagai master switch dengan `getBotSettingValue('self')` di atas `selfgc` grup, menambahkan pengecekan `isBotAdminOnly`, mengirim wait message via `sock.message.send()` langsung, menjalankan `enforceGroupPolicies()` untuk deteksi anti-anti, serta mendukung `silent logging` via `isSilentLog()`.
- **src/connectionHandler.js** - Menambahkan delay reconnect berbeda per jenis error: `stream_error_replaced` 60 detik, `service_unavailable` 30 detik, error lain mulai 2 detik dengan exponential backoff maksimal 30 detik; menyimpan `lastReason` untuk tracking.
- **src/createSocket.js** - Menonaktifkan pemrosesan media otomatis (`generateThumbnail`, `generateWaveform`, `normalizeVoiceNote` diatur ke `false`).
- **lib/utils.js** - Menambahkan `extractTarget()` untuk target tunggal/jamak/feature dengan validasi JID, `formatTargetUsage()`, `getParticipantActionStatus()` beserta mapping status `403`/`404`/`408`/`409`/`500`, `formatActionResults()`, `executeParticipantAction()` dengan konfirmasi IQ 500, memindahkan `isLocked()`/`setLocked()` dari `lib/lockState.js`, memindahkan `transformImports`/`createFakeConsole`/`formatEvalResult`/`formatEvalError`/`executeAsyncCode`/`sendErrorToOwner` ke `lib/function.js`, memperbaiki validasi `formatBytes()`, mengurangi kedalaman `cloneStripQuoted` dari 40 menjadi 20, mengonversi Long-like ke number di `trimRawReplacer` dan `cloneStripQuoted`, mengoptimasi `reviveBase64Fields` dengan array loop, menjadikan `isByteArrayLike`/`isPlainObject`/`isLongLike`/`WA_MEDIA_HOST` sebagai private.
- **lib/loadPlugins.js** - Menambahkan `importFresh()` dengan nonce reload konsisten, mendukung Node.js dan Bun secara terpisah, membersihkan file temporary pattern `.tmp-*.mjs`, mengatur hasil reload global tanpa pengecekan error.
- **lib/notifRestart.js** - Menyederhanakan pengiriman notifikasi restart menjadi hanya `sock.message.send()`, menghapus fallback ke `sock.sendMessage`/`sock.deps.messageDispatch`/`sock.deps.messageCoordinator`.
- **lib/wrapper.js** - Menambahkan `sendStickerPack()` untuk mengirim paket stiker, menambahkan thumbnail 120px quality 10 pada setiap item album di `sendAlbum()`, mendukung format object `{ images, videos }` pada `sendAlbum()`, menurunkan ukuran/quality thumbnail album.
- **lib/groupAndBot.js** - Mengimpor dari `db/group.js` dan `db/botConfig.js`, menggunakan LRU cache(100) untuk `groupSettingsCache`.
- **db/groupCache.js** - Menggunakan LRU cache(50) untuk metadata grup, menambahkan logging fetch/refetch metadata, menambahkan `confirmParticipantAction()` untuk verifikasi aksi participant setelah IQ 500, serta mencocokkan participant berdasarkan nomor/JID dengan normalisasi bagian sebelum `@`.
- **db/rawMessage.js** - Mengganti `structuredClone(event)` dengan shallow clone `{...event}`, menambahkan LRU cache(1000) untuk `jidCache`, mengurangi SQLite journal_size_limit dari 64 MB menjadi 16 MB, cache dari 16 MB menjadi 4 MB, dan mmap dari 256 MB menjadi 64 MB, menambahkan query ascending untuk pesan per chat dan per sender (`getMessagesByChatWithRawAsc`, `getMessagesBySenderWithRawAsc`), mengembalikan decoded attributes pada semua query, menyederhanakan error handling, serta menambahkan logging untuk save/duplicate.
- **db/contacts.js** - Menambahkan LRU cache(1000) untuk `contactCache`, mengurangi SQLite journal_size_limit dari 64 MB menjadi 8 MB, cache dari 8 MB menjadi 2 MB, dan mmap dari 256 MB menjadi 8 MB.
- **db/thumbnails.js** - Mengurangi SQLite journal_size_limit dari 64 MB menjadi 8 MB, page cache dari 4 MB menjadi 1 MB, dan mapping virtual dari 128 MB menjadi 8 MB.
- **plugins/bot/ping.js** - Menampilkan latency aktual dengan mengedit pesan ping; alias `p2` dihapus.
- **plugins/grup/idgc.js** - Menghapus context quote yang tidak diperlukan.
- **plugins/grup/swgc.js** - Mendukung quoted message berbentuk `conversation`.
- **plugins/owner/addthumb.js** - Dipangkas menjadi wrapper tipis tanpa logic thumbnail yang duplikat.
- **plugins/owner/lock.js** - Mengambil state lock dari `lib/utils.js`.
- **plugins/owner/trust.js** dan **untrust.js** - Menggunakan resolver target universal dengan opsi feature, memperbaiki pembacaan error resolver, mengembalikan balasan secara awaited, memakai mention target tanpa menampilkan pasangan JID/LID, serta tidak membatalkan perubahan DB saat ACK konfirmasi timeout.
- **plugins/konvert/upload.js**, **plugins/tools/c2i.js**, dan **plugins/owner/createthumb.js** - Menangani kegagalan download, parsing respons, upload thumbnail, dan URL input tanpa meneruskannya sebagai exception format.
- **plugins/owner/run.js** dan **eval.js** - Mengirim error eksekusi kode langsung ke pengguna.
- **plugins/konvert/tovn.js**, **plugins/search/pinterest.js**, **plugins/tools/get.js**, **plugins/owner/trustgc.js**, dan **listtrust.js** - Menunggu balasan error/status agar rejection pengiriman tidak menjadi unhandled rejection; `get.js` juga memvalidasi URL HTTP/HTTPS, membersihkan tanda baca, memperbaiki deteksi MIME, dan memperketat deteksi konten teks.
- **package.json** - Menambahkan script test, dependency native, fake server sebagai dev dependency, dan trusted dependency untuk package native/sharp.
- **Seluruh plugins** - Menyegarkan format deskripsi dan field `help` pada semua plugin (`bot/`, `chanel/`, `grup/`, `konvert/`, `owner/`, `search/`, `tools/`) agar konsisten dengan format baru: setiap baris teks diawali `>`, section header tanpa `>`, dan command example tanpa `>`.

### Dihapus

- **db/groupDatabase.js** - Digabungkan ke `db/group.js`.
- **db/trustedFeatures.js** - Digabungkan ke `db/group.js`.
- **db/botDatabase.js** - Digantikan oleh `db/botConfig.js`.
- **lib/lockState.js** - Logic `isLocked()` dan `setLocked()` digabungkan ke `lib/utils.js`.

### Catatan Rilis

- Command diproses sebelum operasi berat agar respons tidak tertahan database, logging, atau pemuatan metadata grup.
- Aksi participant memverifikasi metadata ketika server mengembalikan IQ `500` setelah perubahan.
- Mention eksplisit tidak lagi menambahkan pengirim command secara otomatis.
- Database grup dan trust digabungkan ke satu file untuk mengurangi jumlah koneksi SQLite.
- Bot settings dipindahkan ke JSON untuk pembacaan lebih cepat dan mengurangi overhead SQLite.
- LRU cache membatasi penggunaan memori pada cache contact, group, dan jid.
- Reconnect delay diperpanjang untuk `stream_error_replaced` (60 detik) mengingat perilaku WhatsApp companion device saat primary device aktif.

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
