
// src/scrapers/ripc.js
const axios = require('axios');
const { URLSearchParams } = require('url');

async function scrapeRIPC(browser, isRecentDate, targetDates) {
  console.log('Scraping RIPC (API-based)...');
  let allAnnouncements = [];
  const page = await browser.newPage();

  try {
    const initialUrl = 'https://pms.ripc.org/pms/biz/applicant/board/viewBoardList.do?boardCategoryCode=BD40000';
    await page.goto(initialUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000); // Give some time for JS to execute
    await page.waitForLoadState('networkidle'); // Wait for network to be idle after initial JS

    // Extract all hidden input values from frmPageParams
    const formParams = await page.evaluate(() => {
      const params = {};
      const form = document.querySelector('#frmPageParams');
      if (form) {
        const inputs = form.querySelectorAll('input[type="hidden"]');
        inputs.forEach(input => {
          params[input.name] = input.value;
        });
      }
      return params;
    });
    console.log('Extracted form parameters:', formParams);

    // Loop through pages using API calls
    for (let pageNum = 1; pageNum <= 5; pageNum++) { // Scrape up to 5 pages
      console.log(` -> Fetching RIPC API page ${pageNum}...`);
      const apiUrl = 'https://pms.ripc.org/pms/biz/applicant/board/getPostList.do';
      
      const params = new URLSearchParams();
      // Add all extracted form parameters
      for (const key in formParams) {
        params.append(key, formParams[key]);
      }
      // Override currentPageNo and recordCountPerPage for pagination
      params.set('currentPageNo', pageNum);
      params.set('recordCountPerPage', '50'); // Get more items per page
      // boardCategoryCode is already in formParams, but ensure it's correct
      params.set('boardCategoryCode', 'BD40000');

      const response = await axios.post(apiUrl, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      const data = response.data;

      if (!data || !data.result || !data.result.postList || data.result.postList.length === 0) {
        console.log(`    No data found on API page ${pageNum}, breaking loop.`);
        break; // No more data, exit loop
      }

      const announcementsOnPage = data.result.postList.map(item => {
        const title = item.title?.trim() || '';
        const date = item.writeTimeStr?.trim() || '';
        const boardSeq = item.boardSeq;

        const link = `https://pms.ripc.org/pms/biz/applicant/board/viewBoardDetail.do?boardSeq=${boardSeq}`;

        return { title, link, date, site: 'RIPC' };
      }).filter(Boolean);

      const currentRecentAnnouncements = announcementsOnPage.filter(item => 
        isRecentDate(item.date, targetDates)
      );
      
      console.log(`    Found ${currentRecentAnnouncements.length} recent announcements on API page ${pageNum}.`);
      allAnnouncements.push(...currentRecentAnnouncements);

      // If no recent announcements found on this page, and it's not the first page, break
      if (currentRecentAnnouncements.length === 0 && pageNum > 1) {
        console.log('    No recent announcements found on this API page, stopping.');
        break;
      }
    }

    console.log(`RIPC: Found ${allAnnouncements.length} total announcements.`);

  } catch (error) {
    console.error('RIPC API scraping error:', error.message);
  } finally {
    await page.close();
  }
  
  return allAnnouncements; 
}

module.exports = { scrapeRIPC };
