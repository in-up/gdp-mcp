# Government Project Announcement Scraper

This project is a web scraper designed to collect information about government support projects from various websites.

## Overview

The scraper is built with Node.js and Playwright. It scrapes the following websites:

- bizinfo.go.kr
- k-startup.go.kr
- and 6 other sites.

The collected data is processed, deduplicated, and saved as JSON files in the `output/` directory.

## How to Run

1.  Install dependencies:
    ```bash
    npm install
    ```
2.  Run the scraper:
    ```bash
    node index.js
    ```

## Output

The scraper generates the following files in the `output/` directory:

- `latest.json`: Announcements from the last day.
- `YYYYMMDD.json`: Announcements from the last day, with a date-stamped filename.
- `all.json`: All announcements collected over time.