import imageCompression from 'browser-image-compression'

/**
 * Non-negotiable, and the reason is git: an uncompressed phone photo is 3–5 MB,
 * and 365 of them would put well over a gigabyte into a public repo that keeps
 * every blob forever. 1600px on the long edge is still more than any portfolio
 * needs.
 */
export const MAX_EDGE = 1600
export const TARGET_BYTES = 400 * 1024
export const QUALITY = 0.85

export interface Compressed {
  blob: Blob
  width: number
  height: number
  bytes: number
  originalBytes: number
}

export async function compressForStorage(file: File): Promise<Compressed> {
  if (!file.type.startsWith('image/')) {
    throw new Error(`${file.name} is not an image.`)
  }
  const blob = await imageCompression(file, {
    maxWidthOrHeight: MAX_EDGE,
    maxSizeMB: TARGET_BYTES / (1024 * 1024),
    initialQuality: QUALITY,
    useWebWorker: true,
    fileType: 'image/jpeg',
  })
  const { width, height } = await measure(blob)
  return { blob, width, height, bytes: blob.size, originalBytes: file.size }
}

function measure(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve({ width: 0, height: 0 }) }
    img.src = url
  })
}

export function formatBytes(n: number): string {
  return n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`
}
