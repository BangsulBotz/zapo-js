// db/groupCache.js

import chalk from 'chalk'

const groupCache = new Map()
const inFlight = new Map()

export async function getGroupMetadata(jid, sock, { force = false } = {}) {
    if (!jid || !jid.endsWith('@g.us')) return null
    if (!force && groupCache.has(jid)) return groupCache.get(jid)
    if (inFlight.has(jid)) return inFlight.get(jid)

    const fetchPromise = sock.group.queryGroupMetadata(jid)
        .then((metadata) => {
            groupCache.set(jid, metadata)
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

function findParticipant(jid, participantJid) {
    const metadata = groupCache.get(jid)
    return metadata?.participants?.find(
        (p) => p.jid === participantJid || p.phoneNumber === participantJid
    ) ?? null
}

export const isAdminInGroup = (jid, participantJid) => {
    const p = findParticipant(jid, participantJid)
    return !!(p?.isAdmin || p?.isSuperAdmin)
}

export const isSuperAdminInGroup = (jid, participantJid) => !!findParticipant(jid, participantJid)?.isSuperAdmin

export { groupCache }
