import fs from 'fs';

function run() {
  const html = fs.readFileSync('doc_page.html', 'utf8');
  
  const kw = '/v1/images';
  let idx = 0;
  while ((idx = html.indexOf(kw, idx)) !== -1) {
     console.log(`\n=== MATCH AT INDEX ${idx} ===`);
     const start = Math.max(0, idx - 500);
     const end = Math.min(html.length, idx + 800);
     const fragment = html.slice(start, end);
     const cleanFragment = fragment
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ');
     console.log(cleanFragment);
     idx += kw.length;
  }
}
run();
