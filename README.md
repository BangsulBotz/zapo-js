# Zapo Bot Starter

<p align="center">
  <img src="[https://github.com/vinikjkkj.png?size=180](https://raw.githubusercontent.com/vinikjkkj/zapo/master/.github/assets/logo.png)" width="120" alt="Zapo">
</p>

<h3 align="center">A production-oriented WhatsApp bot base built on Zapo-JS</h3>

<p align="center">
  <a href="https://zapo.to">Documentation</a> ·
  <a href="https://github.com/vinikjkkj/zapo">Zapo-JS</a> ·
  <a href="https://www.npmjs.com/package/zapo-js">NPM</a>
</p>

---

## About

This repository is a ready-to-use WhatsApp bot base built on **Zapo-JS**.

The project is designed around a few simple goals:

- ⚡ fast message processing
- 🪶 lightweight runtime
- 🧠 low redundant work
- 🔌 flexible plugin architecture
- 🛡️ isolated plugin errors
- 📦 persistent session storage
- 🖼️ media helpers and thumbnails
- 🎙️ native voice-note processing
- 🎛️ interactive / native-flow buttons
- 🧩 low-level custom node support
- 🚀 suitable as a long-term bot foundation

The project intentionally stays close to the Zapo-JS API instead of rebuilding the entire WhatsApp message layer.

> **Important:** this is a bot starter/base, not a replacement for Zapo-JS itself.

---

## Why Zapo-JS?

Zapo-JS is a TypeScript implementation of the WhatsApp Web protocol focused on high scalability, multi-session operation, low memory usage, and control over the underlying transport and protocol layers.

Official resources:

- **Documentation:** https://zapo.to
- **GitHub:** https://github.com/vinikjkkj/zapo
- **NPM:** https://www.npmjs.com/package/zapo-js

For the complete upstream API, guides, protocol notes, examples, and architecture documentation, use **https://zapo.to** as the primary reference.

---

# Features

### Core

- ESM (`type: module`)
- Zapo-JS `WaClient`
- SQLite-backed session store
- automatic session directory creation
- QR authentication handler
- connection lifecycle handling
- group event handling
- centralized message handler

### Plugin system

Plugins are loaded dynamically from `plugins/`.

```text
plugins/
├── bot/
├── konvert/
├── owner/
└── grup/
```

Each plugin can expose:

```js
export default {
    command: 'ping',
    alias: ['p'],
    category: 'bot',

    async execute(m, { sock, args, plugins }) {
        await m.reply('pong')
    }
}
```

The loader supports aliases, categories, duplicate protection, and plugin reloads.

---

# Requirements

Recommended:

- Node.js 20+
- npm
- FFmpeg + FFprobe for media processing
- a terminal capable of displaying QR codes

Check your versions:

```bash
node -v
npm -v
ffmpeg -version
ffprobe -version
```

---

# Installation

Clone the repository and install dependencies:

```bash
npm install
```

The project has a `postinstall` script:

```json
"postinstall": "node patch.js"
```

Therefore, after installation, the custom Zapo-JS patch is automatically applied.

Start the bot:

```bash
npm start
```

---

# Project Structure

```text
.
├── index.js
├── settings.js
├── patch.js
├── package.json
│
├── src/
│   ├── createSocket.js
│   ├── connectionHandler.js
│   ├── messageHandler.js
│   └── groupEventHandler.js
│
├── lib/
│   ├── wrapper.js
│   ├── loadPlugins.js
│   ├── lockState.js
│   ├── utils.js
│   ├── notifRestart.js
│   └── backupExclude.js
│
├── db/
│   ├── contacts.js
│   ├── groupCache.js
│   └── rawMessage.js
│
└── plugins/
    ├── bot/
    ├── konvert/
    ├── owner/
    └── grup/
```

---

# Basic Sending

The main sending API is Zapo-JS:

```js
await sock.message.send(m.chat, 'Hello World')
```

For structured content:

```js
await sock.message.send(m.chat, {
    type: 'text',
    text: 'Hello World'
})
```

For the complete message/content API, refer to:

https://zapo.to

---

# Replying

The serialized message object exposes `m.reply()`.

Simple reply:

```js
await m.reply('pong')
```

Structured reply:

```js
await m.reply({
    text: 'Hello World'
})
```

