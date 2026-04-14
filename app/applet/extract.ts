import fs from 'fs';

async function extract() {
  const response = await fetch('https://cdn.21st.dev/bundled/1794.html');
  const html = await response.text();
  const scriptMatch = html.match(/<script type="module" crossorigin>(.*?)<\/script>/s);
  if (scriptMatch) {
    fs.writeFileSync('bundle.js', scriptMatch[1]);
    console.log('Saved inline script to bundle.js');
  } else {
    console.log('No inline script found');
  }
}

extract();
