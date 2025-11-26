const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = __dirname;

function getAllCodeFiles(dir, extensions = ['.ts', '.tsx', '.js', '.jsx', '.css', '.html']) {
  const files = [];
  
  function traverse(currentPath) {
    const items = fs.readdirSync(currentPath);
    
    for (const item of items) {
      if (item === 'node_modules' || item === '.git' || item === 'dist' || item === 'build') {
        continue;
      }
      
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (stat.isFile()) {
        const ext = path.extname(item);
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }
  
  traverse(dir);
  return files;
}

function removeComments(content, filePath) {
  const ext = path.extname(filePath);
  let result = content;
  
  if (ext === '.html') {
    result = result.replace(/<!--[\s\S]*?-->/g, '');
  } else if (ext === '.css') {
    result = result.replace(/\/\*[\s\S]*?\*\//g, '');
    result = result.replace(/\/\/.*$/gm, '');
  } else if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
    result = result
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    
    result = result.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
  }
  
  return result;
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const newContent = removeComments(content, filePath);
    
    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`✓ Processed: ${path.relative(projectRoot, filePath)}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
    return false;
  }
}

console.log('Starting comment removal...\n');

const codeFiles = [
  ...getAllCodeFiles(path.join(projectRoot, 'client'), ['.ts', '.tsx', '.js', '.jsx', '.html']),
  ...getAllCodeFiles(path.join(projectRoot, 'server'), ['.ts', '.js']),
  ...getAllCodeFiles(path.join(projectRoot, 'shared'), ['.ts']),
  path.join(projectRoot, 'client', 'index.html'),
  path.join(projectRoot, 'client', 'src', 'index.css'),
];

let processed = 0;
for (const file of codeFiles) {
  if (fs.existsSync(file)) {
    if (processFile(file)) {
      processed++;
    }
  }
}

console.log(`\nCompleted! Processed ${processed} files.`);

