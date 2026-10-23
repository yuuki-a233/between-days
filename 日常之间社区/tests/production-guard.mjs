import {spawnSync} from 'node:child_process';
const result=spawnSync(process.execPath,['scripts/launch.mjs','start'],{env:{...process.env,NODE_ENV:'production',APP_MODE:'local',MAIL_MODE:'local'},encoding:'utf8'});
if(result.status===0)throw new Error('Production must refuse local-mail mode.');
if(!result.stderr.includes('生产环境必须'))throw new Error('Unexpected failure: '+result.stderr);
console.log('PASS production startup rejects local test mailbox configuration');
