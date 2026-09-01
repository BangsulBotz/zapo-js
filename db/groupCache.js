// db/groupCache.js

import chalk from 'chalk'
import { LRU } from '../lib/lru.js'

const groupCache = new LRU(50)
const inFlight = new Map()

export async function getGroupMetadata(jid, sock, { force = false } = {}) {
    if (!jid || !jid.endsWith('@g.us')) return null
    if (!force && groupCache.has(jid)) return groupCache.get(jid)
    if (inFlight.has(jid)) return inFlight.get(jid)

    const fetchPromise = sock.group.queryGroupMetadata(jid)
        .then((metadata) => {
            groupCache.set(jid, metadata)
            console.log(chalk.blue(
                `[GROUP CACHE] ${force ? 'Refetch' : 'Fetch'} metadata ${jid} (${metadata?.participants?.length || 0} participants)`
            ))
            return metadata
        })
        .catch((err) => {
            console.error(chalk.red(`[GROUP CACHE] Gagal fetch metadata ${jid}:`), err?.message || err)
            return null
        })
        .finally(() => inFlight.delete(jid))

    inFlight.set(jid, fetchPromise)
    return fetchPromise
}

export const getCachedGroupMetadata = (jid) => groupCache.get(jid) ?? null
export const hasGroupMetadata = (jid) => groupCache.has(jid)
export const setGroupMetadata = (jid, metadata) => groupCache.set(jid, metadata)
export const invalidateGroupMetadata = (jid) => groupCache.delete(jid)

export function patchGroupMetadata(jid, mutateFn) {
    const metadata = groupCache.get(jid)
    if (!metadata) return null
    mutateFn(metadata)
    return metadata
}

export async function confirmParticipantAction(jid, sock, targets, action) {
    await new Promise(resolve => setTimeout(resolve, 150))
    const metadata = await getGroupMetadata(jid, sock, { force: true })
    if (!metadata?.participants) return false

    return targets.every((target) => {
        const number = String(target).split('@')[0]
        const participant = metadata.participants.find((item) => {
            const ids = [item.jid, item.phoneNumber]
                .filter(Boolean)
                .map(value => String(value).split('@')[0])
            return ids.includes(number)
        })

        if (action === 'add') return !!participant
        if (action === 'remove') return !participant
        if (action === 'promote') return !!participant?.isAdmin || !!participant?.isSuperAdmin
        if (action === 'demote') return !!participant && !participant.isAdmin && !participant.isSuperAdmin
        return false
    })
}

function findParticipant(jid, participantJid) {
    const metadata = groupCache.get(jid)
    if (!metadata?.participants) return null

    const normalizedInput = participantJid?.split('@')[0]

    return metadata.participants.find((p) => {
        if (p.jid === participantJid) return true
        if (p.phoneNumber === participantJid) return true
        if (normalizedInput && (p.jid?.split('@')[0] === normalizedInput || p.phoneNumber?.split('@')[0] === normalizedInput)) return true
        return false
    }) ?? null
}

export const isAdminInGroup = (jid, participantJid) => {
    const p = findParticipant(jid, participantJid)
    return !!(p?.isAdmin || p?.isSuperAdmin)
}

export const isSuperAdminInGroup = (jid, participantJid) => !!findParticipant(jid, participantJid)?.isSuperAdmin

export { groupCache }
