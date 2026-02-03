/**
 * Create a proper favicon.ico from our PNG file
 */

import sharp from 'sharp';
import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

async function createIco() {
  const publicDir = join(process.cwd(), 'public');
  const inputPng = join(publicDir, 'favicon-32x32.png');
  const outputIco = join(publicDir, 'favicon.ico');
  
  console.log('🎨 Creating favicon.ico from favicon-32x32.png...\n');
  
  try {
    // Generate multiple sizes for the ICO file (16x16 and 32x32)
    const sizes = [16, 32];
    const pngBuffers: Buffer[] = [];
    
    for (const size of sizes) {
      const buffer = await sharp(inputPng)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
      pngBuffers.push(buffer);
    }
    
    // Create a simple ICO header
    // ICO format: Header (6 bytes) + Directory entries (16 bytes each) + Image data
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0); // Reserved, must be 0
    header.writeUInt16LE(1, 2); // Type: 1 for ICO
    header.writeUInt16LE(pngBuffers.length, 4); // Number of images
    
    let imageDataOffset = 6 + (pngBuffers.length * 16);
    const directoryEntries: Buffer[] = [];
    
    for (let i = 0; i < pngBuffers.length; i++) {
      const size = sizes[i];
      const imageData = pngBuffers[i];
      const entry = Buffer.alloc(16);
      
      entry.writeUInt8(size === 256 ? 0 : size, 0); // Width (0 means 256)
      entry.writeUInt8(size === 256 ? 0 : size, 1); // Height (0 means 256)
      entry.writeUInt8(0, 2); // Color palette (0 = no palette)
      entry.writeUInt8(0, 3); // Reserved
      entry.writeUInt16LE(1, 4); // Color planes
      entry.writeUInt16LE(32, 6); // Bits per pixel
      entry.writeUInt32LE(imageData.length, 8); // Image data size
      entry.writeUInt32LE(imageDataOffset, 12); // Offset to image data
      
      directoryEntries.push(entry);
      imageDataOffset += imageData.length;
    }
    
    // Combine all parts
    const icoFile = Buffer.concat([
      header,
      ...directoryEntries,
      ...pngBuffers
    ]);
    
    writeFileSync(outputIco, icoFile);
    console.log('✅ Created favicon.ico with sizes:', sizes.join('x'), 'and', sizes[1], 'x', sizes[1]);
    console.log('\n🎉 Favicon generation complete!\n');
    
  } catch (error) {
    console.error('❌ Error creating ICO:', error);
    process.exit(1);
  }
}

createIco();
