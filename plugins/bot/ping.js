// plugins/bot/ping.js

export default {
    command: 'ping',
    alias: ['test'],
    category: 'bot',
    description: 'Cek latency bot.',

    async execute(m) {
        await m.reply('🏓 Pong!')
    }
}
