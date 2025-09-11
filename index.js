// scraper.js (Main)
const { chromium } = require('playwright');
const fs = require('fs');
const { formatDate, isRecentDate } = require('./src/scrapers/utils');

// Import individual scrapers

const { scrapeKStartup } = require('./src/scrapers/k-startup');

const { scrapeBizinfo } = require('./src/scrapers/bizinfo');
const { scrapeGNTP } = require('./src/scrapers/gntp');
const { scrapeOtherSites } = require('./src/scrapers/otherSites');
const { scrapeRIPC } = require('./src/scrapers/ripc');
const { scrapeCCEI } = require('./src/scrapers/ccei');

function deduplicateResults(results) {
  const seen = new Set();
  const unique = results.filter(item => {
    // Use the URL as the unique key, as it's guaranteed to be unique.
    const key = item.link;
    if (!key || key === '#') return false; // Don't include items without a valid link
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique.sort((a, b) => {
    const dateA = new Date(a.date.replace(/[^\\d-]/g, ''));
    const dateB = new Date(b.date.replace(/[^\\d-]/g, ''));
    return dateB - dateA;
  });
}

function writeFiles(finalResults, targetDates) {
  // Write JSON file
  const output = {
    lastUpdated: new Date().toISOString(),
    targetDates: targetDates,
    totalCount: finalResults.length,
    announcements: finalResults
  };
  fs.writeFileSync('announcements.json', JSON.stringify(output, null, 2));

  // Write Markdown file
  let markdown = `# 정부 지원사업 최근 공고\n\n`;
  markdown += `**업데이트:** ${new Date().toLocaleString('ko-KR')}\n\n`;
  markdown += `| 제목 | 사이트 | 날짜 | 링크 |\n`;
  markdown += `|------|--------|------|------|\n`;

  if (finalResults.length === 0) {
    markdown += `| 최근 2일간 새로운 공고가 없습니다 | - | - | - |\n`;
  } else {
    finalResults.forEach(item => {
      const title = item.title.replace(/\|/g, ' ').substring(0, 50);
      const cleanTitle = title.length > 49 ? title + '...' : title;
      markdown += `| ${cleanTitle} | ${item.site} | ${item.date} | [링크](${item.link}) |\n`;
    });
  }
  fs.writeFileSync('README.md', markdown);
}

async function main() {
  console.log('Starting government announcements scraper...');
  
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const targetDates = [formatDate(today), formatDate(yesterday)];
  console.log('Target dates:', targetDates);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const scraperPromises = [
      scrapeBizinfo(browser, isRecentDate, targetDates),
      scrapeGNTP(browser, isRecentDate, targetDates),
      scrapeOtherSites(browser, isRecentDate, targetDates),
      scrapeKStartup(browser, isRecentDate, targetDates), // K-Startup can be slow
      scrapeRIPC(browser, isRecentDate, targetDates),
      scrapeCCEI(browser, isRecentDate, targetDates)
    ];

    // Run scrapers in parallel
    const results = await Promise.all(scraperPromises);
    const allAnnouncements = results.flat(); // Flatten the array of arrays

    // Process and write results
    const finalResults = deduplicateResults(allAnnouncements);
    console.log(`Total unique announcements found: ${finalResults.length}`);
    
    writeFiles(finalResults, targetDates);
    
    console.log('Scraping completed successfully!');

  } catch (error) {
    console.error('Scraping failed:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();



