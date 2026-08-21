// plugins/tools/get.js

import axios from 'axios'
import { performance } from 'perf_hooks'

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36'
]

function randomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

function buildHeaders(url) {
  const parsed = new URL(url)
  const origin = `${parsed.protocol}//${parsed.hostname}`
  const referers = [
    origin,
    'https://www.google.com/',
    'https://www.bing.com/',
    `https://www.google.com/search?q=${encodeURIComponent(parsed.hostname)}`
  ]
  const referer = referers[Math.floor(Math.random() * referers.length)]
  return {
    'User-Agent': randomUA(),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer': referer,
    'Origin': origin,
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'cross-site',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'DNT': '1'
  }
}

function detectFromMagicBytes(buf) {
  const h = buf.slice(0, 12)
  if (h[0] === 0xFF && h[1] === 0xD8 && h[2] === 0xFF) return { ext: 'jpg', mime: 'image/jpeg' }
  if (h[0] === 0x89 && h[1] === 0x50 && h[2] === 0x4E && h[3] === 0x47) return { ext: 'png', mime: 'image/png' }
  if (h[0] === 0x47 && h[1] === 0x49 && h[2] === 0x46) return { ext: 'gif', mime: 'image/gif' }
  if (h[0] === 0x52 && h[1] === 0x49 && h[2] === 0x46 && h[3] === 0x46 && h[8] === 0x57 && h[9] === 0x45 && h[10] === 0x42 && h[11] === 0x50) return { ext: 'webp', mime: 'image/webp' }
  if (h[0] === 0x25 && h[1] === 0x50 && h[2] === 0x44 && h[3] === 0x46) return { ext: 'pdf', mime: 'application/pdf' }
  if (h[0] === 0x49 && h[1] === 0x44 && h[2] === 0x33) return { ext: 'mp3', mime: 'audio/mpeg' }
  if (h[0] === 0xFF && (h[1] & 0xE0) === 0xE0) return { ext: 'mp3', mime: 'audio/mpeg' }
  if (h[4] === 0x66 && h[5] === 0x74 && h[6] === 0x79 && h[7] === 0x70) {
    const brand = buf.slice(8, 12).toString('ascii')
    if (['M4A ', 'M4B ', 'M4P '].includes(brand)) return { ext: 'm4a', mime: 'audio/mp4' }
    return { ext: 'mp4', mime: 'video/mp4' }
  }
  if (h[0] === 0x1A && h[1] === 0x45 && h[2] === 0xDF && h[3] === 0xA3) return { ext: 'webm', mime: 'video/webm' }
  if (h[0] === 0x4F && h[1] === 0x67 && h[2] === 0x67 && h[3] === 0x53) return { ext: 'ogg', mime: 'audio/ogg' }
  if (h[0] === 0x66 && h[1] === 0x4C && h[2] === 0x61 && h[3] === 0x43) return { ext: 'flac', mime: 'audio/flac' }
  if (h[0] === 0x52 && h[1] === 0x49 && h[2] === 0x46 && h[3] === 0x46 && h[8] === 0x57 && h[9] === 0x41 && h[10] === 0x56 && h[11] === 0x45) return { ext: 'wav', mime: 'audio/wav' }
  if (h[0] === 0x50 && h[1] === 0x4B && h[2] === 0x03 && h[3] === 0x04) return { ext: 'zip', mime: 'application/zip' }
  if (h[0] === 0xD0 && h[1] === 0xCF && h[2] === 0x11 && h[3] === 0xE0) return { ext: 'xls', mime: 'application/vnd.ms-excel' }
  if (h[0] === 0x1F && h[1] === 0x8B) return { ext: 'gz', mime: 'application/gzip' }
  if (buf.slice(0, 7).toString() === '<!DOCTY' || buf.slice(0, 5).toString().toLowerCase() === '<html') return { ext: 'html', mime: 'text/html' }
  return null
}

