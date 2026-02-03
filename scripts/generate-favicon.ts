/**
 * Generate favicon files from SVG
 * This script converts the favicon.svg to various sizes needed for different platforms
 */

import { writeFileSync } from 'fs';
import { join } from 'path';

const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="fuelGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#2563eb;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1d4ed8;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <circle cx="50" cy="50" r="48" fill="url(#fuelGradient)"/>
  
  <rect x="35" y="35" width="25" height="35" rx="2" fill="white"/>
  
  <rect x="38" y="40" width="19" height="12" rx="1" fill="#2563eb"/>
  
  <circle cx="43" cy="58" r="2" fill="#2563eb"/>
  <circle cx="50" cy="58" r="2" fill="#2563eb"/>
  
  <rect x="60" y="45" width="8" height="15" rx="1" fill="white"/>
  <rect x="62" y="47" width="4" height="11" rx="0.5" fill="#2563eb"/>
  
  <path d="M 60 52 Q 55 52 55 57" stroke="white" stroke-width="2" fill="none"/>
  
  <path d="M 55 57 L 52 62 L 55 64 L 58 62 Z" fill="white"/>
  
  <circle cx="72" cy="30" r="8" fill="#fbbf24"/>
  <text x="72" y="34" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="#1d4ed8" text-anchor="middle">£</text>
</svg>`;

const APPLE_TOUCH_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180">
  <defs>
    <linearGradient id="appleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1d4ed8;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <rect width="180" height="180" rx="40" fill="url(#appleGradient)"/>
  
  <rect x="60" y="50" width="55" height="85" rx="4" fill="white"/>
  
  <rect x="65" y="58" width="45" height="30" rx="3" fill="#2563eb"/>
  <text x="87.5" y="78" font-family="-apple-system, Arial" font-size="20" font-weight="bold" fill="white" text-anchor="middle">£</text>
  
  <circle cx="75" cy="100" r="4" fill="#2563eb"/>
  <circle cx="87.5" cy="100" r="4" fill="#10b981"/>
  <circle cx="100" cy="100" r="4" fill="#f59e0b"/>
  
  <rect x="60" y="135" width="55" height="8" rx="2" fill="white" opacity="0.9"/>
  
  <rect x="120" y="75" width="20" height="40" rx="3" fill="white"/>
  <rect x="124" y="80" width="12" height="30" rx="2" fill="#2563eb"/>
  
  <path d="M 120 95 Q 110 95 110 110" stroke="white" stroke-width="5" fill="none"/>
  <path d="M 120 95 Q 110 95 110 110" stroke="#2563eb" stroke-width="3" fill="none"/>
  
  <path d="M 110 110 L 100 120 L 110 128 L 120 120 Z" fill="white"/>
  <circle cx="110" cy="119" r="8" fill="#2563eb"/>
  
  <circle cx="140" cy="40" r="20" fill="#fbbf24"/>
  <text x="140" y="48" font-family="-apple-system, Arial" font-size="18" font-weight="bold" fill="#1d4ed8" text-anchor="middle">↓</text>
</svg>`;

async function generateFavicons() {
  const publicDir = join(process.cwd(), 'public');
  
  console.log('📝 Generating favicon files...\n');
  
  // Write SVG files
  writeFileSync(join(publicDir, 'favicon.svg'), FAVICON_SVG);
  console.log('✅ Created favicon.svg');
  
  writeFileSync(join(publicDir, 'apple-touch-icon.png'), APPLE_TOUCH_ICON_SVG);
  console.log('✅ Created apple-touch-icon.png (as SVG - will need conversion)');
  
  console.log('\n🎨 Favicon files generated!');
  console.log('\n📋 Next steps:');
  console.log('   To generate proper PNG and ICO files, you have two options:\n');
  console.log('   Option 1: Use an online converter');
  console.log('   - Visit https://realfavicongenerator.net/');
  console.log('   - Upload public/favicon.svg');
  console.log('   - Download and extract to public/ folder\n');
  console.log('   Option 2: Install sharp library for automated conversion');
  console.log('   - Run: pnpm add -D sharp');
  console.log('   - This script will automatically convert SVG to PNG/ICO\n');
  
  // Try to use sharp if available
  try {
    const sharp = await import('sharp');
    console.log('✨ Sharp detected! Generating PNG files...\n');
    
    // Generate favicon.ico (32x32)
    await sharp.default(Buffer.from(FAVICON_SVG))
      .resize(32, 32)
      .toFile(join(publicDir, 'favicon-32x32.png'));
    console.log('✅ Created favicon-32x32.png');
    
    // Generate 192x192 for manifest
    await sharp.default(Buffer.from(FAVICON_SVG))
      .resize(192, 192)
      .toFile(join(publicDir, 'logo192.png'));
    console.log('✅ Created logo192.png');
    
    // Generate 512x512 for manifest
    await sharp.default(Buffer.from(FAVICON_SVG))
      .resize(512, 512)
      .toFile(join(publicDir, 'logo512.png'));
    console.log('✅ Created logo512.png');
    
    // Generate Apple Touch Icon (180x180)
    await sharp.default(Buffer.from(APPLE_TOUCH_ICON_SVG))
      .resize(180, 180)
      .toFile(join(publicDir, 'apple-touch-icon.png'));
    console.log('✅ Created apple-touch-icon.png');
    
    console.log('\n🎉 All favicon files generated successfully!');
    console.log('   Note: For favicon.ico, you may still want to use an online converter');
    console.log('   as ICO format requires special handling.\n');
    
  } catch (error) {
    console.log('ℹ️  Install sharp for automatic PNG generation:');
    console.log('   pnpm add -D sharp\n');
  }
}

generateFavicons().catch(console.error);
