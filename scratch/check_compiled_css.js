const http = require('http');

http.get('http://localhost:8000', (res) => {
  let html = '';
  res.on('data', chunk => html += chunk);
  res.on('end', () => {
    const cssMatches = [...html.matchAll(/href="([^"]+\.css[^"]*)"/g)].map(m => m[1]);
    console.log('CSS files found:', cssMatches);

    for (const cssUrl of cssMatches) {
      const fullUrl = cssUrl.startsWith('http') ? cssUrl : `http://localhost:8000${cssUrl}`;
      http.get(fullUrl, (cssRes) => {
        let css = '';
        cssRes.on('data', chunk => css += chunk);
        cssRes.on('end', () => {
          console.log(`\n=== CSS from ${cssUrl} (length: ${css.length}) ===`);
          const textWhiteMatches = [...css.matchAll(/([^{}]*text-white[^{}]*\{[^}]+\})/g)].map(m => m[1]);
          console.log('Rules matching text-white:', textWhiteMatches.slice(0, 10));

          // Also search for #0F172A or 15, 23, 42 or color overrides
          const overrides = [...css.matchAll(/([^{}]*\{[^}]*color\s*:\s*[^;]+!important[^}]*\})/g)].map(m => m[1]);
          console.log('Important color overrides:', overrides);
        });
      });
    }
  });
});
