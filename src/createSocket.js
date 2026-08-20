// src/createSocket.js

import fs from 'fs'
import path from 'path'
import { createStore, WaClient } from 'zapo-js'
import { createSqliteStore } from '@zapo-js/store-sqlite'
import { createMediaProcessor } from '@zapo-js/media-utils'
import { config } from '../settings.js'
import { attachWrappers } from '../lib/wrapper.js'

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err?.stack || err?.message || err)
})

process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason)
})

const SESSION_DB_PATH = 'session/session.sqlite'

export function createSocket() {
  const sessionDir = path.dirname(SESSION_DB_PATH)
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true })
    console.log(`[SESSION] Folder "${sessionDir}" belum ada, otomatis dibuat.`)
  }

  const store = createStore({
    backends: {
      sqlite: createSqliteStore({ path: SESSION_DB_PATH })
    },
    providers: {
      auth: 'sqlite',
      signal: 'sqlite',
      preKey: 'sqlite',
      session: 'sqlite',
      identity: 'sqlite',
      senderKey: 'sqlite',
      appState: 'sqlite',
      privacyToken: 'sqlite',
      messages: 'none',
      threads: 'none',
      contacts: 'none'
    }
  })

  const noopLogger = {
    level: 'error',
    trace() {},
    debug() {},
    info() {},
    warn() {},
    error() {},
    child() { return noopLogger }
  }

  const sock = new WaClient(
    {
      store,
      sessionId: config.sessionId,
      recoverFromClientTooOld: true,
      media: {
        processor: createMediaProcessor(),
        generateThumbnail: true,
        generateWaveform: true,
        normalizeVoiceNote: true
      }
    },
    noopLogger
  )

  attachWrappers(sock)

  return sock
}