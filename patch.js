import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const targetFiles = [
  path.join(
    __dirname,
    'node_modules/zapo-js/dist/esm/transport/node/builders/message.js'
  ),
  path.join(
    __dirname,
    'node_modules/zapo-js/dist/transport/node/builders/message.js'
  )
]

const MARKER = '/* OVERRIDE_CUSTOM_NODES_PATCH */'

const regex =
  /if\s*\(\s*input\.customNodes\s*\)\s*\{\s*for\s*\(\s*const\s+node\s+of\s+input\.customNodes\s*\)\s*\{\s*content\.push\(\s*node\s*\);\s*\}\s*\}/

const patchReplacement = `${MARKER}
    if (input.customNodes) {
        for (const node of input.customNodes) {
            if (!node || !node.tag) continue;

            const existingIndex = content.findIndex(
                item => item && item.tag === node.tag
            );

            if (existingIndex !== -1) {
                content[existingIndex] = node;
            } else {
                content.push(node);
            }
        }
    }`

let patchedCount = 0
let skippedCount = 0
let missingCount = 0
let failedCount = 0

const results = []

for (const file of targetFiles) {
  const relativePath = path.relative(__dirname, file)

  if (!fs.existsSync(file)) {
    missingCount++
    results.push(`⏭️ Gak ketemu: ${relativePath}`)
    continue
  }

  let content = fs.readFileSync(file, 'utf8')

  if (content.includes(MARKER)) {
    skippedCount++
    results.push(`ℹ️ Udah ter-patch: ${relativePath}`)
    continue
  }

  if (!regex.test(content)) {
    failedCount++
    results.push(
      `⚠️ Pattern gak match: ${relativePath}`
    )
    continue
  }

  content = content.replace(regex, patchReplacement)

  fs.writeFileSync(file, content, 'utf8')

  patchedCount++
  results.push(`✅ Berhasil patch: ${relativePath}`)
}

console.log(`
══════════════════════════════════════
        ZAPO-JS CUSTOM NODES PATCH
══════════════════════════════════════
`)

console.log(results.join('\n'))

console.log(`
══════════════════════════════════════
Total:
  ${patchedCount} patched
  ${skippedCount} sudah ter-patch
  ${missingCount} tidak ditemukan
  ${failedCount} gagal match
══════════════════════════════════════
`)