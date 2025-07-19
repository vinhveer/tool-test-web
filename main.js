const { analyzeWebsites } = require('./script');
const { saveHTMLReport } = require('./reporter');

(async () => {
  try {
    const url1 = 'https://www.nybgplasticsurgery.com';
    const url2 = 'https://www.nybgplasticsurgery.com';
    
    const results = await analyzeWebsites(url1, url2);
    
    console.log('\n=== TỔNG KẾT ===');
    console.log(`Đã xử lý thành công ${results.length} website`);
    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.url} -> UUID: ${result.uuid}`);
    });
    
    // Tạo HTML report
    const reportPath = saveHTMLReport(results);
    console.log(`\n🎉 Mở file ${reportPath} trong browser để xem báo cáo!`);
    
  } catch (error) {
    console.error('Lỗi:', error);
  }
})(); 