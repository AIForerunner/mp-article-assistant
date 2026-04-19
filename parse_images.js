const fs = require('fs');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync('article_mobile.html', 'utf8');
const dom = new JSDOM(html);
const document = dom.window.document;
const jsContent = document.querySelector('#js_content');

if (!jsContent) {
  console.log('#js_content not found');
  process.exit(1);
}

const images = Array.from(jsContent.querySelectorAll('img')).slice(0, 20);
const attributes = ['data-src', 'src', 'data-original', 'data-url', 'wximg', 'longdesc'];
const hostnames = new Set();

images.forEach((img, index) => {
  console.log(`Image ${index + 1}:`);
  attributes.forEach(attr => {
    const val = img.getAttribute(attr);
    if (val) {
      console.log(`  ${attr}: ${val}`);
      if (attr === 'src' || attr === 'data-src') {
        try {
          const url = new URL(val);
          hostnames.add(url.hostname);
        } catch (e) {
          // Ignore invalid URLs
        }
      }
    }
  });
});

console.log('\nUnique Hostnames:');
hostnames.forEach(host => console.log(host));
