const http = require('http');

http.get('http://localhost:8000', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const idx = data.indexOf('Fast Chargers');
    if (idx !== -1) {
      console.log('--- FOUND SURROUNDING HTML ---');
      console.log(data.substring(Math.max(0, idx - 200), idx + 250));
    } else {
      console.log('--- NOT FOUND IN SSR HTML ---');
    }
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});
