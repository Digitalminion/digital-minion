#!/usr/bin/env node

/**
 * Build script for Digital Minion CLI
 *
 * Uses esbuild to bundle and minify the CLI into a single optimized file.
 * This significantly reduces package size and improves startup time.
 */

const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const isProduction = process.env.NODE_ENV === 'production';
const isWatch = process.argv.includes('--watch');

async function build() {
  try {
    console.log('🔨 Building Digital Minion CLI...');
    console.log(`   Mode: ${isProduction ? 'production' : 'development'}`);
    console.log(`   Watch: ${isWatch ? 'yes' : 'no'}`);

    // Clean dist directory
    const distDir = path.join(__dirname, 'dist');
    if (fs.existsSync(distDir)) {
      fs.rmSync(distDir, { recursive: true });
    }
    fs.mkdirSync(distDir, { recursive: true });

    const buildOptions = {
      entryPoints: ['src/index.ts'],
      bundle: true,
      outfile: 'dist/digital-minion-cli.js',
      platform: 'node',
      target: 'node18',
      format: 'cjs',
      minify: isProduction,
      sourcemap: !isProduction,
      // Bundle all dependencies for standalone executable
      external: [],
      logLevel: 'info',
    };

    if (isWatch) {
      const ctx = await esbuild.context(buildOptions);
      await ctx.watch();
      console.log('👀 Watching for changes...');
    } else {
      await esbuild.build(buildOptions);

      // Add shebang and make the output file executable
      const outFile = path.join(__dirname, 'dist', 'digital-minion-cli.js');
      if (fs.existsSync(outFile)) {
        const content = fs.readFileSync(outFile, 'utf8');
        fs.writeFileSync(outFile, '#!/usr/bin/env node\n' + content);
        fs.chmodSync(outFile, 0o755);
      }

      // Copy LICENSE, README.md, and package.json to dist
      const licensePath = path.join(__dirname, 'LICENSE');
      const readmePath = path.join(__dirname, 'README.md');
      const packagePath = path.join(__dirname, 'package.json');

      if (fs.existsSync(licensePath)) {
        fs.copyFileSync(licensePath, path.join(distDir, 'LICENSE'));
      }

      if (fs.existsSync(readmePath)) {
        fs.copyFileSync(readmePath, path.join(distDir, 'README.md'));
      }

      if (fs.existsSync(packagePath)) {
        fs.copyFileSync(packagePath, path.join(distDir, 'package.json'));
      }

      const stats = fs.statSync(outFile);
      const sizeInKB = (stats.size / 1024).toFixed(2);

      console.log('✅ Build complete!');
      console.log(`   Output: dist/digital-minion-cli.js (${sizeInKB} KB)`);
      console.log(`   Minified: ${isProduction ? 'yes' : 'no'}`);
      console.log(`   Copied: LICENSE, README.md, package.json`);
    }
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

build();
