const cheerio = require('cheerio');

// Parse an HTML string and pull out the basic on-page audit metrics.
function parsePage(html) {
  const $ = cheerio.load(html);

  $('script, style').remove();

  const title = $('title').text();
  const metaDescription = $('meta[name="description"]').attr('content') || '';
  const h1Count = $('h1').length;
  const imgMissingAlt = $('img').filter((i, el) => {
    const alt = $(el).attr('alt');
    return alt === undefined || alt.trim() === '';
  }).length;
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  const wordCount = bodyText === '' ? 0 : bodyText.split(' ').length;

  return {
    title,
    metaDescription,
    h1Count,
    imgMissingAlt,
    wordCount,
  };
}

module.exports = { parsePage };