Depending on the message type, you can also send a structured Zapo message through:

```js
await sock.message.send(m.chat, {
    ...
})
```

---

# Media

Zapo-JS supports media through its message API.

Typical pattern:

```js
await sock.message.send(m.chat, {
    type: 'image',
    media: buffer,
    caption: 'Hello'
})
```

For the exact supported media content types and options, use the upstream Zapo documentation:

https://zapo.to

---

# Voice Notes

This project adds a small wrapper:

```js
sock.sendVoiceNote(jid, input, options)
```

Supported input:

- `Buffer`
- `Uint8Array`
- Node `Readable`
- Web `ReadableStream`
- URL
- local file path
- Promise resolving to one of the above

Examples:

```js
await sock.sendVoiceNote(m.chat, './audio.mp3')
```

```js
await sock.sendVoiceNote(
    m.chat,
    'https://example.com/audio.mp3'
)
```

```js
await sock.sendVoiceNote(
    m.chat,
    bufferAudio
)
```

Reply to a message:

```js
await sock.sendVoiceNote(
    m.chat,
    bufferAudio,
    { quote: m }
)
```

Mentions:

```js
await sock.sendVoiceNote(
    m.chat,
    bufferAudio,
    {
        mentions: [m.sender]
    }
)
```

The wrapper delegates the actual voice-note normalization, waveform and duration processing to the Zapo media processor configured in `createSocket.js`.

This avoids maintaining a second custom FFmpeg voice-note pipeline in the wrapper.

---

# Media Processor

The socket is configured with:

```js
media: {
    processor: createMediaProcessor(),
    generateThumbnail: true,
    generateWaveform: true,
    normalizeVoiceNote: true
}
```

The installed `@zapo-js/media-utils` package provides:

- image thumbnails
- video thumbnails
- media probing
- voice-note waveform generation
- voice-note normalization
- MIME detection

FFmpeg and FFprobe should be available in `PATH`.

For the official media-utils documentation:

https://www.npmjs.com/package/@zapo-js/media-utils

---

# Uploading a Thumbnail

This base provides:

```js
sock.uploadThumbnail(image, options)
```

It accepts:

- Buffer
- Uint8Array
- stream
- URL
- local file path
- Promise resolving to supported input

Basic:

```js
const thumb = await sock.uploadThumbnail('./cover.jpg')
```

From URL:

```js
const thumb = await sock.uploadThumbnail(
    'https://example.com/cover.png'
)
```

From a quoted image:

```js
const thumb = await sock.uploadThumbnail(
    m.quoted.download()
)
```

Custom MIME:

```js
const thumb = await sock.uploadThumbnail(
    buffer,
    { mimetype: 'image/webp' }
)
```

Favicon mode:

```js
const favicon = await sock.uploadThumbnail(
    './favicon.png',
    { favicon: true }
)
```

The returned object contains fields suitable for link-preview style message content, including:

```js
{
    thumbnailDirectPath,
    thumbnailSha256,
    thumbnailEncSha256,
    mediaKey,
    mediaKeyTimestamp,
    thumbnailWidth,
    thumbnailHeight,
    mimetype,
    jpegThumbnail
}
```

Example:

```js
const thumb = await sock.uploadThumbnail('./cover.jpg')

await sock.message.send(m.chat, {
    extendedTextMessage: {
        text: 'https://example.com',
        matchedText: 'https://example.com',
        title: 'Example',
        description: 'Example description',
        ...thumb
    }
})
```

---

# Downloading a Thumbnail

The wrapper also exposes:

```js
sock.downloadThumbnail(fields, options)
```

Example:

```js
const result = await sock.downloadThumbnail({
    mediaKey: fields.mediaKey,
    thumbnailDirectPath: fields.thumbnailDirectPath,
    thumbnailSha256: fields.thumbnailSha256,
    thumbnailEncSha256: fields.thumbnailEncSha256,
    mimetype: fields.mimetype
})
```

Result:

```js
{
    buffer,
    mimetype,
    jpegThumbnail
}
```

---

# Reactions

The wrapper provides:

```js
await sock.sendReact(m.chat, '👍', m.id)
```

Quoted message:

```js
await sock.sendReact(
    m.chat,
    '❤️',
    m.quoted?.key?.id
)
```

Remove a reaction:

