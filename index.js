// index.js

import chalk from 'chalk'
import { createSocket } from './src/createSocket.js'
import { connectionHandler } from './src/connectionHandler.js'
import { messageHandler } from './src/messageHandler.js'
import { groupEventHandler } from './src/groupEventHandler.js'

let sock

try {
  sock = createSocket()

  connectionHandler(sock)
  groupEventHandler(sock)

  const messageHandlerResult = messageHandler(sock)

  if (messageHandlerResult instanceof Promise) {
    messageHandlerResult.catch(err => {
      console.error(
        chalk.red('[MESSAGE] Handler error:'),
        err?.stack || err?.message || err
      )
    })
  }

  await sock.connect()

} catch (err) {
  console.error(
    chalk.red('[WA] Gagal connect awal:'),
    err?.stack || err?.message || err
  )

  process.exit(1)
}

let shuttingDown = false

async function shutdown(signal) {
  if (shuttingDown) return

  shuttingDown = true

  console.log(
    chalk.yellow(`\n[WA] Menerima ${signal}, menutup koneksi...`)
  )

  try {
    if (sock) {
      await sock.disconnect()
    }
  } catch (err) {
    console.error(
      chalk.red('[WA] Gagal menutup koneksi:'),
      err?.stack || err?.message || err
    )
  }

  process.exit(0)
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
