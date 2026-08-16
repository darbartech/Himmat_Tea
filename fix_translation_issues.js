const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, 'src', 'locales');
const LANGUAGES = ['en', 'hi', 'ne', 'ja', 'zh'];

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJSON(filePath, data) {
  const sorted = {};
  Object.keys(data).sort().forEach(key => {
    sorted[key] = data[key];
  });
  fs.writeFileSync(filePath, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
}

function main() {
  console.log('=== FIXING TRANSLATION ISSUES ===\n');

  const FIXES = {
    en: {
      'features.subheadline': 'We obsess over every detail so your cup is always extraordinary.',
      'features.f4.title': 'Small-batch freshness',
      'features.f4.description': 'Roasted and packed within 7 days for peak aroma and flavor.',
      'features.f5.title': 'Expertly curated',
      'features.f5.description': 'Hand-blended by certified tea sommeliers with 20+ years experience.',
      'features.f6.title': 'Ethically farmed',
      'features.f6.description': 'Fair wages, organic practices, and reforestation with every harvest.',
    },
    hi: {
      'features.subheadline': 'हम हर विवरण पर ध्यान देते हैं ताकि आपका कप हमेशा असाधारण रहे।',
      'features.f4.title': 'छोटी बैच-ताज़गी',
      'features.f4.description': 'सबसे अच्छी सुगंध और स्वाद के लिए 7 दिनों के भीतर भुना और पैक किया गया।',
      'features.f5.title': 'विशेषज्ञ द्वारा चयनित',
      'features.f5.description': '20+ वर्षों के अनुभव वाले प्रमाणित चाय समेलियर्स द्वारा हाथ से मिश्रित।',
      'features.f6.title': 'नैतिक रूप से खेती की गई',
      'features.f6.description': 'उचित मजदूरी, जैविक प्रथाएं, और हर फसल के साथ पुनर्वनीकरण।',
    },
    ne: {
      'features.subheadline': 'हामी हर विवरणमा जानदारी दिन्छौं ताकि तपाईंको कप सधैं असाधारण रहोस्।',
      'features.f4.title': 'सानो ब्याच-ताजापन',
      'features.f4.description': 'शीर्ष सुगन्ध र स्वादको लागि ७ दिन भित्र भुनाइएको र प्याक गरिएको।',
      'features.f5.title': 'विशेषज्ञद्वारा चयन गरिएको',
      'features.f5.description': '२०+ वर्ष अनुभव भएका प्रमाणित चिया समेलियरहरूद्वारा हातले मिसाइएको।',
      'features.f6.title': 'नैतिक रूपमा खेती गरिएको',
      'features.f6.description': 'उचित ज्याला, जैविक अभ्यासहरू, र हरेक फसलसँगै पुनर्वनीकरण।',
    },
    ja: {
      'features.subheadline': 'あなたのカップが常に最高の一杯となるよう、あらゆる細部にこだわっています。',
      'features.f4.title': '少量生産で鮮度を維持',
      'features.f4.description': '最高の香りと風味のため、7日以内に焙煎・パッキング。',
      'features.f5.title': '専門家によるキュレーション',
      'features.f5.description': '20年以上の経験を持つ認定ティーソムリエが手作業でブレンド。',
      'features.f6.title': '倫理的に栽培',
      'features.f6.description': '公正な賃金、オーガニック栽培、そして収穫ごとの再植林に取り組んでいます。',
    },
    zh: {
      'features.subheadline': '我们专注于每一个细节，只为您的每一杯都与众不同。',
      'features.f4.title': '小批量新鲜烘焙',
      'features.f4.description': '7日内烘焙封装，确保极致香气与风味。',
      'features.f5.title': '专业茶艺师严选',
      'features.f5.description': '由拥有20余年经验的认证茶艺师亲手调配。',
      'features.f6.title': '道德可持续种植',
      'features.f6.description': '公平薪酬、有机种植，每一次收获都伴随森林再造。',
      'checkout.fields.fullNamePlaceholder': '张伟',
      'footer.cookies': 'Cookie政策',
      'wholesale.brand.himmatTea': '喜马茶',
      'dashboard.products.skuLabel': 'SKU（库存单位）*',
    },
  };

  LANGUAGES.forEach(lang => {
    const filePath = path.join(LOCALES_DIR, `${lang}.json`);
    const data = readJSON(filePath);
    const langFixes = FIXES[lang] || {};
    let applied = 0;
    Object.keys(langFixes).forEach(key => {
      const oldVal = data[key];
      const newVal = langFixes[key];
      if (oldVal !== newVal) {
        if (!oldVal || oldVal.trim() === '') {
          console.log(`[${lang.toUpperCase()}] FILL EMPTY: ${key} = "${newVal}"`);
        } else {
          console.log(`[${lang.toUpperCase()}] UPDATE: ${key}\n    OLD: "${oldVal}"\n    NEW: "${newVal}"`);
        }
        data[key] = newVal;
        applied++;
      }
    });
    writeJSON(filePath, data);
    console.log(`[${lang.toUpperCase()}] Applied ${applied} fixes\n`);
  });

  console.log('=== Translation fix complete ===');
}

main();
