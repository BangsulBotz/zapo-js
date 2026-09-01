// plugins/owner/reload.js

import path from 'path'
import { fileURLToPath } from 'url'
import { reloadGlobalPlugins } from '../../lib/loadPlugins.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PLUGINS_DIR = path.resolve(__dirname, '..')

export default {
  command: 'reload',
  alias: ['rld', 'reloadplugins'],
  category: 'owner',
  description: `> Memuat ulang seluruh plugin bot.

contoh penggunaan:
> \`.reload\``,
  onlyOwner: true,

  async execute(m) {
    const start = Date.now()

    try {
      const res = await reloadGlobalPlugins(PLUGINS_DIR)

      const timeTaken = Date.now() - start

      const folderMap = new Map()

      for (const p of res._raw) {
        if (!folderMap.has(p.folder)) folderMap.set(p.folder, { loaded: 0, hasIssue: false })
        folderMap.get(p.folder).loaded++
      }

      for (const err of res.errorList) {
        if (!folderMap.has(err.folder)) folderMap.set(err.folder, { loaded: 0, hasIssue: true })
        else folderMap.get(err.folder).hasIssue = true
      }

      for (const dup of res.duplicates) {
        if (folderMap.has(dup.a.folder)) folderMap.get(dup.a.folder).hasIssue = true
        if (folderMap.has(dup.b.folder)) folderMap.get(dup.b.folder).hasIssue = true
      }

      let response = `⚡ *RELOAD PLUGINS COMPLETED* (${timeTaken}ms)\n\n`

      for (const [folder, info] of folderMap) {
        if (!info.hasIssue) {
          response += `\`${folder}\` -> All plugins ready.\n`
        } else {
          response += `\`${folder}\` -> (Loaded: ${info.loaded}) ⚠️ *Issues Found*\n`
        }
      }

      if (res.errorList.length > 0) {
        response += `\n❌ *ERRORS (${res.errorList.length}):*\n`
        for (const err of res.errorList) {
          response += `• \`${err.folder}/${err.file}\`\n  └─ ${err.reason}\n`
        }
      }

      if (res.duplicates.length > 0) {
        response += `\n⚠️ *DUPLICATES (${res.duplicates.length}):*\n`
        for (const dup of res.duplicates) {
          const fileA = `${dup.a.folder}/${dup.a.file}`
          const fileB = `${dup.b.folder}/${dup.b.file}`
          const keys = dup.keys.map(k => `\`${k}\``).join(', ')
          response += `• \`${fileA}\` ⚔️ \`${fileB}\`\n  └─ Keys: ${keys}\n`
        }
      }

      return m.reply(response.trim())
    } catch (err) {
      return m.reply(`❌ *Reload Failed:* ${err?.message || err}`)
    }
  }
}
