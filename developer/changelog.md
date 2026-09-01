# Changelog

## v1.4.0 - 2026-08-28

Penyempurnaan file publik, optimasi pemrosesan event, konsolidasi database, optimasi memori, dan perapian penggunaan API zapo-js.

### Ditambahkan

- **db/group.js** - Database gabungan untuk setting grup dan trust user/grup, menggantikan `db/groupDatabase.js` dan `db/trustedFeatures.js` dalam satu file `store/group.db`.
- **db/botConfig.js** - Pengaturan bot berbasis JSON (`store/bot_settings.json`), menggantikan `db/botDatabase.js` yang menggunakan SQLite.
- **lib/lru.js** - Utility class LRU cache untuk pembatasan jumlah item di memori.
- **lib/memoryMonitor.js** - Pemantauan penggunaan memori periodik dengan logging ke CSV dan GC hint.
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

- **index.js** - Menambahkan import dan inisialisasi `startMemoryMonitor(30000)` untuk pemantauan memori periodik.
- **handler.js** - Mengekspor `buildContact()`, memindahkan `transformImports`, `createFakeConsole`, `formatEvalResult`, `formatEvalError`, `executeAsyncCode` ke `lib/function.js`, menambahkan `NOISY_MESSAGE_FIELDS` untuk membersihkan field protobuf bising, menambahkan `attachCompactJsonInspect()` untuk inspeksi objek yang lebih rapi, menambahkan `stripDeviceId()` dan `isJidFromBot()` untuk deteksi JID bot, menggunakan `sock.getCredentials()` untuk `me` di eval context, membersihkan field bising dari `logRawDebug()`, serta menghapus auto-parse JSON pada `m.reply()`.
- **src/messageHandler.js** - Menambahkan deduplikasi command dengan `handledCommandIds` (Set, max 4096), melewati pesan history/offline sebelum bot aktif dengan `isHistoricalMessage()`, menggunakan `sock.getCredentials()` untuk sender/pushName, menjadikan `self` sebagai master switch dengan `getBotSettingValue('self')` di atas `selfgc` grup, menambahkan pengecekan `isBotAdminOnly`, mengirim wait message via `sock.message.send()` langsung, menjalankan `enforceGroupPolicies()` untuk deteksi anti-anti, serta mendukung `silent logging` via `isSilentLog()`.
- **src/connectionHandler.js** - Menambahkan delay reconnect berbeda per jenis error: `stream_error_replaced` 60 detik, `service_unavailable` 30 detik, error lain mulai 2 detik dengan exponential backoff maksimal 30 detik; menyimpan `lastReason` untuk tracking.
- **src/createSocket.js** - Menonaktifkan pemrosesan media otomatis (`generateThumbnail`, `generateWaveform`, `normalizeVoiceNote` diatur ke `false`).
- **lib/utils.js** - Menambahkan `extractTarget()` untuk target tunggal, target jamak, dan target feature; mencegah mention LID berubah menjadi target PN duplikat; menambahkan `formatTargetUsage()` dan helper umum aksi participant; memindahkan state lock dari modul terpisah; memperbaiki validasi `formatBytes()`; menambahkan `formatActionResults()` beserta mapping status participant `403`, `404`, `408`, dan `500`; mengurangi kedalaman `cloneStripQuoted` dari 40 menjadi 20; mengoptimasi `reviveBase64Fields` dengan array loop; serta menghapus helper yang tidak digunakan.
- **lib/loadPlugins.js** - Menambahkan import fresh untuk Node dan Bun, nonce reload yang konsisten, pembersihan file temporary, serta pengaturan hasil reload global.
- **lib/notifRestart.js** - Menggunakan `sock.message.send()` secara langsung untuk notifikasi restart.
- **lib/wrapper.js** - Mendukung format object `{ images, videos }` pada `sendAlbum()`, menambahkan thumbnail pada item album, dan menurunkan ukuran/quality thumbnail album.
- **lib/groupAndBot.js** - Mengimpor dari `db/group.js` dan `db/botConfig.js`, menggunakan LRU cache(100) untuk `groupSettingsCache`.
- **db/groupCache.js** - Mencocokkan participant berdasarkan nomor/JID dengan normalisasi bagian sebelum `@`, mencatat fetch/refetch metadata dan jumlah participant, mengonfirmasi hasil aksi participant setelah IQ 500, serta menggunakan LRU cache(50) untuk metadata grup.
- **db/rawMessage.js** - Mengganti `structuredClone(event)` dengan shallow clone `{...event}`, menambahkan LRU cache(1000) untuk `jidCache`, mengurangi SQLite mmap dari 256 MB menjadi 64 MB dan cache dari 16 MB menjadi 4 MB, menambahkan query ascending untuk pesan per chat dan per sender, mengembalikan decoded attributes, serta menampilkan kembali nomor `order` saat pesan berhasil disimpan.
- **db/contacts.js** - Menambahkan LRU cache(1000) untuk `contactCache` dan mengurangi SQLite mmap dari 256 MB menjadi 8 MB.
- **db/thumbnails.js** - Mengurangi page cache SQLite thumbnail dari 4 MB menjadi 1 MB dan mapping virtual dari 128 MB menjadi 32 MB tanpa mengubah format metadata atau fungsi thumbnail.
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
- **patch.js** - Menambahkan patch encoding media untuk `pollCreationOptionImageMessage` agar tipe media gambar dikenali zapo-js.

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
