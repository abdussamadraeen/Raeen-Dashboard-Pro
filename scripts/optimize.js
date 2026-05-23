import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const JS_DIR = path.resolve('public/js');
const CSS_FILE = path.resolve('public/style.css');

console.log('🚀 Starting premium in-place compression and V8 micro-optimizations...');

// 1. Minify and Optimize CSS
try {
  console.log(`\n🎨 Compressing and optimizing stylesheet: ${CSS_FILE}`);
  const esbuildPath = path.resolve('node_modules/.bin/esbuild');
  const cmd = `"${esbuildPath}" "${CSS_FILE}" --minify --outfile="${CSS_FILE}" --allow-overwrite`;
  execSync(cmd, { stdio: 'inherit' });
  console.log('✓ CSS optimized successfully.');
} catch (e) {
  console.error('❌ CSS compression failed:', e);
}

// 2. Minify and Optimize ES6 Javascript Modules
try {
  const files = fs.readdirSync(JS_DIR).filter(file => file.endsWith('.js'));
  console.log(`\n⚡ Compressing and V8-optimizing ${files.length} JavaScript ES6 modules in-place...`);
  
  const esbuildPath = path.resolve('node_modules/.bin/esbuild');

  for (const file of files) {
    const filePath = path.join(JS_DIR, file);
    const sizeBefore = fs.statSync(filePath).size;
    
    // Command to minify ES6 module in-place
    const cmd = `"${esbuildPath}" "${filePath}" --minify --format=esm --outfile="${filePath}" --allow-overwrite`;
    execSync(cmd, { stdio: 'ignore' });
    
    const sizeAfter = fs.statSync(filePath).size;
    const ratio = ((1 - sizeAfter / sizeBefore) * 100).toFixed(1);
    console.log(`  └─ ${file.padEnd(16)} : ${(sizeBefore / 1024).toFixed(2)} kB -> ${(sizeAfter / 1024).toFixed(2)} kB (-${ratio}%)`);
  }
  console.log('\n✓ JavaScript modules micro-optimized successfully.');
} catch (e) {
  console.error('❌ JavaScript module compression failed:', e);
}

// 3. Minify and Optimize JSON Assets
try {
  const jsonFiles = [
    path.resolve('public/extracted_apps.json'),
    path.resolve('public/rules.json')
  ];
  console.log(`\n📦 Minifying and optimizing ${jsonFiles.length} JSON data assets...`);
  
  for (const filePath of jsonFiles) {
    if (fs.existsSync(filePath)) {
      const sizeBefore = fs.statSync(filePath).size;
      const content = fs.readFileSync(filePath, 'utf8');
      // Zero-whitespace JSON stringification
      const minified = JSON.stringify(JSON.parse(content));
      fs.writeFileSync(filePath, minified, 'utf8');
      
      const sizeAfter = fs.statSync(filePath).size;
      const ratio = ((1 - sizeAfter / sizeBefore) * 100).toFixed(1);
      console.log(`  └─ ${path.basename(filePath).padEnd(24)} : ${(sizeBefore / 1024).toFixed(2)} kB -> ${(sizeAfter / 1024).toFixed(2)} kB (-${ratio}%)`);
    }
  }
  console.log('✓ JSON assets optimized successfully.');
} catch (e) {
  console.error('❌ JSON minification failed:', e);
}

console.log('\n🎉 Compression and execution optimization cycle complete!');
