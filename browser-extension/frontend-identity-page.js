// Reads rendered account labels only. Never reads cookies, tokens, storage, or application internals.
globalThis.__drawingReadFrontendIdentity=async function(options){
  const text=n=>(n?.innerText||n?.textContent||'').trim().replace(/\s+/g,' ');
  const clean=s=>(s||'').trim().replace(/\s+/g,' ');
  const visible=n=>!!n?.getClientRects().length&&getComputedStyle(n).visibility!=='hidden';
  const browser=navigator.userAgent.includes('Edg/')?'Edge':navigator.userAgent.includes('Chrome/')?'Chrome':'unknown';
  const result={readerBuild:'frontend-identity-4',readAt:new Date().toISOString(),url:location.origin+location.pathname,browser,
    status:'identity-unconfirmed',companyDisplayName:null,visibleAccountId:null,displayNameMatch:null,identityVerified:false,saved:false,published:false,evidence:[]};
  const generic=new Set(['头像','用户头像','账号','账户','个人中心','用户中心','avatar','profile','account']);
  const usable=s=>!!clean(s)&&clean(s).length<=200&&!generic.has(clean(s).toLowerCase())&&!/https?:\/\//i.test(s);
  const rect=n=>{const r=n.getBoundingClientRect();return{x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height)};};
  const key=n=>{
    const parts=[];let p=n;
    for(let i=0;p&&p!==document.body&&i<8;i++,p=p.parentElement){
      parts.unshift([p.tagName,p.id||'',p.getAttribute('class')||'',p.parentElement?[...p.parentElement.children].indexOf(p):0]);
    }
    return JSON.stringify(parts);
  };
  const isHeader=n=>{const r=n.getBoundingClientRect();return visible(n)&&r.width>0&&r.height>0&&r.width<=200&&r.height<=160&&r.y>=0&&r.y<160&&r.x>=innerWidth*.60;};
  const candidateNodes=()=>{
    const nodes=[...document.querySelectorAll('img,[class*="avatar"],[class*="Avatar"],[data-testid*="avatar"],[aria-label*="头像"]')].filter(isHeader);
    // An avatar wrapper and its image are one candidate, not two independently chosen targets.
    return nodes.filter(n=>!nodes.some(x=>x!==n&&n.contains(x)&&isHeader(x)));
  };
  try{
    if(!['www.kujiale.com','beta.kujiale.com','yun.kujiale.com','yun-beta.kujiale.com'].includes(location.hostname)||
      location.protocol!=='https:'||location.port)throw Error('Not a supported design origin');
    if(!['inspect','hover'].includes(options.action))throw Error('Invalid identity-read action');
    if(browser!==options.expectedBrowser)throw Error('Connected browser family does not match the selected browser');
    if(options.expectedCompanyName!==undefined&&(!options.expectedCompanyName?.trim()||options.expectedCompanyName.length>200))throw Error('Invalid expected company display name');
    const nodes=candidateNodes();
    result.avatarCandidates=nodes.map(n=>({avatarKey:key(n),tag:n.tagName,id:n.id||null,classes:n.getAttribute('class')||'',title:n.getAttribute('title'),ariaLabel:n.getAttribute('aria-label'),alt:n.getAttribute('alt'),bounds:rect(n)})).slice(0,30);
    if(options.action==='inspect')return{...result,status:'identity-inspected',candidateCount:nodes.length};
    if(!options.avatarKey)throw Error('Inspect first and select the observed avatarKey');
    const matches=nodes.filter(n=>key(n)===options.avatarKey);
    if(matches.length!==1)throw Error('Observed avatar no longer uniquely identifies a header element; inspect again');
    const avatar=matches[0];
    const titles=()=>{
      const values=[];let n=avatar;
      for(let i=0;n&&n!==document.body&&i<3;i++,n=n.parentElement){
        if(!isHeader(n))break;
        const value=n.getAttribute('title');if(usable(value))values.push({source:'avatar-title',text:clean(value),bounds:rect(n)});
      }
      return values;
    };
    const tooltipNodes=()=>[...document.querySelectorAll('[role="tooltip"],[class*="tooltip"],[class*="Tooltip"]')].filter(visible);
    const before=new Set(tooltipNodes());
    const originalUrl=location.href;
    try{
      // Mouse events reveal the same UI account label described by the user; no clicks or navigation.
      for(const type of ['pointerover','mouseover','mouseenter'])avatar.dispatchEvent(new MouseEvent(type,{bubbles:type!=='mouseenter',cancelable:true,view:window}));
      await new Promise(resolve=>setTimeout(resolve,800));
      if(location.href!==originalUrl||!avatar.isConnected||!isHeader(avatar))throw Error('Design page or avatar changed during hover');
      result.evidence=titles();
      const described=new Set();let owner=avatar;
      for(let i=0;owner&&i<3;i++,owner=owner.parentElement)for(const id of (owner.getAttribute('aria-describedby')||'').split(/\s+/).filter(Boolean))described.add(id);
      const a=avatar.getBoundingClientRect();
      const accountIds=[];
      // Observed on the real design toolbar: the account name is in a custom menu, not a tooltip.
      for(const n of [...document.querySelectorAll('[class*="TopBar-account-name_"]')].filter(visible)){
        const t=text(n),r=n.getBoundingClientRect();
        const nearby=r.x+r.width>=a.x-200&&r.x<=a.x+a.width+160&&r.y>=0&&r.y<=a.y+a.height+180;
        if(usable(t)&&nearby){
          result.evidence.push({source:'avatar-account-menu',text:t,selector:'[class*="TopBar-account-name_"]',bounds:rect(n)});
          const root=n.parentElement?.parentElement;
          for(const idNode of [...(root?.querySelectorAll('[class*="TopBar-account-id_"]')||[])].filter(visible)){
            const raw=text(idNode),match=/^ID\s*[:：]\s*([A-Za-z0-9_-]{1,100})$/i.exec(raw),ir=idNode.getBoundingClientRect();
            if(match&&Math.abs(ir.x-r.x)<=50&&ir.y>=r.y&&ir.y<=r.y+r.height+60)accountIds.push({id:match[1],source:'avatar-account-menu-id',text:raw,selector:'[class*="TopBar-account-id_"]',bounds:rect(idNode)});
          }
        }
      }
      for(const n of tooltipNodes()){
        const t=text(n),r=n.getBoundingClientRect();
        const nearby=r.x+r.width>=a.x-160&&r.x<=a.x+a.width+160&&r.y>=0&&r.y<=a.y+a.height+180;
        if(usable(t)&&(described.has(n.id)||(!before.has(n)&&nearby)))result.evidence.push({source:described.has(n.id)?'avatar-describedby':'new-nearby-tooltip',text:t,bounds:rect(n)});
      }
      const names=[...new Set(result.evidence.map(e=>e.text))];result.displayNameCandidates=names;
      const expected=clean(options.expectedCompanyName);
      // Names are not searched in the rest of the page; only evidence attached to the chosen avatar counts.
      if(names.length===1){
        result.companyDisplayName=names[0];
        const ids=[...new Set(accountIds.map(e=>e.id))];
        if(ids.length===1){result.visibleAccountId=ids[0];result.accountIdEvidence=accountIds.find(e=>e.id===ids[0]);}
        if(options.expectedCompanyName===undefined)result.status='identity-read';
        else {result.displayNameMatch=names[0]===expected;result.status=result.displayNameMatch?'display-name-match':'display-name-mismatch';}
      }
      return result;
    }finally{
      for(const type of ['pointerout','mouseout','mouseleave'])if(avatar.isConnected)avatar.dispatchEvent(new MouseEvent(type,{bubbles:type!=='mouseleave',cancelable:true,view:window}));
    }
  }catch(error){return{...result,status:'identity-read-failed',error:error.message};}
};
