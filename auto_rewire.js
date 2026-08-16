const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const plan = JSON.parse(fs.readFileSync(path.join(ROOT, 'rewire_plan.json'), 'utf8'));

function relImport(targetFile, importPath) {
  const targetDir = path.dirname(path.join(ROOT, targetFile));
  const absImport = path.join(ROOT, importPath);
  let rel = path.relative(targetDir, absImport).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel.replace(/\/TranslationContext$/, '/TranslationContext');
}

const TRANSLATION_IMPORT = "import { useTranslation } from 'RELPATH';";

function ensureImportAndHook(content, targetFile) {
  const relPath = relImport(targetFile, 'src/context/TranslationContext.tsx').replace(/\.tsx$/, '');
  const importLine = TRANSLATION_IMPORT.replace('RELPATH', relPath);
  
  let modified = false;
  if (!content.includes("useTranslation") && !content.includes("TranslationContext")) {
    const lastImportEnd = [...content.matchAll(/^import\s+.*?;\s*$/gm)].pop();
    if (lastImportEnd) {
      content = content.slice(0, lastImportEnd.index + lastImportEnd[0].length) + 
        '\n' + importLine + 
        content.slice(lastImportEnd.index + lastImportEnd[0].length);
      modified = true;
    }
  }
  
  if (!content.includes('useTranslation()')) {
    const hooks = [
      { pattern: /(function\s+\w+Component\s*\([^)]*\)\s*\{)/, type: 'fn' },
      { pattern: /(const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*\{)/, type: 'arrow' },
      { pattern: /(export\s+default\s+function\s+\w+\s*\([^)]*\)\s*\{)/, type: 'exportfn' },
      { pattern: /(export\s+default\s+\([^)]*\)\s*=>\s*\{)/, type: 'exportarrow' },
    ];
    
    for (const h of hooks) {
      const m = content.match(h.pattern);
      if (m) {
        const insertAt = m.index + m[0].length;
        const indentMatch = content.slice(0, m.index).match(/(?:^|\n)([ \t]*)$/);
        const indent = (indentMatch ? indentMatch[1] : '') + '  ';
        const hookLine = '\n' + indent + 'const { t } = useTranslation();\n';
        content = content.slice(0, insertAt) + hookLine + content.slice(insertAt);
        modified = true;
        break;
      }
    }
  }
  
  return { content, modified };
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function applyReplacements(content, fileItems) {
  const report = [];
  for (const it of fileItems) {
    const text = it.text;
    const key = it.bucket === 'B' ? it.key : it.keys[0];
    const tCall = `t('${key}')`;
    const reText = escapeRegex(text);
    
    // Pattern 1: JSX text content: >Text<  or  children between tags
    // Match:  >Hardcoded<
    const textRe = new RegExp(`>(${reText})<`, 'g');
    let matched = false;
    if (textRe.test(content)) {
      content = content.replace(textRe, `>{${tCall}}<`);
      matched = true;
    }
    
    // Pattern 2: HTML/JSX attributes: attr="Hardcoded Text"  
    const attrs = ['placeholder', 'aria-label', 'title', 'alt'];
    for (const attr of attrs) {
      const attrRe = new RegExp(`(${attr}=)"(${reText})"`, 'g');
      if (attrRe.test(content)) {
        content = content.replace(attrRe, `$1={${tCall}}`);
        matched = true;
      }
    }
    
    // Pattern 3: <option value="x">Hardcoded</option> — already covered by pattern 1
    // Pattern 4: standalone string in JS context (less common, more risky)
    if (!matched) {
      // Try exact string assignment or bare return: 'text' or "text" standalone
      const standaloneRe = new RegExp(`(['"])(${reText})\\1`, 'g');
      const lines = content.split('\n');
      let sm = false;
      const newLines = lines.map(line => {
        if (/<[^>]*>/.test(line)) return line; // Skip lines with JSX tags — pattern 1 handles
        if (standaloneRe.test(line)) {
          const after = line.replace(standaloneRe, (m, q, t) => {
            if (t !== text) return m;
            return tCall;
          });
          if (after !== line) { sm = true; return after; }
        }
        return line;
      });
      if (sm) { content = newLines.join('\n'); matched = true; }
    }
    
    if (matched) {
      report.push(`  OK  [${it.bucket}] "${text}" -> ${key}`);
    } else {
      report.push(`  MISS[${it.bucket}] "${text}" -> ${key}`);
    }
  }
  return { content, report };
}

let totalFiles = 0, totalReplaced = 0, totalMissed = 0;

const missLog = [];

for (const f of plan.files) {
  const filePath = path.join(ROOT, f.file);
  if (!fs.existsSync(filePath)) {
    console.log(`\n[SKIP MISSING] ${f.file}`);
    continue;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  
  const { content: afterImport } = ensureImportAndHook(content, f.file);
  content = afterImport;
  
  const { content: afterRepl, report } = applyReplacements(content, f.items);
  
  let fileReplaced = 0, fileMissed = 0;
  for (const r of report) {
    if (r.includes('  OK')) fileReplaced++;
    else fileMissed++;
  }
  
  totalReplaced += fileReplaced;
  totalMissed += fileMissed;
  
  if (fileReplaced > 0 || content !== afterRepl) {
    fs.writeFileSync(filePath, afterRepl, 'utf8');
    totalFiles++;
    console.log(`\n[${f.file}]  +${fileReplaced} ok, ${fileMissed} miss`);
    for (const r of report) if (r.includes('MISS')) console.log(r);
  } else {
    console.log(`\n[${f.file}]  no replacements applied`);
    for (const r of report) console.log(r);
  }
  
  for (const r of report) if (r.includes('MISS')) missLog.push({ file: f.file, msg: r.slice(2) });
}

console.log(`\n\n=== SUMMARY ===`);
console.log(`Files written: ${totalFiles}`);
console.log(`Replacements OK: ${totalReplaced}`);
console.log(`Replacements MISSED: ${totalMissed}`);

if (missLog.length > 0) {
  console.log(`\n=== MISSED LIST (${missLog.length}) ===`);
  for (const m of missLog) console.log(`${m.file}:  ${m.msg}`);
}
