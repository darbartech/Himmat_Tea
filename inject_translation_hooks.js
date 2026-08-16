const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = 'd:/Projects/Himmat_Tea';
const SRC = path.join(PROJECT_ROOT, 'src');
const enPath = path.join(SRC, 'locales', 'en.json');
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

let serverCompsFixed = 0;
let clientCompsInjected = 0;

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

function isClientFile(code, filePath) {
  if (code.includes("'use client'") || code.includes('"use client"')) return true;
  if (/export\s+default\s+async\s+function/.test(code)) return false;
  if (/from\s+['"]next\/headers['"]/.test(code)) return false;
  if (/\buse(?:State|Effect|Context|Ref|Memo|Callback|Translation|Router|Params|SearchParams)\s*\(/.test(code)) return true;
  if (filePath.endsWith('.tsx')) return true;
  return false;
}

function ensureImport(code, impPath) {
  if (/\bimport\s*\{\s*[^}]*\buseTranslation\b[^}]*\s*\}\s*from\s*['"][^'"]+Translation/.test(code)) return code;
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

function ensureDestructureHook(code) {
  if (/const\s*\{\s*[^}]*\bt\b[^}]*\s*\}\s*=\s*useTranslation\s*\(/.test(code)) return code;
  const m = code.match(/export\s+default\s+function\s+[A-Z]\w*\s*\([^)]*\)\s*\{/);
  if (!m) return code;
  const insertPos = m.index + m[0].length;
  const before = code.slice(0, insertPos);
  const after = code.slice(insertPos);
  return before + '\n  const { t } = useTranslation();' + after;
}

function replaceTWithEnStrs(code) {
  return code.replace(/\bt\(\s*['"]([^'"]+)['"]\s*\)/g, (match, key) => {
    const val = en[key];
    if (typeof val === 'string') return JSON.stringify(val);
    return match;
  });
}

for (const file of walk(SRC)) {
  try {
    let code = fs.readFileSync(file, 'utf8');
    if (!/\bt\(\s*['"][^'"]+['"]\s*\)/.test(code)) continue;

    if (!isClientFile(code, file)) {
      const newCode = replaceTWithEnStrs(code);
      if (newCode !== code) {
        fs.writeFileSync(file, newCode);
        console.log('[SERVER] Replaced t() -> en literal:', path.relative(PROJECT_ROOT, file));
        serverCompsFixed++;
      }
    } else {
      let newCode = ensureImport(code, relativePathToHook(file));
      newCode = ensureDestructureHook(newCode);
      if (newCode !== code) {
        fs.writeFileSync(file, newCode);
        console.log('[CLIENT] Injected import+destructure:', path.relative(PROJECT_ROOT, file));
        clientCompsInjected++;
      }
    }
  } catch (err) {
    console.error('ERROR on', file, ':', err.message);
  }
}

console.log('\nDone. Server comps fixed:', serverCompsFixed, '| Client comps injected:', clientCompsInjected);
