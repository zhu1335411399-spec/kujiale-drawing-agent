// Pure comparison: a root line-reference change may update inherited descendants in that column.
globalThis.__drawingReviewInheritedLines=function({before,after,rowId,rootId,column,descendants,previewMatches}){
 const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
 const equal=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
 const effects=[];
 if(rowId!==rootId||before.length!==after.length||!before.length||![1,2,5].includes(column))return{ok:false,effects};
 const root=after.find(r=>r.id===rowId),newCell=root?.cells[column];
 if(!newCell||!newCell.text.endsWith(' 替换'))return{ok:false,effects};
 const inheritedText=newCell.text.slice(0,-3).trim();
 for(let i=0;i<before.length;i++){
  const old=before[i],now=after[i];if(old.id!==now.id||old.cells.length!==now.cells.length)return{ok:false,effects};
  if(equal(old,now))continue;
  for(let c=0;c<old.cells.length;c++)if(c!==column&&!equal(old.cells[c],now.cells[c]))return{ok:false,effects};
  if(!equal(old.cells[column].checked,now.cells[column].checked))return{ok:false,effects};
  if(old.id===rowId)continue;
  if(!descendants.includes(old.id)||!previewMatches.includes(old.id)||old.cells[column].text.includes('替换')||now.cells[column].text!==inheritedText)return{ok:false,effects};
  effects.push({id:old.id,before:old.cells[column].text,after:now.cells[column].text});
 }
 return{ok:true,effects};
};
