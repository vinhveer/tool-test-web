const { analyzeWebsites } = require('./script');
const { generateHTMLReport } = require('./reporter');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const readExcelConfig = () => {
  const workbook = XLSX.readFile('auto_run.xlsx');
  
  // Read configure sheet
  const configSheet = workbook.Sheets['configure'];
  const configData = XLSX.utils.sheet_to_json(configSheet);
  const config = configData[0]; // First row has the URLs
  
  // Read slug sheet
  const slugSheet = workbook.Sheets['slug'];
  const slugData = XLSX.utils.sheet_to_json(slugSheet);
  
  return {
    siteLive: config.site_live,
    siteDev: config.site_dev,
    slugs: slugData.map(row => row.slug)
  };
};

const createReportFolder = () => {
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/[-:]/g, '')
    .replace('T', '')
    .slice(0, 12); // mmddyyhhmm format
  
  const folderName = `report_${timestamp}`;
  const folderPath = path.join(__dirname, folderName);
  
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
  
  // Tạo thư mục images trong report folder
  const imagesPath = path.join(folderPath, 'images');
  if (!fs.existsSync(imagesPath)) {
    fs.mkdirSync(imagesPath, { recursive: true });
  }
  
  return folderPath;
};

const saveHTMLReportWithName = (results, reportPath, fileName) => {
  const html = generateHTMLReport(results);
  const outputPath = path.join(reportPath, fileName);
  
  fs.writeFileSync(outputPath, html);
  console.log(`✅ Đã tạo report: ${fileName}`);
  
  return outputPath;
};

const analyzeWebsitesWithBrowser = async (url1, url2, browser, reportFolder) => {
  const { processWebsite } = require('./script');
  
  const urls = [url1, url2];
  const results = [];
  
  // Truyền thư mục images của report folder
  const imagesDir = path.join(reportFolder, 'images');
  
  for (let i = 0; i < urls.length; i++) {
    console.log(`  📊 Xử lý website ${i + 1}/${urls.length}: ${urls[i]}`);
    const result = await processWebsite(urls[i], browser, imagesDir);
    results.push(result);
  }
  
  return results;
};

(async () => {
  let browser;
  
  try {
    console.log('📖 Đọc cấu hình từ Excel...');
    const config = readExcelConfig();
    
    console.log(`🌐 Site Live: ${config.siteLive}`);
    console.log(`🔧 Site Dev: ${config.siteDev}`);
    console.log(`📝 Tổng số slug: ${config.slugs.length}`);
    
    // Tạo thư mục report
    const reportFolder = createReportFolder();
    console.log(`📁 Tạo thư mục: ${reportFolder}`);
    
    // Khởi động browser một lần duy nhất
    console.log('🚀 Khởi động browser...');
    browser = await puppeteer.launch({
      executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    // Xử lý từng slug
    for (let i = 0; i < config.slugs.length; i++) {
      const slug = config.slugs[i];
      console.log(`\n🔄 Xử lý slug ${i + 1}/${config.slugs.length}: ${slug}`);
      
      const url1 = config.siteLive + slug;
      const url2 = config.siteDev + slug;
      
      console.log(`  Live: ${url1}`);
      console.log(`  Dev: ${url2}`);
      
      try {
        const results = await analyzeWebsitesWithBrowser(url1, url2, browser, reportFolder);
        
        // Tạo tên file report
        const safeSlug = slug === '/' ? 'home' : slug.replace(/\//g, '_');
        const fileName = `html_report_${safeSlug}.html`;
        
        saveHTMLReportWithName(results, reportFolder, fileName);
        
      } catch (error) {
        console.error(`❌ Lỗi khi xử lý slug ${slug}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Hoàn thành! Kiểm tra thư mục ${reportFolder}`);
    
  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    if (browser) {
      console.log('🔒 Đóng browser...');
      await browser.close();
    }
  }
})(); 