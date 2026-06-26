#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const versionFile = path.join(root, 'version.json');
const swFile = path.join(root, 'sw.js');
const htmlFile = path.join(root, 'index.html');
const appJsFile = path.join(root, 'src', 'core', 'app.js');

const args = process.argv.slice(2);
const verFlagIdx = args.indexOf('--ver');
let newV;
if (verFlagIdx >= 0 && args[verFlagIdx + 1]) {
  newV = parseInt(args[verFlagIdx + 1]);
} else {
  const cur = JSON.parse(fs.readFileSync(versionFile, 'utf8'));
  newV = cur.v + 1;
}

// 1. version.json
fs.writeFileSync(versionFile, JSON.stringify({ v: newV }) + '\n');

// 2. sw.js CACHE name
let sw = fs.readFileSync(swFile, 'utf8');
sw = sw.replace(/quiz-v\d+/g, `quiz-v${newV}`);
// Also update all ?v=N in STATIC array
sw = sw.replace(/\?v=\d+/g, `?v=${newV}`);
fs.writeFileSync(swFile, sw);

// 3. index.html: update all ?v=N references
let html = fs.readFileSync(htmlFile, 'utf8');
html = html.replace(/\?v=\d+/g, `?v=${newV}`);
fs.writeFileSync(htmlFile, html);

// 4. js/app.js APP_V constant
let appJs = fs.readFileSync(appJsFile, 'utf8');
appJs = appJs.replace(/const APP_V = \d+/, `const APP_V = ${newV}`);
fs.writeFileSync(appJsFile, appJs);

console.log(`✅ Bumped to v${newV}`);
