const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const OUT = path.join(__dirname, '..', 'public')
fs.mkdirSync(OUT, { recursive: true })

// Dumbbell mark on the app's existing fuel-green gradient, dark charcoal glyph
// for contrast — same palette as the in-app brand mark, so the home-screen
// icon and the app itself feel like the same product.
function dumbbellSvg({ maskable = false } = {}) {
  const scale = maskable ? 0.62 : 1
  return `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#b8ea78"/>
      <stop offset="55%" stop-color="#a8e063"/>
      <stop offset="100%" stop-color="#5f9634"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <g transform="translate(256,256) scale(${scale}) translate(-256,-256)">
    <rect x="118" y="176" width="54" height="160" rx="20" fill="#12140f"/>
    <rect x="340" y="176" width="54" height="160" rx="20" fill="#12140f"/>
    <rect x="158" y="234" width="196" height="44" rx="22" fill="#12140f"/>
  </g>
</svg>`
}

async function render(svg, size, outfile) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(path.join(OUT, outfile))
  console.log('wrote', outfile, size)
}

async function main() {
  const standard = dumbbellSvg({ maskable: false })
  const maskable = dumbbellSvg({ maskable: true })

  await render(standard, 512, 'icon-512.png')
  await render(standard, 192, 'icon-192.png')
  await render(standard, 180, 'apple-touch-icon.png')
  await render(standard, 32, 'favicon-32.png')
  await render(standard, 16, 'favicon-16.png')
  await render(maskable, 512, 'icon-maskable-512.png')
  await render(maskable, 192, 'icon-maskable-192.png')
}

main().catch(e => { console.error(e); process.exit(1) })
