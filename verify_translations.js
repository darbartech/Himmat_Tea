const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, 'src', 'locales');
const LANGUAGES = ['en', 'hi', 'ne', 'ja', 'zh'];
const LANGUAGE_NAMES = { en: 'English', hi: 'Hindi', ne: 'Nepali', ja: 'Japanese', zh: 'Chinese' };

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function parseCSV(csvPath) {
  const content = fs.readFileSync(csvPath, 'utf8');
  const lines = content.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        if (inQuotes && line[j + 1] === '"') {
          current += '"';
          j++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });
    rows.push(row);
  }
  return rows;
}

function looksLikeEnglish(text) {
  if (!text || typeof text !== 'string') return false;
  if (text.startsWith('http') || text.startsWith('www')) return false;
  if (text.includes('@') && text.includes('.')) return false;
  if (/^\d+$/.test(text)) return false;
  if (/^[A-Z0-9-]+$/.test(text)) return false;
  if (text === 'Rs.' || text === 'Rs' || text === '$' || text === '₹') return false;
  if (/^[^\w]*[A-Za-z]/.test(text)) return true;
  return false;
}

function main() {
  console.log('=== DETAILED TRANSLATION VERIFICATION ===\n');

  const enData = readJSON(path.join(LOCALES_DIR, 'en.json'));
  const allTranslations = {};
  LANGUAGES.forEach(lang => {
    allTranslations[lang] = readJSON(path.join(LOCALES_DIR, `${lang}.json`));
  });

  console.log('--- 1. Checking rewiring CSV: hardcoded text matches key values in EN ---');
  const rewiringCSV = parseCSV(path.join(LOCALES_DIR, 'rewiring-todo-existing-keys.csv'));
  let rewiringMismatches = 0;
  rewiringCSV.forEach((row, idx) => {
    const hardcoded = row['Hardcoded Text Found In Code'];
    const keysField = row['Existing Translation Key(s) To Use Instead'];
    if (!hardcoded || !keysField) return;
    const keys = keysField.split(';').map(k => k.trim()).filter(Boolean);
    keys.forEach(key => {
      const value = enData[key];
      if (value !== undefined && hardcoded !== value) {
        rewiringMismatches++;
        if (rewiringMismatches <= 20) {
          console.log(`  Row ${idx + 2}: "${hardcoded}" != t('${key}')="${value}"`);
        }
      }
    });
  });
  console.log(`  Total rewiring entries: ${rewiringCSV.length}, Mismatches: ${rewiringMismatches} (note: many are expected due to key aliases)\n`);

  console.log('--- 2. Checking new-keys-added CSV: values match EN translation ---');
  const newKeysCSV = parseCSV(path.join(LOCALES_DIR, 'new-keys-added.csv'));
  let valueMismatches = 0;
  let missingKeys = 0;
  newKeysCSV.forEach((row, idx) => {
    const key = row['New Translation Key'];
    const expected = row['English Source Text'];
    if (!key) return;
    const actual = enData[key];
    if (actual === undefined) {
      missingKeys++;
      console.log(`  Row ${idx + 2}: MISSING KEY "${key}"`);
    } else if (expected && actual !== expected) {
      valueMismatches++;
      if (valueMismatches <= 10) {
        console.log(`  Row ${idx + 2}: Key "${key}" expected="${expected}" actual="${actual}"`);
      }
    }
  });
  console.log(`  CSV rows: ${newKeysCSV.length}, Missing keys: ${missingKeys}, Value mismatches: ${valueMismatches}\n`);

  console.log('--- 3. Checking non-English languages for identical-to-English values (possible untranslated) ---');
  const possibleUntranslated = {};
  LANGUAGES.forEach(lang => {
    if (lang === 'en') return;
    possibleUntranslated[lang] = [];
    const langData = allTranslations[lang];
    Object.keys(enData).forEach(key => {
      const enVal = enData[key];
      const langVal = langData[key];
      if (enVal && langVal && enVal === langVal) {
        if (looksLikeEnglish(enVal)) {
          possibleUntranslated[lang].push({ key, value: enVal });
        }
      }
    });
  });

  LANGUAGES.forEach(lang => {
    if (lang === 'en') return;
    const list = possibleUntranslated[lang] || [];
    console.log(`  ${LANGUAGE_NAMES[lang]}: ${list.length} values identical to English (possible untranslated)`);
    if (list.length > 0 && list.length <= 30) {
      list.forEach(item => {
        console.log(`    - ${item.key}: "${item.value}"`);
      });
    } else if (list.length > 30) {
      list.slice(0, 30).forEach(item => {
        console.log(`    - ${item.key}: "${item.value}"`);
      });
      console.log(`    ... and ${list.length - 30} more`);
    }
  });
  console.log('');

  console.log('--- 4. Checking himmat_tea_new_translation_keys_v2.json values match locale files ---');
  const v2Data = readJSON(path.join(LOCALES_DIR, 'himmat_tea_new_translation_keys_v2.json'));
  let v2Issues = 0;
  LANGUAGES.forEach(lang => {
    const v2Lang = v2Data[lang] || {};
    const localeLang = allTranslations[lang];
    Object.keys(v2Lang).forEach(key => {
      const v2Value = v2Lang[key];
      const localeValue = localeLang[key];
      if (localeValue === undefined) {
        v2Issues++;
        if (v2Issues <= 10) {
          console.log(`  [${lang}] MISSING in locale file: ${key} = "${v2Value}"`);
        }
      }
    });
  });
  console.log(`  V2 cross-check issues: ${v2Issues}\n`);

  console.log('--- 5. Checking for empty/null/undefined values ---');
  LANGUAGES.forEach(lang => {
    const data = allTranslations[lang];
    const emptyKeys = [];
    Object.keys(data).forEach(key => {
      const val = data[key];
      if (val === null || val === undefined || (typeof val === 'string' && val.trim() === '')) {
        emptyKeys.push(key);
      }
    });
    console.log(`  ${LANGUAGE_NAMES[lang]}: ${emptyKeys.length} empty values`);
    if (emptyKeys.length > 0 && emptyKeys.length <= 10) {
      emptyKeys.forEach(k => console.log(`    - ${k}`));
    } else if (emptyKeys.length > 10) {
      emptyKeys.slice(0, 10).forEach(k => console.log(`    - ${k}`));
      console.log(`    ... and ${emptyKeys.length - 10} more`);
    }
  });
  console.log('');

  console.log('=== SUMMARY ===');
  const totalKeys = Object.keys(enData).length;
  console.log(`Total keys per language: ${totalKeys}`);
  LANGUAGES.forEach(lang => {
    if (lang === 'en') return;
    const untranslated = (possibleUntranslated[lang] || []).length;
    const pct = totalKeys > 0 ? ((1 - untranslated / totalKeys) * 100).toFixed(1) : '0.0';
    console.log(`  ${LANGUAGE_NAMES[lang]}: ${totalKeys - untranslated}/${totalKeys} translated (${pct}%)`);
  });
  console.log('\nVerification complete.');
}

main();
