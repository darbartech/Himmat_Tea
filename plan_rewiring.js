const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, 'src', 'locales');

function parseCSV(csvPath) {
  const raw = fs.readFileSync(csvPath, 'utf8');
  const lines = raw.split(/\r?\n/).filter(l => l.trim().length > 0);
  const header = lines.shift();
  
  const isBucketA = /Hardcoded Text Found In Code/.test(header);
  
  const rows = [];
  for (const line of lines) {
    const cells = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i+1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (c === ',' && !inQ) {
        cells.push(cur); cur = '';
      } else {
        cur += c;
      }
    }
    cells.push(cur);
    if (isBucketA && cells.length >= 3) {
      rows.push({ text: cells[0], keys: cells[1].split(';').map(s=>s.trim()), files: cells[2].split(';').map(s=>s.trim()) });
    } else if (!isBucketA && cells.length >= 3) {
      rows.push({ key: cells[0], text: cells[1], files: cells[2].split(';').map(s=>s.trim()) });
    }
  }
  return rows;
}

const bucketA = parseCSV(path.join(LOCALES_DIR, 'rewiring-todo-existing-keys.csv'));
const bucketB = parseCSV(path.join(LOCALES_DIR, 'new-keys-added.csv'));

const byFile = {};
function add(file, entry, bucket) {
  if (!file) return;
  if (!byFile[file]) byFile[file] = [];
  byFile[file].push({ ...entry, bucket });
}

for (const r of bucketA) for (const f of r.files) add(f, r, 'A');
for (const r of bucketB) for (const f of r.files) add(f, r, 'B');

const sortedFiles = Object.keys(byFile).sort();

console.log(`Bucket A rows: ${bucketA.length}`);
console.log(`Bucket B rows: ${bucketB.length}`);
console.log(`Unique files: ${sortedFiles.length}\n`);

console.log('=== PER-FILE REWIRING PLAN ===\n');
for (const f of sortedFiles) {
  const items = byFile[f];
  console.log(`\n${'='.repeat(80)}`);
  console.log(`FILE: ${f}  (${items.length} replacements)`);
  console.log(`${'='.repeat(80)}`);
  for (const it of items) {
    if (it.bucket === 'A') {
      console.log(`\n  [A] Hardcoded: "${it.text}"  ->  use existing key(s): ${it.keys.join(' | ')}`);
    } else {
      console.log(`\n  [B] Hardcoded: "${it.text}"  ->  use new key: ${it.key}`);
    }
  }
}

console.log('\n\n=== FILE LIST ONLY (for processing) ===');
sortedFiles.forEach(f => console.log(f));
