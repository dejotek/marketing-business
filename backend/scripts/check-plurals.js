#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const apiPath = path.join(__dirname, '..', 'src', 'api');
if (!fs.existsSync(apiPath)) {
  console.error('API folder not found:', apiPath);
  process.exit(1);
}

const schemas = [];
const apis = fs.readdirSync(apiPath).filter(f => fs.statSync(path.join(apiPath, f)).isDirectory());
apis.forEach(api => {
  const ctDir = path.join(apiPath, api, 'content-types');
  if (!fs.existsSync(ctDir)) return;
  const cts = fs.readdirSync(ctDir).filter(f => fs.statSync(path.join(ctDir, f)).isDirectory());
  cts.forEach(ct => {
    const schemaPath = path.join(ctDir, ct, 'schema.json');
    if (!fs.existsSync(schemaPath)) return;
    try {
      const raw = fs.readFileSync(schemaPath, 'utf8');
      const obj = JSON.parse(raw);
      const plural = obj.info && obj.info.pluralName;
      schemas.push({ api, ct, file: schemaPath, plural, collectionName: obj.collectionName });
    } catch (e) {
      console.warn('Failed to parse', schemaPath, e.message);
    }
  });
});

console.log('Found', schemas.length, 'schema(s)');
schemas.forEach(s => console.log('-', s.file, '->', s.plural || '(no plural)', 'collection:', s.collectionName || '(no collectionName)'));

const map = {};
schemas.forEach(s => {
  const key = s.plural || s.collectionName || s.file;
  map[key] = map[key] || [];
  map[key].push(s);
});

const duplicates = Object.entries(map).filter(([k, v]) => v.length > 1);
if (duplicates.length) {
  console.error('\nDuplicate pluralName/collectionName detected:');
  duplicates.forEach(([k, v]) => {
    console.error('\n-', k);
    v.forEach(x => console.error('   ', x.file));
  });
  process.exit(2);
}

console.log('\nNo duplicates detected.');
