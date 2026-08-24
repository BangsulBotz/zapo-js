// menu.js
import zapoPkg from 'zapo-js/package.json' with { type: 'json' }
import { config } from '../../settings.js'

const zapoVersion = zapoPkg.version

const MENU_URL = 'https://github.com/bangsulbotz/zapo-js'
const BOT_CREATED_AT = new Date('2026-08-20T00:00:00')
const BULAN_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

function getRuntime() {
    if (typeof Bun !== 'undefined') return `Bun v${Bun.version}`
    return `Node v${process.versions.node}`
}

function formatCreatedDate() {
    const tanggal = BOT_CREATED_AT.getDate()
    const bulan = BULAN_ID[BOT_CREATED_AT.getMonth()]
    const tahun = BOT_CREATED_AT.getFullYear()
    return `${tanggal} ${bulan} ${tahun}`
}

function getBotAge() {
    const now = new Date()
    let years = now.getFullYear() - BOT_CREATED_AT.getFullYear()
    let months = now.getMonth() - BOT_CREATED_AT.getMonth()
    let days = now.getDate() - BOT_CREATED_AT.getDate()

    if (days < 0) {
        months -= 1
        const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0)
        days += prevMonth.getDate()
    }

    if (months < 0) {
        years -= 1
        months += 12
    }

    const parts = []
    if (years > 0) parts.push(`${years} tahun`)
    if (months > 0) parts.push(`${months} bulan`)
    if (days > 0 || parts.length === 0) parts.push(`${days} hari`)

    return parts.join(' ')
}

function buildDescription() {
    const umur = getBotAge()
    const tanggalDibuat = formatCreatedDate()
    return `Halo! Bot ini dibangun menggunakan library zapo-js yang mengejar kecepatan dan juga efisiensi. Dibuat pada ${tanggalDibuat}, sudah berjalan selama ${umur}.`
}

function formatCategoryName(category) {
    if (!category || category === 'root') return 'Lainnya'
    return category
        .split(/[-_/]/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
}

function uniquePlugins(plugins) {
    const seen = new Set()
    const unique = []

    for (const plugin of plugins.values()) {
        if (seen.has(plugin)) continue
        seen.add(plugin)
        unique.push(plugin)
    }

    return unique
}

function groupByCategory(pluginList) {
    const groups = new Map()

    for (const plugin of pluginList) {
        if (plugin.hidden) continue

        const category = plugin.category || 'root'
        if (!groups.has(category)) groups.set(category, [])
        groups.get(category).push(plugin)
    }

    for (const list of groups.values()) {
        list.sort((a, b) => a.command.localeCompare(b.command))
    }

    return groups
}

function sortedCategoryKeys(groups) {
    return [...groups.keys()].sort((a, b) => {
        if (a === 'root') return 1
        if (b === 'root') return -1
        return a.localeCompare(b)
    })
}

function buildHeader(m) {
    const prefix = config.noprefix ? 'no prefix' : config.prefixes.join(' ')

    return [
        `Halo *@${m.sender.split('@')[0]}* 😇`,
        `\`\`\`Prefix :\`\`\` \`${prefix}\``,
        `\`\`\`Node   :\`\`\` \`${getRuntime()}\``,
        `\`\`\`Library:\`\`\` \`zapo-js v${zapoVersion}\``
    ].join('\n')
}

function buildCategoryListText(groups, usedPrefix, command) {
    const lines = ['`Kategori Menu`']

    for (const category of sortedCategoryKeys(groups)) {
        const jumlah = groups.get(category).length
        lines.push(`- ${usedPrefix}${formatCategoryName(category)} \`(${jumlah} fitur)\``)
    }

    lines.push('')
    lines.push('`Catatan:`')
    lines.push('> Menampilkan Semua Fitur:')
    lines.push(`> Ketik \`${usedPrefix}${command} all\``)
    lines.push('> Menampilkan Per Kategori:')
    lines.push(`> Ketik \`${usedPrefix}${command} <kategori>\``)

    return lines.join('\n')
}

function buildAllMenuText(groups, usedPrefix) {
    const lines = []

    for (const category of sortedCategoryKeys(groups)) {
        const items = groups.get(category)
        lines.push(`\`${formatCategoryName(category)}\` \`(${items.length} fitur)\``)

        for (const plugin of items) {
            lines.push(`- ${usedPrefix}${plugin.command}`)
        }

        lines.push('')
    }

    lines.push(`\`Total: ${groups.size ? [...groups.values()].reduce((a, b) => a + b.length, 0) : 0} Fitur\``)

    return lines.join('\n').trim()
}

function buildCategoryMenuText(groups, categoryKey, usedPrefix) {
    const items = groups.get(categoryKey)
    const lines = [`\`${formatCategoryName(categoryKey)}\` \`(${items.length} fitur)\``, '']

    for (const plugin of items) {
        lines.push(`- ${usedPrefix}${plugin.command}`)
    }

    return lines.join('\n')
}

export default {
    command: 'menu',
    category: 'bot',
    description: `Menampilkan daftar menu fitur bot berdasarkan kategori.

*Format Penggunaan:*
> \`Menampilkan semua fitur\`
> .menu all

> \`Menampilkan fitur berdasarkan kategori\`
> .menu <kategori>`,
    help: '`[kategori|all]`',
    typing: true,

    async execute(m, { plugins, sock }) {
        const pluginList = uniquePlugins(plugins)
        const groups = groupByCategory(pluginList)
        const arg = (m.args[0] || '').toLowerCase()
        const usedPrefix = m.prefix
        const header = buildHeader(m)

        let body

        if (!arg) {
            body = buildCategoryListText(groups, usedPrefix, m.command)
        } else if (arg === 'all') {
            body = buildAllMenuText(groups, usedPrefix)
        } else {
            const matchedKey = [...groups.keys()].find((key) => key.toLowerCase() === arg)

            if (!matchedKey) {
                return m.reply(`Kategori "${arg}" tidak ditemukan. Ketik ${usedPrefix}${m.command} untuk melihat daftar kategori.`)
            }

            body = buildCategoryMenuText(groups, matchedKey, usedPrefix)
        }
        const hasil = header + '\n\n' + body

        return sock.sendThumbnail(m.chat, {
            url: MENU_URL,
            title: m.pushName,
            body: buildDescription(),
            text: hasil,
            thumbnail: 'random',
            favicon: 'random',
            quote: m,
            mentions: [m.sender]
        })
    }
}
