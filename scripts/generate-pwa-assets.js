#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * PWA Asset Generator
 * Converts SVG icons and splash screens to PNG format for iOS/Android compatibility
 *
 * Usage: node scripts/generate-pwa-assets.js
 *
 * Requires: sharp (npm install sharp --save-dev)
 */

const fs = require('fs');
const path = require('path');

async function generateAssets() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.error('Error: sharp is not installed.');
    console.error('Please run: npm install sharp --save-dev');
    process.exit(1);
  }

  const publicDir = path.join(__dirname, '..', 'public');

  // Icon conversions
  const iconConversions = [
    { src: 'icon-192x192.svg', dest: 'icon-192x192.png', size: 192 },
    { src: 'icon-512x512.svg', dest: 'icon-512x512.png', size: 512 },
    { src: 'apple-touch-icon.svg', dest: 'apple-touch-icon.png', size: 180 },
    { src: 'icons/chat.svg', dest: 'icons/chat.png', size: 96 },
  ];

  // Splash screen conversions
  const splashConversions = [
    { src: 'splash/iphone5.svg', dest: 'splash/iphone5.png' },
    { src: 'splash/iphone6.svg', dest: 'splash/iphone6.png' },
    { src: 'splash/iphoneplus.svg', dest: 'splash/iphoneplus.png' },
    { src: 'splash/iphonex.svg', dest: 'splash/iphonex.png' },
    { src: 'splash/iphonexr.svg', dest: 'splash/iphonexr.png' },
    { src: 'splash/iphonexsmax.svg', dest: 'splash/iphonexsmax.png' },
    { src: 'splash/ipad.svg', dest: 'splash/ipad.png' },
  ];

  // Screenshot conversions
  const screenshotConversions = [
    { src: 'screenshots/chat-narrow.svg', dest: 'screenshots/chat-narrow.png' },
    { src: 'screenshots/home-narrow.svg', dest: 'screenshots/home-narrow.png' },
  ];

  console.log('Generating PWA assets...\n');

  // Generate icons
  console.log('Converting icons:');
  for (const { src, dest, size } of iconConversions) {
    const srcPath = path.join(publicDir, src);
    const destPath = path.join(publicDir, dest);

    if (!fs.existsSync(srcPath)) {
      console.log(`  Skipping ${src} (not found)`);
      continue;
    }

    try {
      await sharp(srcPath)
        .resize(size, size)
        .png()
        .toFile(destPath);
      console.log(`  ${src} -> ${dest}`);
    } catch (err) {
      console.error(`  Error converting ${src}:`, err.message);
    }
  }

  // Generate splash screens
  console.log('\nConverting splash screens:');
  for (const { src, dest } of splashConversions) {
    const srcPath = path.join(publicDir, src);
    const destPath = path.join(publicDir, dest);

    if (!fs.existsSync(srcPath)) {
      console.log(`  Skipping ${src} (not found)`);
      continue;
    }

    try {
      await sharp(srcPath)
        .png()
        .toFile(destPath);
      console.log(`  ${src} -> ${dest}`);
    } catch (err) {
      console.error(`  Error converting ${src}:`, err.message);
    }
  }

  // Generate screenshots
  console.log('\nConverting screenshots:');
  for (const { src, dest } of screenshotConversions) {
    const srcPath = path.join(publicDir, src);
    const destPath = path.join(publicDir, dest);

    if (!fs.existsSync(srcPath)) {
      console.log(`  Skipping ${src} (not found)`);
      continue;
    }

    try {
      await sharp(srcPath)
        .png()
        .toFile(destPath);
      console.log(`  ${src} -> ${dest}`);
    } catch (err) {
      console.error(`  Error converting ${src}:`, err.message);
    }
  }

  console.log('\nDone! PWA assets generated successfully.');
}

generateAssets().catch(console.error);
