const fs = require('fs');
const path = require('path');
const { analyzeAndCompareBlocks, generateBlockSummary, getUniqueClasses } = require('./comparer');

const generateHTMLReport = (results) => {
  const [site1, site2] = results;
  const allBlocks = analyzeAndCompareBlocks(site1, site2);
  const summary = generateBlockSummary(allBlocks);
  const uniqueClasses = getUniqueClasses(allBlocks);
  
  console.log('=== DEBUG: Block Analysis ===');
  allBlocks.forEach((block, index) => {
    console.log(`${index + 1}. ${block.className} - ${block.type} (Site1: ${block.site1Index}, Site2: ${block.site2Index})`);
  });
  
  // Tạo markers cho site 1 - chỉ cho blocks có ở site 1
  const site1Markers = allBlocks.map((blockData) => {
    if (!blockData.site1) return '';
    const yPercent = (blockData.site1.y / site1.imageHeight) * 100;
    return `
      <div class="block-marker site1-marker" id="marker-site1-${blockData.displayIndex}" 
           style="top: ${yPercent}%; left: 10px;">
        <div class="marker-arrow">→</div>
        <div class="marker-label">${blockData.displayIndex}</div>
      </div>
    `;
  }).filter(m => m).join('');
  
  // Tạo markers cho site 2 - chỉ cho blocks có ở site 2
  const site2Markers = allBlocks.map((blockData) => {
    if (!blockData.site2) return '';
    const yPercent = (blockData.site2.y / site2.imageHeight) * 100;
    return `
      <div class="block-marker site2-marker" id="marker-site2-${blockData.displayIndex}" 
           style="top: ${yPercent}%; left: 10px;">
        <div class="marker-arrow">→</div>
        <div class="marker-label">${blockData.displayIndex}</div>
      </div>
    `;
  }).filter(m => m).join('');
  
  // Tạo danh sách sidebar với tất cả blocks
  const sidebarItems = allBlocks.map(block => {
    const displayClass = block.className;
    const site1Y = block.site1 ? Math.round(block.site1.y) : 0;
    const site2Y = block.site2 ? Math.round(block.site2.y) : 0;
    
    // Determine what action to take based on which sites have the block
    let scrollAction = '';
    if (block.site1 && block.site2) {
      scrollAction = `handleBlockClick(${block.displayIndex}, ${site1Y}, ${site2Y}, true, true)`;
    } else if (block.site1 && !block.site2) {
      scrollAction = `handleBlockClick(${block.displayIndex}, ${site1Y}, 0, true, false)`;
    } else if (!block.site1 && block.site2) {
      scrollAction = `handleBlockClick(${block.displayIndex}, 0, ${site2Y}, false, true)`;
    } else {
      scrollAction = `handleBlockClick(${block.displayIndex}, 0, 0, false, false)`;
    }
    
    // Determine styling based on block type
    let borderClass = 'border-gray-200';
    let textClass = 'text-gray-900';
    let statusText = '';
    
    if (block.type === 'matched') {
      borderClass = 'border-green-300 bg-green-50';
      textClass = 'text-green-800';
      statusText = `
        <div class="text-xs text-green-600 mt-1">
          Merged: Live[${block.site1Index + 1}] ↔ Dev[${block.site2Index + 1}]
        </div>
      `;
    } else if (block.type === 'site1-only') {
      borderClass = 'border-blue-300 bg-blue-50';
      textClass = 'text-blue-800';
      statusText = `
        <div class="text-xs text-blue-600 mt-1">
          Live only [${block.site1Index + 1}]
        </div>
      `;
    } else if (block.type === 'site2-only') {
      borderClass = 'border-red-300 bg-red-50';
      textClass = 'text-red-800';
      statusText = `
        <div class="text-xs text-red-600 mt-1">
          Dev only [${block.site2Index + 1}]
        </div>
      `;
    }
    
    return `
      <div 
        class="cursor-pointer p-3 rounded-lg border transition-all hover:bg-gray-50 ${borderClass}"
        onclick="${scrollAction}"
      >
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <div class="font-medium text-sm ${textClass}">
              ${displayClass}
            </div>
            <div class="text-xs text-gray-500">Block ${block.displayIndex}</div>
            ${statusText}
          </div>
          <div class="flex gap-1 ml-2">
            <div class="w-4 h-4 rounded-full ${block.site1 ? 'bg-blue-500' : 'bg-gray-300'}" title="Live Site"></div>
            <div class="w-4 h-4 rounded-full ${block.site2 ? 'bg-green-500' : 'bg-gray-300'}" title="Dev Site"></div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Website Block Comparison</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .screenshot-container {
            height: 90vh;
            overflow-y: auto;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            position: sticky;
            top: 0;
            position: relative;
        }
        .screenshot-container img {
            width: 100%;
            height: auto;
            display: block;
        }
        .sidebar {
            height: 100vh;
            overflow-y: auto;
            position: sticky;
            top: 0;
        }
        .active-block {
            background-color: #fef3c7 !important;
            border-color: #f59e0b !important;
        }
        
        /* Block Markers */
        .block-marker {
            position: absolute;
            z-index: 10;
            display: flex;
            align-items: center;
            opacity: 0.7;
            transition: all 0.3s ease;
            transform: translateY(-50%);
        }
        .block-marker.active {
            opacity: 1;
            transform: translateY(-50%) scale(1.2);
        }
        .marker-arrow {
            background: #ef4444;
            color: white;
            width: 30px;
            height: 30px;
            border-radius: 50% 0 50% 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 14px;
            margin-right: 5px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
        .marker-label {
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            min-width: 20px;
            text-align: center;
        }
        .site1-marker .marker-arrow {
            background: #3b82f6;
        }
        .site2-marker .marker-arrow {
            background: #10b981;
        }
        
        /* Overlay container */
        .image-overlay {
            position: relative;
        }
        
        /* Scroll Controls */
        .scroll-controls {
            position: absolute;
            top: 50%;
            right: 10px;
            transform: translateY(-50%);
            display: flex;
            flex-direction: column;
            gap: 5px;
            z-index: 20;
        }
        .scroll-btn {
            width: 40px;
            height: 40px;
            background: rgba(0,0,0,0.7);
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            transition: background 0.2s;
            user-select: none;
        }
        .scroll-btn:hover {
            background: rgba(0,0,0,0.9);
        }
        .scroll-btn:active {
            background: #3b82f6;
        }
        
        /* Keyboard shortcuts hint */
        .shortcuts-hint {
            position: fixed;
            bottom: 10px;
            right: 10px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 8px;
            border-radius: 6px;
            font-size: 11px;
            z-index: 100;
        }
    </style>
</head>
<body class="bg-gray-50">
    <div class="flex min-h-screen">
        <!-- Sidebar - 1/5 -->
        <div class="w-1/5 bg-white border-r border-gray-200 p-3 sidebar">
            <!-- Site URLs -->
            <div class="mb-4 pb-3 border-b border-gray-200">
                <div class="mb-2">
                    <h3 class="text-sm font-semibold text-blue-700">Live Site</h3>
                    <a href="${site1.url}" target="_blank" class="text-xs text-blue-600 hover:underline break-all">
                        ${site1.url}
                    </a>
                </div>
                <div>
                    <h3 class="text-sm font-semibold text-green-700">Dev Site</h3>
                    <a href="${site2.url}" target="_blank" class="text-xs text-green-600 hover:underline break-all">
                        ${site2.url}
                    </a>
                </div>
            </div>
            
            <!-- Comparison Summary -->
            <div class="mb-4 pb-3 border-b border-gray-200">
                <h3 class="text-sm font-bold text-gray-900 mb-2">Summary</h3>
                <div class="grid grid-cols-2 gap-2 text-xs">
                    <div class="bg-green-50 p-2 rounded border border-green-200">
                        <div class="font-bold text-green-600">${summary.matched}</div>
                        <div class="text-green-700">Merged</div>
                    </div>
                    <div class="bg-blue-50 p-2 rounded border border-blue-200">
                        <div class="font-bold text-blue-600">${summary.site1Only}</div>
                        <div class="text-blue-700">Live Only</div>
                    </div>
                    <div class="bg-red-50 p-2 rounded border border-red-200">
                        <div class="font-bold text-red-600">${summary.site2Only}</div>
                        <div class="text-red-700">Dev Only</div>
                    </div>
                    <div class="bg-gray-50 p-2 rounded border border-gray-200">
                        <div class="font-bold text-gray-600">${summary.total}</div>
                        <div class="text-gray-700">Total</div>
                    </div>
                </div>
                <div class="mt-2 text-xs text-gray-600">
                    <strong>${uniqueClasses.length}</strong> unique classes
                </div>
            </div>
            
            <!-- Block Indicators -->
            <div class="mb-3">
                <h3 class="text-sm font-bold text-gray-900 mb-2">Blocks</h3>
                <div class="text-xs text-gray-600 mb-2">
                    <div class="flex items-center gap-2 mb-1">
                        <div class="w-4 h-4 rounded-full bg-blue-500"></div>
                        <span>Live Site</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-4 h-4 rounded-full bg-green-500"></div>
                        <span>Dev Site</span>
                    </div>
                </div>
            </div>
            
            <div class="space-y-2">
                ${sidebarItems}
            </div>
        </div>
        
        <!-- Main Content - 4/5 -->
        <div class="w-4/5">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
                <!-- Site 1 Screenshot -->
                <div>
                    <div class="mb-3">
                        <h5 class="text-lg font-semibold text-blue-700">Live Site</h5>
                    </div>
                    <div class="screenshot-container" id="site1">
                        <div class="image-overlay">
                            <img src="${site1.imagePath}" alt="Site 1 Screenshot" id="img-site1">
                            ${site1Markers}
                            <!-- Scroll Controls -->
                            <div class="scroll-controls">
                                <button class="scroll-btn" 
                                        onmousedown="startScroll('site1', 'up')" 
                                        onmouseup="stopScroll()" 
                                        onmouseleave="stopScroll()"
                                        onclick="scrollStep('site1', 'up')">
                                    ↑
                                </button>
                                <button class="scroll-btn" 
                                        onmousedown="startScroll('site1', 'down')" 
                                        onmouseup="stopScroll()" 
                                        onmouseleave="stopScroll()"
                                        onclick="scrollStep('site1', 'down')">
                                    ↓
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Site 2 Screenshot -->
                <div>
                    <div class="mb-3">
                        <h5 class="text-lg font-semibold text-green-700">Dev Site</h5>
                    </div>
                    <div class="screenshot-container" id="site2">
                        <div class="image-overlay">
                            <img src="${site2.imagePath}" alt="Site 2 Screenshot" id="img-site2">
                            ${site2Markers}
                            <!-- Scroll Controls -->
                            <div class="scroll-controls">
                                <button class="scroll-btn" 
                                        onmousedown="startScroll('site2', 'up')" 
                                        onmouseup="stopScroll()" 
                                        onmouseleave="stopScroll()"
                                        onclick="scrollStep('site2', 'up')">
                                    ↑
                                </button>
                                <button class="scroll-btn" 
                                        onmousedown="startScroll('site2', 'down')" 
                                        onmouseup="stopScroll()" 
                                        onmouseleave="stopScroll()"
                                        onclick="scrollStep('site2', 'down')">
                                    ↓
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Keyboard Shortcuts Hint -->
    <div class="shortcuts-hint">
        <div><strong>Controls:</strong></div>
        <div>↑↓ Keys: Navigate | Space: Scroll both</div>
        <div>Hold arrows: Continuous scroll</div>
    </div>

    <script>
        let currentActiveBlock = null;
        let currentBlockIndex = 1;
        let scrollInterval = null;
        
        // Site data for calculations
        const site1Height = ${site1.imageHeight};
        const site2Height = ${site2.imageHeight};
        const allBlocksData = ${JSON.stringify(allBlocks)};
        
        console.log('=== Loaded Blocks ===');
        allBlocksData.forEach((block, i) => {
            console.log(\`\${i+1}. \${block.className} - \${block.type} (S1:\${block.site1Index}, S2:\${block.site2Index})\`);
        });
        
        function handleBlockClick(blockIndex, site1Y, site2Y, hasSite1, hasSite2) {
            console.log('=== BLOCK CLICKED ===');
            console.log('Block:', blockIndex, 'Site1Y:', site1Y, 'Site2Y:', site2Y, 'HasSite1:', hasSite1, 'HasSite2:', hasSite2);
            
            currentBlockIndex = blockIndex;
            
            // Remove previous active highlighting
            if (currentActiveBlock) {
                currentActiveBlock.classList.remove('active-block');
            }
            
            // Remove active markers
            document.querySelectorAll('.block-marker').forEach(marker => {
                marker.classList.remove('active');
            });
            
            // Highlight current block in sidebar
            const sidebarItems = document.querySelectorAll('.cursor-pointer');
            const currentItem = sidebarItems[blockIndex - 1];
            if (currentItem) {
                currentItem.classList.add('active-block');
                currentActiveBlock = currentItem;
                console.log('Highlighted block', blockIndex);
            }
            
            // Scroll and activate markers ONLY for sites that have the block
            if (hasSite1) {
                const marker1 = document.getElementById('marker-site1-' + blockIndex);
                if (marker1) marker1.classList.add('active');
                
                console.log('Scrolling site1 to Y:', site1Y);
                scrollSite('site1', site1Y, site1Height);
            } else {
                console.log('Block not found in site1, skipping scroll');
            }
            
            if (hasSite2) {
                const marker2 = document.getElementById('marker-site2-' + blockIndex);
                if (marker2) marker2.classList.add('active');
                
                console.log('Scrolling site2 to Y:', site2Y);
                scrollSite('site2', site2Y, site2Height);
            } else {
                console.log('Block not found in site2, skipping scroll');
            }
            
            if (!hasSite1 && !hasSite2) {
                console.log('Block not found in either site');
            }
        }
        
        function scrollSite(siteId, targetY, originalHeight) {
            const container = document.getElementById(siteId);
            const img = document.getElementById('img-' + siteId);
            
            if (!container || !img) {
                console.log('Elements not found for', siteId);
                return;
            }
            
            console.log(siteId + ' - Target Y:', targetY, 'Original height:', originalHeight);
            
            // Simple scroll calculation
            const containerHeight = container.clientHeight;
            const scrollRatio = targetY / originalHeight;
            const scrollPosition = Math.max(0, (scrollRatio * container.scrollHeight) - containerHeight / 2);
            
            console.log(siteId + ' - Container height:', containerHeight, 'Scroll height:', container.scrollHeight, 'Scroll to:', scrollPosition);
            
            container.scrollTo({
                top: scrollPosition,
                behavior: 'smooth'
            });
            
            console.log(siteId + ' - Scrolled!');
        }
        
        // Scroll Controls
        function scrollStep(siteId, direction) {
            const container = document.getElementById(siteId);
            if (!container) return;
            
            const step = 100;
            const currentScroll = container.scrollTop;
            const newScroll = direction === 'up' ? currentScroll - step : currentScroll + step;
            
            container.scrollTo({
                top: Math.max(0, newScroll),
                behavior: 'smooth'
            });
        }
        
        function startScroll(siteId, direction) {
            if (scrollInterval) clearInterval(scrollInterval);
            
            scrollInterval = setInterval(() => {
                scrollStep(siteId, direction);
            }, 50);
        }
        
        function stopScroll() {
            if (scrollInterval) {
                clearInterval(scrollInterval);
                scrollInterval = null;
            }
        }
        
        // Keyboard Navigation
        function navigateBlocks(direction) {
            const newIndex = direction === 'up' ? 
                Math.max(1, currentBlockIndex - 1) : 
                Math.min(allBlocksData.length, currentBlockIndex + 1);
            
            if (newIndex !== currentBlockIndex && allBlocksData[newIndex - 1]) {
                const block = allBlocksData[newIndex - 1];
                
                const hasSite1 = block.site1 ? true : false;
                const hasSite2 = block.site2 ? true : false;
                const site1Y = hasSite1 ? Math.round(block.site1.y) : 0;
                const site2Y = hasSite2 ? Math.round(block.site2.y) : 0;
                
                handleBlockClick(block.displayIndex, site1Y, site2Y, hasSite1, hasSite2);
            }
        }
        
        function autoScrollBoth() {
            const container1 = document.getElementById('site1');
            const container2 = document.getElementById('site2');
            
            if (container1 && container2) {
                const step = 200;
                container1.scrollBy({ top: step, behavior: 'smooth' });
                container2.scrollBy({ top: step, behavior: 'smooth' });
            }
        }
        
        // Keyboard Event Handlers
        document.addEventListener('keydown', function(e) {
            switch(e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    navigateBlocks('up');
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    navigateBlocks('down');
                    break;
                case ' ':
                    e.preventDefault();
                    autoScrollBoth();
                    break;
            }
        });
        
        // Prevent scroll on space bar
        window.addEventListener('keydown', function(e) {
            if(e.keyCode === 32 && e.target === document.body) {
                e.preventDefault();
            }
        });
        
        // Auto-select first block
        window.addEventListener('load', function() {
            console.log('Page loaded');
            setTimeout(() => {
                console.log('Auto-selecting first block...');
                if (allBlocksData.length > 0) {
                    const firstBlock = allBlocksData[0];
                    const hasSite1 = firstBlock.site1 ? true : false;
                    const hasSite2 = firstBlock.site2 ? true : false;
                    const site1Y = hasSite1 ? Math.round(firstBlock.site1.y) : 0;
                    const site2Y = hasSite2 ? Math.round(firstBlock.site2.y) : 0;
                    
                    handleBlockClick(firstBlock.displayIndex, site1Y, site2Y, hasSite1, hasSite2);
                }
            }, 1000);
        });
        
        // Debug info
        console.log('Script loaded. Site heights:', site1Height, site2Height);
        console.log('Total blocks:', allBlocksData.length);
    </script>
</body>
</html>
  `;

  return html;
};

const saveHTMLReport = (results) => {
  const html = generateHTMLReport(results);
  const outputPath = path.join(__dirname, 'analysis_report.html');
  
  fs.writeFileSync(outputPath, html);
  console.log(`✅ Đã tạo HTML report: ${outputPath}`);
  
  return outputPath;
};

module.exports = { generateHTMLReport, saveHTMLReport }; 