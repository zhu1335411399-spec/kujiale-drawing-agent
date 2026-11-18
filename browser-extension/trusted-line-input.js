// Browser input is restricted to the current authorized line-style operation and observed input.
export async function withTrustedLineInputs({chromeApi,tabId,values,target,run}){
  const allowed=Object.fromEntries(Object.entries(values).filter(([,v])=>v!==undefined));
  if(!Object.keys(allowed).length)return run();
  const initial=await chromeApi.tabs.get(tabId);
  if(!/^https:\/\/(?:www|beta|yun|yun-beta)\.kujiale\.com\/pub\/saas\/workbench\/construction\/drawing_config\/config\/style(?:[?#]|$)/.test(initial.url))throw Error('Trusted input requires the bound line-style page');
  await chromeApi.debugger.attach({tabId},'1.3');
  let done=false,outcome,lastNonce=null;
  const evaluate=(func,args=[])=>chromeApi.scripting.executeScript({target:{tabId},func,args});
  const command=(name,args)=>chromeApi.debugger.sendCommand({tabId},name,args);
  try{
    await evaluate(()=>{
      globalThis.__drawingTrustedInputRequest=null;globalThis.__drawingTrustedInputAck=null;
      globalThis.__drawingTrustedFill=async(input,value,field,rowId)=>{
        const nonce=crypto.randomUUID();input.setAttribute('data-drawing-trusted-input',nonce);
        globalThis.__drawingTrustedInputRequest={nonce,value,field,rowId};
        try{
          for(let i=0;i<100;i++){
            await new Promise(resolve=>setTimeout(resolve,80));
            const ack=globalThis.__drawingTrustedInputAck;
            if(ack?.nonce===nonce){if(ack.error)throw Error(ack.error);return 'browser-input';}
          }
          throw Error('Browser input timed out; inspect before retrying');
        }finally{input.removeAttribute('data-drawing-trusted-input');globalThis.__drawingTrustedInputRequest=null;}
      };
    });
    const running=Promise.resolve().then(run).then(value=>{outcome={value};done=true;},error=>{outcome={error};done=true;});
    while(!done){
      await new Promise(resolve=>setTimeout(resolve,80));
      const [probe]=await evaluate((expected)=>{
        const req=globalThis.__drawingTrustedInputRequest;if(!req)return null;
        const status=(document.querySelector('[class*="TopBarRightComponent-configDesc"]')?.innerText||'').replace(/\s+/g,' ').trim();
        const customer=/来自于\s*(.*?)\s+\d{4}-\d{2}-\d{2}/.exec(status)?.[1]?.trim();
        const selected=[...document.querySelectorAll('.ant-select-selection-item')].filter(n=>n.getClientRects().length&&(n.getAttribute('title')||n.innerText).trim()===expected.expectedConfigName);
        const inputs=[...document.querySelectorAll('input[data-drawing-trusted-input]')].filter(n=>n.getAttribute('data-drawing-trusted-input')===req.nonce&&n.getClientRects().length&&!n.disabled&&!n.readOnly);
        if(customer!==expected.expectedCustomerName||selected.length!==1||inputs.length!==1)return{...req,error:'Input target or customer changed'};
        const row=[...document.querySelectorAll('tr[data-row-key]')].filter(n=>n.getAttribute('data-row-key')===req.rowId&&n.getClientRects().length);
        if(row.length!==1)return{...req,error:'Edited row is not uniquely visible'};
        const input=inputs[0];
        if(req.field==='colorIndex'&&!input.matches('input[class*="ColorIndexPicker-input"]'))return{...req,error:'Color input ownership changed'};
        if(req.field!=='colorIndex'&&!row[0].contains(input))return{...req,error:'Input is outside the edited row'};
        const r=input.getBoundingClientRect();return{...req,x:r.x+r.width/2,y:r.y+r.height/2};
      },[target]);
      const req=probe?.result;if(!req||req.nonce===lastNonce)continue;lastNonce=req.nonce;
      let error=req.error;
      try{
        if(error)throw Error(error);
        if(!Object.hasOwn(allowed,req.field)||allowed[req.field]!==req.value)throw Error('Input does not match authorized field and value');
        if((await chromeApi.tabs.get(tabId)).url!==initial.url)throw Error('Page navigated before browser input');
        await command('Input.dispatchMouseEvent',{type:'mousePressed',x:req.x,y:req.y,button:'left',clickCount:1});
        await command('Input.dispatchMouseEvent',{type:'mouseReleased',x:req.x,y:req.y,button:'left',clickCount:1});
        await command('Input.dispatchKeyEvent',{type:'keyDown',key:'a',code:'KeyA',windowsVirtualKeyCode:65,modifiers:2,commands:['selectAll']});
        await command('Input.dispatchKeyEvent',{type:'keyUp',key:'a',code:'KeyA',windowsVirtualKeyCode:65,modifiers:2});
        await command('Input.insertText',{text:req.value});
        await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
        await command('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
      }catch(e){error=e.message;}
      await evaluate(ack=>{globalThis.__drawingTrustedInputAck=ack;},[{nonce:req.nonce,...(error?{error}:{})}]);
    }
    await running;if(outcome.error)throw outcome.error;return outcome.value;
  }finally{
    await evaluate(()=>{delete globalThis.__drawingTrustedFill;delete globalThis.__drawingTrustedInputRequest;delete globalThis.__drawingTrustedInputAck;}).catch(()=>{});
    await chromeApi.debugger.detach({tabId}).catch(()=>{});
  }
}
