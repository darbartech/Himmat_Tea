const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = 'd:/Projects/Himmat_Tea';
const SRC = path.join(PROJECT_ROOT, 'src');
const enPath = path.join(SRC, 'locales', 'en.json');
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (['node_modules', '.next', '.git'].includes(ent.name)) continue;
      walk(full, out);
    } else if (/\.(tsx|ts)$/.test(ent.name)) {
        out.push(full);
      }
  }
  return out;
}

function relativePathToHook(file) {
  const rel = path.relative(path.dirname(file), path.join(SRC, 'hooks', 'useTranslation.ts'));
  let p = rel.replace(/\\/g, '/').replace(/\.ts$/, '');
  if (!p.startsWith('.')) p = './' + p;
  return p;
}

function hasTCall(code) {
  return /\bt\(\s*['"][^'"]+['"]\s*\)/.test(code);
}

function isClientFile(code) {
  if (code.includes("'use client'") || code.includes('"use client"')) return true;
  if (/export\s+default\s+async\s+function/.test(code)) return false;
  if (/from\s+['"]next\/headers['"]/.test(code)) return false;
  if (/\buse(?:State|Effect|Context|Ref|Memo|Callback|Translation|Router|Params|SearchParams)\s*\(/.test(code)) return true;
  if (/\bexport\s+(default\s+)?function\s+[A-Z]\w*\s*\(/.test(code)) return true;
  return false;
}

function hasUseTranslationImport(code) {
  return /\bimport\s*\{\s*[^}]*\buseTranslation\b[^}]*\s*\}\s*from\s*['"][^'"]+['"]\s*;?/.test(code);
}

function hasUseTranslationDestructure(code) {
  return /const\s*\{\s*[^}]*\bt\b[^}]*\s*\}\s*=\s*useTranslation\s*\(/.test(code);
}

function addImport(code, impPath) {
  if (hasUseTranslationImport(code)) return code;
  const lines = code.split('\n');
  let lastImportIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*import\s/.test(lines[i])) lastImportIdx = i;
  }
  const toInsert = `import { useTranslation } from '${impPath}';`;
  if (lastImportIdx === -1) {
    return toInsert + '\n' + code;
  }
  lines.splice(lastImportIdx + 1, 0, toInsert);
  return lines.join('\n');
}

function addDestructure(code) {
  if (hasUseTranslationDestructure(code)) return code;
  const patterns = [
    /export\s+default\s+function\s+([A-Z]\w*)\s*\([^)]*\)\s*\{/,
    /export\s+function\s+([A-Z]\w*)\s*\([^)]*\)\s*\{/,
    /function\s+([A-Z]\w*)\s*\([^)]*\)\s*\{/,
    /export\s+default\s+function\s*\([^)]*\)\s*\{/,
  ];
  for (const regex of patterns) {
    const m = code.match(regex);
    if (m) {
      const insertPos = m.index + m[0].length;
      console.log('  -> Matched pattern:', m[0].slice(0, 80), 'at pos', m.index);
      return code.slice(0, insertPos) + '\n  const { t } = useTranslation();' + code.slice(insertPos);
    }
  }
  console.log('  -> NO FUNCTION PATTERN MATCHED');
  return code;
}

function replaceTWithEn(code) {
  return code.replace(/\bt\(\s*['"]([^'"]+)['"]\s*\)/g, (match, key) => {
    const val = en[key];
    if (typeof val === 'string') return JSON.stringify(val);
    console.log('  -> No en value for key:', key);
    return match;
  });
}

let serverFixed = 0, clientInjected = 0, skipped = 0;

for (const file of walk(SRC)) {
  try {
    let code = fs.readFileSync(file, 'utf8');
    if (!hasTCall(code)) continue;

    const rel = path.relative(PROJECT_ROOT, file);

    if (!isClientFile(code)) {
      const newCode = replaceTWithEn(code);
      if (newCode !== code) {
        fs.writeFileSync(file, newCode);
        console.log('[SERVER FIX]', rel);
        serverFixed++;
      } else {
        console.log('[SERVER SKIP - no replacements]', rel);
      }
    } else {
      const beforeImport = code;
      let newCode = addImport(code, relativePathToHook(file));
      let importAdded = newCode !== beforeImport;

      const beforeDest = newCode;
      newCode = addDestructure(newCode);
      let destAdded = newCode !== beforeDest;

      if (importAdded || destAdded) {
        fs.writeFileSync(file, newCode);
        console.log('[CLIENT INJECT]', rel, `(import:${importAdded}, dest:${destAdded})`);
        clientInjected++;
      } else {
        console.log('[CLIENT SKIP - already has both]', rel);
        skipped++;
      }
    }
  } catch (e) {
    console.error('ERROR', file, ':', e.message);
  }
}

console.log('\n=== Summary ===');
console.log('Server comps fixed:', serverFixed);
console.log('Client comps injected:', clientInjected);
console.log('Client already OK:', skipped);
