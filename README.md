# PagePulse

PagePulse is a small web tool that audits any public URL. You paste in a link, and it fetches that page and returns a report covering HTTP status, response time, page title, meta description, heading count, images missing alt text, and an approximate word count.

## What it does

Paste a URL into the input field and click Audit. The backend fetches that page, parses the returned HTML, and sends back a structured JSON report. The frontend renders that report as a clean list, and lets you download the raw JSON if you want it for your own use.

## Tech stack

Node.js and Express for the backend. Cheerio for HTML parsing. Vanilla HTML, CSS, and JavaScript for the frontend, with no framework or build step.

## Running it locally

Clone the repository, then from the project root run these two commands :

```
npm install
node index.js
```

The server starts on port 3000. Open `http://localhost:3000` in your browser to use the tool.

## API contract

### POST /audit

Request body (JSON):
```
{ "url": "https://example.com" }
```

Successful response (200):

```
{
"status": 200,
"responseTime": 184,
"title": "Example Domain",
"metaDescription": "",
"h1Count": 1,
"imgMissingAlt": 0,
"wordCount": 17
}
```
## Design decisions

I separated the HTML parsing logic into its own function in parser.js instead of leaving it inline inside the /audit route handler. While preparing to write tests for the parsing logic, I realized I could not actually test it in isolation, since it was tangled together with the fetch call, the timeout handling, and the Express request and response objects. Pulling it out into a function that just takes an HTML string and returns the extracted fields meant tests could call it directly with a controlled HTML string, with no live network call and no server needed. It also cleanly separates the part of the code that talks to the outside world from the part that is just deterministic logic, which made the route handler itself easier to read too.

When rendering the report on the frontend, I never insert scraped values directly into innerHTML. The title, meta description, and other fields all come from someone else's website. I build the row structure first using innerHTML with only static, trusted markup, then fill in every actual scraped value afterward using textContent, which always renders as plain text and never as executable HTML. It is a small extra step, but it closes a real vulnerability class that is easy to miss when the priority is just getting a demo working.

I used Cheerio for HTML parsing instead of a full headless browser like Puppeteer. Cheerio only reads the static HTML a server returns and does not execute any JavaScript on the page. I actually ran into this limitation directly while testing against YouTube, which came back with almost no real content, since YouTube builds most of the page with JavaScript after the initial HTML loads. I decided that tradeoff was acceptable here, since a headless browser would add real complexity and slow down every audit, even for the majority of normal sites that do not need it. Given more time, I would add a fallback that only launches a headless browser when a result looks suspiciously empty, rather than doing it for every request.
