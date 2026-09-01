// db/botConfig.js

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const storeDir = path.join(__dirname, '..', 'store')
const filePath = path.join(storeDir, 'bot_settings.json')

fs.mkdirSync(storeDir, { recursive: true })

let config = {}

if (fs.existsSync(filePath)) {
    try {
        config = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    } catch {
        config = {}
    }
}

function saveToFile() {
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2))
}

export function getBotSetting(key) {
    return config[key]
}

export function saveBotSetting(key, value) {
    config[key] = value
    saveToFile()
    return value
}
