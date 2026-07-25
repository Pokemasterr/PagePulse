const test = require('node:test');
const assert = require('node:assert');
const { parsePage } = require('./parser');

test('happy path: extracts every field from well-formed HTML', () => {
  const html = `
    <html>
      <head>
        <title>Test Page</title>
        <meta name="description" content="A test description">
      </head>
      <body>
        <h1>Hello World</h1>
        <p>This is some visible text.</p>
        <img src="a.png">
        <img src="b.png" alt="valid alt">
      </body>
    </html>
  `;

  const result = parsePage(html);

  assert.strictEqual(result.title, 'Test Page');
  assert.strictEqual(result.metaDescription, 'A test description');
  assert.strictEqual(result.h1Count, 1);
  assert.strictEqual(result.imgMissingAlt, 1);
  // "Hello World This is some visible text." -> 7 words
  assert.strictEqual(result.wordCount, 7);
});

test('missing title and meta description return empty strings, not undefined', () => {
  const html = '<html><head></head><body><p>Some content here</p></body></html>';

  let result;
  assert.doesNotThrow(() => {
    result = parsePage(html);
  });

  assert.strictEqual(result.title, '');
  assert.strictEqual(result.metaDescription, '');
});

test('empty string input does not throw and returns zeroed counts', () => {
  let result;
  assert.doesNotThrow(() => {
    result = parsePage('');
  });

  assert.strictEqual(result.h1Count, 0);
  assert.strictEqual(result.imgMissingAlt, 0);
  assert.strictEqual(result.wordCount, 0);
});

// --- Additional edge cases ---

test('counts multiple h1s and treats empty/whitespace/absent alt as missing', () => {
  const html = `
    <body>
      <h1>One</h1><h1>Two</h1><h1>Three</h1>
      <img alt=""><img alt="   "><img>
    </body>
  `;

  const result = parsePage(html);

  assert.strictEqual(result.h1Count, 3);
  assert.strictEqual(result.imgMissingAlt, 3);
});

test('script and style contents are excluded from the word count', () => {
  const html = `
    <body>
      <script>var x = "lots of hidden words here";</script>
      <style>.a { color: red; }</style>
      <p>Visible words only</p>
    </body>
  `;

  const result = parsePage(html);

  // Only "Visible words only" should remain after script/style removal.
  assert.strictEqual(result.wordCount, 3);
});

test('whitespace-only body yields a word count of 0', () => {
  const html = `
    <body>

      <img src="x.png">
    </body>
  `;

  const result = parsePage(html);

  assert.strictEqual(result.wordCount, 0);
  assert.strictEqual(result.h1Count, 0);
  assert.strictEqual(result.imgMissingAlt, 1);
});
