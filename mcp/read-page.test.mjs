import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readDrawingPage} from '../browser-extension/read-page.js';

function snapshot({extraSelect=false}={}){
  const selected={innerText:'示例基础模板'};
  const picker={getClientRects:()=>[{}],closest:()=>null,querySelector:s=>s==='[role="combobox"]'?{}:selected};
  const pagination={...picker,closest:()=>({})};
  const context={document:{body:{innerText:''},title:'配置页',querySelector:()=>null,querySelectorAll:s=>s==='.ant-select'?[picker,pagination,...(extraSelect?[picker]:[])]:[]},location:{origin:'https://www.kujiale.com',pathname:'/pub/saas/workbench/construction/drawing_config/config/style'},getComputedStyle:()=>({visibility:'visible'})};
  return vm.runInNewContext('('+readDrawingPage.toString()+')({kind:"context"})',context);
}
test('reads the unique selected template without relying on a generated rc_select ID',()=>{
  assert.equal(snapshot().identity.configName,'示例基础模板');
});
test('does not choose a template from multiple unbound selects',()=>{
  assert.equal(snapshot({extraSelect:true}).identity.configName,null);
});
