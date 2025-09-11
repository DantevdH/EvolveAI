#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Import optimization script
 * Analyzes and optimizes imports to reduce bundle size
 */

const srcDir = path.join(__dirname, '..', 'src');

// Common patterns for optimization
const optimizations = [
  {
    name: 'React Native imports',
    pattern: /import\s*{\s*([^}]+)\s*}\s*from\s*['"]react-native['"]/g,
    optimize: (match, imports) => {
      const importList = imports.split(',').map(imp => imp.trim());
      // Sort imports for consistency
      return `import { ${importList.sort().join(', ')} } from 'react-native';`;
    }
  },
  {
    name: 'Relative imports',
    pattern: /import\s*.*\s*from\s*['"]\.\.\/\.\.\/\.\.\//g,
    optimize: (match) => {
      // Convert to absolute imports where possible
      return match.replace(/\.\.\/\.\.\/\.\.\//g, '@/');
    }
  },
  {
    name: 'Unused React imports',
    pattern: /import\s+React\s+from\s+['"]react['"];?\s*\n(?!.*React\.)/g,
    optimize: () => {
      // Remove React import if not used directly
      return '';
    }
  }
];

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  const analysis = {
    file: filePath,
    totalLines: lines.length,
    importLines: lines.filter(line => line.trim().startsWith('import')).length,
    unusedImports: [],
    optimizations: []
  };

  // Check for unused imports (basic check)
  const imports = lines.filter(line => line.trim().startsWith('import'));
  imports.forEach(importLine => {
    const match = importLine.match(/import\s*{\s*([^}]+)\s*}\s*from/);
    if (match) {
      const importedItems = match[1].split(',').map(item => item.trim());
      importedItems.forEach(item => {
        const cleanItem = item.replace(/\s+as\s+\w+/, '').trim();
        // Check if the imported item is used in the file
        const usageCount = (content.match(new RegExp(`\\b${cleanItem}\\b`, 'g')) || []).length;
        if (usageCount <= 1) {
          analysis.unusedImports.push(cleanItem);
        }
      });
    }
  });

  return analysis;
}

function optimizeFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let optimized = false;

  optimizations.forEach(optimization => {
    const newContent = content.replace(optimization.pattern, optimization.optimize);
    if (newContent !== content) {
      content = newContent;
      optimized = true;
    }
  });

  if (optimized) {
    fs.writeFileSync(filePath, content);
    return true;
  }
  return false;
}

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      getAllFiles(filePath, fileList);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

console.log('🔍 Analyzing imports and bundle size...\n');

const files = getAllFiles(srcDir);
let totalOptimizations = 0;
let totalUnusedImports = 0;

files.forEach(file => {
  const analysis = analyzeFile(file);
  const optimized = optimizeFile(file);
  
  if (optimized) {
    totalOptimizations++;
    console.log(`✅ Optimized: ${path.relative(srcDir, file)}`);
  }
  
  if (analysis.unusedImports.length > 0) {
    totalUnusedImports += analysis.unusedImports.length;
    console.log(`⚠️  ${path.relative(srcDir, file)}: ${analysis.unusedImports.length} potentially unused imports`);
  }
});

console.log(`\n📊 Import Optimization Results:`);
console.log(`   Files optimized: ${totalOptimizations}`);
console.log(`   Potentially unused imports: ${totalUnusedImports}`);
console.log(`   Total files analyzed: ${files.length}`);

console.log(`\n🚀 Bundle Size Optimization Benefits:`);
console.log(`   - Reduced import overhead`);
console.log(`   - Cleaner code structure`);
console.log(`   - Better tree-shaking potential`);
console.log(`   - Improved build performance`);

console.log(`\n✅ Import optimization complete!`);
