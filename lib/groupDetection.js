// lib/groupDetection.js

import chalk from 'chalk'
import { getEffectiveGroupSettings, detectGroupLink } from './groupAndBot.js'

export function detectLinkViolation(text) {
  const link = detectGroupLink(text || '')
  return link ? { type: 'link', match: link } : null
}

//fungsi kick sender
async function kickSender(sock, chatJid, senderJid) {
  try {
    await sock.group.removeParticipants(chatJid, [senderJid])
  } catch (err) {
    console.error(chalk.red(`[ANTILINK] Gagal kick ${senderJid}:`), err?.message || err)
  }
}
//fungsi delete pesan
async function deleteCurrentMessage(sock, chatJid, m) {
  try {
    await sock.message.send(chatJid, {
      type: 'revoke',
      target: {
        remoteJid: chatJid,
        id: m.id,
        fromMe: false,
        participant: m.isGroup ? m.sender : undefined
      }
    })
  } catch (err) {
    console.error(chalk.red(`[ANTILINK] Gagal hapus pesan ${m.id}:`), err?.message || err)
  }
}

//anti link
async function handleAntilink(m, sock, settings) {
  if (!settings?.antilink?.kick && !settings?.antilink?.delete) return
  if (m.isAdmin) return

  const violation = detectLinkViolation(m.text)
  if (!violation) return

  console.log(chalk.red(`[ANTILINK] Link terdeteksi di ${m.chat} dari ${m.sender}: ${violation.match}`))

  if (!m.isBotAdmin) {
    console.log(chalk.yellow(`[ANTILINK] Bot bukan admin di ${m.chat}, aksi dibatalkan`))
    return
  }

  const tasks = []
  if (settings.antilink.kick) {
    console.log(chalk.red(`[ANTILINK] Kick ${m.sender} dari ${m.chat}`))
    tasks.push(kickSender(sock, m.chat, m.sender))
  }
  if (settings.antilink.delete) {
    console.log(chalk.red(`[ANTILINK] Hapus pesan ${m.id} di ${m.chat}`))
    tasks.push(deleteCurrentMessage(sock, m.chat, m))
  }
  await Promise.all(tasks)
}

const policies = [handleAntilink]

export async function enforceGroupPolicies(m, sock) {
  const settings = getEffectiveGroupSettings(m.chat)
  if (!settings) return

  await Promise.all(policies.map((policy) => policy(m, sock, settings)))
}