import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const context=vm.createContext({});vm.runInContext(readFileSync(new URL('../browser-extension/object-inheritance-review.js',import.meta.url),'utf8'),context);
const row=(id,label)=>({id,cells:[{text:id,checked:[]},{text:'model',checked:[]},{text:label,checked:[]},{text:'fill',checked:[true]}]});
function fixture(){return{before:[row('root','Old 替换'),row('child','无'),row('custom','Own 替换')],after:[row('root','Bright 1 替换'),row('child','Bright 1'),row('custom','Own 替换')],rowId:'root',rootId:'root',column:2,descendants:['child','custom'],previewMatches:['child']};}
test('root line propagation accepts only the inherited column and matching preview',()=>{const r=context.__drawingReviewInheritedLines(fixture());assert.equal(r.ok,true);assert.equal(r.effects[0].id,'child');});
test('unrelated changes, custom references, wrong previews and changed rows remain blocked',()=>{
 for(const mutate of [f=>{f.after[1].cells[3].checked=[false];},f=>{f.after[2].cells[2].text='Bright 1';},f=>{f.previewMatches=[];},f=>{f.descendants=[];},f=>{f.after[1].id='other';},f=>{f.rootId='other';}]){const f=fixture();mutate(f);assert.equal(context.__drawingReviewInheritedLines(f).ok,false);}
});
