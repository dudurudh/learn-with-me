#!/usr/bin/env node
/** Writes the PWA icons with zlib and a hand-rolled PNG encoder — a build-time
 *  image dependency for six flat squares is not worth it. Foam-deep ground,
 *  a paper grid, one cinnabar cell: the drawer, at 1/365 scale. */
import { deflateSync } from 'node:zlib'
import { writeFile } from 'node:fs/promises'

const FOAM_DEEP = [0x2e, 0x6b, 0x7c]
const PAPER = [0xf5, 0xf2, 0xec]
const CINNABAR = [0xc2, 0x5a, 0x28]

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

function drawer(size) {
  const cells = 5
  const pad = Math.round(size * 0.16)
  const inner = size - pad * 2
  const step = inner / cells
  const gap = Math.max(1, Math.round(size * 0.012))
  return (x, y) => {
    if (x < pad || y < pad || x >= size - pad || y >= size - pad) return FOAM_DEEP
    const cx = Math.floor((x - pad) / step)
    const cy = Math.floor((y - pad) / step)
    const ox = (x - pad) - cx * step
    const oy = (y - pad) - cy * step
    if (ox < gap || oy < gap || ox > step - gap || oy > step - gap) return FOAM_DEEP
    if (cx === 3 && cy === 1) return CINNABAR            // the one found colour
    return (cx + cy * 2) % 3 === 0 ? PAPER : [0x62, 0xa8, 0xb8]
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
  if (x < pad || y < pad || x >= 512 - pad || y >= 512 - pad) return FOAM_DEEP
  return inner(Math.round(x - pad), Math.round(y - pad))
})
await writeFile('public/icon-maskable-512.png', maskable)
console.log('wrote public/icon-maskable-512.png')
