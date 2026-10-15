import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";

test("control reconciles actual state, never fabricates readiness, refuses active stop and duplicate provisioning", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(),"thalika-control-"));
  process.env.THALIKA_ROLE="control"; process.env.THALIKA_CONFIG_DIR=directory; process.env.RUNPOD_API_KEY="test-only";
  process.env.THALIKA_INSTALLATION_ID="test"; process.env.RUNTIME_TOKEN="internal-test-only-token-32-characters-minimum";
  process.env.RUNPOD_NETWORK_VOLUME_ID="volume1"; process.env.RUNPOD_DATA_CENTER_ID="DC1"; process.env.RUNPOD_TEMPLATE_ID="template1";
  const realFetch=globalThis.fetch;
  let pods: Record<string,unknown>[]=[]; let starts=0; let stops=0; let creates=0; let ready=false; let active=true;
  globalThis.fetch=async (url,init)=>{
    const value=String(url);
    if(value.endsWith('/networkvolumes/volume1')) return Response.json({id:'volume1',size:30,dataCenterId:'DC1'});
    if(value.includes('.proxy.runpod.net')) {
      if(init?.method==='POST') return active ? Response.json({error:'jobs active'},{status:409}) : Response.json({reserved:true});
      return Response.json({ready,stage:ready?'Ready':'Loading VoxCPM2',activeJobs:active?[{id:'job_test'}]:[],lastActivity:new Date().toISOString(),bootedAt:new Date().toISOString(),startup:{}});
    }
    if(value.includes('/pods?')) return Response.json(pods);
    if(value.endsWith('/start')) {starts++;pods[0].desiredStatus='RUNNING';return Response.json({});}
    if(value.endsWith('/stop')) {stops++;pods[0].desiredStatus='EXITED';return Response.json({});}
    if(value.endsWith('/pods')&&init?.method==='POST') {creates++;throw new Error('Ambiguous provider timeout');}
    if(value.includes('/pods/')) return Response.json(pods[0]);
    throw new Error('Unexpected request '+value);
  };
  try {
    const {controlAction,getControlStatus}=await import('../src/lib/cloud/control');
    await assert.rejects(controlAction('start',randomUUID()),/Provisioning is disabled/); assert.equal(creates,0);
    pods=[{id:'pod123',name:'thalika-test',desiredStatus:'EXITED',costPerHr:.5}];
    const key=randomUUID(); await controlAction('start',key); await controlAction('start',key); assert.equal(starts,1);
    const status=await getControlStatus(); assert.equal(status.mode,'control'); if(status.mode==='control'){assert.equal(status.modelReady,false);assert.equal(status.stage,'Loading VoxCPM2');}
    await assert.rejects(controlAction('stop',randomUUID()),/refused safe stop/); assert.equal(stops,0);
    active=false; ready=true; await controlAction('stop',randomUUID()); assert.equal(stops,1);
    const stopped=await getControlStatus(); if(stopped.mode==='control') assert.equal(stopped.stage,'Stopped');
    // New install: an uncertain create must block subsequent provisioning attempts.
    pods=[]; await fs.unlink(path.join(directory,'control.json')); process.env.ALLOW_GPU_PROVISIONING='1';
    await assert.rejects(controlAction('start',randomUUID()),/Ambiguous/);
    await assert.rejects(controlAction('start',randomUUID()),/uncertain/); assert.equal(creates,1);
  } finally {globalThis.fetch=realFetch; await fs.rm(directory,{recursive:true,force:true});}
});
