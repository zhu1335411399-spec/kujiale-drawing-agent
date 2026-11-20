import fs from 'node:fs';
const root=new URL('../browser-extension/',import.meta.url),path=new URL('frontend-identity-page.js',root);
const content=fs.readFileSync(path,'utf8');
const marker='// BEGIN GENERATED FRONTEND CONFIG SYNC';
const base=content.split(marker)[0].split('// Fixed configuration refresh in the customer')[0].trimEnd();
fs.writeFileSync(path,base+'\n'+marker+'\n'+fs.readFileSync(new URL('frontend-capture-page.js',root),'utf8')+'\n'+fs.readFileSync(new URL('frontend-sync-page.js',root),'utf8'));
console.log('Bundled fixed frontend configuration refresh');
