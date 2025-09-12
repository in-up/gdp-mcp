// Polyfill for File object if not defined (for undici compatibility in some Node.js environments)
if (typeof File === 'undefined') {
  global.File = class File extends Blob {
    constructor(fileBits, fileName, options) {
      super(fileBits, options);
      this.name = fileName;
      this.lastModified = options?.lastModified || Date.now();
    }
  };
}

// scraper.js (Main)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { formatDate, isRecentDate } = require('./src/scrapers/utils');

// Import individual scrapers
const { scrapeKStartup } = require('./src/scrapers/kstartup');
const { scrapeBizinfo } = require('./src/scrapers/bizinfo');
const { scrapeGNTP } = require('./src/scrapers/gntp');
const { scrapeGNCKL } = require('./src/scrapers/gnckl');
const { scrapeGNCEP } = require('./src/scrapers/gncep');
const { scrapeRIPC } = require('./src/scrapers/ripc');
const { scrapeCCEI } = require('./src/scrapers/ccei');
const { scrapeGnstartup } = require('./src/scrapers/gnstartup');


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
    const dateA = new Date(a.date.replace(/[^\d-]/g, ''));
    const dateB = new Date(b.date.replace(/[^\d-]/g, ''));
    return dateB - dateA;
  });
}

function calculateDateSpecificScraperStatuses(announcements, scrapers) {
  const dateSpecificScraperStatuses = {};
  scrapers.forEach(scraper => {
    const count = announcements.filter(item => item.site === scraper.name).length;
    dateSpecificScraperStatuses[scraper.name] = count;
  });
  return dateSpecificScraperStatuses;
}

function writeFiles(finalResults, yesterdayAnnouncements, allScraperStatuses, scrapers) {
  const outputDir = 'output';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  // Calculate scraperStatuses for yesterday's announcements
  const yesterdayScraperStatuses = calculateDateSpecificScraperStatuses(yesterdayAnnouncements, scrapers);

  // Write latest.json
  const latestOutput = {
    header: {
      lastUpdated: new Date().toISOString(),
      scraperStatuses: yesterdayScraperStatuses,
    },
    announcements: yesterdayAnnouncements,
  };
  fs.writeFileSync(path.join(outputDir, 'latest.json'), JSON.stringify(latestOutput, null, 2));

  // Write (date).json
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateString = formatDate(yesterday).replace(/-/g, '');
  fs.writeFileSync(path.join(outputDir, `${dateString}.json`), JSON.stringify(latestOutput, null, 2));

  // Write all.json
  let allAnnouncements = [];
  const allJsonPath = path.join(outputDir, 'all.json');
  if (fs.existsSync(allJsonPath)) {
    const existingData = JSON.parse(fs.readFileSync(allJsonPath, 'utf-8'));
    allAnnouncements = existingData.announcements || [];
  }
  const mergedAnnouncements = deduplicateResults([...allAnnouncements, ...finalResults]);
  const allOutput = {
    header: {
      lastUpdated: new Date().toISOString(),
      scraperStatuses: allScraperStatuses,
    },
    announcements: mergedAnnouncements,
  };
  fs.writeFileSync(allJsonPath, JSON.stringify(allOutput, null, 2));


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
  const yesterdayDate = formatDate(yesterday);
  console.log('Target dates:', targetDates);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const scrapers = [
    { name: 'Bizinfo', fn: scrapeBizinfo },
    { name: 'GNTP', fn: scrapeGNTP },
    { name: 'GNCKL', fn: scrapeGNCKL },
    { name: 'gncep', fn: scrapeGNCEP },
    { name: 'k-startup', fn: scrapeKStartup },
    { name: 'RIPC', fn: scrapeRIPC },
    { name: 'CCEI', fn: scrapeCCEI },
    { name: 'GNStartup', fn: scrapeGnstartup },
  ];

  const scraperStatuses = {};

  try {
    const results = await Promise.allSettled(
      scrapers.map(scraper => scraper.fn(browser, isRecentDate, targetDates))
    );

    const allAnnouncements = results
      .map((result, index) => {
        const scraperName = scrapers[index].name;
        if (result.status === 'fulfilled') {
          const announcementsCount = result.value ? result.value.length : 0;
          scraperStatuses[scraperName] = announcementsCount; // Store count
          return result.value;
        }
        else {
          scraperStatuses[scraperName] = -1; // Store -1 for failure
          console.error(`${scraperName} scraper failed:`, result.reason);
          return [];
        }
      })
      .flat();

    // Process and write results
    const finalResults = deduplicateResults(allAnnouncements);
    const yesterdayAnnouncements = finalResults.filter(item => item.date === yesterdayDate);

    console.log(`Total unique announcements found: ${finalResults.length}`);
    
    writeFiles(finalResults, yesterdayAnnouncements, scraperStatuses, scrapers);
    
    console.log('Scraping completed successfully!');

  } catch (error) {
    console.error('Scraping failed:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();