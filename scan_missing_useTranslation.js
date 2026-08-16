const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, 'src', 'locales', 'new-keys-added.csv');
const REWIRING_CSV = path.join(__dirname, 'src', 'locales', 'rewiring-todo-existing-keys.csv');
const SRC_ROOT = path.join(__dirname, 'src');

function parseCSV(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/).filter(l => l.trim().length > 0);
  lines.shift();
  const rows = [];
  for (const line of lines) {
    const fields = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') { cur += '"'; i++; }
          else { inQuotes = false; }
        } else { cur += ch; }
      } else {
        if (ch === '"') { inQuotes = true; }
        else if (ch === ',') { fields.push(cur); cur = ''; }
        else { cur += ch; }
      }
    }
    fields.push(cur);
    rows.push(fields);
  }
  return rows;
}

const newKeysRows = parseCSV(CSV_PATH);
const rewiringRows = parseCSV(REWIRING_CSV);

const allFiles = new Set();
for (const [,, fileList] of newKeysRows) {
  for (const f of (fileList || '').split(';').map(s => s.trim()).filter(Boolean)) {
    allFiles.add(f);
  }
}
for (const [,, fileList] of rewiringRows) {
  for (const f of (fileList || '').split(';').map(s => s.trim()).filter(Boolean)) {
    allFiles.add(f);
  }
}

console.log('=== SCANNING ALL FILES REFERENCED IN BOTH CSVs ===\n');
console.log(`Total unique files to check: ${allFiles.size}\n`);

const issues = [];

for (const relPath of [...allFiles].sort()) {
  const absPath = path.join(__dirname, relPath);
  if (!fs.existsSync(absPath)) {
    issues.push({ file: relPath, issue: 'FILE NOT FOUND' });
    continue;
  }
  const content = fs.readFileSync(absPath, 'utf8');

  const hasUseTranslationImport = /from\s+['"](@\/hooks\/useTranslation|..\/..\/context\/TranslationContext)['"]/.test(content)
    || /import\s*\{\s*useTranslation\s*\}\s*from\s*['"]/.test(content);

  const tCalls = [...content.matchAll(/\bt\s*\(\s*['"`]([^'"`]+)['"`]/g)].map(m => m[1]);
  const hasTCalls = tCalls.length > 0;

  const componentFunctions = [...content.matchAll(/^\s*(?:export\s+default\s+)?(?:function\s+([A-Z][A-Za-z0-9_]*)|const\s+([A-Z][A-Za-z0-9_]*)\s*=\s*(?:\([^)]*\)|[A-Za-z_][\w]*)\s*=>)/gm)];
  const componentsWithTBodies = [];
  for (const match of componentFunctions) {
    const name = match[1] || match[2];
    if (!name) continue;
    const nameIdx = content.indexOf(name, match.index);
    const afterName = content.slice(nameIdx + name.length);
    const bodyMatch = afterName.match(/\{/);
    if (bodyMatch) {
      const bodyStart = nameIdx + name.length + bodyMatch.index + 1;
      let depth = 1;
      let i = bodyStart;
      while (i < content.length && depth > 0) {
        if (content[i] === '{') depth++;
        else if (content[i] === '}') depth--;
        i++;
      }
      const body = content.slice(bodyStart, i - 1);
      if (/\bt\s*\(/.test(body)) {
        const hasHook = /const\s*\{\s*t\s*\}\s*=\s*useTranslation\s*\(\s*\)/.test(body);
        componentsWithTBodies.push({ name, hasHook });
      }
    }
  }

  const problemComponents = componentsWithTBodies.filter(c => !c.hasHook);

  if (hasTCalls && !hasUseTranslationImport) {
    issues.push({
      file: relPath,
      issue: 'USES t() BUT NO useTranslation IMPORT',
      details: `t() calls: ${tCalls.length} keys`,
    });
  }

  if (problemComponents.length > 0) {
    issues.push({
      file: relPath,
      issue: `INNER COMPONENT(S) USE t() WITHOUT useTranslation HOOK (like the ProductSlider bug)`,
      details: problemComponents.map(c => `${c.name}`).join(', '),
    });
  }
}

console.log(`\n=== ISSUES FOUND: ${issues.length} ===\n`);
for (let i = 0; i < issues.length; i++) {
  const x = issues[i];
  console.log(`${i + 1}. [${x.issue}]`);
  console.log(`   File: ${x.file}`);
  if (x.details) console.log(`   Details: ${x.details}`);
  console.log();
}

if (issues.length === 0) {
  console.log('No issues found. All files correctly import useTranslation and hook it in every component that calls t().');
}
