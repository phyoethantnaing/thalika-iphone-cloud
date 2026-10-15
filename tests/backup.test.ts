import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
test('backup validates checksum and restores without overwriting existing data', async () => {
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),'thalika-backup-'));
  const root=path.join(temp,'persistent'); const archive=path.join(temp,'backup.tar.gz'); const restored=path.join(temp,'restored');
  try {
    await fs.mkdir(path.join(root,'data'),{recursive:true}); await fs.writeFile(path.join(root,'data','example.json'),'{"test":true}');
    const run=(...args:string[])=>spawnSync('python',['scripts/backup.py',...args],{encoding:'utf8'});
    assert.notEqual(run('backup',archive,'--root',root).status,0);
    assert.equal(run('backup',archive,'--root',root,'--confirm-quiescent').status,0);
    assert.equal(run('verify',archive).status,0);
    assert.equal(run('restore',archive,'--root',restored).status,0);
    assert.equal(await fs.readFile(path.join(restored,'data','example.json'),'utf8'),'{"test":true}');
    assert.notEqual(run('restore',archive,'--root',restored).status,0);
    await fs.appendFile(archive,'tamper'); assert.notEqual(run('verify',archive).status,0);
  } finally { await fs.rm(temp,{recursive:true,force:true}); }
});