```js
await sock.sendReact(m.chat, '', m.id)
```

---

# 🔘 Buttons / Interactive Messages

One of the reasons this base is useful for bot developers is that you are not restricted to plain text.

Zapo's lower-level message structures can be used to construct interactive/native-flow messages.

The exact available message structures should always be checked against the installed Zapo version and the official docs:

https://zapo.to

## Quick Reply Button

A typical native-flow button uses:

```js
{
    name: 'quick_reply',
    buttonParamsJson: JSON.stringify({
        display_text: 'Menu',
        id: '.menu'
    })
}
```

Example:

```js
await sock.message.send(m.chat, {
    interactiveMessage: {
        body: {
            text: 'Pilih menu:'
        },
        footer: {
            text: 'Bot'
        },
        nativeFlowMessage: {
            buttons: [
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: 'Menu',
                        id: '.menu'
                    })
                },
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: 'Owner',
                        id: '.owner'
                    })
                }
            ],
            messageVersion: 1
        }
    }
})
```

---

# URL Button

```js
await sock.message.send(m.chat, {
    interactiveMessage: {
        body: {
            text: 'Open website'
        },
        nativeFlowMessage: {
            buttons: [
                {
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({
                        display_text: 'Open Website',
                        url: 'https://example.com',
                        merchant_url: 'https://example.com'
                    })
                }
            ],
            messageVersion: 1
        }
    }
})
```

---

# Copy Button

Useful for links, codes, IDs, etc.

```js
await sock.message.send(m.chat, {
    interactiveMessage: {
        body: {
            text: 'Klik untuk menyalin link'
        },
        nativeFlowMessage: {
            buttons: [
                {
                    name: 'cta_copy',
                    buttonParamsJson: JSON.stringify({
                        display_text: 'Salin Link',
                        copy_code: 'https://example.com'
                    })
                }
            ],
            messageVersion: 1
        }
    }
})
```

---

# Single Select / Dropdown

Native-flow menus can be represented with `single_select`.

Example structure:

```js
await sock.message.send(m.chat, {
    interactiveMessage: {
        body: {
            text: 'Pilih kategori'
        },
        nativeFlowMessage: {
            buttons: [
                {
                    name: 'single_select',
                    buttonParamsJson: JSON.stringify({
                        title: 'Pilih Menu',
                        sections: [
                            {
                                title: 'Kategori',
                                rows: [
                                    {
                                        header: 'Bot',
                                        title: 'Menu Bot',
                                        description: 'Fitur bot',
                                        id: '.menu bot'
                                    },
                                    {
                                        header: 'Owner',
                                        title: 'Menu Owner',
                                        description: 'Fitur owner',
                                        id: '.menu owner'
                                    }
                                ]
                            }
                        ]
                    })
                }
            ],
            messageVersion: 1
        }
    }
})
```

> Native-flow message compatibility can vary with WhatsApp client/version. Keep the payload aligned with the current Zapo/WhatsApp message structures.

---

# Interactive Message With Media

If a message type supports a media header, build the content according to the Zapo message schema rather than inventing a custom wrapper.

For example, a thumbnail generated by:

```js
const thumb = await sock.uploadThumbnail('./cover.jpg')
```

can be combined with supported extended/link-preview structures:

```js
await sock.message.send(m.chat, {
    extendedTextMessage: {
        text: 'https://example.com',
        matchedText: 'https://example.com',
        title: 'Example',
        description: 'Example website',
        ...thumb
    }
})
```

For deeper interactive/media combinations, use the official Zapo message type definitions and documentation.

---

# Custom Nodes Patch

## Why is this patched?

Zapo-JS is intentionally a **high-level API**.

That is useful because it provides a cleaner and safer abstraction over WhatsApp Web. However, a high-level API also means applications are generally limited to the message structures and transport options exposed by Zapo itself.

For bot developers who work with lower-level WhatsApp structures, that can become restrictive.

Sometimes you want to send a message structure that:

- is not exposed by the high-level API yet
- requires a custom binary node
- needs additional relay nodes
- follows a pattern commonly used by lower-level libraries such as Baileys
- needs protocol-level control without waiting for a high-level wrapper

Therefore this project includes a small patch to Zapo-JS.

---

## What the patch does

`patch.js` runs automatically during:

