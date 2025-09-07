#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all TypeScript/JavaScript files in src directory
const files = glob.sync('src/**/*.{ts,tsx,js,jsx}', { cwd: process.cwd() });

let fixedCount = 0;

files.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  
  // Fix import statements with extra comma and semicolon
  // Pattern: import { , Component1, Component2 } from 'react-native';;
  content = content.replace(
    /import\s*{\s*,\s*([^}]+)\s*}\s*from\s*['"][^'"]+['"];;/g,
    (match, components) => {
      return `import { ${components.trim()} } from 'react-native';`;
    }
  );
  
  // Fix import statements with just extra semicolon
  // Pattern: import { Component1, Component2 } from 'react-native';;
  content = content.replace(
    /import\s*{\s*([^}]+)\s*}\s*from\s*['"][^'"]+['"];;/g,
    (match, components) => {
      return `import { ${components.trim()} } from 'react-native';`;
    }
  );
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${file}`);
    fixedCount++;
  }
});

console.log(`\n🎉 Fixed ${fixedCount} files with import syntax errors!`);
