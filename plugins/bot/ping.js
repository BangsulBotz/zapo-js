// plugins/bot/ping.js
export default {
    command: 'ping',
    alias: ['test', 'mbut'],
    category: 'bot',
    description: `> Menampilkan latency (waktu respon) bot dalam satuan milidetik.

contoh penggunaan:
> \`.ping\``,
    async execute(m, { sock }) {
        const start = Date.now()
        const msg = await m.reply('🏓 Pinging...')
        const latency = Date.now() - start

        await sock.message.send(m.chat, `🏓 Pong! ${latency}ms`, { editKey: { id: msg.id } })
    }
}