```bash
npm install
```

because `package.json` contains:

```json
{
    "scripts": {
        "postinstall": "node patch.js"
    }
}
```

The patch modifies Zapo's message builder so `input.customNodes` can be injected into the generated node list.

The patch behavior is intentionally simple:

```text
customNodes
    │
    ├── matching tag exists
    │       └── replace existing node
    │
    └── matching tag does not exist
            └── append node
```

A node without a `tag` is ignored.

This gives the application a lower-level escape hatch while keeping the normal Zapo API intact.

---

# Using Custom Nodes

Conceptually:

```js
await sock.message.send(jid, {
  interactiveMessage: {
    body: {
      text: "may I ask for your contact?"
    },
    nativeFlowMessage: {
      buttons: [
        {
          name: "request_contact_info"
        }
      ],
      messageParamsJson: JSON.stringify({})
    }
  }
}, {
  customNodes: [
    {
      tag: "biz",
      attrs: {},
      content: [
        {
          tag: "interactive",
          attrs: {
            type: "native_flow",
            v: "1"
          },
          content: [
            {
              tag: "native_flow",
              attrs: {
                name: "request_contact_info"
              }
            }
          ]
        }
      ]
    }
  ]
})

```

The exact node structure depends on the WhatsApp message you are trying to reproduce.

Think of `customNodes` as a Zapo-side equivalent of the low-level additional-node escape hatch commonly used in libraries such as Baileys.

### Important

This patch does **not** turn Zapo-JS into Baileys.

It only provides a controlled low-level escape hatch so developers can inject/override custom nodes without abandoning Zapo-JS.

---

# Patch Safety

The patch is:

- applied automatically after installation
- idempotent
- marker-based
- limited to the Zapo message-builder files
- designed to avoid duplicate patching

The patch marker is:

```text
/* OVERRIDE_CUSTOM_NODES_PATCH */
```

Running:

```bash
npm install
```

again will not repeatedly apply the same patch if it is already present.

---

# Plugin Development

Create a plugin under:

```text
plugins/<category>/
```

Example:

```js
export default {
    command: 'hello',
    alias: ['hi'],
    category: 'bot',
    description: 'Say hello',

    async execute(m, { sock, args }) {
        await m.reply(
            `Hello ${m.pushName || 'there'}!`
        )
    }
}
```

After adding a plugin, use the project's reload command if enabled rather than restarting the entire bot.

---

# Plugin Context

Plugins receive a context object.

Common values include:

```js
{
    sock,
    args,
    plugins
}
```

The serialized message object `m` also exposes message-related properties such as:

```js
m.chat
m.sender
m.text
m.command
m.args
m.quoted
m.isGroup
m.isMedia
m.type
m.reply()
```

Use the actual serializer implementation as the source of truth for additional properties.

---

# Quoting

Simple:

```js
await m.reply('Hello')
```

Structured messages can pass quote information through the message options supported by Zapo.

For wrapper helpers:

```js
await sock.sendVoiceNote(
    m.chat,
    './voice.mp3',
    {
        quote: m
    }
)
```

---

# Mentions

Example:

```js
await sock.sendVoiceNote(
    m.chat,
    './voice.mp3',
    {
        mentions: [m.sender]
    }
)
```

For other message types, use the mention fields supported by the corresponding Zapo message structure.

---

# Session Storage

This base uses:

```text
session/session.sqlite
```

The SQLite store is configured through:

```js
createSqliteStore({
    path: SESSION_DB_PATH
})
```

The session database stores authentication/session state so the bot does not need to pair again after every restart.

Do **not** commit the session directory to Git.

Recommended `.gitignore` entries:

```gitignore
node_modules/
session/
database/
*.sqlite
*.sqlite-shm
*.sqlite-wal
.env
```

---

# Configuration

The main bot configuration lives in:

```text
settings.js
```

Keep secrets, session identifiers, owner configuration, prefixes, and environment-specific settings there rather than hardcoding them throughout plugins.

---

# Performance Philosophy

This base deliberately avoids unnecessary abstractions and duplicate processing.

The main principles are:

### 1. Use Zapo's native capabilities

If Zapo or an official Zapo package already provides a feature, prefer it over reimplementing the same feature in the wrapper.

### 2. Keep wrappers thin

The wrapper exists to make common bot operations convenient.

