// settings.js

import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)

export const settings = {
  usePairingCode: true,
  customPairing: 'BERAKLAH', //wajib 8 huruf/angka (dilarang pakai karakter I, O, U, 0)
  noprefix: true,
  self: true,

  // log RAW event 'message'
  eventMessage: false,
  // log RAW semua event
  eventAll: false,

  ownerName: 'ghofar',
  owner: '6281234567890',
  botName: 'bangsulbotz',
  botNumber: '',

  //id grup mu. fitur backup dioper kesinii. bukan chat pribadi.
  jidGroup: '1234@g.us',

  prefixes: [".","#","!","/"],

  //cuman template, beberapa belum terpakai wkwk
  pesan: {
    wait: 'Sedang diproses, mohon tunggu sebentar ya kak... ⏳',
    error: 'Terjadi kesalahan 😥 Coba lagi nanti ya.',
    done: 'Berhasil dilakukan ✓',
    ownerOnly: 'Fitur ini khusus owner bot!',
    groupOnly: 'Fitur ini hanya bisa digunakan di grup!',
    privateOnly: 'Fitur ini hanya bisa digunakan di private chat!',
    adminOnly: 'Fitur ini hanya untuk Admin grup!',
    botAdmin: 'Bot harus menjadi Admin untuk menjalankan perintah ini!'
  }
}

export const config = settings

export function updateSetting(key, value) {
  // object multiline (mis. pesan) tidak aman ditulis-ulang per baris -> tolak
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    console.error(`[SETTINGS] Gagal mengedit "${key}": value berupa object tidak didukung. Edit manual di settings.js.`)
    return false
  }

  try {
    const lines = fs.readFileSync(__filename, 'utf8').split('\n')

    // cari properti HANYA di level atas objek settings (depth 1),
    // biar key nested di dalam pesan {} tidak ikut ke-match
    let depth = 0
    let targetIdx = -1
    let indent = ''

    for (let i = 0; i < lines.length; i++) {
      // buang isi string dulu, supaya kurung/koma di dalam nilai tidak menyesatkan
      const bare = lines[i].replace(/(['"])(?:\\.|(?!\1).)*\1/g, '')
      depth += (bare.match(/[{[]/g) || []).length - (bare.match(/[}\]]/g) || []).length

      const match = bare.match(/^(\s*)([A-Za-z_$][\w$]*)\s*:/)
      if (depth === 1 && match && match[2] === key) {
        targetIdx = i
        indent = match[1]
        break
      }
    }

    if (targetIdx === -1) {
      console.error(`[SETTINGS] Properti "${key}" tidak ditemukan di settings.js`)
      return false
    }

    const hadComma = /,\s*$/.test(lines[targetIdx])
    lines[targetIdx] = `${indent}${key}: ${JSON.stringify(value)}${hadComma ? ',' : ''}`

    fs.writeFileSync(__filename, lines.join('\n'), 'utf8')
    settings[key] = value
    return true
  } catch (err) {
    console.error('[SETTINGS] Gagal mengedit file settings.js:', err?.message || err)
  }
  return false
}

export const updateConfig = updateSetting
