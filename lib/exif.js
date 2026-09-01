// lib/sticker-convert.js

import fs from 'fs'
import path from 'path'
import { tmpdir } from 'os'
import crypto from 'crypto'
import ff from 'fluent-ffmpeg'
import sharp from 'sharp'
import { fileTypeFromBuffer } from 'file-type'

const MAX_SIZE = 1024 * 1024
const MAX_DURATION = 10
const QUALITY = 90
const MIN_FPS = 20
const MAX_FPS = 30

const TMP = (ext) => path.join(tmpdir(), `${crypto.randomBytes(6).toString('hex')}.${ext}`)

const LADDER = [
  { scale: 400, fps: 30, dur: 10 },
  { scale: 400, fps: 25, dur: 10 },
  { scale: 400, fps: 20, dur: 10 },
  { scale: 400, fps: 20, dur: 8 },
  { scale: 400, fps: 20, dur: 6 },
  { scale: 320, fps: 30, dur: 10 },
  { scale: 320, fps: 25, dur: 10 },
  { scale: 320, fps: 20, dur: 8 },
  { scale: 320, fps: 20, dur: 6 },
  { scale: 256, fps: 20, dur: 6 },
  { scale: 256, fps: 20, dur: 5 }
]

function runFF(inputPath, outputPath, outputOptions, format) {
  return new Promise((resolve, reject) => {
    let stderrLog = ''
    ff(inputPath)
      .on('stderr', (line) => { stderrLog += line + '\n' })
      .on('error', (err) => reject(new Error(`ffmpeg gagal: ${err.message}\n--- stderr ---\n${stderrLog}`)))
      .on('end', resolve)
      .addOutputOptions(outputOptions)
      .toFormat(format)
      .save(outputPath)
  })
}

function probeVideo(file) {
  return new Promise((resolve) => {
    ff.ffprobe(file, (err, data) => {
      if (err) return resolve({ fps: 30, duration: 0 })
      const stream = data.streams.find(s => s.codec_type === 'video')
      if (!stream) return resolve({ fps: 30, duration: 0 })
      const [a, b] = (stream.avg_frame_rate || '30/1').split('/').map(Number)
      const fps = (!b || isNaN(a / b)) ? 30 : Math.round(a / b)
      const duration = parseFloat(data.format?.duration || 0)
      resolve({ fps, duration })
    })
  })
}

export async function imageToWebp(media) {
  const tmpIn = TMP('png')
  const tmpOut = TMP('webp')
  fs.writeFileSync(tmpIn, media)

  const vf = `scale=w='min(320,iw)':h='min(320,ih)':force_original_aspect_ratio=decrease,pad=320:320:(ow-iw)/2:(oh-ih)/2:color=#00000000`

  try {
    await runFF(tmpIn, tmpOut, [
      '-vcodec', 'libwebp',
      '-vf', vf,
      '-quality', String(QUALITY),
      '-pix_fmt', 'yuva420p'
    ], 'webp')
  } finally {
    if (fs.existsSync(tmpIn)) fs.unlinkSync(tmpIn)
  }

  const buff = fs.readFileSync(tmpOut)
  fs.unlinkSync(tmpOut)
  return buff
}

export async function videoToWebp(media) {
  const detected = await fileTypeFromBuffer(media)
  const ext = (detected?.ext === 'webm') ? 'webm' : 'mp4'
  const tmpIn = TMP(ext)
  fs.writeFileSync(tmpIn, media)

  const { fps: srcFps, duration } = await probeVideo(tmpIn)

  let resultBuff = null
  let lastError = null

  for (const { scale, fps, dur } of LADDER) {
    const targetFps = Math.max(MIN_FPS, Math.min(fps, srcFps, MAX_FPS))
    const targetDur = Math.min(dur, Math.floor(duration), MAX_DURATION)
    const outPath = TMP('webp')

    const vf = `fps=${targetFps},scale=w='min(${scale},iw)':h='min(${scale},ih)':force_original_aspect_ratio=decrease,pad=${scale}:${scale}:(ow-iw)/2:(oh-ih)/2:color=#00000000`

    try {
      await runFF(tmpIn, outPath, [
        '-vcodec', 'libwebp_anim',
        '-vf', vf,
        '-loop', '0',
        '-ss', '0',
        '-t', String(targetDur),
        '-an',
        '-preset', 'default',
        '-quality', String(QUALITY),
        '-compression_level', '6',
        '-pix_fmt', 'yuva420p'
      ], 'webp')
    } catch (err) {
      lastError = err
      if (fs.existsSync(outPath)) fs.unlinkSync(outPath)
      continue
    }

    const size = fs.statSync(outPath).size

    if (size <= MAX_SIZE) {
      resultBuff = fs.readFileSync(outPath)
      fs.unlinkSync(outPath)
      break
    }
    fs.unlinkSync(outPath)
  }

  if (fs.existsSync(tmpIn)) fs.unlinkSync(tmpIn)

  if (!resultBuff) {
    if (lastError) throw lastError
    throw new Error('Gagal compress video ke bawah 1MB setelah semua percobaan (fps sudah di batas minimum 20)')
  }
  return resultBuff
}

export async function extractStillFrame(webpBuffer) {
  return sharp(webpBuffer, { animated: false }).webp().toBuffer()
}

export async function convertToSticker(buffer) {
  const detected = await fileTypeFromBuffer(buffer)

  const isLottie = detected
    ? /was/.test(detected.mime)
    : (buffer.toString('utf-8', 0, 20).includes('{"v":') || buffer[0] === 0x1f)

  if (isLottie) {
    throw new Error('Lottie sticker (.tgs) tidak didukung, harus berupa gambar atau video.')
  }

  const isWebp = detected ? /webp/.test(detected.mime) : false

  if (isWebp) {
    return { buffer, isAnimated: buffer.includes(Buffer.from('ANIM')) }
  }

  if (detected && /jpeg|jpg|png/.test(detected.mime)) {
    return { buffer: await imageToWebp(buffer), isAnimated: false }
  }

  if (detected && /video/.test(detected.mime)) {
    return { buffer: await videoToWebp(buffer), isAnimated: true }
  }

  throw new Error(`Format tidak didukung: ${detected?.mime || 'unknown'}`)
}