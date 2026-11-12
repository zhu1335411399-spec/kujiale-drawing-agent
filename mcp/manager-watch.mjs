import {ensureDaemon} from './ipc.mjs';
let client,stopping=false;const stop=()=>{stopping=true;client?.close();};process.once('SIGTERM',stop);process.once('SIGINT',stop);
try{do{try{client||=await ensureDaemon();console.log(JSON.stringify(await client.call('/manager/status')));}catch(error){client?.close();client=null;console.log(JSON.stringify({checkedAt:Date.now(),service:'unavailable',error:error.message,browsers:[]}));}if(process.argv.includes('--once'))break;if(!stopping)await new Promise(r=>setTimeout(r,2000));}while(!stopping);}finally{client?.close();}
