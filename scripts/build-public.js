#!/usr/bin/env node
// Export only the approved pages and their referenced assets.
const fs = require('node:fs');
const path = require('node:path');
const {Parser} = require('htmlparser2');

const pages = ['index.html', 'consulting/index.html', 'projects/index.html',
  'shelf/index.html', 'stream/index.html', '404.html'];
const routes = ['/', '/consulting/', '/projects/', '/shelf/', '/stream/', '/404.html'];
const supportFiles = ['shelf.xml'];
const assetType = /\.(?:css|js|png|jpe?g|webp|avif|gif|svg|ico|woff2?|ttf|otf|mp3|wav|ogg|mp4|webm)$/i;
const assetRoot = /^(?:css|fonts|img|assets)\//;

function localReference(ref, file) {
  if (!ref || ref.startsWith('#')) return null;
  const url = new URL(ref, 'https://leewilkers.com/' + file);
  if (url.origin !== 'https://leewilkers.com') return null;
  const decoded = decodeURIComponent(url.pathname).slice(1);
  if (decoded.includes('..') || decoded.includes('\\') || decoded.includes('\0')) throw new Error(`Unsafe asset path: ${ref}`);
  return decoded;
}

function htmlReferences(text, file) {
  const refs = [];
  new Parser({onopentag(name, attrs) {
    if (/^(true|1)$/i.test(attrs['data-draft'] || '') || (attrs.class || '').split(/\s+/).includes('draft-banner')) throw new Error(`Draft in public page: ${file}`);
    if (attrs.href) {
      const local = localReference(attrs.href, file);
      if (local !== null && !routes.includes('/' + local) && !supportFiles.includes(local) && !(assetRoot.test(local) && assetType.test(local))) throw new Error(`Unapproved internal link in ${file}: ${attrs.href}`);
    }
    for (const key of ['src','href','poster']) if (attrs[key]) refs.push(attrs[key]);
    if (name === 'meta' && attrs.content && /^(https?:)?\/\//.test(attrs.content)) refs.push(attrs.content);
    if (attrs.srcset) for (const candidate of attrs.srcset.split(',')) refs.push(candidate.trim().split(/\s+/)[0]);
  }}, {decodeEntities: true}).end(text);
  return refs;
}

function dependencies(text, file) {
  const refs = file.endsWith('.html') ? htmlReferences(text, file) : [];
  // JS media paths and feed images can use root-relative or same-origin URLs.
  for (const m of text.matchAll(/https:\/\/leewilkers\.com(\/[^"'`\s<>)]*)/g)) refs.push(m[1]);
  for (const m of text.matchAll(/["'`(]\s*(\/(?!\/)[^"'`\s<>)]*)/g)) refs.push(m[1]);
  if (file.endsWith('.css')) {
    for (const m of text.matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/g)) refs.push(m[1]);
  }
  return [...new Set(refs.filter(ref => assetType.test(ref.split(/[?#]/)[0])).map(ref => localReference(ref, file)).filter(ref => ref && assetRoot.test(ref) && assetType.test(ref)))];
}

function publicFiles(source) {
  const found = new Set([...pages, ...supportFiles]);
  const queue = [...found];
  while (queue.length) {
    const file = queue.pop();
    if (file.includes('..') || path.isAbsolute(file)) throw new Error(`Unsafe asset path: ${file}`);
    const full = path.join(source, file);
    if (!fs.existsSync(full)) throw new Error(`Missing public dependency: ${file}`);
    const relative = path.relative(fs.realpathSync(source), fs.realpathSync(full));
    if (relative.startsWith('..') || path.isAbsolute(relative) || fs.lstatSync(full).isSymbolicLink()) throw new Error(`Unsafe asset symlink: ${file}`);
    if (!/\.(html|css|js|xml)$/.test(file)) continue;
    const text = fs.readFileSync(full, 'utf8');
    for (const dep of dependencies(text, file)) {
      if (!found.has(dep)) { found.add(dep); queue.push(dep); }
    }
  }
  return found;
}

function buildPublic(source, output) {
  const files = publicFiles(source); // Validate before replacing the generated artifact.
  fs.rmSync(output, {recursive: true, force: true});
  fs.mkdirSync(output, {recursive: true});
  for (const file of files) {
    const dest = path.join(output, file);
    fs.mkdirSync(path.dirname(dest), {recursive: true});
    fs.copyFileSync(path.join(source, file), dest);
  }
  const sitemapRoutes = routes.slice(0, 4); // Stream stays noindex; 404 is not discoverable.
  fs.writeFileSync(path.join(output, 'sitemap.xml'),
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    sitemapRoutes.map(route => `  <url><loc>https://leewilkers.com${route}</loc></url>`).join('\n') + '\n</urlset>\n');
  // Crawlers must be able to see the 404 response on removed draft URLs.
  fs.writeFileSync(path.join(output, 'robots.txt'), 'User-agent: *\nAllow: /\n\nSitemap: https://leewilkers.com/sitemap.xml\n');
  const verification = 'google8f11425ab7fc438d.html';
  if (fs.existsSync(path.join(source, verification))) fs.copyFileSync(path.join(source, verification), path.join(output, verification));
  console.log(`[public-export] ${pages.length} pages and ${files.size - pages.length} referenced assets; no draft or tool directories.`);
  return files;
}

if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  buildPublic(path.join(root, '_site'), path.join(root, '_public'));
}
module.exports = {buildPublic, publicFiles, dependencies, pages, supportFiles};
