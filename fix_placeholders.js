const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, 'src', 'locales');
const LANGS = ['en', 'ne', 'hi', 'ja', 'zh'];

const FIXES = {
  ne: {
    'dashboard.home.lowStockProductsText': 'तपाईंसँग {count} उत्पादन{plural} स्टकमा कम चलिरहेका छन्।',
  },
  hi: {
    'dashboard.home.lowStockProductsText.singular': 'आपके पास {count} उत्पाद का स्टॉक कम चल रहा है।',
    'dashboard.adminUsers.deleteConfirm': 'क्या आप वाकई {user} को हटाना चाहते हैं? यह क्रिया पूर्ववत नहीं की जा सकती।',
    'dashboard.inventory.expiringProductsText': 'आपके पास अगले 30 दिनों में {count} बैच{plural} की म्याद समाप्त होने वाली है।',
    'dashboard.inventory.lowStockProductsText': 'आपके पास {count} उत्पाद{plural} का स्टॉक कम चल रहा है।',
    'dashboard.inventory.adjustStockFor': '{product} के लिए स्टॉक समायोजित करें',
    'dashboard.inventory.currentStockUnits': 'वर्तमान स्टॉक: {stock} इकाइयाँ',
    'dashboard.coupons.percentOff': '{percent}% छूट',
    'dashboard.coupons.amountOff': '₹{amount} छूट',
    'dashboard.coupons.onOrdersOver': '₹{amount} से ऊपर के ऑर्डर पर',
    'dashboard.coupons.usedCount': '{used}/{limit}',
    'dashboard.blog.deleteConfirm': 'क्या आप वाकई "{title}" को हटाना चाहते हैं? यह क्रिया पूर्ववत नहीं की जा सकती।',
  },
  ja: {
    'dashboard.home.lowStockProductsText.singular': '{count} 件の商品の在庫が残りわずかです。',
    'dashboard.adminUsers.deleteConfirm': '本当に {user} を削除しますか？この操作は元に戻せません。',
    'dashboard.inventory.expiringProductsText': '今後 30 日以内に期限切れになるバッチが {count} 件{plural}あります。',
    'dashboard.inventory.lowStockProductsText': '在庫残りわずかな商品が {count} 件{plural}あります。',
    'dashboard.inventory.adjustStockFor': '{product} の在庫を調整',
    'dashboard.inventory.currentStockUnits': '現在の在庫: {stock} 単位',
    'dashboard.coupons.percentOff': '{percent}% OFF',
    'dashboard.coupons.amountOff': '¥{amount} OFF',
    'dashboard.coupons.onOrdersOver': '¥{amount} 以上の注文で適用',
    'dashboard.coupons.usedCount': '{used}/{limit}',
    'dashboard.blog.deleteConfirm': '本当に「{title}」を削除しますか？この操作は元に戻せません。',
  },
  zh: {
    'dashboard.home.lowStockProductsText.singular': '您有 {count} 个产品库存紧张。',
    'dashboard.adminUsers.deleteConfirm': '确定要删除 {user} 吗？此操作无法撤销。',
    'dashboard.inventory.expiringProductsText': '未来 30 天内有 {count} 个批次{plural}即将过期。',
    'dashboard.inventory.lowStockProductsText': '您有 {count} 个产品{plural}库存紧张。',
    'dashboard.inventory.adjustStockFor': '调整 {product} 的库存',
    'dashboard.inventory.currentStockUnits': '当前库存：{stock} 单位',
    'dashboard.coupons.percentOff': '{percent}% 折扣',
    'dashboard.coupons.amountOff': '减 ₹{amount}',
    'dashboard.coupons.onOrdersOver': '订单满 ₹{amount} 可用',
    'dashboard.coupons.usedCount': '{used}/{limit}',
    'dashboard.blog.deleteConfirm': '确定要删除「{title}」吗？此操作无法撤销。',
  },
};

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
  console.log('=== Placeholder Fix Script ===\n');

  const data = {};
  LANGS.forEach(lang => {
    data[lang] = loadJSON(path.join(LOCALES_DIR, `${lang}.json`));
  });

  const en = data['en'];
  let fixesApplied = 0;

  for (const [lang, keyMap] of Object.entries(FIXES)) {
    for (const [key, value] of Object.entries(keyMap)) {
      if (!(key in en)) {
        console.log(`[SKIP] Key not in EN: ${lang}.${key}`);
        continue;
      }
      const enPh = extractPlaceholders(en[key]);
      const valPh = extractPlaceholders(value);
      const missing = [...enPh].filter(p => !valPh.has(p));
      const extra = [...valPh].filter(p => !enPh.has(p));
      if (missing.length > 0 || extra.length > 0) {
        console.log(`[WARN PH MISMATCH] ${lang}.${key}`);
        console.log(`  EN needs: ${[...enPh].join(', ')}`);
        console.log(`  New val has: ${[...valPh].join(', ')}`);
        console.log(`  Val: ${value}`);
      } else {
        data[lang][key] = value;
        fixesApplied++;
        console.log(`[FIXED] ${lang}.${key}`);
      }
    }
  }

  console.log(`\nTotal fixes applied: ${fixesApplied}`);

  console.log('\n--- Verification pass ---');
  const enKeys = new Set(Object.keys(data['en']));
  let phErrors = 0;
  for (const key of enKeys) {
    const enPh = extractPlaceholders(data['en'][key]);
    if (enPh.size === 0) continue;
    for (const lang of LANGS) {
      if (lang === 'en') continue;
      const v = data[lang][key];
      if (!v) continue;
      const lPh = extractPlaceholders(v);
      const miss = [...enPh].filter(p => !lPh.has(p));
      const ext = [...lPh].filter(p => !enPh.has(p));
      if (miss.length > 0 || ext.length > 0) {
        console.log(`[PH ERR] ${lang}.${key}`);
        console.log(`  EN(${[...enPh].join(',')}): ${data['en'][key]}`);
        console.log(`  ${lang}(${[...lPh].join(',')}): ${v}`);
        phErrors++;
      }
    }
  }
  console.log(phErrors === 0 ? `\nAll placeholders consistent! (0 errors)` : `\nRemaining placeholder errors: ${phErrors}`);

  console.log('\n--- Writing files ---');
  LANGS.forEach(lang => {
    const fp = path.join(LOCALES_DIR, `${lang}.json`);
    saveJSON(fp, data[lang]);
    console.log(`  ${lang}.json: ${Object.keys(data[lang]).length} keys`);
  });

  console.log('\nDone.');
}

main();
