// plugins/bot/ping.js
export default {
    command: 'ping',
    alias: ['test', 'p2', 'mbut'],
    category: 'bot',
    description: 'Cek latency bot.',
    execute: m => m.reply('🏓 Pong!')
}
