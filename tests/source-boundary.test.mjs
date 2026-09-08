import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {validateSource}=require('../scripts/validate-source.js');
function fixture(t) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'clean-source-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const put=(file,text='')=>{const p=path.join(root,file);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,text);};
  for(const file of ['index.njk','consulting.njk','projects.njk','shelf.njk','stream.njk','404.njk','shelf.xml.njk','_includes/base.njk','_includes/type-symbols.njk','_includes/dust-placeholder.njk','_data/site.json','content/items/items.json','google8f11425ab7fc438d.html'])put(file);
  put('_data/topics.json','["Books"]');return {root,put};
}
test('source rejects extra pages, private records, hidden notes and symlinks',t=>{
  const f=fixture(t);assert.equal(validateSource(f.root).items,0);
  for(const [file,text] of [['internal.njk','hello'],['content/items/item.md','---\ndest: stream\n---'],['content/items/item.md','---\ndest: shelf\n---\nPrivate draft'],['content/items/item.md','---\ndest: shelf\nprivate_note: secret\n---']]) {
    f.put(file,text);assert.throws(()=>validateSource(f.root));fs.unlinkSync(path.join(f.root,file));
  }
  fs.symlinkSync(os.tmpdir(),path.join(f.root,'img'));assert.throws(()=>validateSource(f.root),/symlink/);
});
test('source requires stable publication dates and a valid topic',t=>{
  const f=fixture(t);const item='---\ntitle: Book\ndest: shelf\ntopic: Books\n';
  f.put('content/items/book.md',item+'---');assert.throws(()=>validateSource(f.root),/added date/);
  f.put('content/items/book.md',item+'added: "2026-04-12T12:00:00-04:00"\n---');assert.equal(validateSource(f.root).items,1);
});
test('malformed links and display flags fail before rendering',t=>{
  const f=fixture(t),base='---\ntitle: Book\ndest: shelf\ntopic: Books\nadded: "2026-04-12T12:00:00-04:00"\n';
  for(const bad of ['links: https://example.com','links: [{url: 12}]','shelf_list: "true"','title: [Book]']) {
    f.put('content/items/book.md',base+bad+'\n---');assert.throws(()=>validateSource(f.root));
  }
});
