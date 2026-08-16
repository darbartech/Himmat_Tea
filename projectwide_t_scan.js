const fs = require('fs');
const path = require('path');

const SRC_ROOT = path.join(__dirname, 'src');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(tsx|ts|jsx|js)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const allTsxFiles = walk(SRC_ROOT);
console.log(`Scanning ${allTsxFiles.length} .tsx/.ts/.jsx/.js files...\n`);

const problems = [];
for (const file of allTsxFiles) {
  const rel = path.relative(__dirname, file).replace(/\\/g, '/');
  const content = fs.readFileSync(file, 'utf8');
  const hasImport = /(import\s*\{\s*useTranslation\s*\}|from\s+['"](@\/hooks\/useTranslation|.*context\/TranslationContext)['"])/.test(content);
  const usesTLiteral = /\bt\s*\(\s*['"`][^'"`]+['"`]/.test(content);
  if (usesTLiteral && !hasImport) {
    const matches = [...content.matchAll(/\bt\s*\(\s*['"`][^'"`]+['"`]/g)].slice(0, 5).map(m => m[0]);
    problems.push({ file: rel, examples: matches });
  }
}

if (problems.length === 0) {
  console.log('✅ ALL CLEAR: Every file that calls t("...") imports useTranslation.');
} else {
  console.log(`❌ ${problems.length} FILES CALL t() WITHOUT IMPORTING useTranslation:\n`);
  for (const p of problems) {
    console.log(`${p.file}`);
    console.log(`  Examples: ${p.examples.join(', ')}`);
    console.log();
  }
  process.exitCode = 1;
}
