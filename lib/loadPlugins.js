// lib/loadPlugins.js

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import chalk from 'chalk'
import { pathToFileURL } from 'url'

async function collectPlugins(dir, baseDir = dir, allPlugins = []) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true })
  const relativeDir = path.relative(baseDir, dir) || 'root'

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      await collectPlugins(fullPath, baseDir, allPlugins)
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      try {
        const nonce = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
        const fileUrl = `${pathToFileURL(fullPath).href}?t=${nonce}`
        const mod = await import(fileUrl)
        const plugin = mod?.default || mod

      if (plugin && typeof plugin.command === 'string' && typeof plugin.execute === 'function') {
          const rawAlias = plugin.alias || plugin.aliases
          const aliasList = Array.isArray(rawAlias)
            ? rawAlias
            : typeof rawAlias === 'string'
            ? [rawAlias]
            : []

          Object.defineProperty(plugin, 'source', {
            value: `./${path.join('plugins', relativeDir === 'root' ? '' : relativeDir, entry.name).replaceAll(path.sep, '/')}`,
            enumerable: false,
            configurable: true
          })

          allPlugins.push({
            file: entry.name,
            folder: relativeDir,
            fullPath: fullPath,
            plugin: plugin,
            command: plugin.command.toLowerCase().trim(),
            aliases: aliasList.map(a => String(a).toLowerCase().trim()).filter(Boolean)
          })
        } else {
          allPlugins.push({
            file: entry.name,
            folder: relativeDir,
            plugin: null,
            skip: true
          })
        }
      } catch (err) {
        allPlugins.push({
          file: entry.name,
          folder: relativeDir,
          plugin: null,
          error: err.message
        })
      }
    }
  }

  return allPlugins
}

function detectDuplicates(allPlugins) {
  const registry = new Map()
  const duplicates = []

  for (const p of allPlugins) {
    if (!p.plugin) continue

    const triggers = [
      { key: p.command, type: 'command' },
      ...p.aliases.map(al => ({ key: al, type: 'alias' }))
    ]

    for (const item of triggers) {
      if (!item.key) continue

      if (registry.has(item.key)) {
        const existing = registry.get(item.key)
        const sameFile = existing.file === p.file && existing.folder === p.folder
        if (sameFile) continue

        duplicates.push({
          key: item.key,
          a: existing,
          b: { file: p.file, folder: p.folder, type: item.type }
        })
      } else {
        registry.set(item.key, { file: p.file, folder: p.folder, type: item.type })
      }
    }
  }

  return duplicates
}

export async function loadPlugins(dir, onProgress = null) {
  const tempPlugins = new Map()
  let loadedCount = 0
  let errorCount = 0
  let skipCount = 0

  const allPlugins = await collectPlugins(dir, dir)
  const duplicates = detectDuplicates(allPlugins)

  const dupWarnings = new Map()
  for (const dup of duplicates) {
    const keyA = `${dup.a.folder}/${dup.a.file}`
    const keyB = `${dup.b.folder}/${dup.b.file}`
    const pairKey = [keyA, keyB].sort().join('||')

    if (!dupWarnings.has(pairKey)) {
      dupWarnings.set(pairKey, { a: dup.a, b: dup.b, keys: [] })
    }
    dupWarnings.get(pairKey).keys.push(dup.key)
  }

  const folderGroups = new Map()

  for (const p of allPlugins) {
    const folder = p.folder
    if (!folderGroups.has(folder)) folderGroups.set(folder, { loaded: 0, errors: [], skips: [] })
    const group = folderGroups.get(folder)

    if (p.error) {
      group.errors.push({ file: p.file, reason: p.error })
      errorCount++
    } else if (p.skip) {
      group.skips.push({ file: p.file })
      skipCount++
    } else {
      if (!tempPlugins.has(p.command)) {
        tempPlugins.set(p.command, p.plugin)
        p.plugin.category = p.folder
      }
      p.aliases.forEach(al => {
        if (!tempPlugins.has(al)) tempPlugins.set(al, p.plugin)
      })
      group.loaded++
      loadedCount++
    }
  }

  for (const [folder, group] of folderGroups) {
    const folderDups = [...dupWarnings.values()].filter(d =>
      d.a.folder === folder || d.b.folder === folder
    )

    const hasIssues = group.errors.length > 0 || group.skips.length > 0 || folderDups.length > 0

    if (!hasIssues) {
      console.log(chalk.blue(`[LOADER] `) + chalk.cyan(folder) + chalk.green(` -> All plugins ready.`))
    } else {
      console.log(chalk.blue(`[LOADER] `) + chalk.yellow(folder) + chalk.white(` (Loaded: ${group.loaded})`))

      for (const dup of folderDups) {
        const fileA = `${dup.a.folder}/${dup.a.file}`
        const fileB = `${dup.b.folder}/${dup.b.file}`
        const keys = dup.keys.map(k => `"${k}"`).join(', ')
        console.log(chalk.yellow(`  ⚠️ `) + chalk.bgYellow.black(` WARN `) + ` ${chalk.white(dup.a.file)}, ${chalk.white(dup.b.file)}`)
        console.log(chalk.gray(`      └─ Duplikat: ${keys}`))
        console.log(chalk.gray(`         ${fileA}`))
        console.log(chalk.gray(`         ${fileB}`))
      }

      for (const err of group.errors) {
        console.log(chalk.red(`  ❌ `) + chalk.bgRed.white(` ERROR `) + ` ${chalk.white(err.file)}`)
        console.log(chalk.gray(`      └─ Masalah: ${err.reason}`))
      }

      for (const skip of group.skips) {
        console.log(chalk.gray(`  ➖ `) + chalk.bgGray.white(` SKIP `) + ` ${chalk.white(skip.file)}`)
        console.log(chalk.gray(`      └─ Export default bukan plugin valid`))
      }

      console.log(chalk.gray('──────────────────────────────────────────────────'))
    }
  }

  if (onProgress) await onProgress('done', loadedCount)

  return {
    temp: tempPlugins,
    loaded: loadedCount,
    skipped: skipCount,
    errors: errorCount,
    duplicates: [...dupWarnings.values()],
    errorList: allPlugins.filter(p => p.error).map(p => ({ file: p.file, folder: p.folder, reason: p.error })),
    skipList: allPlugins.filter(p => p.skip).map(p => ({ file: p.file, folder: p.folder })),
    _raw: allPlugins.filter(p => p.plugin)
  }
}
