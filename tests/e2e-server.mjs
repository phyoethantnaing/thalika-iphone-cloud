import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { scryptSync } from 'node:crypto';
import { startFake } from './fake-inference.mjs';
const directory=mkdtempSync(join(tmpdir(),'thalika-e2e-'));
const fake=startFake();
const salt='e2e-only-salt';
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3100'],{stdio:'inherit',env:{...process.env,
  THALIKA_ROLE:'studio',THALIKA_CLOUD:'0',APP_ORIGIN:'http://127.0.0.1:3100',
  THALIKA_DATA_DIR:directory,THALIKA_CONFIG_DIR:join(directory,'config'),
  OWNER_PASSWORD_HASH:`${salt}:${scryptSync('e2e-test-only-password',salt,64).toString('hex')}`,
  SESSION_SECRET:'e2e-only-secret-not-production-0123456789',RUNTIME_TOKEN:'e2e-only-runtime-token-not-production-0123456789',
  HF_VOXCPM2_URL:'http://127.0.0.1:7860',NEXT_TELEMETRY_DISABLED:'1'
}});
function cleanup(){child.kill('SIGTERM');fake.close();}
process.on('SIGINT',cleanup);process.on('SIGTERM',cleanup);
child.on('exit', code=>{fake.close();rmSync(directory,{recursive:true,force:true});process.exit(code||0);});
