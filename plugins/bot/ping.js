// plugins/bot/ping.js

export default {
    command: 'ping',
    alias: ['test', 'p2', 'mbut'],
    description: '> Cek latency bot.',
    category: 'bot',

    async execute(m, { sock }) {
        const start = process.hrtime.bigint()

        const sent = await m.reply('🏓 Pinging...')

        const end = process.hrtime.bigint()
        const latency = (Number(end - start) / 1_000_000).toFixed(2)

        if (!sent?.id) {
            return m.reply(`🏓 Pong! ${latency} ms`)
        }

        await sock.message.send(m.chat, `🏓 Pong! ${latency} ms`, { editKey: { id: sent.id } })
    }
}