const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, 'src', 'locales');
const LANGS = ['en', 'ne', 'hi', 'ja', 'zh'];

const PLACEHOLDER_FIX_KEYS = [
  'dashboard.adminUsers.deleteConfirm',
  'dashboard.blog.deleteConfirm',
  'dashboard.coupons.amountOff',
  'dashboard.coupons.onOrdersOver',
  'dashboard.coupons.percentOff',
  'dashboard.coupons.usedCount',
  'dashboard.inventory.adjustStockFor',
  'dashboard.inventory.currentStockUnits',
  'dashboard.inventory.expiringProductsText',
  'dashboard.inventory.lowStockProductsText',
  'dashboard.home.lowStockProductsText',
  'dashboard.home.lowStockProductsText.singular',
];

function loadJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function saveJSON(filePath, data) {
  const sorted = {};
  Object.keys(data).sort().forEach(k => { sorted[k] = data[k]; });
  fs.writeFileSync(filePath, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
}

function extractPlaceholders(str) {
  const matches = str.match(/\{[a-zA-Z0-9_]+\}/g);
  return matches ? new Set(matches) : new Set();
}

function main() {
  console.log('=== Translation Merge & Fix Script ===\n');

  const existingData = {};
  LANGS.forEach(lang => {
    existingData[lang] = loadJSON(path.join(LOCALES_DIR, `${lang}.json`));
    console.log(`[Existing] ${lang}: ${Object.keys(existingData[lang]).length} keys`);
  });

  const v2Data = loadJSON(path.join(LOCALES_DIR, 'himmat_tea_new_translation_keys_v2.json'));
  LANGS.forEach(lang => {
    console.log(`[V2 New] ${lang}: ${Object.keys(v2Data[lang]).length} keys`);
  });

  console.log('\n--- Step 1: Merge new keys ---');
  const mergedData = {};
  LANGS.forEach(lang => {
    mergedData[lang] = { ...existingData[lang] };
    let added = 0, skipped = 0;
    for (const [key, value] of Object.entries(v2Data[lang])) {
      if (!(key in mergedData[lang])) {
        mergedData[lang][key] = value;
        added++;
      } else {
        skipped++;
      }
    }
    console.log(`${lang}: +${added} new keys (skipped ${skipped} existing)`);
  });

  console.log('\n--- Step 2: Fix 12 placeholder bugs in hi/ja/zh ---');
  const enRef = mergedData['en'];
  const fixedLangs = ['hi', 'ja', 'zh'];
  
  for (const key of PLACEHOLDER_FIX_KEYS) {
    if (!(key in enRef)) {
      console.log(`  [SKIP] Key not found in en: ${key}`);
      continue;
    }
    const expectedPlaceholders = extractPlaceholders(enRef[key]);
    
    for (const lang of fixedLangs) {
      if (!(key in mergedData[lang])) continue;
      const currentPlaceholders = extractPlaceholders(mergedData[lang][key]);
      
      const missing = new Set([...expectedPlaceholders].filter(p => !currentPlaceholders.has(p)));
      if (missing.size > 0) {
        console.log(`  [FIX] ${lang} ${key}: missing ${[...missing].join(', ')}`);
        console.log(`    EN (ref): ${enRef[key]}`);
        console.log(`    OLD ${lang}: ${mergedData[lang][key]}`);
        
        const v2Fix = v2Data[lang] && v2Data[lang][key];
        if (v2Fix) {
          const v2Placeholders = extractPlaceholders(v2Fix);
          if (expectedPlaceholders.size === v2Placeholders.size &&
              [...expectedPlaceholders].every(p => v2Placeholders.has(p))) {
            mergedData[lang][key] = v2Fix;
            console.log(`    NEW ${lang}: ${mergedData[lang][key]}`);
          } else {
            console.log(`    [WARN] V2 value placeholders don't match EN. Manual review needed.`);
          }
        } else {
          console.log(`    [WARN] No V2 value found for ${lang}.${key}`);
        }
      }
    }
  }

  console.log('\n--- Step 3: Verify key parity ---');
  const keySets = {};
  LANGS.forEach(lang => {
    keySets[lang] = new Set(Object.keys(mergedData[lang]));
  });
  const enKeys = keySets['en'];
  let allParity = true;
  for (const lang of LANGS) {
    if (lang === 'en') continue;
    const diff1 = new Set([...enKeys].filter(k => !keySets[lang].has(k)));
    const diff2 = new Set([...keySets[lang]].filter(k => !enKeys.has(k)));
    if (diff1.size > 0) { console.log(`  [PARITY MISSING] ${lang} missing: ${[...diff1].slice(0,5).join(', ')}${diff1.size>5?` (+${diff1.size-5} more)`:''}`); allParity = false; }
    if (diff2.size > 0) { console.log(`  [PARITY EXTRA] ${lang} extra: ${[...diff2].slice(0,5).join(', ')}${diff2.size>5?` (+${diff2.size-5} more)`:''}`); allParity = false; }
  }
  if (allParity) {
    console.log(`  All languages in perfect key parity! (${enKeys.size} keys each)`);
  }

  console.log('\n--- Step 4: Verify placeholder consistency ---');
  let placeholderErrors = 0;
  for (const key of enKeys) {
    const enPh = extractPlaceholders(enRef[key]);
    if (enPh.size === 0) continue;
    for (const lang of LANGS) {
      if (lang === 'en') continue;
      const langVal = mergedData[lang][key];
      if (!langVal) continue;
      const langPh = extractPlaceholders(langVal);
      const missing = [...enPh].filter(p => !langPh.has(p));
      const extra = [...langPh].filter(p => !enPh.has(p));
      if (missing.length > 0 || extra.length > 0) {
        console.log(`  [PH ERROR] ${lang}.${key}`);
        console.log(`    EN (${[...enPh].join(',')}): ${enRef[key]}`);
        console.log(`    ${lang} (${[...langPh].join(',')}): ${langVal}`);
        placeholderErrors++;
      }
    }
  }
  console.log(placeholderErrors === 0 ? '  All placeholders consistent!' : `  Total placeholder errors: ${placeholderErrors}`);

  console.log('\n--- Step 5: Write merged files ---');
  LANGS.forEach(lang => {
    const filePath = path.join(LOCALES_DIR, `${lang}.json`);
    saveJSON(filePath, mergedData[lang]);
    const after = Object.keys(loadJSON(filePath)).length;
    console.log(`  ${filePath}: ${after} keys written`);
  });

  console.log('\n=== Done ===');
  console.log('\nNext steps:');
  console.log('1. Bump TRANSLATION_VERSION in src/context/TranslationContext.tsx (v5 -> v6)');
  console.log('2. Wire up bucket A: hardcoded -> existing keys (rewiring-todo-existing-keys.csv)');
  console.log('3. Wire up bucket B: hardcoded -> new keys (new-keys-added.csv)');
}

main();