const EXT_MAP = {
  jpg: { mime: 'image/jpeg' }, jpeg: { mime: 'image/jpeg' },
  png: { mime: 'image/png' }, gif: { mime: 'image/gif' },
  webp: { mime: 'image/webp' }, bmp: { mime: 'image/bmp' },
  svg: { mime: 'image/svg+xml' }, ico: { mime: 'image/x-icon' },
  mp3: { mime: 'audio/mpeg' }, m4a: { mime: 'audio/mp4' },
  ogg: { mime: 'audio/ogg' }, flac: { mime: 'audio/flac' },
  wav: { mime: 'audio/wav' }, aac: { mime: 'audio/aac' },
  mp4: { mime: 'video/mp4' }, webm: { mime: 'video/webm' },
  mkv: { mime: 'video/x-matroska' }, avi: { mime: 'video/x-msvideo' },
  mov: { mime: 'video/quicktime' },
  pdf: { mime: 'application/pdf' },
  zip: { mime: 'application/zip' }, rar: { mime: 'application/x-rar-compressed' },
  gz: { mime: 'application/gzip' }, tar: { mime: 'application/x-tar' },
  apk: { mime: 'application/vnd.android.package-archive' },
  exe: { mime: 'application/x-msdownload' },
  txt: { mime: 'text/plain' }, html: { mime: 'text/html' },
  css: { mime: 'text/css' }, csv: { mime: 'text/csv' },
  json: { mime: 'application/json' }, js: { mime: 'application/javascript' },
  xml: { mime: 'application/xml' },
  doc: { mime: 'application/msword' },
  docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  xls: { mime: 'application/vnd.ms-excel' },
  xlsx: { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  ppt: { mime: 'application/vnd.ms-powerpoint' },
  pptx: { mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
  ttf: { mime: 'font/ttf' }, otf: { mime: 'font/otf' },
  woff: { mime: 'font/woff' }, woff2: { mime: 'font/woff2' }
}

const MIME_LABEL = {
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { ext: 'docx', label: 'Word' },
  'application/msword': { ext: 'doc', label: 'Word' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { ext: 'xlsx', label: 'Excel' },
  'application/vnd.ms-excel': { ext: 'xls', label: 'Excel' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { ext: 'pptx', label: 'PowerPoint' },
  'application/vnd.ms-powerpoint': { ext: 'ppt', label: 'PowerPoint' },
  'application/pdf': { ext: 'pdf', label: 'PDF' },
  'application/zip': { ext: 'zip', label: 'ZIP' },
  'application/x-rar-compressed': { ext: 'rar', label: 'RAR' },
  'application/gzip': { ext: 'gz', label: 'GZIP' },
  'application/vnd.android.package-archive': { ext: 'apk', label: 'APK' },
  'application/x-msdownload': { ext: 'exe', label: 'EXE' },
  'text/plain': { ext: 'txt', label: 'Text' },
  'text/csv': { ext: 'csv', label: 'CSV' },
  'application/json': { ext: 'json', label: 'JSON' },
  'application/javascript': { ext: 'js', label: 'JavaScript' },
  'text/html': { ext: 'html', label: 'HTML' },
  'font/ttf': { ext: 'ttf', label: 'Font TTF' },
  'font/otf': { ext: 'otf', label: 'Font OTF' }
}

function detectFromZipContent(buf) {
  try {
    const content = buf.toString('binary')
    if (content.includes('word/')) return { ext: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
    if (content.includes('xl/')) return { ext: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
    if (content.includes('ppt/')) return { ext: 'pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }
    if (content.includes('AndroidManifest.xml')) return { ext: 'apk', mime: 'application/vnd.android.package-archive' }
  } catch {}
  return { ext: 'zip', mime: 'application/zip' }
}

function detectFromUrl(url) {
  try {
    const pathname = new URL(url).pathname
    const ext = pathname.split('.').pop().toLowerCase().split('?')[0]
    if (EXT_MAP[ext]) return { ext, mime: EXT_MAP[ext].mime }
  } catch {}
  return null
}

function resolveFileInfo(buffer, url, contentType) {
  const magic = detectFromMagicBytes(buffer)
  if (magic) {
    if (magic.ext === 'zip') return detectFromZipContent(buffer)
    return magic
  }
  const fromUrl = detectFromUrl(url)
  if (fromUrl) return fromUrl
  const ct = contentType?.split(';')[0]?.trim() || ''
  if (MIME_LABEL[ct]) return { ext: MIME_LABEL[ct].ext, mime: ct }
  const ext = ct.split('/')[1]?.split(';')[0]?.trim() || 'bin'
  return { ext, mime: ct || 'application/octet-stream' }
}

async function fetchWithFallback(url, attempt = 1) {
  const strategies = [
    () => axios.get(url, { headers: buildHeaders(url), responseType: 'arraybuffer', timeout: 30000, maxContentLength: 100 * 1024 * 1024, maxRedirects: 10, decompress: true }),
    () => axios.get(url, { headers: { 'User-Agent': randomUA(), 'Accept': '*/*', 'Accept-Language': 'en-US,en;q=0.5' }, responseType: 'arraybuffer', timeout: 30000, maxContentLength: 100 * 1024 * 1024, maxRedirects: 10 }),
    () => axios.get(url, { headers: { 'User-Agent': randomUA(), 'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8', 'Referer': new URL(url).origin + '/', 'Sec-Fetch-Dest': 'image', 'Sec-Fetch-Mode': 'no-cors', 'Sec-Fetch-Site': 'same-origin' }, responseType: 'arraybuffer', timeout: 30000, maxContentLength: 100 * 1024 * 1024 }),
    () => axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1', 'Accept': 'image/webp,*/*', 'Referer': 'https://www.google.com/' }, responseType: 'arraybuffer', timeout: 30000, maxContentLength: 100 * 1024 * 1024 }),
    () => axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)', 'Accept': '*/*' }, responseType: 'arraybuffer', timeout: 30000, maxContentLength: 100 * 1024 * 1024 })
  ]

  const strategy = strategies[attempt - 1]
  if (!strategy) return null

  try {
    const response = await strategy()
    return { response, attempt }
  } catch (err) {
    const status = err.response?.status
    if ([401, 403, 406, 429].includes(status) && attempt < strategies.length) {
      await new Promise(r => setTimeout(r, 500 * attempt))
      return fetchWithFallback(url, attempt + 1)
    }
    throw err
  }
}

export default {
  command: 'get',
  alias: ['fetch'],
  category: 'tools',
  description: 'Mengambil data atau media dari URL secara langsung.\n\n' +
    '*Format Penggunaan:*\n' +
    '> `Mengambil data dari URL`\n> .get <url>\n\n' +
    '> `Mengambil URL dari pesan yang di-reply`\n> .get',
  help: '<url>',
  typing: true,
  wait: true,

  async execute(m, { sock, args }) {

    let url = args.find(a => /^https?:\/\//.test(a)) || ''

    if (!url && m.quoted?.text) {
      const urls = m.quoted.text.match(/https?:\/\/[^\s<>"']+/gi)
      if (urls) url = urls[0]
    }

    if (!url) {
      return m.reply(`Masukkan URL yang valid!\nContoh: ${m.prefix}${m.command} https://example.com/file.mp4`)
    }

    const startTime = performance.now()

    try {
      const result = await fetchWithFallback(url)

      if (!result) {
        return m.reply('❌ *Gagal Fetch!*\n\nSemua strategi sudah dicoba tapi tetap gagal.')
      }

      const { response, attempt } = result
      const contentType = response.headers['content-type'] || ''
      const buffer = Buffer.from(response.data)
      const duration = ((performance.now() - startTime) / 1000).toFixed(2)
      const { ext, mime } = resolveFileInfo(buffer, url, contentType)
      const tryLabel = attempt > 1 ? ` _(percobaan ke-${attempt})_` : ''
      const sizeKB = (buffer.length / 1024).toFixed(1)
      const sizeMB = (buffer.length / 1024 / 1024).toFixed(2)
      const sizeLabel = buffer.length > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`

      const caption =
        `⏱️ *Durasi:* ${duration}s${tryLabel}\n` +
        `🌐 *Source:* ${new URL(url).hostname}\n` +
        `📦 *Ukuran:* ${sizeLabel}\n` +
        `📄 *Tipe:* ${mime}`

      if (/^image/.test(mime)) {
        if (ext === 'webp') {
          return sock.message.send(m.chat, { type: 'sticker', media: buffer, mimetype: mime }, { quote: m.raw })
        }
        return sock.message.send(m.chat, { type: 'image', media: buffer, mimetype: mime, caption }, { quote: m.raw })
      }

      if (/^video/.test(mime)) {
        if (ext === 'webm') {
          return sock.message.send(m.chat, { type: 'sticker', media: buffer, mimetype: mime }, { quote: m.raw })
        }
        return sock.message.send(m.chat, { type: 'video', media: buffer, mimetype: mime, caption }, { quote: m.raw })
      }

      if (/^audio/.test(mime)) {
        return sock.message.send(m.chat, { type: 'audio', media: buffer, mimetype: mime, ptt: false }, { quote: m.raw })
      }

      if (/^text|json|javascript|xml/.test(mime)) {
        const text = buffer.toString('utf-8')
        if (text.length > 4000) return sendAsFile(sock, m, buffer, `result.${ext}`, mime, caption)
        return m.reply(text.slice(0, 4000))
      }

      return sendAsFile(sock, m, buffer, `file_${Date.now()}.${ext}`, mime, caption)

    } catch (err) {
      console.error(err)
      const status = err.response?.status
      let errMsg = `❌ *Gagal Fetch!*\n\n*Status:* ${status || 'Error'}\n*Pesan:* ${err.message}`
      if (status === 403) errMsg += '\n\n💡 Server pakai proteksi / IP diblokir / butuh login'
      else if (status === 429) errMsg += '\n\n⚠️ Rate limited — coba lagi nanti.'
      else if (err.message.includes('exceeded')) errMsg += '\n*File terlalu besar (maks 100MB)*'
      m.reply(errMsg)
    }
  }
}

async function sendAsFile(sock, m, buffer, fileName, mimetype, caption) {
  return sock.message.send(m.chat, { type: 'document', media: buffer, mimetype, fileName, caption }, { quote: m.raw })
}
