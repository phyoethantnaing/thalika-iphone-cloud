// CPU-only Docker control smoke test. Never calls a paid provider.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID, scryptSync } from 'node:crypto';
import assert from 'node:assert/strict';
const image=process.argv[2];
if(!image) throw new Error('Pass a locally built control image');
const directory=mkdtempSync(join(tmpdir(),'thalika-container-test-'));
const name='thalika-control-test-'+randomUUID().slice(0,8);
const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const origin='https://control.test.invalid';
const salt='container-test-salt';
const envFile=join(directory,'test.env');
writeFileSync(envFile,`OWNER_PASSWORD_HASH=${salt}:${scryptSync('test-only-password',salt,64).toString('hex')}\nSESSION_SECRET=container-test-only-secret-32-characters-minimum\nRUNTIME_TOKEN=container-test-only-runtime-32-characters-minimum\nAPP_ORIGIN=${origin}\n`,{mode:0o600});
try {
  assert.equal(docker('image','inspect',image,'--format','{{.Config.User}}'),'10001:10001');
  docker('run','--detach','--rm','--name',name,'--env-file',envFile,'--tmpfs','/workspace/persistent:uid=10001,gid=10001,mode=700','-p','127.0.0.1::3000',image);
  const port=docker('inspect',name,'--format','{{(index (index .NetworkSettings.Ports "3000/tcp") 0).HostPort}}');
  const base='http://127.0.0.1:'+port;
  let ready=false;
  for(let i=0;i<30;i++){try{ready=(await fetch(base+'/api/health')).ok;if(ready)break;}catch{}await new Promise(r=>setTimeout(r,500));}
  assert.equal(ready,true,'Control HTTP health');
  assert.equal((await fetch(base+'/api/voice-profiles')).status,401);
  const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({password:'test-only-password'})});
  assert.equal(login.status,200); const cookie=login.headers.get('set-cookie');
  assert.ok(cookie.includes('Secure')&&cookie.includes('HttpOnly')&&cookie.includes('SameSite=strict'));
  const status=await fetch(base+'/api/cloud/status',{headers:{Cookie:cookie.split(';')[0]}});
  const result=await status.json(); assert.equal(result.mode,'control'); assert.equal(result.hourlyRate,null);
  const csrf=await fetch(base+'/api/cloud/action',{method:'POST',headers:{Cookie:cookie.split(';')[0],Origin:'https://attacker.invalid','Content-Type':'application/json'},body:'{}'}); assert.equal(csrf.status,403);
  assert.equal((await fetch(base+'/api/voice-profiles',{headers:{Cookie:cookie.split(';')[0]}})).status,404);
  console.log('Control container: non-root startup, HTTP health, owner login, Secure cookies, CSRF, and API isolation passed. No provider resources called.');
} finally {
  try{docker('stop',name);}catch{}
  rmSync(directory,{recursive:true,force:true});
}
