// index.js

import chalk from 'chalk'
import { createSocket } from './src/createSocket.js'
import { connectionHandler } from './src/connectionHandler.js'
import { messageHandler } from './src/messageHandler.js'
import { groupEventHandler } from './src/groupEventHandler.js'

const sock = createSocket()

connectionHandler(sock)
groupEventHandler(sock)
await messageHandler(sock)

process.on('SIGINT', async () => {
  console.log(chalk.yellow('\n[WA] Menutup koneksi...'))
  await sock.disconnect()
  process.exit(0)
})

try {
  await sock.connect()
} catch (err) {
  console.error(chalk.red('[WA] Gagal connect awal:'), err?.message || err)
  process.exit(1)
}