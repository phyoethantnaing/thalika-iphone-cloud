#!/usr/bin/env node
const base=process.env.STUDIO_URL; const token=process.env.RUNTIME_TOKEN;
if(!base?.startsWith('https://')||!token) throw new Error('Set HTTPS STUDIO_URL and RUNTIME_TOKEN');
const began=Date.now(); const deadline=began+Number(process.env.STARTUP_TIMEOUT_MS||900000);
let lastStage='';
while(Date.now()<deadline){
  try{
    const r=await fetch(new URL('/api/internal/runtime',base),{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(8000)});
    if(r.ok){const status=await r.json();if(status.stage!==lastStage){console.log(status.stage);lastStage=status.stage;}if(status.ready){console.log(`Verified ready after ${((Date.now()-began)/1000).toFixed(1)} seconds of observation`);process.exit(0);}}
  }catch{/* provisioning/network errors are transient until timeout */}
  await new Promise(resolve=>setTimeout(resolve,5000));
}
throw new Error('Readiness timeout. Compute may still be billed. Check the Pod dashboard, storage mount and private logs.');
