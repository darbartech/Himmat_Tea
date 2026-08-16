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
      } else cur += c;
    }
    cells.push(cur);
    if (isBucketA && cells.length >= 3) {
      for (const f of cells[2].split(';').map(s=>s.trim()).filter(Boolean)) {
        rows.push({ file: f, bucket: 'A', text: cells[0], keys: cells[1].split(';').map(s=>s.trim()) });
      }
    } else if (!isBucketA && cells.length >= 3) {
      for (const f of cells[2].split(';').map(s=>s.trim()).filter(Boolean)) {
        rows.push({ file: f, bucket: 'B', text: cells[1], key: cells[0] });
      }
    }
  }
  return rows;
}

const all = [...parseCSV(path.join(LOCALES_DIR, 'rewiring-todo-existing-keys.csv')),
             ...parseCSV(path.join(LOCALES_DIR, 'new-keys-added.csv'))];

const byFile = {};
for (const r of all) {
  if (!byFile[r.file]) byFile[r.file] = [];
  byFile[r.file].push(r);
}

// Check if file actually exists
const existing = {};
for (const [f, items] of Object.entries(byFile)) {
  const fp = path.join(__dirname, f);
  if (fs.existsSync(fp)) existing[f] = items;
  else console.log(`[WARN] File not found: ${f}`);
}

const files = Object.keys(existing).sort();
const out = { files: [] };

for (const f of files) {
  const items = existing[f];
  // De-duplicate: prefer specific over ambiguous
  const outItems = [];
  const seenKey = new Set();
  for (const it of items) {
    let key;
    if (it.bucket === 'B') key = it.key;
    else key = it.keys[0];
    if (seenKey.has(key)) continue;
    seenKey.add(key);
    outItems.push(it);
  }
  out.files.push({ file: f, items: outItems });
}

fs.writeFileSync(path.join(__dirname, 'rewire_plan.json'), JSON.stringify(out, null, 2), 'utf8');
console.log(`Plan written: ${out.files.length} files`);

// Split into groups for parallel processing
const groups = [[], [], [], []];
out.files.forEach((f, i) => groups[i % 4].push(f));
groups.forEach((g, i) => {
  fs.writeFileSync(path.join(__dirname, `rewire_group_${i+1}.json`), JSON.stringify({ files: g }, null, 2), 'utf8');
  console.log(`Group ${i+1}: ${g.length} files`);
});
