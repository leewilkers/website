const fs = require('node:fs');
const path = require('node:path');
const matter = require('gray-matter');
const templates = ['index.njk', 'consulting.njk', 'projects.njk', 'shelf.njk', 'stream.njk', '404.njk', 'shelf.xml.njk'];
const fixed = new Set([...templates, '_includes/base.njk', '_includes/type-symbols.njk', '_includes/dust-placeholder.njk', '_data/site.json', '_data/topics.json', 'content/items/items.json', 'google8f11425ab7fc438d.html']);
const media = /^(?:css|fonts|img|assets)\/(?!.*(?:^|\/)\.)[^\\]+\.(?:css|js|png|jpe?g|webp|avif|gif|svg|ico|woff2?|ttf|otf|mp3|wav|ogg|mp4|webm)$/i;
const fields = new Set(['author','title','type','image','shelf_list','cover_label','dest','topic','url','order','dek','blurb','links','description','description_source','description_source_url','cover_label_text','note','quote','interactive','pinned','tooltip','source_label','type_symbol','year','date','published','added']);
function validateSource(root) {
  let items = 0;
  const topics = JSON.parse(fs.readFileSync(path.join(root, '_data/topics.json'), 'utf8'));
  for (const file of fixed) if (!fs.existsSync(path.join(root,file))) throw Error(`Missing source: ${file}`);
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, {withFileTypes:true})) {
      const full = path.join(dir, entry.name), file = path.relative(root, full).split(path.sep).join('/');
      if (entry.isSymbolicLink()) throw Error(`Source symlink is not allowed: ${file}`);
      if (entry.isDirectory()) {walk(full); continue;}
      if (/^content\/items\/[^/]+\.md$/.test(file)) {
        const {data,content} = matter(fs.readFileSync(full,'utf8'));
        if (data.dest !== 'shelf') throw Error(`Only public shelf records belong here: ${file}`);
        if (content.trim()) throw Error(`Unpublished note body in ${file}`);
        for (const key of Object.keys(data)) if (!fields.has(key)) throw Error(`Unrecognized item field ${key}: ${file}`);
        for (const [key,value] of Object.entries(data)) {
          if (['shelf_list','cover_label','interactive','pinned'].includes(key)) {
            if (typeof value !== 'boolean') throw Error(`Expected boolean ${key}: ${file}`);
          } else if (['order','year'].includes(key)) {
            if (!Number.isFinite(Number(value))) throw Error(`Expected numeric ${key}: ${file}`);
          } else if (key === 'links') {
            if (!Array.isArray(value) || value.some(link => !link || typeof link !== 'object' || typeof link.url !== 'string' || (link.label !== undefined && typeof link.label !== 'string') || Object.keys(link).some(k => !['url','label'].includes(k)))) throw Error(`Expected links with url and optional label: ${file}`);
          } else if (typeof value !== 'string') throw Error(`Expected text ${key}: ${file}`);
        }
        if (!data.title || !topics.includes(data.topic)) throw Error(`Missing title or unknown topic: ${file}`);
        if (!data.added || !Number.isFinite(Date.parse(data.added))) throw Error(`Set an explicit added date: ${file}`);
        if (data.image && (!data.image.startsWith('/img/') || data.image.includes('..') || !fs.existsSync(path.join(root,data.image.slice(1))))) throw Error(`Missing or unsafe cover: ${file}`);
        items++;
      } else if (!fixed.has(file) && !media.test(file)) throw Error(`Unapproved source file: ${file}`);
      if (templates.includes(file)) {
        const {data} = matter(fs.readFileSync(full, 'utf8'));
        if (data.draft || data.shelfCuration) throw Error(`Draft or curation mode is not public: ${file}`);
      }
    }
  }
  walk(root);
  return {items};
}
module.exports = {validateSource};
