const { analyzeWebsites } = require('./script');
const { saveHTMLReport } = require('./reporter');

(async () => {
  try {
    const url1 = 'https://www.nybgplasticsurgery.com/non-surgical/coolsculpting/';
    const url2 = 'http://plasticsurgery-06-2025.local/non-surgical/coolsculpting/';
    
    const results = await analyzeWebsites(url1, url2);
    
    console.log(`Đã xử lý thành công ${results.length} website`);
    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.url} -> UUID: ${result.uuid}`);
    });
    
    // Tạo HTML report
    const reportPath = saveHTMLReport(results);
    console.log(`\nMở file ${reportPath} trong browser để xem báo cáo!`);
    
  } catch (error) {
    console.error('Lỗi:', error);
  }
})(); 