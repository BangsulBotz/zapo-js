// plugins/tools/cekdevice.js

const DEVICE_BY_PREFIX = [
  ['3EB0', 'WhatsApp Web'],
  ['AC', 'Android'],
  ['A5', 'WhatsApp Business'],
  ['3A', 'iPhone']
]

function detectDevice(messageId) {
  const prefix = String(messageId || '').slice(0, 4).toUpperCase()
  const match = DEVICE_BY_PREFIX.find(([key]) => prefix.startsWith(key))
  return match ? { prefix: match[0], name: match[1] } : { prefix, name: 'Tidak dikenal' }
}

export default {
  command: 'cekdevice',
  alias:['cekhp','hpcek'],
  category: 'tools',
  description: `> Mengecek perkiraan perangkat pengirim pesan (Android/iPhone/Web).

contoh penggunaan:
> \`.cekdevice\` (reply pesan)`,
  help: '(reply)',

  async execute(m) {
    if (!m.quoted) return m.reply('Wajib reply pesan yang ingin dicek.')

    const messageId = m.quoted.key?.id || ''
    const parsedDeviceId = Number(m.quoted.deviceId ?? 0)
    const deviceId = Number.isFinite(parsedDeviceId) ? parsedDeviceId : 0
    const device = detectDevice(messageId)
    const linked = deviceId !== 0

    return m.reply(
      `📱 \`Perangkat Pesan\`\n\n` +
      `• \`ID Device :\` ${deviceId}\n` +
      `• \`Status    :\` ${linked ? 'Perangkat tertaut' : 'Perangkat utama'}\n` +
      `• \`Terbaca   :\` ${device.name}\n` +
      `• \`Prefix ID :\` ${device.prefix || '-'}`
    )
  }
}
