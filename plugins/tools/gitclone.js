// ./plugins/tools/gitclone.js

import axios from 'axios'
import https from 'https'
import { performance } from 'perf_hooks'
import { formatBytes } from '../../lib/utils.js'

const GITHUB_URL_REGEX = /(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9][\w-]{0,38})\/([a-zA-Z0-9._-]{1,100})(?:\.git)?/i
const REPO_SHORTHAND_REGEX = /(?:^|\s)([a-zA-Z0-9][\w-]{0,38})\/([a-zA-Z0-9._-]{1,100})(?:\s|$)/i

const keepAliveAgent = new https.Agent({ keepAlive: true, maxSockets: 20 })

function extractRepo(raw) {
  if (!raw) return null
  const text = raw.trim()
  const fromUrl = text.match(GITHUB_URL_REGEX)
  if (fromUrl) return { user: fromUrl[1], repo: fromUrl[2].replace(/\.git$/i, '') }
  const fromShorthand = text.match(REPO_SHORTHAND_REGEX)
  if (fromShorthand) return { user: fromShorthand[1], repo: fromShorthand[2].replace(/\.git$/i, '') }
  return null
}

export default {
  command: 'gitclone',
  alias: ['git', 'clonegit'],
  category: 'tools',
  description: 'Mengunduh repository GitHub sebagai file ZIP.\n\n' +
    '*Format Penggunaan:*\n' +
    '> `Mengunduh repository dari URL atau user/repo`\n> .gitclone <url atau user/repo>\n\n' +
    '> `Menggunakan link GitHub dari pesan yang di-reply`\n> .gitclone',
  help: '<url repo>',
  typing: true,
  wait: true,

  async execute(m, { sock, args }) {

    const typed = args.join(' ')
    const input = typed || m.quoted?.text || ''

    if (!input.trim()) {
      return m.reply(
        `Masukkan repo GitHub yang valid!\n` +
        `Contoh:\n` +
        `• ${m.prefix}${m.command} nazedev/hitori\n` +
        `• ${m.prefix}${m.command} github.com/nazedev/hitori\n` +
        `• reply pesan berisi link GitHub lalu ketik ${m.prefix}${m.command}`
      )
    }

    const target = extractRepo(input)
    if (!target) return m.reply('❌ Tidak menemukan format `user/repo` atau link GitHub yang valid.')

    const { user, repo } = target
    const zipUrl = `https://api.github.com/repos/${user}/${repo}/zipball`
    const repoUrl = `https://github.com/${user}/${repo}`
    const t0 = performance.now()

    try {
      const response = await axios.get(zipUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/vnd.github+json',
          'Accept-Encoding': 'gzip, deflate, br'
        },
        httpsAgent: keepAliveAgent,
        responseType: 'stream',
        timeout: 60000,
        maxRedirects: 10,
        decompress: true
      })

      const sizeHeader = Number(response.headers['content-length']) || null
      const caption =
        `📦 *Repo:* ${user}/${repo}\n` +
        `🔗 *Link:* ${repoUrl}` +
        (sizeHeader ? `\n📄 *Ukuran:* ${formatBytes(sizeHeader)}` : '')

      await sock.message.send(m.chat, {
        type: 'document',
        media: response.data,
        mimetype: 'application/zip',
        fileName: `${repo}.zip`,
        caption
      }, { quote: m.raw })

      const duration = ((performance.now() - t0) / 1000).toFixed(2)
      console.log(`[GITCLONE] ${user}/${repo} selesai dalam ${duration}s`)

    } catch (err) {
      const status = err.response?.status
      const errMsg = status === 404
        ? `❌ Repo *${user}/${repo}* tidak ditemukan atau bersifat private.`
        : `❌ Gagal mengunduh repo!\n*Status:* ${status || 'Error'}\n*Pesan:* ${err.message}`

      console.error(`[GITCLONE] Error ${user}/${repo}:`, err.message)
      return m.reply(errMsg)
    }
  }
}
