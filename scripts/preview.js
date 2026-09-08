// Local preview serves only the verified public artifact.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {spawn} = require('node:child_process');
const root = path.resolve(__dirname, '..'), output = path.join(root, '_public');
const port = Number(process.env.PORT || 8138);
const types = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.xml':'application/xml','.txt':'text/plain','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.avif':'image/avif','.gif':'image/gif','.mp4':'video/mp4','.webm':'video/webm','.mp3':'audio/mpeg','.ogg':'audio/ogg','.wav':'audio/wav','.woff2':'font/woff2','.woff':'font/woff'};
let building = false, pending = false, timer;
function build() {
  if (building) {pending = true; return;}
  building = true;
  const child = spawn('npm',['run','build:public'],{cwd:root,stdio:'inherit'});
  child.on('exit', code => {
    building = false;
    if (code !== 0) console.error('Build failed. Preview serves the previous valid artifact, if available.');
    else console.log(`Preview ready: http://127.0.0.1:${port}/ (reload after edits)`);
    if (pending) {pending = false; build();}
  });
}
http.createServer((req,res) => {
  if (!['GET','HEAD'].includes(req.method)) {res.writeHead(405);res.end();return;}
  let file;
  try {
    const pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    file = path.resolve(output, '.' + pathname);
    if (!file.startsWith(output + path.sep) && file !== output) throw Error('path');
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file,'index.html');
  } catch {res.writeHead(400);res.end();return;}
  let status = 200;
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {file=path.join(output,'404.html');status=404;}
  if (!fs.existsSync(file)) {res.writeHead(503);res.end('Building preview.');return;}
  const size = fs.statSync(file).size;
  let start=0,end=size-1;
  const headers = {'Content-Type':types[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-store','Accept-Ranges':'bytes'};
  if (req.headers.range && status === 200) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
    if (!match || (!match[1] && !match[2])) {res.writeHead(416,{'Content-Range':`bytes */${size}`});res.end();return;}
    if (match[1]) {start=Number(match[1]);end=match[2]?Math.min(Number(match[2]),size-1):size-1;}
    else start=Math.max(0,size-Number(match[2]));
    if (start > end || start >= size) {res.writeHead(416,{'Content-Range':`bytes */${size}`});res.end();return;}
    status=206;headers['Content-Range']=`bytes ${start}-${end}/${size}`;
  }
  headers['Content-Length']=Math.max(0,end-start+1);res.writeHead(status,headers);
  if (req.method === 'HEAD' || size === 0) res.end();else fs.createReadStream(file,{start,end}).on('error',()=>res.destroy()).pipe(res);
}).listen(port,'127.0.0.1',() => console.log(`Local-only preview listening on ${port}`));
for (const folder of ['src','scripts']) fs.watch(path.join(root,folder),{recursive:true},()=>{clearTimeout(timer);timer=setTimeout(build,350);});
fs.watch(path.join(root,'.eleventy.js'),()=>{clearTimeout(timer);timer=setTimeout(build,350);});
build();
