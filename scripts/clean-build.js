const fs = require('node:fs');
const path = require('node:path');
const {validateSource} = require('./validate-source');
const root = path.resolve(__dirname, '..');
validateSource(path.join(root, 'src'));
fs.rmSync(path.join(root, '_site'), {recursive: true, force: true});
