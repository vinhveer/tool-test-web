const puppeteer = require('puppeteer-core');
const { diffLines, diffWordsWithSpace } = require('diff');
const fs = require('fs');
const path = require('path');
const beautify = require('js-beautify').html;

// Hàm format HTML
function formatHTML(html) {
  return beautify(html, {
    indent_size: 2,
    indent_char: ' ',
    max_preserve_newlines: 1,
    preserve_newlines: true,
    keep_array_indentation: false,
    break_chained_methods: false,
    indent_scripts: 'keep',
    brace_style: 'collapse',
    space_before_conditional: true,
    unescape_strings: false,
    jslint_happy: false,
    end_with_newline: false,
    wrap_line_length: 0,
    indent_inner_html: true,
    comma_first: false,
    e4x: false,
    indent_empty_lines: false
  });
}

// Hàm tạo HTML report giống GitHub
function generateHTMLReport(blockIndex, htmlA, htmlB, urlA, urlB) {
  const formattedA = formatHTML(htmlA);
  const formattedB = formatHTML(htmlB);
  
  // Sửa logic: so sánh A với B để hiển thị đúng thêm/bớt
  const diff = diffWordsWithSpace(formattedA, formattedB);
  
  let diffHtmlA = '';
  let diffHtmlB = '';
  
  diff.forEach(part => {
    const escapedValue = part.value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    
    if (part.added) {
      // Thuộc tính được thêm vào (ở URL B) - màu xanh
      diffHtmlB += `<span class="diff-added">+${escapedValue}</span>`;
      // URL A không có phần này
      diffHtmlA += '';
    } else if (part.removed) {
      // Thuộc tính bị xóa (chỉ có ở URL A) - màu đỏ
      diffHtmlA += `<span class="diff-removed">-${escapedValue}</span>`;
      // URL B không có phần này
      diffHtmlB += '';
    } else {
      // Phần không thay đổi
      diffHtmlA += escapedValue;
      diffHtmlB += escapedValue;
    }
  });

  const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Block ${blockIndex + 1} Comparison</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f6f8fa;
            line-height: 1.5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 6px;
            border: 1px solid #d0d7de;
            overflow: hidden;
        }
        .header {
            background: #f6f8fa;
            border-bottom: 1px solid #d0d7de;
            padding: 16px 20px;
        }
        .header h1 {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
            color: #24292f;
        }
        .file-header {
            background: #f6f8fa;
            border-bottom: 1px solid #d0d7de;
            padding: 8px 16px;
            font-size: 12px;
            color: #656d76;
            display: flex;
            align-items: center;
        }
        .file-header .url {
            font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
            background: #f3f4f6;
            padding: 2px 6px;
            border-radius: 3px;
            margin-left: 8px;
        }
        .diff-container {
            display: flex;
        }
        .diff-panel {
            flex: 1;
            border-right: 1px solid #d0d7de;
        }
        .diff-panel:last-child {
            border-right: none;
        }
        .diff-header {
            background: #f6f8fa;
            padding: 8px 12px;
            border-bottom: 1px solid #d0d7de;
            font-size: 12px;
            font-weight: 600;
            color: #24292f;
        }
        .diff-content {
            padding: 8px;
            font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
            font-size: 12px;
            line-height: 1.45;
            overflow-x: auto;
            min-height: 200px;
        }
        .diff-line {
            white-space: pre-wrap;
            word-break: break-all;
        }
        .diff-added {
            background-color: #ccfdf7;
            color: #064e3b;
            text-decoration: none;
            padding: 1px 2px;
            border-radius: 2px;
        }
        .diff-removed {
            background-color: #fecaca;
            color: #991b1b;
            text-decoration: none;
            padding: 1px 2px;
            border-radius: 2px;
        }
        .url-a {
            background: #ffeaa7;
        }
        .url-b {
            background: #d4f7d4;
        }
        .stats {
            padding: 12px 16px;
            background: #f6f8fa;
            border-top: 1px solid #d0d7de;
            font-size: 12px;
            color: #656d76;
        }
        .stats .added {
            color: #1a7f37;
            font-weight: 600;
        }
        .stats .removed {
            color: #cf222e;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📋 Block ${blockIndex + 1} Comparison Report</h1>
        </div>
        
        <div class="file-header">
            <span>🔍 Comparing:</span>
            <span class="url url-a">${urlA} (Base)</span>
            <span>vs</span>
            <span class="url url-b">${urlB} (Target)</span>
        </div>

        <div class="diff-container">
            <div class="diff-panel">
                <div class="diff-header">🟢 Site gốc (${urlA})</div>
                <div class="diff-content">
                    <div class="diff-line">${diffHtmlA}</div>
                </div>
            </div>
            
            <div class="diff-panel">
                <div class="diff-header"> 🔴Site dev (${urlB})</div>
                <div class="diff-content">
                    <div class="diff-line">${diffHtmlB}</div>
                </div>
            </div>
        </div>

        <div class="stats">
            <span class="added">+${diff.filter(p => p.added).length} additions</span>
            <span style="margin: 0 8px;">•</span>
            <span class="removed">-${diff.filter(p => p.removed).length} deletions</span>
        </div>
    </div>
</body>
</html>`;

  return htmlTemplate;
}

async function extractBlocks(url, selector) {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
    'AppleWebKit/537.36 (KHTML, like Gecko) ' +
    'Chrome/114.0.0.0 Safari/537.36'
  );

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 0 });
  await page.waitForSelector(selector, { timeout: 30000 });

  // Sửa để lấy outerHTML thay vì innerHTML để có cả thẻ cha
  const blocks = await page.$$eval(selector, els =>
    els.map(el => el.outerHTML.trim())
  );

  await browser.close();
  return blocks;
}

function saveBlockDiff(i, htmlA, htmlB, urlA, urlB) {
  // Không tạo file riêng lẻ nữa, chỉ log
  console.log(`📄 Processing block ${i + 1}...`);
}

function saveIdenticalBlock(i, html, urlA, urlB) {
  // Không tạo file riêng lẻ nữa, chỉ log
  console.log(`📄 Processing identical block ${i + 1}...`);
}

// Hàm tạo module report riêng lẻ
function generateModuleReport(moduleData, urlA, urlB) {
  const { index, status, htmlA, htmlB } = moduleData;
  
  let moduleContent = '';
  let statusIcon = '';
  let statusText = '';
  
  switch (status) {
    case 'identical':
      statusIcon = '✅';
      statusText = 'Identical';
      moduleContent = `
        <div class="module-section">
          <div class="module-content identical">
            <pre>${formatHTML(htmlA || '')}</pre>
          </div>
        </div>`;
      break;
      
    case 'different':
      statusIcon = '🔄';
      statusText = 'Different';
      
      // URL A hiển thị data gốc, URL B có diff highlighting
      const formattedA = formatHTML(htmlA);
      const formattedB = formatHTML(htmlB);
      
      // Tạo diff để highlight cho URL B
      const diff = diffLines(formattedA, formattedB);
      let diffHtmlB = '';
      
      diff.forEach(part => {
        const escapedValue = part.value
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
        
        if (part.added) {
          // Phần được thêm vào ở URL B
          diffHtmlB += `<span class="diff-added">+${escapedValue}</span>`;
        } else if (part.removed) {
          // Phần bị thiếu ở URL B
          diffHtmlB += `<span class="diff-removed">-${escapedValue}</span>`;
        } else {
          // Phần giống nhau
          diffHtmlB += escapedValue;
        }
      });
      
      moduleContent = `
        <div class="module-section">
          <div class="module-split">
            <div class="module-half">
              <h4>🟢 Site gốc (URL A)</h4>
              <div class="module-content">
                <pre>${formattedA.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')}</pre>
              </div>
            </div>
            <div class="module-half">
              <h4>🔴 Site Dev (URL B)</h4>
              <div class="module-content">
                <pre>${diffHtmlB}</pre>
              </div>
            </div>
          </div>
        </div>`;
      break;
      
    case 'missing_in_b':
      statusIcon = '🔴';
      statusText = 'Missing in Target Site';
      moduleContent = `
        <div class="module-section">
          <div class="module-split">
            <div class="module-half">
              <h4>🟢 Site gốc (URL A) - Has Module</h4>
              <div class="module-content">
                <pre>${formatHTML(htmlA || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')}</pre>
              </div>
            </div>
            <div class="module-half">
              <h4>🟡  Site Dev(URL B) - Missing</h4>
              <div class="module-content missing">
                <span class="missing-text">❌ Module not found in target site</span>
              </div>
            </div>
          </div>
        </div>`;
      break;
      
    case 'extra_in_b':
      statusIcon = '🟢';
      statusText = 'Extra in Target Site';
      moduleContent = `
        <div class="module-section">
          <div class="module-split">
            <div class="module-half">
              <h4>🟢 Target Site (URL A) - Missing</h4>
              <div class="module-content missing">
                <span class="missing-text">❌ Module not found in base site</span>
              </div>
            </div>
            <div class="module-half">
              <h4>🔴 Site Dev (URL B) - Has Module</h4>
              <div class="module-content">
                <pre>${formatHTML(htmlB || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')}</pre>
              </div>
            </div>
          </div>
        </div>`;
      break;
  }
  
  return `
    <div class="module-block">
      <div class="module-header">
        <span class="module-title">${statusIcon} Module ${index}: ${extractModuleClass(htmlA || htmlB || '')}</span>
        <span class="module-status ${status}">${statusText}</span>
      </div>
      ${moduleContent}
    </div>`;
}

// Hàm extract class name từ HTML
function extractModuleClass(html) {
  if (!html) return 'mod_unknown';
  
  // Tìm thẻ đầu tiên trong HTML
  const firstTagMatch = html.match(/<div[^>]+class="([^"]*)"[^>]*>/);
  if (firstTagMatch) {
    const classNames = firstTagMatch[1].split(' ');
    // Tìm tất cả class bắt đầu với "mod"
    const modClasses = classNames.filter(cls => cls.startsWith('mod'));
    if (modClasses.length > 0) {
      return modClasses.join(' ');
    }
    
    // Nếu không có class mod, trả về class đầu tiên
    return classNames[0] || 'mod_unknown';
  }
  
  // Fallback: tìm data-s3-module
  const moduleMatch = html.match(/data-s3-module="([^"]*)"/);
  if (moduleMatch) {
    return `mod_${moduleMatch[1] || 'module'}`;
  }
  
  return 'mod_unknown';
}

function generateComprehensiveReport(moduleReports, urlA, urlB) {
  const dir = path.join(__dirname, 'report');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  const moduleBlocks = moduleReports.map(module => 
    generateModuleReport(module, urlA, urlB)
  ).join('');

  const comprehensiveReport = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>📋 Module Comparison Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f6f8fa;
            line-height: 1.5;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        .header {
            background: white;
            border-radius: 6px;
            border: 1px solid #d0d7de;
            padding: 20px;
            margin-bottom: 20px;
        }
        .header h1 {
            margin: 0 0 10px 0;
            font-size: 24px;
            font-weight: 600;
            color: #24292f;
        }
        .header .subtitle {
            color: #656d76;
            font-size: 14px;
        }
        .url {
            font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
            background: #f3f4f6;
            padding: 4px 8px;
            border-radius: 4px;
            margin: 0 4px;
        }
        .module-block {
            background: white;
            border-radius: 6px;
            border: 1px solid #d0d7de;
            margin-bottom: 20px;
            overflow: hidden;
        }
        .module-header {
            background: #f6f8fa;
            border-bottom: 1px solid #d0d7de;
            padding: 12px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .module-title {
            font-weight: 600;
            font-size: 14px;
        }
        .module-status {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
        }
        .module-status.identical {
            background: #d4f7d4;
            color: #1a7f37;
        }
        .module-status.different {
            background: #fff3cd;
            color: #856404;
        }
        .module-status.missing_in_b {
            background: #f8d7da;
            color: #721c24;
        }
        .module-status.extra_in_b {
            background: #d1ecf1;
            color: #0c5460;
        }
        .module-section {
            padding: 16px;
        }
        .module-split {
            display: flex;
            gap: 16px;
        }
        .module-half {
            flex: 1;
        }
        .module-half h4 {
            margin: 0 0 8px 0;
            font-size: 12px;
            color: #656d76;
        }
        .module-content {
            border: 1px solid #d0d7de;
            border-radius: 4px;
            background: #f6f8fa;
            min-height: 100px;
        }
        .module-content pre {
            margin: 0;
            padding: 12px;
            font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
            font-size: 12px;
            line-height: 1.45;
            overflow-x: auto;
            white-space: pre-wrap;
            word-break: break-all;
        }
        .module-content.identical pre {
            background: #f0fff4;
            border-left: 3px solid #10b981;
        }
        .module-content.missing {
            display: flex;
            align-items: center;
            justify-content: center;
            background: #fef2f2;
        }
        .missing-text {
            color: #dc2626;
            font-weight: 500;
            font-size: 14px;
        }
        .diff-added {
            background-color: #ccfdf7;
            color: #064e3b;
            padding: 1px 2px;
            border-radius: 2px;
        }
        .diff-removed {
            background-color: #fecaca;
            color: #991b1b;
            padding: 1px 2px;
            border-radius: 2px;
        }
        .summary {
            background: white;
            border-radius: 6px;
            border: 1px solid #d0d7de;
            padding: 16px;
            margin-bottom: 20px;
        }
        .summary-stats {
            display: flex;
            gap: 20px;
        }
        .stat {
            text-align: center;
        }
        .stat-number {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 4px;
        }
        .stat-label {
            font-size: 12px;
            color: #656d76;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📋 Module Comparison Report</h1>
            <div class="subtitle">
                Comparing: <span class="url">${urlA} (Site gốc)</span> vs <span class="url">${urlB} (Site Dev)</span>
            </div>
        </div>
        
        <div class="summary">
            <div class="summary-stats">
                <div class="stat">
                    <div class="stat-number" style="color: #10b981;">${moduleReports.filter(r => r.status === 'identical').length}</div>
                    <div class="stat-label">Identical</div>
                </div>
                <div class="stat">
                    <div class="stat-number" style="color: #f59e0b;">${moduleReports.filter(r => r.status === 'different').length}</div>
                    <div class="stat-label">Different</div>
                </div>
                <div class="stat">
                    <div class="stat-number" style="color: #ef4444;">${moduleReports.filter(r => r.status === 'missing_in_b').length}</div>
                    <div class="stat-label">Missing in Target</div>
                </div>
                <div class="stat">
                    <div class="stat-number" style="color: #3b82f6;">${moduleReports.filter(r => r.status === 'extra_in_b').length}</div>
                    <div class="stat-label">Extra in Target</div>
                </div>
            </div>
        </div>

        ${moduleBlocks}
    </div>
</body>
</html>`;

  const reportFile = path.join(dir, 'comparison_report.html');
  fs.writeFileSync(reportFile, comprehensiveReport, 'utf-8');
  console.log(`🌐 Report saved: ${reportFile}`);
}

(async () => {
  const selector = 'div[class*="mod_"]';
  const urlB = 'https://www.nybgplasticsurgery.com';
  const urlA = 'https://www.nybgplasticsurgery.com'; // So sánh local vs production

  console.log(`So sánh selector "${selector}" giữa\n • ${urlA}\n • ${urlB}\n`);

  const [blocksA, blocksB] = await Promise.all([
    extractBlocks(urlA, selector),
    extractBlocks(urlB, selector)
  ]);

  const maxLen = Math.max(blocksA.length, blocksB.length);
  const moduleReports = [];

  for (let i = 0; i < maxLen; i++) {
    const blockA = blocksA[i] || null;
    const blockB = blocksB[i] || null;
    
    console.log(`\n=== Block #${i + 1} ===`);
    
    if (blockA && blockB) {
      // Cả hai đều có block
      if (blockA === blockB) {
        console.log('✔️ Giống hệt nhau');
        moduleReports.push({
          index: i + 1,
          status: 'identical',
          htmlA: blockA,
          htmlB: blockB
        });
      } else {
        console.log('❌ Khác nhau, diff:');
        diffLines(blockA, blockB).forEach(part => {
          const mark = part.added ? '+' : part.removed ? '-' : ' ';
          process.stdout.write(mark + part.value);
        });

        saveBlockDiff(i, blockA, blockB, urlA, urlB);
        moduleReports.push({
          index: i + 1,
          status: 'different',
          htmlA: blockA,
          htmlB: blockB
        });
      }
    } else if (blockA && !blockB) {
      // Site A có, Site B thiếu
      console.log('🔴 Site B thiếu block này');
      moduleReports.push({
        index: i + 1,
        status: 'missing_in_b',
        htmlA: blockA,
        htmlB: null
      });
    } else if (!blockA && blockB) {
      // Site B có, Site A thiếu
      console.log('🟢 Site B có thêm block này');
      moduleReports.push({
        index: i + 1,
        status: 'extra_in_b',
        htmlA: null,
        htmlB: blockB
      });
    }
  }

  // Tạo tổng hợp HTML report
  generateComprehensiveReport(moduleReports, urlA, urlB);

  if (blocksA.length !== blocksB.length) {
    console.warn(
      `⚠️ Số block khác nhau: A có ${blocksA.length}, B có ${blocksB.length}`
    );
  }
})();
