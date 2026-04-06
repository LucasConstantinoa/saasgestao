import fs from 'fs';

async function fetchUrl() {
  const response = await fetch('https://cdn.21st.dev/bundled/1794.html');
  const text = await response.text();
  fs.writeFileSync('output.html', text);
  console.log('Saved to output.html');
}

fetchUrl();
