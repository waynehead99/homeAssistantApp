/**
 * Simple script to generate PWA icons
 * Run: node scripts/generate-icons.js
 *
 * This creates simple placeholder icons. For production, replace with your own icons.
 */

import { writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')

// Simple SVG icon (home icon)
const createSvg = (size) => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#1e293b" rx="${size * 0.1}"/>
  <g transform="translate(${size * 0.2}, ${size * 0.2})">
    <path
      d="M${size * 0.3} ${size * 0.35}L${size * 0.15} ${size * 0.2}L${size * 0} ${size * 0.35}M${size * 0.05} ${size * 0.3}V${size * 0.55}H${size * 0.15}V${size * 0.4}H${size * 0.25}V${size * 0.55}H${size * 0.35}V${size * 0.3}"
      fill="none"
      stroke="#3b82f6"
      stroke-width="${size * 0.02}"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </g>
</svg>`

// Ensure public directory exists
try {
  mkdirSync(publicDir, { recursive: true })
} catch (e) {
  // Directory exists
}

// Generate icons
const sizes = [192, 512]

sizes.forEach(size => {
  const svg = createSvg(size)
  const filename = `icon-${size}.svg`
  writeFileSync(join(publicDir, filename), svg)
  console.log(`Created ${filename}`)
})

console.log('')
console.log('SVG icons created! For PNG icons, you can:')
console.log('1. Use an online converter (svgtopng.com)')
console.log('2. Use ImageMagick: convert icon-192.svg icon-192.png')
console.log('3. Use a design tool like Figma')
