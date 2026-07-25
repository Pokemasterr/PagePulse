const input = document.getElementById('url-input');
const button = document.getElementById('audit-button');
const results = document.getElementById('results');

// Most recent successful audit, kept around so it can be downloaded as JSON.
let lastReport = null;
let downloadLink = null;

const REPORT_LABELS = [
  'Status',
  'Response time',
  'Title',
  'Meta description',
  'H1 count',
  'Images missing alt',
  'Word count',
];

const EXAMPLES = [
  { label: 'Wikipedia', url: 'https://en.wikipedia.org' },
  { label: 'GitHub', url: 'https://github.com' },
  { label: 'Hacker News', url: 'https://news.ycombinator.com' },
  { label: 'MDN', url: 'https://developer.mozilla.org' },
  { label: 'Example', url: 'https://example.com' },
  { label: 'httpbin', url: 'https://httpbin.org' },
];

// Render a status message wrapped in a styleable element. Only the static
// class name goes through innerHTML; the message text uses textContent,
// consistent with the XSS-safe pattern used elsewhere in this file.
function showMessage(text, className) {
  hideDownload();
  results.innerHTML = `<div class="${className}"></div>`;
  results.firstChild.textContent = text;
}

function hideDownload() {
  if (downloadLink) downloadLink.hidden = true;
}

// Build the label/value rows once and reuse them for both the real report
// and the faded skeleton preview. Labels/markup are static; values always
// go in via textContent so scraped content can't inject HTML.
function renderRows(values, extraClass) {
  const wrapper = document.createElement('div');
  if (extraClass) wrapper.className = extraClass;

  wrapper.innerHTML = REPORT_LABELS.map(
    () => '<div class="report-row"><span class="report-label"></span><span class="report-value"></span></div>'
  ).join('');

  const labelEls = wrapper.querySelectorAll('.report-label');
  const valueEls = wrapper.querySelectorAll('.report-value');

  REPORT_LABELS.forEach((label, i) => {
    labelEls[i].textContent = label;
    valueEls[i].textContent = values[i];
  });

  results.replaceChildren(wrapper);
}

// Faded preview of the report shape, shown before any audit has run.
function showSkeleton() {
  hideDownload();
  renderRows(REPORT_LABELS.map(() => '—'), 'state-skeleton');
}

async function runAudit() {
  const url = input.value.trim();

  results.textContent = '';

  if (!url) {
    showMessage('Please enter a URL.', 'state-message state-error');
    return;
  }

  button.disabled = true;
  const originalLabel = button.textContent;
  button.textContent = 'Auditing…';
  showMessage('Loading…', 'state-message state-loading');

  try {
    const response = await fetch('/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    const data = await response.json();

    results.textContent = '';

    if (!response.ok) {
      showMessage(data.error || 'Something went wrong.', 'state-message state-error');
      return;
    }

    renderReport(data, url);
  } catch (err) {
    showMessage('Could not reach the server. Please try again.', 'state-message state-error');
  } finally {
    button.disabled = false;
    button.textContent = originalLabel;
  }
}

function renderReport(data, url) {
  lastReport = { data, url };

  renderRows([
    data.status,
    `${data.responseTime} ms`,
    data.title,
    data.metaDescription,
    data.h1Count,
    data.imgMissingAlt,
    data.wordCount,
  ]);

  if (downloadLink) downloadLink.hidden = false;
}

function hostFrom(url) {
  try {
    return new URL(url).hostname;
  } catch {
    // Fall back to a filename-safe slug when the URL doesn't parse.
    return url.replace(/^https?:\/\//, '').replace(/[/?#].*$/, '').replace(/[^a-z0-9.-]/gi, '') || 'site';
  }
}

// Serialize the stored report to a file and trigger a download.
function downloadReport() {
  if (!lastReport) return;

  const json = JSON.stringify(lastReport.data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const objectUrl = URL.createObjectURL(blob);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = `pagepulse-report-${hostFrom(lastReport.url)}-${timestamp}.json`;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

// A minimal text link that appears only once a report is on screen.
function buildDownloadLink() {
  downloadLink = document.createElement('button');
  downloadLink.type = 'button';
  downloadLink.className = 'sample download-link';
  downloadLink.textContent = 'Download JSON';
  downloadLink.hidden = true;
  downloadLink.addEventListener('click', downloadReport);
  results.insertAdjacentElement('afterend', downloadLink);
}

// Load a target into the input and run it, unless an audit is already going.
function auditUrl(url) {
  if (button.disabled) return;
  input.value = url;
  runAudit();
}

// A single quiet line of text links under the input.
function buildSampleTargets() {
  const row = document.querySelector('.input-row');
  if (!row) return;

  const line = document.createElement('p');
  line.className = 'samples';

  const lead = document.createElement('span');
  lead.className = 'samples-lead';
  lead.textContent = 'Try';
  line.appendChild(lead);

  EXAMPLES.forEach((example, i) => {
    if (i > 0) {
      const sep = document.createElement('span');
      sep.className = 'samples-sep';
      sep.textContent = '·';
      line.appendChild(sep);
    }

    const link = document.createElement('button');
    link.type = 'button';
    link.className = 'sample';
    link.textContent = example.label;
    link.addEventListener('click', () => auditUrl(example.url));
    line.appendChild(link);
  });

  row.insertAdjacentElement('afterend', line);
}

button.addEventListener('click', runAudit);

buildSampleTargets();
buildDownloadLink();
showSkeleton();
