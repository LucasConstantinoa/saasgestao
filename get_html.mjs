import fs from 'fs';

async function getHtml() {
  const response = await fetch('https://cdn.21st.dev/bundled/1794.html');
  const html = await response.text();
  
  // Extract the body content
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    console.log(bodyMatch[1].substring(0, 2000));
  }
}

getHtml();
