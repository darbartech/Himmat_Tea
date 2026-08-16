const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const tsc = spawnSync(
  process.execPath,
  ['node_modules/typescript/bin/tsc', '--noEmit', '--project', 'tsconfig.json'],
  { cwd: __dirname, encoding: 'utf8', maxBuffer: 50 * 1024 * 1024, timeout: 180_000 }
);

const combined = (tsc.stdout || '') + '\n' + (tsc.stderr || '');
const files = new Set();
for (const line of combined.split(/\r?\n/)) {
  const m = /^([^(]+)\(\d+,\d+\): error TS2304: Cannot find name 't'/.exec(line);
  if (m) files.add(m[1].replace(/\\/g, '/'));
}

const arr = [...files].sort();
console.log(JSON.stringify(arr, null, 2));
console.log(`\nTotal: ${arr.length}`);
