import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import exporter from '../scripts/build-public.js';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'site-public-test-'));
  t.after(() => fs.rmSync(root, {recursive:true, force:true}));
  const source = path.join(root, 'source'), output = path.join(root, 'output');
  function put(file, text) { const p=path.join(source,file); fs.mkdirSync(path.dirname(p),{recursive:true}); fs.writeFileSync(p,text); }
  for(const file of [...exporter.pages,...exporter.supportFiles]) put(file, '<h1>Public</h1>');
  return {source,output,put};
}

test('public export excludes internal pages and unreferenced assets, even if locally generated', t => {
  const f=fixture(t);
  for(const file of ['_drafts/test/index.html','preview-7m4q/index.html','vgr_zirp_transcripts/session/index.html','assets/logo_stool/prompt_v3/index.html','shelf-movers/index.html','img/private.png']) f.put(file,'private');
  f.put('index.html','<link href="/css/main.css"><img src="/img/public.png"><meta content="https://leewilkers.com/img/og.png">');
  f.put('img/og.png','social preview');
  f.put('css/main.css','@font-face { src: url(../fonts/body.woff2); }');
  f.put('img/public.png','image'); f.put('fonts/body.woff2','font');
  exporter.buildPublic(f.source,f.output);
  assert(fs.existsSync(path.join(f.output,'fonts/body.woff2')));
  assert(fs.existsSync(path.join(f.output,'img/public.png')));
  assert(fs.existsSync(path.join(f.output,'img/og.png')));
  for(const dir of ['_drafts','preview-7m4q','vgr_zirp_transcripts','assets','shelf-movers']) assert(!fs.existsSync(path.join(f.output,dir)));
  assert(!fs.existsSync(path.join(f.output,'img/private.png')));
  const map=fs.readFileSync(path.join(f.output,'sitemap.xml'),'utf8');
  assert.equal([...map.matchAll(/<loc>/g)].length,4);
  assert(!map.includes('/stream/')&&!map.includes('404'));
});
test('public export fails closed on a draft page or unapproved navigation',t=>{
  const f=fixture(t);f.put('index.html','<a href="/sound-lab/">Lab</a>');
  assert.throws(()=>exporter.buildPublic(f.source,f.output),/Unapproved internal link/);
  f.put('index.html','<body data-draft="true">Draft</body>');
  assert.throws(()=>exporter.buildPublic(f.source,f.output),/Draft in public page/);
});
test('public export fails on missing assets and replaces stale output only after validation',t=>{
  const f=fixture(t);fs.mkdirSync(f.output);fs.writeFileSync(path.join(f.output,'old.txt'),'old');
  f.put('index.html','<img src="/img/missing.png">');
  assert.throws(()=>exporter.buildPublic(f.source,f.output),/Missing public dependency/);
  assert(fs.existsSync(path.join(f.output,'old.txt')));
  f.put('img/missing.png','image');exporter.buildPublic(f.source,f.output);
  assert(!fs.existsSync(path.join(f.output,'old.txt')));
});

test('navigation validation handles browser HTML syntax and same-origin URLs', t => {
  const f=fixture(t);
  for(const link of ["<a href='/private/'>x</a>", '<A HREF = /private/>x</A>', '<a href="https://leewilkers.com/private/">x</a>', '<a href="/priv&#97;te/">x</a>', '<a href="private/">x</a>']) {
    f.put('index.html',link);
    assert.throws(()=>exporter.buildPublic(f.source,f.output),/Unapproved internal link/);
  }
  f.put('index.html', '<a href="https://example.com/private/">External</a><a href="#section">Section</a>');
  exporter.buildPublic(f.source,f.output);
});
test('relative and unquoted media dependencies are exported',t=>{
  const f=fixture(t);
  f.put('index.html','<img src=img/cover.png><video poster="img/cover.png"><source src="img/clip.mp4"></video>');
  f.put('img/cover.png','image');f.put('img/clip.mp4','video');
  exporter.buildPublic(f.source,f.output);
  assert(fs.existsSync(path.join(f.output,'img/clip.mp4')));
});
test('symlinks and encoded traversal cannot escape the public tree',t=>{
  const f=fixture(t);f.put('img/placeholder.png','image');
  fs.symlinkSync(path.join(f.output,'../../elsewhere'),path.join(f.source,'img','link.png'));
  f.put('index.html','<img src="/img/%252e%252e/private.png">');
  assert.throws(()=>exporter.buildPublic(f.source,f.output));
  const secret=path.join(f.source,'..','private.png');fs.writeFileSync(secret,'private');
  fs.unlinkSync(path.join(f.source,'img','link.png'));fs.symlinkSync(secret,path.join(f.source,'img','link.png'));
  f.put('index.html','<img src="/img/link.png">');
  assert.throws(()=>exporter.buildPublic(f.source,f.output),/Unsafe asset symlink/);
});
