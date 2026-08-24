// lib/backupExclude.js

export const excludeFolders = [
    'node_modules',
    'session',
    '.git'
]

export const excludeFiles = [
    './store/raw_message.db',
    './store/raw_message.db-shm',
    './store/raw_message.db-wal',
    'bun.lock',
    'bunfig.toml',
    'package-lock.json'
]


