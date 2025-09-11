
// src/scrapers/utils.js

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function isRecentDate(dateStr, targetDates) {
  if (!dateStr) return false;
  
  const normalizedDate = dateStr.replace(/[.\s]/g, '-').replace(/년|월|일/g, '');
  
  return targetDates.some(target => 
    normalizedDate.includes(target) || 
    normalizedDate.includes(target.replace(/-/g, '.')) ||
    normalizedDate.includes(target.replace(/-/g, ''))
  );
}

module.exports = { formatDate, isRecentDate };
