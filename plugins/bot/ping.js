// plugins/bot/ping.js

export default {
    command: 'ping',
    alias: ['test', 'p2', 'mbut'],
    category: 'bot',
    description: 'Cek latency bot.',

    async execute(m) {
        await m.reply('🏓 Pong!')
    }
}
