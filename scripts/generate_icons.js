import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const publicDir = path.resolve('public');
const tempDir = path.resolve('scripts/temp_icons');

if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// 1. Write favicon.svg
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" fill="none">
  <defs>
    <linearGradient id="mm-logo-grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
      <stop stop-color="#16224A"/>
      <stop offset="1" stop-color="#0F9E8E"/>
    </linearGradient>
  </defs>
  <rect width="36" height="36" rx="10" fill="url(#mm-logo-grad)"/>
  <path d="M10 24.5V11.5L18 18.5L26 11.5V24.5" stroke="#ffffff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M13.5 25C15.5 23.2 20.5 23.2 22.5 25" stroke="#54D6C4" stroke-width="2" stroke-linecap="round"/>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'favicon.svg'), faviconSvg.trim());
console.log('Wrote public/favicon.svg');

// 2. HTML templates for PNG rendering
// Standard icon (with rounded corners or full background bleed)
// For pwa-512x512 and pwa-192x192
const getStandardHtml = (size) => `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: ${size}px;
    height: ${size}px;
    background: transparent;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  svg {
    width: 100%;
    height: 100%;
    display: block;
  }
</style>
</head>
<body>
<svg viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg-grad" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop stop-color="#16224A"/>
      <stop offset="1" stop-color="#0F9E8E"/>
    </linearGradient>
  </defs>
  <!-- Rounded squircle background -->
  <rect width="512" height="512" rx="112" fill="url(#bg-grad)"/>
  <!-- Crisp M monogram -->
  <path d="M142 348V164L256 263L370 164V348" stroke="#ffffff" stroke-width="39" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Turquoise ocean wave accent -->
  <path d="M192 355C220 330 292 330 320 355" stroke="#54D6C4" stroke-width="28" stroke-linecap="round"/>
</svg>
</body>
</html>`;

// Maskable icon (FULL BLEED background, safe-zone centered inner logo)
// Android PWA specification: keep all graphics inside the inner 80% circle (radius ~ 205px from center)
const getMaskableHtml = (size) => `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: ${size}px;
    height: ${size}px;
    background: #16224A;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  svg {
    width: 100%;
    height: 100%;
    display: block;
  }
</style>
</head>
<body>
<svg viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg-grad-mask" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop stop-color="#16224A"/>
      <stop offset="1" stop-color="#0F9E8E"/>
    </linearGradient>
  </defs>
  <!-- Full bleed rectangle with no rounding so maskable shapes don't get white edges -->
  <rect width="512" height="512" fill="url(#bg-grad-mask)"/>
  <!-- Scaled monogram within safe zone (center = 256, 256) -->
  <g transform="translate(64, 64) scale(0.75)">
    <path d="M142 348V164L256 263L370 164V348" stroke="#ffffff" stroke-width="44" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M192 355C220 330 292 330 320 355" stroke="#54D6C4" stroke-width="32" stroke-linecap="round"/>
  </g>
</svg>
</body>
</html>`;

// Apple touch icon (180x180, full bleed, rounded by iOS automatically)
const getAppleTouchHtml = (size) => `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: ${size}px;
    height: ${size}px;
    background: #16224A;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  svg {
    width: 100%;
    height: 100%;
    display: block;
  }
</style>
</head>
<body>
<svg viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg-grad-apple" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop stop-color="#16224A"/>
      <stop offset="1" stop-color="#0F9E8E"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg-grad-apple)"/>
  <path d="M142 348V164L256 263L370 164V348" stroke="#ffffff" stroke-width="40" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M192 355C220 330 292 330 320 355" stroke="#54D6C4" stroke-width="30" stroke-linecap="round"/>
</svg>
</body>
</html>`;

const targets = [
  { file: 'pwa-512x512.png', size: 512, html: getStandardHtml(512) },
  { file: 'pwa-192x192.png', size: 192, html: getStandardHtml(192) },
  { file: 'maskable-512x512.png', size: 512, html: getMaskableHtml(512) },
  { file: 'apple-touch-icon.png', size: 180, html: getAppleTouchHtml(180) },
];

const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

for (const target of targets) {
  const htmlFile = path.join(tempDir, `${target.file}.html`);
  const outFile = path.join(publicDir, target.file);
  fs.writeFileSync(htmlFile, target.html);

  const fileUrl = 'file:///' + htmlFile.replace(/\\/g, '/');
  console.log(`Generating ${target.file} (${target.size}x${target.size})...`);

  const cmd = `"${edgePath}" --headless --disable-gpu --hide-scrollbars --default-background-color=00000000 --window-size=${target.size},${target.size} --screenshot="${outFile}" "${fileUrl}"`;
  execSync(cmd, { stdio: 'inherit' });
}

console.log('All PWA icons successfully generated!');
