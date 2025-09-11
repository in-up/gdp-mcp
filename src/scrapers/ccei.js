
// src/scrapers/ccei.js
const axios = require('axios');
const { URLSearchParams } = require('url');

async function scrapeCCEI(browser, isRecentDate, targetDates) {
  console.log('Scraping Gyeongnam CCEI (API-based)...');
  let allAnnouncements = [];

  try {
    // Loop through pages using API calls
    for (let pageNum = 1; pageNum <= 5; pageNum++) { // Scrape up to 5 pages
      console.log(` -> Fetching CCEI API page ${pageNum}...`);
      const apiUrl = 'https://ccei.creativekorea.or.kr/gyeongnam/allim/allimList.json';
      
      const params = new URLSearchParams();
      params.append('div_code', '1');
      params.append('pagePerContents', '30'); // Get 30 items per page as requested
      params.append('page', pageNum);

      const response = await axios.post(apiUrl, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      const data = response.data;

      if (!data || !data.result || !data.result.list || data.result.list.length === 0) {
        console.log(`    No data found on API page ${pageNum}, breaking loop.`);
        break; // No more data, exit loop
      }

      const announcementsOnPage = data.result.list.map(item => {
        const title = item.TITLE?.trim() || '';
        const date = item.REG_DATE?.trim() || '';
        const seq = item.SEQ;
        const divCode = item.DIV_CODE || '1'; // Default to 1 if not present

        const link = `https://ccei.creativekorea.or.kr/gyeongnam/allim/allim_view.do?no=${seq}&div_code=${divCode}`;

        return { title, link, date, site: 'CCEI' };
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

    console.log(`CCEI: Found ${allAnnouncements.length} total announcements.`);

  } catch (error) {
    console.error('CCEI API scraping error:', error.message);
  } finally {
    // No browser to close for API-based scraping
  }
  
  return allAnnouncements; 
}

module.exports = { scrapeCCEI };