It should not become a second WhatsApp protocol implementation.

### 3. Avoid blocking hot paths

Message handling can happen at high frequency, so avoid unnecessary synchronous filesystem, database, and child-process operations.

### 4. Cache expensive metadata

Group metadata and similar frequently accessed data should not be fetched repeatedly when the same information is already available.

### 5. Keep plugin isolation

A broken plugin should not take down the whole message processing pipeline.

### 6. Optimize real bottlenecks

Do not add abstraction or caching just because it looks sophisticated.

Correctness and compatibility come first.

---

# Official Zapo Documentation

For the complete upstream documentation:

## 📚 Zapo Documentation

https://zapo.to

The official documentation covers:

- installation
- `WaClient`
- authentication
- stores
- sessions
- message sending
- message receiving
- media
- reactions
- polls
- groups
- newsletters
- app state
- plugins
- events
- storage providers
- protocol details
- API reference
- examples
- architecture

The upstream project also provides its source and package documentation:

- GitHub: https://github.com/vinikjkkj/zapo
- NPM: https://www.npmjs.com/package/zapo-js
- Media utilities: https://www.npmjs.com/package/@zapo-js/media-utils

> **Use the documentation matching the Zapo version installed in your project.** Low-level WhatsApp structures can change independently of the high-level API.

---

# Useful Zapo Packages

Depending on your project, Zapo provides optional packages for different workloads.

Examples include:

```bash
# SQLite persistence
npm install @zapo-js/store-sqlite better-sqlite3

# Media processing
npm install @zapo-js/media-utils sharp

# Native acceleration
npm install @zapo-js/native
```

Other storage backends and optional packages are documented upstream.

See:

https://zapo.to

---

# Development Workflow

Recommended workflow:

```text
write plugin
    ↓
run bot
    ↓
test command
    ↓
inspect logs
    ↓
reload plugin
    ↓
repeat
```

For larger architecture changes:

```text
Git checkpoint
    ↓
make changes
    ↓
run syntax check
    ↓
run bot
    ↓
test message flow
    ↓
review git diff
    ↓
commit
```

Always keep a Git checkpoint before large AI-assisted refactors.

---

# Troubleshooting

## `ffmpeg` not found

Check:

```bash
ffmpeg -version
ffprobe -version
```

Install FFmpeg using your operating system's package manager.

---

## Session keeps asking for pairing

Check:

```text
session/session.sqlite
```

and ensure the process has permission to read/write the session directory.

---

## Plugin is not detected

Check:

- file is inside `plugins/`
- plugin uses ESM syntax
- `export default` is present
- `command` exists
- file extension is `.js`
- there is no syntax error

---

## Custom nodes patch did not apply

Run:

```bash
node patch.js
```

The script reports whether the target Zapo message-builder files were:

- patched
- already patched
- missing
- not matched

If the Zapo internal message-builder structure changes in a future release, the patch may require an update.

---

# Important Note About Custom Protocol Features

Custom nodes and low-level WhatsApp message structures are intentionally powerful.

They also depend more closely on WhatsApp's internal protocol behavior than ordinary high-level message APIs.

Therefore:

- test custom messages against the current WhatsApp clients
- avoid assuming every internal message type remains stable
- keep custom node code isolated
- prefer native Zapo APIs when they provide the required feature
- use `customNodes` when you specifically need lower-level control

The patch exists to provide **flexibility**, not to encourage bypassing every high-level abstraction.

---

# Credits

Built with:

- [Zapo-JS](https://github.com/vinikjkkj/zapo)
- `@zapo-js/media-utils`
- `@zapo-js/store-sqlite`
- `better-sqlite3`
- `sharp`
- `file-type`
- FFmpeg / FFprobe

Special thanks to the Zapo project and its contributors.

---

# Disclaimer

This project is an independent WhatsApp Web bot implementation.

Zapo-JS is an independent implementation for engineering and interoperability research and is not affiliated with or endorsed by WhatsApp.

Use automation responsibly and in accordance with the applicable WhatsApp terms and policies.

---

<p align="center">
  <b>Built for developers who want Zapo-JS without giving up low-level control.</b>
</p>

<p align="center">
  ⚡ Fast · 🪶 Lightweight · 🔌 Flexible · 🧩 Extensible
</p>
