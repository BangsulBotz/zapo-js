// rawMessageUtils.js

function isBinary(value) {
  if (!value || typeof value !== 'object') return false
  if (Buffer.isBuffer(value)) return true
  if (value instanceof Uint8Array) return true
  if (ArrayBuffer.isView(value)) return true
  return false
}

function isLong(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    typeof value.low === 'number' &&
    typeof value.high === 'number' &&
    typeof value.unsigned === 'boolean' &&
    !isBinary(value)
  )
}

function longToNumber(value) {
  const lo = value.low >>> 0
  const hi = value.high >>> 0
  return hi * 4294967296 + lo
}

function deepCloneRaw(obj) {
  if (obj === null || obj === undefined) return obj
  if (isBinary(obj)) return '__BIN__' + Buffer.from(obj).toString('base64') + '__'
  if (isLong(obj)) return '__LONG__' + longToNumber(obj) + '__'
  if (Array.isArray(obj)) return obj.map((item) => deepCloneRaw(item))
  if (typeof obj === 'object') {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, deepCloneRaw(v)]))
  }
  return obj
}

function stripUnsendable(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj
  delete obj.messageContextInfo
  return obj
}

const FILTERED_NODE_TAGS = ['enc', 'device-identity']

function filterEncNodes(nodes) {
  if (!Array.isArray(nodes)) return nodes ?? null
  const filtered = nodes.filter((node) => !FILTERED_NODE_TAGS.includes(node?.tag))
  return filtered.length ? filtered : null
}

function extractReplayableAttrs(attrsJson) {
  if (!attrsJson) return null
  let attrs
  try {
    attrs = typeof attrsJson === 'string' ? JSON.parse(attrsJson) : attrsJson
  } catch {
    return null
  }
  if (!attrs || typeof attrs !== 'object') return null
  const result = {}
  for (const key of ['type']) {
    if (typeof attrs[key] === 'string') result[key] = attrs[key]
  }
  return Object.keys(result).length ? result : null
}

function formatMessage(obj) {
  if (!obj || typeof obj !== 'object') return
  if (Array.isArray(obj)) {
    obj.forEach(formatMessage)
    return
  }
  for (const key of Object.keys(obj)) {
    if (['buttonParamsJson', 'messageParamsJson', 'paramsJson'].includes(key) && typeof obj[key] === 'string') {
      try {
        obj[key] = { __stringify: JSON.parse(obj[key]) }
      } catch (e) {}
    } else {
      formatMessage(obj[key])
    }
  }
}

function toCode(value, indent = 2, level = 0) {
  const pad = ' '.repeat(indent * level)
  const padNext = ' '.repeat(indent * (level + 1))

  if (typeof value === 'string') {
    if (value.startsWith('__LONG__') && value.endsWith('__')) {
      return value.slice(8, -2)
    }
    if (value.startsWith('__BIN__') && value.endsWith('__')) {
      return `Buffer.from('${value.slice(7, -2)}', 'base64')`
    }
    if (value.includes('\n')) {
      return '`' + value.replace(/`/g, '\\`').replace(/\$\{/g, '\\${') + '`'
    }
    return JSON.stringify(value)
  }
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) return JSON.stringify(value)
  if (value === undefined) return 'undefined'

  if (Array.isArray(value)) {
    if (!value.length) return '[]'
    const items = value.map((v) => padNext + toCode(v, indent, level + 1)).join(',\n')
    return '[\n' + items + '\n' + pad + ']'
  }

  if (typeof value === 'object') {
    if (value.__stringify !== undefined) {
      return 'JSON.stringify(' + toCode(value.__stringify, indent, level) + ')'
    }
    const entries = Object.entries(value)
    if (!entries.length) return '{}'
    const lines = entries
      .map(([k, v]) => {
        const keyStr = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : JSON.stringify(k)
        return padNext + keyStr + ': ' + toCode(v, indent, level + 1)
      })
      .join(',\n')
    return '{\n' + lines + '\n' + pad + '}'
  }
  return 'undefined'
}

export function buildReplayCode(msgContent, nodesContent = null, replayAttrs = null, mutateContent = null) {
  const clonedContent = deepCloneRaw(msgContent)
  stripUnsendable(clonedContent)
  mutateContent?.(clonedContent)
  formatMessage(clonedContent)

  const optionParts = []

  if (nodesContent) {
    const clonedNodes = deepCloneRaw(nodesContent)
    formatMessage(clonedNodes)
    optionParts.push(`customNodes: ${toCode(clonedNodes, 2, 1)}`)
  }

  if (replayAttrs) {
    optionParts.push(`additionalAttributes: ${JSON.stringify(replayAttrs)}`)
  }

  const options = optionParts.length ? `, {\n  ${optionParts.join(',\n  ')}\n}` : ''
  return `await sock.message.send(jid, ${toCode(clonedContent)}${options})\n`
}

export {
  isBinary,
  isLong,
  longToNumber,
  deepCloneRaw,
  stripUnsendable,
  filterEncNodes,
  extractReplayableAttrs,
  formatMessage,
  toCode
}
