const { diffLines, diffWordsWithSpace } = require('diff');
const beautify = require('js-beautify').html;

// Hàm format HTML từ compare.js
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

// Hàm so sánh HTML content
function compareHTMLBlocks(htmlA, htmlB) {
  if (!htmlA || !htmlB) return null;
  
  const formattedA = formatHTML(htmlA);
  const formattedB = formatHTML(htmlB);
  
  if (formattedA === formattedB) {
    return { status: 'identical', htmlA: formattedA, htmlB: formattedB };
  }
  
  const diff = diffWordsWithSpace(formattedA, formattedB);
  return { status: 'different', htmlA: formattedA, htmlB: formattedB, diff };
}

const analyzeAndCompareBlocks = (site1, site2) => {
  const allBlocks = [];
  
  // Tạo danh sách tất cả blocks từ cả 2 site với thông tin đầy đủ
  const site1Blocks = site1.modBlocks.map((block, index) => ({
    siteIndex: index,
    className: block.className.split(' ')[0],
    site: 'site1',
    data: block
  }));
  
  const site2Blocks = site2.modBlocks.map((block, index) => ({
    siteIndex: index,
    className: block.className.split(' ')[0],
    site: 'site2', 
    data: block
  }));
  
  let site1Index = 0;
  let site2Index = 0;
  
  // So sánh từng index theo logic mới
  while (site1Index < site1Blocks.length || site2Index < site2Blocks.length) {
    const block1 = site1Blocks[site1Index];
    const block2 = site2Blocks[site2Index];
    
    if (block1 && block2) {
      // Cả 2 site đều có block ở index này
      if (block1.className === block2.className) {
        // Cùng class name -> Merge và so sánh HTML
        const htmlComparison = compareHTMLBlocks(
          block1.data.htmlContent, 
          block2.data.htmlContent
        );
        
        allBlocks.push({
          id: `merged-${allBlocks.length + 1}`,
          displayIndex: allBlocks.length + 1,
          className: block1.className,
          site1: block1.data,
          site2: block2.data,
          site1Class: block1.className,
          site2Class: block2.className,
          hasConflict: false,
          type: 'matched',
          site1Index: site1Index,
          site2Index: site2Index,
          htmlComparison: htmlComparison
        });
        
        site1Index++;
        site2Index++;
      } else {
        // Khác class name -> Tách riêng, chỉ tăng index site gốc
        allBlocks.push({
          id: `site1-${allBlocks.length + 1}`,
          displayIndex: allBlocks.length + 1,
          className: block1.className,
          site1: block1.data,
          site2: null,
          site1Class: block1.className,
          site2Class: null,
          hasConflict: true,
          type: 'site1-only',
          site1Index: site1Index,
          site2Index: null
        });
        
        site1Index++; // Chỉ tăng site1Index
      }
    } else if (block1 && !block2) {
      // Chỉ có site1
      allBlocks.push({
        id: `site1-${allBlocks.length + 1}`,
        displayIndex: allBlocks.length + 1,
        className: block1.className,
        site1: block1.data,
        site2: null,
        site1Class: block1.className,
        site2Class: null,
        hasConflict: true,
        type: 'site1-only',
        site1Index: site1Index,
        site2Index: null
      });
      
      site1Index++;
    } else if (!block1 && block2) {
      // Chỉ có site2
      allBlocks.push({
        id: `site2-${allBlocks.length + 1}`,
        displayIndex: allBlocks.length + 1,
        className: block2.className,
        site1: null,
        site2: block2.data,
        site1Class: null,
        site2Class: block2.className,
        hasConflict: true,
        type: 'site2-only',
        site1Index: null,
        site2Index: site2Index
      });
      
      site2Index++;
    }
  }
  
  return allBlocks;
};

const generateBlockSummary = (allBlocks) => {
  const summary = {
    total: allBlocks.length,
    matched: 0,
    site1Only: 0,
    site2Only: 0,
    classMismatch: 0
  };
  
  allBlocks.forEach(block => {
    switch (block.type) {
      case 'matched':
        summary.matched++;
        break;
      case 'site1-only':
        summary.site1Only++;
        break;
      case 'site2-only':
        summary.site2Only++;
        break;
      case 'class-mismatch':
        summary.classMismatch++;
        break;
    }
  });
  
  return summary;
};

const getUniqueClasses = (allBlocks) => {
  const classes = new Set();
  
  allBlocks.forEach(block => {
    if (block.site1Class) classes.add(block.site1Class);
    if (block.site2Class) classes.add(block.site2Class);
  });
  
  return Array.from(classes).sort();
};

const getBlocksByClass = (allBlocks, className) => {
  return allBlocks.filter(block => 
    block.site1Class === className || block.site2Class === className
  );
};

module.exports = {
  analyzeAndCompareBlocks,
  generateBlockSummary,
  getUniqueClasses,
  getBlocksByClass,
  compareHTMLBlocks,
  formatHTML
}; 