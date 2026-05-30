const fs = require('fs');
const path = require('path');

const rootDir = 'C:\\Users\\DELL\\Desktop\\kart';
const resultsPath = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\a0acb0aa-1b71-4413-8691-78d89bb7a765\\scratch\\icon_scan_results.json';

if (!fs.existsSync(resultsPath)) {
  console.error('Scan results not found! Run find_icons.js first.');
  process.exit(1);
}

const { fileIconUsage } = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

const filesToMigrate = Object.keys(fileIconUsage);

console.log(`Starting migration on ${filesToMigrate.length} files...`);

for (const relPath of filesToMigrate) {
  const fullPath = path.join(rootDir, relPath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`File not found: ${fullPath}, skipping...`);
    continue;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let originalContent = content;

  // Let's perform replacements for different syntax combinations

  // 1. Static text icon names with standard double/single quotes in className
  // e.g. <span className="material-symbols-outlined text-xl">home</span>
  const regex1 = /<span\s+([^>]*?)className=(["'])([^"']*?)(?:material-symbols-outlined|material-symbols-rounded)([^"']*?)\2([^>]*?)>\s*([a-zA-Z0-9_]+)\s*<\/span>/g;
  content = content.replace(regex1, (match, beforeClass, quote, classPrefix, classSuffix, afterClass, iconName) => {
    const classes = (classPrefix + classSuffix).trim();
    const otherProps = (beforeClass + ' ' + afterClass).trim();
    const classAttr = classes ? `className="${classes}"` : '';
    const otherAttr = otherProps ? ` ${otherProps}` : '';
    return `<DynamicLucideIcon name="${iconName}"${otherAttr ? otherAttr : ''}${classAttr ? ' ' + classAttr : ''} />`;
  });

  // 2. Dynamic variable icon names with standard double/single quotes in className
  // e.g. <span className="material-symbols-outlined text-xl">{opt.icon}</span>
  const regex2 = /<span\s+([^>]*?)className=(["'])([^"']*?)(?:material-symbols-outlined|material-symbols-rounded)([^"']*?)\2([^>]*?)>\s*\{([^}]+?)\}\s*<\/span>/g;
  content = content.replace(regex2, (match, beforeClass, quote, classPrefix, classSuffix, afterClass, varName) => {
    const classes = (classPrefix + classSuffix).trim();
    const otherProps = (beforeClass + ' ' + afterClass).trim();
    const classAttr = classes ? `className="${classes}"` : '';
    const otherAttr = otherProps ? ` ${otherProps}` : '';
    return `<DynamicLucideIcon name={${varName.trim()}}${otherAttr ? otherAttr : ''}${classAttr ? ' ' + classAttr : ''} />`;
  });

  // 3. Static text icon names with template literal className
  // e.g. <span className={`material-symbols-outlined ${isActive ? 'active' : ''}`}>home</span>
  const regex3 = /<span\s+([^>]*?)className=\{\`([^`]*?)(?:material-symbols-outlined|material-symbols-rounded)([^`]*?)\`\}([^>]*?)>\s*([a-zA-Z0-9_]+)\s*<\/span>/g;
  content = content.replace(regex3, (match, beforeClass, classPrefix, classSuffix, afterClass, iconName) => {
    const classes = (classPrefix + classSuffix).trim();
    const otherProps = (beforeClass + ' ' + afterClass).trim();
    const classAttr = classes ? `className={\`${classes}\`}` : '';
    const otherAttr = otherProps ? ` ${otherProps}` : '';
    return `<DynamicLucideIcon name="${iconName}"${otherAttr ? otherAttr : ''}${classAttr ? ' ' + classAttr : ''} />`;
  });

  // 4. Dynamic variable icon names with template literal className
  // e.g. <span className={`material-symbols-outlined ${isActive ? 'active' : ''}`}>{opt.icon}</span>
  const regex4 = /<span\s+([^>]*?)className=\{\`([^`]*?)(?:material-symbols-outlined|material-symbols-rounded)([^`]*?)\`\}([^>]*?)>\s*\{([^}]+?)\}\s*<\/span>/g;
  content = content.replace(regex4, (match, beforeClass, classPrefix, classSuffix, afterClass, varName) => {
    const classes = (classPrefix + classSuffix).trim();
    const otherProps = (beforeClass + ' ' + afterClass).trim();
    const classAttr = classes ? `className={\`${classes}\`}` : '';
    const otherAttr = otherProps ? ` ${otherProps}` : '';
    return `<DynamicLucideIcon name={${varName.trim()}}${otherAttr ? otherAttr : ''}${classAttr ? ' ' + classAttr : ''} />`;
  });

  // 5. Spans spanning multiple lines (newline in tags)
  // Let's do a more generic search for span attributes and inner text/variables.
  // This helps match the cases where the span is broken down on multiple lines.
  const regexMultiLine = /<span\s+([^>]*?)(?:material-symbols-outlined|material-symbols-rounded)([^>]*?)>\s*(?:([a-zA-Z0-9_]+)|\{([^}]+)\})\s*<\/span>/gs;
  content = content.replace(regexMultiLine, (match, before, after, iconName, varName) => {
    // Reconstruct className and other props
    const fullProps = (before + ' ' + after).replace(/\s+/g, ' ').trim();
    
    // Extract className if present
    let classNameVal = '';
    let cleanProps = fullProps;
    const classMatch = fullProps.match(/className=(?:(["'])(.*?)\1|\{\`(.*?)\`\}|\{(.*?)\})/);
    if (classMatch) {
      const matchedClass = classMatch[2] || classMatch[3] || classMatch[4] || '';
      // Remove material-symbols-outlined/rounded
      const cleanClass = matchedClass.replace(/material-symbols-(?:outlined|rounded)/g, '').trim().replace(/\s+/g, ' ');
      
      // Re-serialize className based on style
      if (classMatch[0].includes('`')) {
        classNameVal = `className={\`${cleanClass}\`}`;
      } else if (classMatch[0].includes('{')) {
        classNameVal = `className={${cleanClass}}`;
      } else {
        classNameVal = `className="${cleanClass}"`;
      }
      
      // Remove className from cleanProps to prevent duplicates
      cleanProps = fullProps.replace(/className=(?:(["'])(.*?)\1|\{\`(.*?)\`\}|\{(.*?)\})/, '').trim();
    }

    const cleanPropsAttr = cleanProps ? ` ${cleanProps}` : '';
    const classAttr = classNameVal ? ` ${classNameVal}` : '';
    const nameAttr = iconName ? `name="${iconName}"` : `name={${varName.trim()}}`;

    return `<DynamicLucideIcon ${nameAttr}${cleanPropsAttr}${classAttr} />`;
  });

  // Check if content was actually modified
  if (content !== originalContent) {
    // Insert import statement for DynamicLucideIcon
    if (!content.includes('DynamicLucideIcon') && !relPath.includes('DynamicLucideIcon')) {
      const importStmt = "import DynamicLucideIcon from '@/components/DynamicLucideIcon';\n";
      
      // Find position to insert (after use client or at the top)
      const useClientMatch = content.match(/^['"]use client['"];?\s*/i);
      if (useClientMatch) {
        const insertPos = useClientMatch[0].length;
        content = content.slice(0, insertPos) + importStmt + content.slice(insertPos);
      } else {
        content = importStmt + content;
      }
    }

    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Successfully migrated: ${relPath}`);
  } else {
    console.log(`No changes made to: ${relPath}`);
  }
}

console.log('Migration completed!');
