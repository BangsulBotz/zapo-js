// plugins/owner/$.js

import { exec } from 'child_process'
import { promisify } from 'util'

const execPromise = promisify(exec)

export default {
  command: '$',
  alias: ['shell', 'exec'],
  category: 'owner',
  description: 'Menjalankan perintah terminal atau shell.\n\n' +
    '*Format Penggunaan:*\n' +
    '> `Menjalankan perintah shell`\n> .$ <command>',
  help: '`<command>`',
  onlyOwner: true,
  wait: true,

  async execute(m, { args }) {
    const command = args ? args.join(' ') : ''

    if (!command) return m.reply('*Masukkan perintah shell!*')

    try {
      const { stdout, stderr } = await execPromise(command)

      if (stdout) {
        return m.reply(`output:\n${stdout.trim()}`)
      }

      if (stderr) {
        return m.reply(`Standard Error:\n\n${stderr.trim()}`)
      }

      if (!stdout && !stderr) {
        return m.reply('*Command executed (No output)*')
      }
    } catch (error) {
      return m.reply(`*Error:*\n\n${error.message}`)
    }
  }
}
