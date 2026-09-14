#!/usr/bin/env node
/** Writes the PWA icons with zlib and a hand-rolled PNG encoder. A build-time
 *  image dependency for nine flat squares is not worth it. */
import { deflateSync } from 'node:zlib'
import { writeFile } from 'node:fs/promises'

// Matches the wordmark: the drawer, three by three, one compartment filled.
const ACCENT = [0x24, 0x45, 0x7f]
const WHITE = [0xff, 0xff, 0xff]

function crc32(buf) {
  let c = ~0
  for (const b of buf) {
    c ^= b
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function png(size, pixels) {
  const raw = Buffer.alloc(size * (size * 3 + 1))
  let p = 0
  for (let y = 0; y < size; y++) {
    raw[p++] = 0                                   // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixels(x, y)
      raw[p++] = r; raw[p++] = g; raw[p++] = b
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function mix(a, b, t) {
  return a.map((c, i) => c * (1 - t) + b[i] * t)
}

function drawer(size) {
  const cells = 3
  const pad = Math.round(size * 0.2)
  const step = (size - pad * 2) / cells
  const cell = step * 0.66
  return (x, y) => {
    const cx = Math.floor((x - pad) / step)
    const cy = Math.floor((y - pad) / step)
    if (cx < 0 || cy < 0 || cx >= cells || cy >= cells) return ACCENT
    const ox = (x - pad) - cx * step
    const oy = (y - pad) - cy * step
    if (ox > cell || oy > cell) return ACCENT
    // The middle compartment is the one that is filled.
    return cx === 1 && cy === 1 ? WHITE : mix(ACCENT, WHITE, 0.42)
  }
}

for (const size of [180, 192, 512]) {
  const name = `public/icon-${size}.png`
  await writeFile(name, png(size, drawer(size)))
  console.log('wrote', name)
}

const maskable = png(512, (x, y) => {
  // Maskable icons get cropped to a circle, so keep the artwork well inside.
  const pad = 512 * 0.22
  const inner = drawer(Math.round(512 - pad * 2))
  if (x < pad || y < pad || x >= 512 - pad || y >= 512 - pad) return ACCENT
  return inner(Math.round(x - pad), Math.round(y - pad))
})
await writeFile('public/icon-maskable-512.png', maskable)
console.log('wrote public/icon-maskable-512.png')
