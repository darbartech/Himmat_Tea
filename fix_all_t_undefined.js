const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = __dirname;

const tscOutput = execSync(
  `node node_modules/typescript/bin/tsc --noEmit --project tsconfig.json 2>&1`,
  { encoding: 'utf8', cwd: PROJECT_ROOT, maxBuffer: 20 * 1024 * 1024 }
);

const tErrorFiles = new Set();
for (const line of tscOutput.split(/\r?\n/)) {
  const m = line.match(/^([^(]+)\(\d+,\d+\): error TS2304: Cannot find name 't'/);
  if (m) {
    const rel = m[1].replace(/\\/g, '/').trim();
    tErrorFiles.add(rel);
  }
}

console.log(`Found ${tErrorFiles.size} UNIQUE files with "Cannot find name 't'":`);
for (const f of [...tErrorFiles].sort()) console.log(`  - ${f}`);
console.log();

const HOOK_IMPORT_CANON = `import { useTranslation } from '@/hooks/useTranslation';`;

let fixedCount = 0;
let skippedCount = 0;

for (const rel of [...tErrorFiles].sort()) {
  const abs = path.join(PROJECT_ROOT, rel);
  if (!fs.existsSync(abs)) { console.log(`  SKIP not found: ${rel}`); skippedCount++; continue; }
  let content = fs.readFileSync(abs, 'utf8');

  const origContent = content;

  let alreadyHasHook = /import\s*\{\s*useTranslation\s*\}\s*from\s*['"][^'"]+['"];?/.test(content);
  if (!alreadyHasHook) {
    const anyImportMatch = content.match(/^(import\s+['"][^'"]+['"];?)/m);
    if (anyImportMatch) {
      content = content.slice(0, anyImportMatch.index + anyImportMatch[0].length)
        + '\n' + HOOK_IMPORT_CANON + '\n'
        + content.slice(anyImportMatch.index + anyImportMatch[0].length);
    } else {
      const directive = content.match(/^(['"]use client['"];?\s*)/);
      if (directive) {
        content = directive[0] + '\n' + HOOK_IMPORT_CANON + '\n' + content.slice(directive[0].length);
      } else {
        content = HOOK_IMPORT_CANON + '\n' + content;
      }
    }
  }

  const hasClientDir = /^\s*['"]use client['"]\s*;?/m.test(content);
  if (!hasClientDir) {
    const firstImp = content.match(/^import /m);
    if (firstImp) {
      content = "'use client';\n\n" + content.slice(firstImp.index);
    } else {
      content = "'use client';\n\n" + content;
    }
  }

  const topLevelExportDefFunc = /(export\s+default\s+function\s+([A-Z][A-Za-z0-9_]*)\s*\([^)]*\)\s*\{)/;
  const topLevelExportConstFunc = /(export\s+default\s+(?:function\s+)?(?:const|let|var)\s+([A-Z][A-Za-z0-9_]*)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>\s*\{)/;
  const topLevelNamedDefFunc = /(^\s*function\s+([A-Z][A-Za-z0-9_]*)\s*\([^)]*\)\s*\{)/m;
  const topLevelNamedConstFunc = /(^\s*(?:const|let|var)\s+([A-Z][A-Za-z0-9_]*)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>\s*\{)/m;

  const patterns = [topLevelExportDefFunc, topLevelExportConstFunc, topLevelNamedDefFunc, topLevelNamedConstFunc];

  function bodyHasTBraceInsert(body) {
    if (/\bconst\s*\{\s*t\s*\}\s*=\s*useTranslation\s*\(\s*\)/.test(body)) {
      return { changed: false, newBody: body };
    }
    const firstLine = body.match(/^\s*\{/);
    if (firstLine) {
      return { changed: true, newBody: '{\n  const { t } = useTranslation();\n' + body.slice(firstLine[0].length) };
    }
    return { changed: true, newBody: '\n  const { t } = useTranslation();\n' + body };
  }

  let anyMatched = false;
  for (const pat of patterns) {
    const mm = content.match(pat);
    if (!mm) continue;
    anyMatched = true;
    const signature = mm[0];
    const bodyStartIdx = mm.index + signature.length;
    const openBraceIdx = content.indexOf('{', mm.index + signature.length - 1);
    const afterSig = content.slice(mm.index + signature.length);
    const firstOpen = afterSig.indexOf('{');
    if (firstOpen === -1) continue;
    let i = mm.index + signature.length + firstOpen;
    let depth = 0;
    do {
      const ch = content[i];
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      i++;
    } while (i < content.length && depth > 0);
    const bodyEnd = i;
    const braceStart = mm.index + signature.length + firstOpen;
    let body = content.slice(braceStart, bodyEnd);
    const result = bodyHasTBraceInsert(body);
    if (!result.changed) break;
    content = content.slice(0, braceStart) + result.newBody + content.slice(bodyEnd);
    break;
  }

  if (!anyMatched) {
    console.log(`  SKIP (no component pattern matched to inject hook): ${rel}`);
    skippedCount++;
    continue;
  }

  if (content === origContent) {
    console.log(`  NO-CHANGE (already had import+hook): ${rel}`);
    skippedCount++;
    continue;
  }

  fs.writeFileSync(abs, content, 'utf8');
  fixedCount++;
  console.log(`  ✅ FIXED: ${rel}`);
}

console.log(`\n=== SUMMARY ===`);
console.log(`Files fixed: ${fixedCount}`);
console.log(`Files skipped/no-change: ${skippedCount}`);
