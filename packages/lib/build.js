#!/usr/bin/env node

/**
 * Build script for Digital Minion Library
 *
 * Creates an optimized bundle structure:
 * - backends/asana.js - All Asana implementations
 * - backends/index.js - Factory + core (references asana.js)
 * - digital-minion-lib.js - Main entry (references backends/index.js)
 */

const esbuild = require('esbuild');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const util = require('util');

const execAsync = util.promisify(exec);

const isProduction = process.env.NODE_ENV === 'production';

async function build() {
  try {
    console.log('🔨 Building Digital Minion Library...');
    console.log(`   Mode: ${isProduction ? 'production' : 'development'}`);

    // Clean dist directory
    const distDir = path.join(__dirname, 'dist');
    if (fs.existsSync(distDir)) {
      fs.rmSync(distDir, { recursive: true });
    }
    fs.mkdirSync(distDir, { recursive: true });
    fs.mkdirSync(path.join(distDir, 'backends'), { recursive: true });

    // Step 1: Bundle backends/asana into a single file (including asana SDK)
    console.log('\n📦 Step 1: Bundling Asana backend...');
    await esbuild.build({
      entryPoints: ['src/backends/asana/index.ts'],
      bundle: true,
      outfile: 'dist/backends/asana.js',
      platform: 'node',
      target: 'node18',
      format: 'cjs',
      minify: isProduction,
      sourcemap: !isProduction,
      external: [], // Bundle asana SDK
      logLevel: 'info',
    });
    console.log('   ✓ dist/backends/asana.js created (with asana SDK bundled)');

    // Step 2: Bundle backends/index (factory + core) - references asana.js
    console.log('\n📦 Step 2: Bundling backend factory...');
    await esbuild.build({
      entryPoints: ['src/backends/index.ts'],
      bundle: true,
      outfile: 'dist/backends/index.js',
      platform: 'node',
      target: 'node18',
      format: 'cjs',
      minify: isProduction,
      sourcemap: !isProduction,
      external: ['./asana'], // Only reference local asana.js
      logLevel: 'info',
    });
    console.log('   ✓ dist/backends/index.js created');

    // Step 3: Bundle main entry (client + types) - references backends/index.js
    console.log('\n📦 Step 3: Bundling main library...');
    await esbuild.build({
      entryPoints: ['src/index.ts'],
      bundle: true,
      outfile: 'dist/digital-minion-lib.js',
      platform: 'node',
      target: 'node18',
      format: 'cjs',
      minify: isProduction,
      sourcemap: !isProduction,
      external: ['./backends'], // Only reference local backends/index.js
      logLevel: 'info',
    });
    console.log('   ✓ dist/digital-minion-lib.js created');

    // Step 4: Generate TypeScript declarations
    console.log('\n📝 Step 4: Generating type declarations...');
    try {
      await execAsync('npx tsc --emitDeclarationOnly --outDir dist');

      // Move generated types to match bundle structure
      const typesDir = path.join(distDir);

      // Rename main index.d.ts to digital-minion-lib.d.ts
      if (fs.existsSync(path.join(typesDir, 'index.d.ts'))) {
        fs.renameSync(
          path.join(typesDir, 'index.d.ts'),
          path.join(typesDir, 'digital-minion-lib.d.ts')
        );
        console.log('   ✓ dist/digital-minion-lib.d.ts created');
      }

      // Clean up unnecessary type files (keep only what we need)
      const filesToKeep = [
        'digital-minion-lib.js',
        'digital-minion-lib.d.ts',
        'digital-minion-lib.d.ts.map',
        'digital-minion-lib.js.map',
        'backends',
        'LICENSE',
        'README.md',
        'package.json'
      ];

      const files = fs.readdirSync(typesDir);
      files.forEach(file => {
        const filePath = path.join(typesDir, file);
        const stats = fs.statSync(filePath);

        if (!filesToKeep.includes(file) && !stats.isDirectory()) {
          fs.unlinkSync(filePath);
        }
      });

      console.log('   ✓ Type declarations organized');
    } catch (error) {
      console.warn('   ⚠ Type generation had warnings (non-fatal)');
    }

    // Step 5: Copy metadata files
    console.log('\n📄 Step 5: Copying metadata files...');
    const metaFiles = ['LICENSE', 'README.md', 'package.json'];
    metaFiles.forEach(file => {
      const srcPath = path.join(__dirname, file);
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, path.join(distDir, file));
        console.log(`   ✓ ${file} copied`);
      }
    });

    // Calculate bundle sizes
    const asanaSize = (fs.statSync(path.join(distDir, 'backends', 'asana.js')).size / 1024).toFixed(2);
    const backendSize = (fs.statSync(path.join(distDir, 'backends', 'index.js')).size / 1024).toFixed(2);
    const mainSize = (fs.statSync(path.join(distDir, 'digital-minion-lib.js')).size / 1024).toFixed(2);

    console.log('\n✅ Build complete!');
    console.log('\n📊 Bundle sizes:');
    console.log(`   backends/asana.js:        ${asanaSize} KB`);
    console.log(`   backends/index.js:        ${backendSize} KB`);
    console.log(`   digital-minion-lib.js:    ${mainSize} KB`);
    console.log(`   Minified:                 ${isProduction ? 'yes' : 'no'}`);

    console.log('\n📦 Package structure:');
    console.log('   dist/');
    console.log('   ├── digital-minion-lib.js     (main entry)');
    console.log('   ├── digital-minion-lib.d.ts   (types)');
    console.log('   ├── backends/');
    console.log('   │   ├── asana.js              (Asana implementation)');
    console.log('   │   └── index.js              (factory + core)');
    console.log('   ├── LICENSE');
    console.log('   ├── README.md');
    console.log('   └── package.json');

  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

build();
