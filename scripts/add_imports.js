const fs = require('fs');
const path = require('path');

const rootDir = 'C:\\Users\\DELL\\Desktop\\kart';
const excludeDirs = ['.next', '.git', 'node_modules', 'out', 'android', 'ios'];

function addImports(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (excludeDirs.some(exclude => fullPath.includes(path.sep + exclude + path.sep) || fullPath.endsWith(path.sep + exclude) || file === exclude)) {
      continue;
    }

    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      addImports(fullPath);
    } else if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx'))) {
      if (file === 'DynamicLucideIcon.js' || file === 'add_imports.js' || file === 'migrate_files.js') continue;
      
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('DynamicLucideIcon') && !content.includes('import DynamicLucideIcon')) {
        const importStmt = "import DynamicLucideIcon from '@/components/DynamicLucideIcon';\n";
        
        // Find position to insert (after use client or at the top)
        const useClientMatch = content.match(/^['"]use client['"];?\s*/i);
        if (useClientMatch) {
          const insertPos = useClientMatch[0].length;
          content = content.slice(0, insertPos) + importStmt + content.slice(insertPos);
        } else {
          content = importStmt + content;
        }
        
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Added import to: ${fullPath.replace(rootDir + path.sep, '').replace(/\\/g, '/')}`);
      }
    }
  }
}

addImports(rootDir);
console.log('Finished adding imports!');
