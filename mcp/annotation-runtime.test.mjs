import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const code=fs.readFileSync(new URL('../browser-extension/annotation-style-runtime-page.js',import.meta.url),'utf8');
function fixture(kind='text'){
 const labels={text:'文本',leader:'引线',dimension:'尺寸',elevation:'标高'};let phase='list',query='',creates=0,completes=0;const rows=[{id:'original',name:'Original'}],session=new Map();
 const node=label=>({innerText:label,getClientRects:()=>[{}],getAttribute:()=>null,querySelectorAll:()=>[],disabled:false});
 class Input{constructor(placeholder,value=''){this.placeholder=placeholder;this._value=value;}get value(){return this._value;}set value(v){this._value=v;}getAttribute(k){return k==='placeholder'?this.placeholder:null;}getClientRects(){return[{}];}focus(){}dispatchEvent(){}closest(){return{querySelectorAll:()=>[searchButton]};}}
 const searchInput=new Input('搜索样式名称'),nameInput=new Input('请输入样式名称','新建样式');
 const searchButton=node('搜索');searchButton.click=()=>{query=searchInput.value;};
 const create=node('新建样式');create.click=()=>{creates++;phase='name';};const next=node('下一步');next.click=()=>phase='spec';const finish=node('完成');finish.click=()=>{completes++;rows.push({id:'created',name:nameInput.value});phase='list';};
 const wizard=node('新建'+labels[kind]+'样式 取消 下一步');wizard.querySelectorAll=()=>[next];nameInput.parentElement=wizard;
 const selected=node('Fixture config'),status=node('当前 「基础配置」未发布来自于 Fixture customer 2026-01-01 12:00:00');
 const document={body:node(''),querySelector:()=>status,querySelectorAll:s=>s==='.ant-select-selection-item'?[selected]:s==='input'?[searchInput,...(phase==='name'?[nameInput]:[])]:s==='button,a,[role="button"]'?[create,...(phase==='spec'?[finish]:[])]:[]};
 const sandbox={document,location:{href:'https://www.kujiale.com/pub/saas/workbench/construction/drawing_config/config/style'},getComputedStyle:()=>({visibility:'visible'}),HTMLInputElement:Input,Event:class{},KeyboardEvent:class{},setTimeout:f=>f(),sessionStorage:{getItem:k=>session.get(k),setItem:(k,v)=>session.set(k,v)},__drawingAnnotationInputVersion:1,
  __drawingStyleInspection:async()=>phase==='spec'?{status:'editor-observed',dialogs:[{editorType:kind,fields:[]}]}:{status:'style-settings-observed',page:{tables:[{renderedRows:rows.filter(r=>r.name.includes(query)).length,rows:rows.filter(r=>r.name.includes(query)).map(r=>({id:r.id,cells:['1',r.name]}))}]}},
  __drawingTrustedFill:async(input,value)=>{input.value=value;}
 };vm.runInNewContext(code,sandbox);
 const args={annotationTask:'create',annotationKind:kind,requestId:'fixture_create_01',name:'Example '+kind,expectedConfigName:'Fixture config',expectedCustomerName:'Fixture customer'};
 return{run:extra=>sandbox.__drawingAnnotationRuntime({...args,...extra}),sandbox,rows,counts:()=>({creates,completes}),session};
}
test('all four categories use name-next-specification-complete and verify the new ID',async()=>{
 for(const kind of ['text','leader','dimension','elevation']){const f=fixture(kind),r=await f.run();assert.equal(r.status,'annotation-fields-verified');assert.equal(r.style.name,'Example '+kind);assert.equal(r.style.id,'created');assert.equal(r.saved,false);assert.deepEqual(f.counts(),{creates:1,completes:1});assert.equal((await f.run()).status,'request-already-used');assert.equal(f.counts().creates,1);assert.equal(f.rows[0].name,'Original');}
});
test('a blocked name input resumes its recorded wizard without another create click',async()=>{
 const f=fixture();const fill=f.sandbox.__drawingTrustedFill;f.sandbox.__drawingTrustedFill=async()=>{throw Error('input blocked');};assert.equal((await f.run()).status,'needs-review');assert.equal(f.counts().creates,1);
 f.sandbox.__drawingTrustedFill=fill;assert.equal((await f.run()).status,'annotation-fields-verified');assert.deepEqual(f.counts(),{creates:1,completes:1});
});
test('missing updated browser input stops before any new style is opened',async()=>{
 const f=fixture();delete f.sandbox.__drawingAnnotationInputVersion;assert.equal((await f.run()).status,'blocked');assert.equal(f.counts().creates,0);
});
