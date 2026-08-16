const fs = require('fs');
const path = require('path');

// Fix 1: Replace all =={t( patterns with ={t(
const searchDir = path.join(__dirname, 'src');
let filesFixed = 0;
let instancesFixed = 0;

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fp = path.join(dir, entry.name);
    if (entry.isDirectory()) walkDir(fp);
    else if (/\.(tsx|ts|jsx|js)$/.test(entry.name)) {
      let content = fs.readFileSync(fp, 'utf8');
      const re = /==(\{t\(['"`])/g;
      if (re.test(content)) {
        const matches = content.match(re);
        instancesFixed += matches.length;
        content = content.replace(re, '=$1');
        fs.writeFileSync(fp, content, 'utf8');
        filesFixed++;
      }
    }
  }
}

walkDir(searchDir);
console.log(`Fixed ${instancesFixed} =={t( instances in ${filesFixed} files`);

// Fix 2: Merge conflict resolution - for each conflicted API file, check and fix
const conflictFiles = [
  'src/app/api/product-lines/[id]/route.ts',
  'src/app/api/product-lines/route.ts',
  'src/app/api/products/[id]/route.ts',
  'src/app/api/products/route.ts',
  'src/app/api/upload/route.ts',
];

console.log('\nChecking merge conflict files...');

for (const f of conflictFiles) {
  const fp = path.join(__dirname, f);
  if (!fs.existsSync(fp)) { console.log(`  ${f}: NOT FOUND`); continue; }
  const content = fs.readFileSync(fp, 'utf8');
  const hasConflict = /^<<<<<<<|^=======|^>>>>>>>/m.test(content);
  if (!hasConflict) { console.log(`  ${f}: No conflicts`); continue; }
  
  // Strategy: remove ALL conflict markers and keep BOTH sides (ours and theirs) by removing markers only
  // This is a safe first-pass approach; review may be needed
  let lines = content.split(/\r?\n/);
  const out = [];
  let inConflict = false;
  for (const line of lines) {
    if (/^<<<<<<< /.test(line)) { inConflict = true; continue; }
    if (/^=======$/.test(line)) { continue; }
    if (/^>>>>>>> /.test(line)) { inConflict = false; continue; }
    out.push(line);
  }
  const newContent = out.join('\n');
  fs.writeFileSync(fp, newContent, 'utf8');
  console.log(`  ${f}: Conflict markers removed (${lines.length - out.length} lines stripped)`);
}
