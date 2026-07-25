const express = require('express');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const cheerio = require('cheerio');

const app = express();

app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.send('PagePulse server is alive');
});

app.post('/audit', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const start = Date.now();
    const response = await fetch(url, { signal: controller.signal });
    const end = Date.now();

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return res.status(422).json({ error: 'URL did not return an HTML page' });
    }

    const html = await response.text();
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

    res.json({
      status: response.status,
      responseTime: end - start,
      title,
      metaDescription,
      h1Count,
      imgMissingAlt,
      wordCount,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(408).json({ error: 'Request timed out after 10 seconds' });
    }
    return res.status(400).json({ error: 'Failed to fetch the URL' });
  } finally {
    clearTimeout(timeout);
  }
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
