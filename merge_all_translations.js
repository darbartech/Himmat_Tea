const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, 'src', 'locales');
const LANGUAGES = ['en', 'hi', 'ne', 'ja', 'zh'];

function readJSON(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(content);
}

function writeJSON(filePath, data) {
  const sorted = {};
  Object.keys(data).sort().forEach(key => {
    sorted[key] = data[key];
  });
  fs.writeFileSync(filePath, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
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

function main() {
  console.log('Starting translation merge process...\n');

  const newKeysV2Path = path.join(LOCALES_DIR, 'himmat_tea_new_translation_keys_v2.json');
  const newKeysV2 = readJSON(newKeysV2Path);

  const newKeysAddedCSV = parseCSV(path.join(LOCALES_DIR, 'new-keys-added.csv'));
  const newKeysFromCSV = new Set(newKeysAddedCSV.map(r => r['New Translation Key']).filter(Boolean));

  const rewiringCSV = parseCSV(path.join(LOCALES_DIR, 'rewiring-todo-existing-keys.csv'));

  console.log(`Found ${newKeysFromCSV.size} new keys in new-keys-added.csv`);
  console.log(`Found ${rewiringCSV.length} rewiring entries in rewiring-todo-existing-keys.csv\n`);

  const masterKeySet = new Set();

  LANGUAGES.forEach(lang => {
    const existingPath = path.join(LOCALES_DIR, `${lang}.json`);
    let existingData = {};
    if (fs.existsSync(existingPath)) {
      existingData = readJSON(existingPath);
    } else {
      console.log(`WARNING: ${existingPath} does not exist, creating new file`);
    }

    Object.keys(existingData).forEach(key => masterKeySet.add(key));

    const v2Translations = newKeysV2[lang] || {};
    Object.keys(v2Translations).forEach(key => masterKeySet.add(key));

    let mergedData = { ...existingData };
    let addedCount = 0;
    let updatedCount = 0;

    Object.keys(v2Translations).forEach(key => {
      if (!(key in existingData)) {
        mergedData[key] = v2Translations[key];
        addedCount++;
      }
    });

    newKeysFromCSV.forEach(key => {
      if (!(key in mergedData)) {
        const v2Value = v2Translations[key];
        if (v2Value) {
          mergedData[key] = v2Value;
          addedCount++;
        } else if (lang === 'en') {
          const csvRow = newKeysAddedCSV.find(r => r['New Translation Key'] === key);
          if (csvRow && csvRow['English Source Text']) {
            mergedData[key] = csvRow['English Source Text'];
            addedCount++;
          }
        }
      }
    });

    writeJSON(existingPath, mergedData);
    console.log(`[${lang.toUpperCase()}] Added: ${addedCount}, Updated: ${updatedCount}, Total keys: ${Object.keys(mergedData).length}`);
  });

  console.log(`\nTotal unique master keys: ${masterKeySet.size}`);

  console.log('\nVerifying all language files have the same keys...');
  const keySets = {};
  LANGUAGES.forEach(lang => {
    const data = readJSON(path.join(LOCALES_DIR, `${lang}.json`));
    keySets[lang] = new Set(Object.keys(data));
  });

  const enKeys = keySets['en'];
  let allConsistent = true;
  LANGUAGES.forEach(lang => {
    if (lang === 'en') return;
    const langKeys = keySets[lang];
    const missingInLang = [...enKeys].filter(k => !langKeys.has(k));
    const extraInLang = [...langKeys].filter(k => !enKeys.has(k));
    if (missingInLang.length > 0) {
      allConsistent = false;
      console.log(`  WARNING: ${lang.toUpperCase()} missing ${missingInLang.length} keys:`);
      missingInLang.slice(0, 10).forEach(k => console.log(`    - ${k}`));
      if (missingInLang.length > 10) console.log(`    ... and ${missingInLang.length - 10} more`);
    }
    if (extraInLang.length > 0) {
      allConsistent = false;
      console.log(`  WARNING: ${lang.toUpperCase()} has ${extraInLang.length} extra keys:`);
      extraInLang.slice(0, 10).forEach(k => console.log(`    - ${k}`));
      if (extraInLang.length > 10) console.log(`    ... and ${extraInLang.length - 10} more`);
    }
  });

  if (allConsistent) {
    console.log('  All language files are key-consistent!');
  }

  console.log('\nChecking rewiring CSV keys exist in translations...');
  const enData = readJSON(path.join(LOCALES_DIR, 'en.json'));
  let rewiringIssues = 0;
  rewiringCSV.forEach((row, idx) => {
    const keysField = row['Existing Translation Key(s) To Use Instead'];
    if (!keysField) return;
    const keys = keysField.split(';').map(k => k.trim()).filter(Boolean);
    keys.forEach(key => {
      if (!(key in enData)) {
        rewiringIssues++;
        if (rewiringIssues <= 15) {
          console.log(`  Row ${idx + 2}: Key "${key}" not found in en.json (from hardcoded: "${row['Hardcoded Text Found In Code']}")`);
        }
      }
    });
  });
  if (rewiringIssues === 0) {
    console.log('  All rewiring keys exist!');
  } else {
    console.log(`  ${rewiringIssues} rewiring key issues found (some may be multi-key combinations)`);
  }

  console.log('\nChecking new-keys-added CSV keys exist in translations...');
  let newKeysMissing = 0;
  newKeysFromCSV.forEach(key => {
    if (!(key in enData)) {
      newKeysMissing++;
      console.log(`  MISSING: ${key}`);
    }
  });
  if (newKeysMissing === 0) {
    console.log('  All new keys from CSV are present!');
  } else {
    console.log(`  ${newKeysMissing} new keys are missing from en.json`);
  }

  console.log('\nTranslation merge process completed!');
}

main();
