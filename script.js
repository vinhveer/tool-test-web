const puppeteer = require('puppeteer-core');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const processWebsite = async (url, browser, imagesDir = null) => {
  const page = await browser.newPage();
  const uuid = uuidv4();
  
  // Sử dụng imagesDir được truyền vào hoặc default
  const targetImagesDir = imagesDir || path.join(__dirname, 'images');
  if (!fs.existsSync(targetImagesDir)) {
    fs.mkdirSync(targetImagesDir, { recursive: true });
  }

  try {
    // Giả lập desktop
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
      'AppleWebKit/537.36 (KHTML, like Gecko) ' +
      'Chrome/114.0.0.0 Safari/537.36'
    );

    console.log(`[${uuid}] Đang mở trang: ${url}`);
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 0
    });
    console.log(`[${uuid}] Trang đã load (networkidle2)`);

    // Cuộn trang để trigger lazy-load
    await page.evaluate(async () => {
      const step = window.innerHeight / 2;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise(r => setTimeout(r, 500));
      }
      window.scrollTo(0, 0);
    });
    console.log(`[${uuid}] Đã cuộn hết trang`);

    // Chờ tĩnh thêm
    await new Promise(r => setTimeout(r, 5000));
    console.log(`[${uuid}] Chờ tĩnh 5s xong`);

    // Tìm tất cả div.class*="mod" và lấy thông tin vị trí + HTML content
    await page.waitForSelector('div[class*="mod"]', { timeout: 60000 });
    const modInfo = await page.evaluate(() => {
      const modDivs = document.querySelectorAll('div[class*="mod"]');
      return Array.from(modDivs).map(div => {
        const rect = div.getBoundingClientRect();
        const style = window.getComputedStyle(div);
        return {
          x: rect.x + window.scrollX,
          y: rect.y + window.scrollY,
          width: rect.width,
          height: rect.height,
          minHeight: parseFloat(style.minHeight) || 0,
          className: div.className,
          htmlContent: div.outerHTML.trim()
        };
      });
    });

    console.log(`[${uuid}] Tìm thấy ${modInfo.length} khối mod`);

    // Tính toán thống kê height
    const heights = modInfo.map(info => info.height);
    const minHeight = Math.min(...heights);
    const maxHeight = Math.max(...heights);
    const avgHeight = (minHeight + maxHeight) / 2;

    console.log(`[${uuid}] === THỐNG KÊ HEIGHT ===`);
    console.log(`[${uuid}] Min height: ${minHeight}px`);
    console.log(`[${uuid}] Max height: ${maxHeight}px`);
    console.log(`[${uuid}] Avg height: ${avgHeight}px`);

    // Chụp full page
    const fullBuffer = await page.screenshot({ fullPage: true });
    const imagePath = path.join(targetImagesDir, `${uuid}.png`);
    await fs.promises.writeFile(imagePath, fullBuffer);
    console.log(`[${uuid}] ✅ Đã lưu ảnh full page: ${imagePath}`);

    // Tính độ dài ảnh theo công thức
    const imageHeight = await page.evaluate(() => document.body.scrollHeight);
    const calculatedLength = imageHeight - minHeight + avgHeight;
    
    console.log(`[${uuid}] === KẾT QUẢ TÍNH TOÁN ===`);
    console.log(`[${uuid}] Độ dài ảnh: ${imageHeight}px`);
    console.log(`[${uuid}] Công thức: ${imageHeight} - ${minHeight} + ${avgHeight} = ${calculatedLength}px`);

    // Trả về thông tin
    const report = {
      uuid,
      url,
      timestamp: new Date().toISOString(),
      imageHeight,
      minHeight,
      maxHeight,
      avgHeight,
      calculatedLength,
      imagePath: `images/${uuid}.png`,
      modBlocks: modInfo
    };

    console.log(`[${uuid}] ✅ Hoàn thành phân tích`);

    return report;
  } catch (error) {
    console.error(`[${uuid}] Lỗi:`, error);
    throw error;
  } finally {
    await page.close();
  }
};

const analyzeWebsites = async (url1, url2) => {
  // Khởi Puppeteer
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const urls = [url1, url2];

  try {
    console.log('Bắt đầu xử lý tuần tự 2 website...');
    const results = [];
    
    for (let i = 0; i < urls.length; i++) {
      console.log(`\n=== XỬ LÝ WEBSITE ${i + 1}/${urls.length} ===`);
      const result = await processWebsite(urls[i], browser);
      results.push(result);
      console.log(`Hoàn thành website ${i + 1}: ${result.uuid}`);
    }

    console.log('\n=== HOÀN THÀNH TẤT CẢ ===');
    results.forEach((result, index) => {
      console.log(`Website ${index + 1}: ${result.url} -> ${result.uuid}`);
    });

    return results;
  } finally {
    await browser.close();
    console.log('Đóng browser. Hoàn thành!');
  }
};

module.exports = { analyzeWebsites, processWebsite };
