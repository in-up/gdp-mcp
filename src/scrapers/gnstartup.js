const axios = require('axios');

const scrapeGnstartup = async (browser, isRecentDate, targetDates) => {
    const announcements = [];
    const siteName = 'gnstartup';
    const baseUrl = 'https://www.gnstartup.kr/api/client/business';

    try {
        for (let i = 1; i <= 5; i++) { // Scrape up to 5 pages
            const apiUrl = `${baseUrl}?page=${i}&size=10&searchValue=&sort=progress&progress=0&categories=327a26be-6861-4570-a4ad-54b4a9ba00ad,d97aa36c-41ba-40ba-86e2-228fdd6e80fb,224e5ccf-fcd8-4395-840f-868e63ab41f6,4e48e473-2792-4483-91ab-9c1ed1000be5,ee204210-11b3-4703-8fbf-95bcfccf2856&target=48d257cf-f358-4f2d-920a-404804aa0abb&startDate=&endDate=&categories2=40d51458-44e6-4f3b-91db-732941ac2571`;
            const response = await axios.get(apiUrl);
            const data = response.data;

            if (data && data.content && data.content.length > 0) {
                for (const item of data.content) {
                    const title = item.title;
                    const link = `https://www.gnstartup.kr/business/8339db24-725a-45bc-baf9-d778adc7b0d8/${item.seq}/detail`; // Construct full link
                    const date = item.createDate.split(' ')[0]; // Assuming createDate is "YYYY-MM-DD HH:MM:SS"

                    if (isRecentDate(date, targetDates)) {
                        announcements.push({
                            title,
                            link,
                            date,
                            site: siteName,
                        });
                    }
                }
            } else {
                console.log(`[GNStartup] No content found on page ${i}, stopping.`);
                break; // Stop if no content on a page
            }
        }
    } catch (error) {
        console.error(`${siteName} scraping error:`, error);
    } finally {
        // No browser to close when using API
    }

    return announcements;
};

module.exports = { scrapeGnstartup };