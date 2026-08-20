// settings.js

import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)

export const settings = {
  sessionId: 'default',
  logLevel: 'info',
  usePairingCode: true,
  customPairing: 'BERAKLAH', //wajib 8 huruf/angka (dilarang pakai karakter I, O, U, 0) 
  noprefix: true,
  self: true,

  eventMessage: false,  // log RAW event 'message'
  eventAll: false,     // log RAW semua event

  ownerName: 'ghofar',
  owner: '6281234567890', //628xxx (contoh: 6281234567890)
  botName: 'bangsulbotz',
  botNumber: '', //628xxx (contoh: 6281234567890)
  jidGroup: '123@g.us',  //id grup mu. fitur backup dioper kesinii. bukan chat pribadi. 

  prefixes: ['.', '#', '!', '/'],

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
  settings[key] = value

  try {
    let content = fs.readFileSync(__filename, 'utf8')
    const regex = new RegExp(`(${key}:\\s*)([^,\\n]+)`)
    const formattedValue = typeof value === 'string' ? `'${value}'` : value

    if (regex.test(content)) {
      content = content.replace(regex, `$1${formattedValue}`)
      fs.writeFileSync(__filename, content, 'utf8')
      return true
    }
  } catch (err) {
    console.error('[SETTINGS] Gagal mengedit file settings.js:', err?.message || err)
  }
  return false
}

export const updateConfig = updateSetting
