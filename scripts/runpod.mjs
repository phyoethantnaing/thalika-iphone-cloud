#!/usr/bin/env node
// Manual/operator fallback for official Runpod v1 APIs. No API credentials reach a browser.
// Commands that cost money require --approve-charges; storage deletion is not implemented.
import { readFile } from 'node:fs/promises';
const [command, ...args] = process.argv.slice(2);
const key = process.env.RUNPOD_API_KEY;
if (!key) throw new Error('RUNPOD_API_KEY must be set in the operator environment');
const approved = args.includes('--approve-charges');
const podId = process.env.RUNPOD_POD_ID;
const id = value => { if (!/^[a-zA-Z0-9_-]+$/.test(value || '')) throw new Error('Valid resource ID is required'); return value; };
async function api(endpoint, method='GET', body) {
  const r=await fetch('https://rest.runpod.io/v1'+endpoint,{method,headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
  if(!r.ok) throw new Error(`Runpod HTTP ${r.status}. Reconcile in dashboard before retrying.`);
  return r.status===204?null:r.json().catch(()=>null);
}
function summary(p) { return {id:p.id,name:p.name,desiredStatus:p.desiredStatus,costPerHr:p.adjustedCostPerHr??p.costPerHr??null,networkVolumeId:p.networkVolumeId||p.networkVolume?.id||null,lastStartedAt:p.lastStartedAt}; }
if(command==='status') console.log(JSON.stringify(summary(await api(`/pods/${id(podId)}?includeNetworkVolume=true`)),null,2));
else if(command==='list') console.log(JSON.stringify((await api('/pods?includeNetworkVolume=true')).map(summary),null,2));
else if(command==='start'||command==='resume') {
  if(!approved) throw new Error('Review current prices, then pass --approve-charges');
  await api(`/pods/${id(podId)}/start`,'POST'); console.log(JSON.stringify(summary(await api(`/pods/${id(podId)}`)),null,2));
} else if(command==='stop') {
  const token=process.env.RUNTIME_TOKEN;
  if(!token) throw new Error('RUNTIME_TOKEN required to guard active jobs; use provider dashboard for an unreachable Pod');
  const origin=`https://${id(podId)}-3000.proxy.runpod.net`;
  const r=await fetch(origin+'/api/internal/runtime',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({action:'reserve-stop'}),signal:AbortSignal.timeout(10000)});
  if(!r.ok) throw new Error('Safe stop refused or runtime unreachable. Check active jobs in Studio.');
  try { await api(`/pods/${id(podId)}/stop`,'POST'); }
  catch(e) { await fetch(origin+'/api/internal/runtime',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({action:'release'})}).catch(()=>{}); throw e; }
  console.log(JSON.stringify(summary(await api(`/pods/${id(podId)}`)),null,2));
} else if(command==='create-volume') {
  if(!approved) throw new Error('Persistent storage incurs charges. Pass --approve-charges after reviewing provider prices.');
  const size=Number(process.env.RUNPOD_VOLUME_GB); const dc=process.env.RUNPOD_DATA_CENTER_ID;
  if(!dc||!Number.isInteger(size)||size<20) throw new Error('Set RUNPOD_DATA_CENTER_ID and RUNPOD_VOLUME_GB >= 20');
  // Never retry this POST automatically after a network error.
  const volume=await api('/networkvolumes','POST',{name:'thalika-persistent',size,dataCenterId:dc});
  console.log(JSON.stringify(await api(`/networkvolumes/${id(volume.id)}`),null,2));
} else if(command==='create-pod') {
  if(!approved) throw new Error('Review current prices, then pass --approve-charges');
  if(!process.env.RUNPOD_TEMPLATE_ID||!process.env.RUNPOD_NETWORK_VOLUME_ID) throw new Error('Template and network volume IDs are required');
  const name=`thalika-${id(process.env.THALIKA_INSTALLATION_ID)}`;
  if((await api('/pods')).some(p=>p.name===name)) throw new Error('Matching Pod exists. Resume or reconcile it first.');
  const volume=await api(`/networkvolumes/${id(process.env.RUNPOD_NETWORK_VOLUME_ID)}`);
  if(volume.dataCenterId!==process.env.RUNPOD_DATA_CENTER_ID) throw new Error('Data center must match the volume');
  console.log('Creating a Pod once. If this request fails, inspect Runpod before trying again.');
  const pod=await api('/pods','POST',{name,templateId:process.env.RUNPOD_TEMPLATE_ID,cloudType:'SECURE',computeType:'GPU',gpuCount:1,gpuTypeIds:(process.env.RUNPOD_GPU_TYPES||'NVIDIA RTX A5000,NVIDIA GeForce RTX 3090').split(','),gpuTypePriority:'custom',dataCenterIds:[volume.dataCenterId],networkVolumeId:volume.id,volumeMountPath:'/workspace',ports:['3000/http'],interruptible:false});
  console.log(JSON.stringify(summary(await api(`/pods/${id(pod.id)}`)),null,2));
} else throw new Error('Commands: status, list, start/resume --approve-charges, stop, create-volume --approve-charges, create-pod --approve-charges. Termination/deletion is dashboard-only.');
