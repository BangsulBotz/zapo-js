// plugins/konvert/upload.js

import { buildQuoteContext } from '../../lib/utils.js'

function resolveMediaTarget(m, sock) {
    if (m.quoted?.isMedia) {
        return {
            mime: m.quoted.mime,
            download: () => m.quoted.download()
        }
    }

    if (m.isMedia) {
        const raw = m.raw?.message?.[m.type]
        return {
            mime: raw?.mimetype || '',
            download: () => sock.message.downloadBytes(m.raw.message)
        }
    }

    return null
}

export default {
    command: 'up',
    alias: ['upload'],
    help: '`(reply)`',
    category: 'konvert',
    description: `Upload media (reply/caption) ke tmpfile.link, hasil link dengan tombol salin.

\`Cara Penggunaan:\`
> reply media lalu ketik: \`.up\`
> atau kirim media dengan caption: \`.up\``,
    typing: true,

    async execute(m, { sock }) {
        const target = resolveMediaTarget(m, sock)

        if (!target) return m.reply('❌ Reply media atau kirim media dengan caption dulu!')

        const buffer = await target.download()
        if (!buffer) return m.reply('❌ Gagal download media.')

        const ext = (target.mime || 'application/octet-stream').split('/')[1] || 'bin'
        const fileName = `file_${Date.now()}.${ext}`

        const formData = new FormData()
        formData.append('file', new Blob([buffer]), fileName)

        const start = performance.now()

        let res
        try {
            res = await fetch('https://tmpfile.link/api/upload', {
                method: 'POST',
                body: formData
            })
        } catch (err) {
            return m.reply(`❌ Gagal konek ke server upload: ${err.message}`)
        }

        const durationSec = ((performance.now() - start) / 1000).toFixed(2)

        if (!res.ok) return m.reply(`❌ Upload gagal (${res.status})`)

        const data = await res.json()
        const url = data.downloadLink

        if (!url) return m.reply('❌ Upload gagal, tidak ada link.')

        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        const expiresStr = expiresAt.toLocaleString('id-ID', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: false
        })

        await m.reply({
            interactiveMessage: {
                header: { title: '✅ Upload Berhasil', hasMediaAttachment: false },
                body: {
                    text: `⏳ Waktu: ${durationSec}s\n📦 Ukuran: ${(data.size / 1024).toFixed(1)} KB`
                },
                footer: { text: `Kadaluarsa pada ${expiresStr}` },
                nativeFlowMessage: {
                    buttons: [
                        {
                            name: 'cta_copy',
                            buttonParamsJson: JSON.stringify({
                                display_text: '📋 Salin Link',
                                copy_code: url
                            })
                        }
                    ],
                    messageVersion: 1
                },
                contextInfo: buildQuoteContext(m)
            }
        })
    }
}