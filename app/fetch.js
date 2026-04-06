const https = require('https');
https.get('https://cdn.21st.dev/bundled/1794.html?theme=light', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log(data));
});
