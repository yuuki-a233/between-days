import net from 'node:net';
import {spawnSync,spawn} from 'node:child_process';import {fileURLToPath} from 'node:url';import path from 'node:path';import fs from 'node:fs';
import nextEnv from '@next/env';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');process.chdir(root);
const mode=process.argv[2]||'dev';if(!['dev','start'].includes(mode))throw new Error('Use dev or start.');
process.env.NODE_ENV=mode==='dev'?'development':'production';process.env.NEXT_TELEMETRY_DISABLED='1';
nextEnv.loadEnvConfig(root,mode==='dev');
await import('../lib/config.ts');
const available=await new Promise(resolve=>{const probe=net.createServer();probe.once('error',()=>resolve(false));probe.listen(Number(process.env.PORT||3100),'127.0.0.1',()=>probe.close(()=>resolve(true)))});
if(!available){console.error('本地端口已被占用，请先打开现有 http://localhost:'+(process.env.PORT||3100)+'，或停止原来的启动窗口。');process.exit(1)}
const migrated=spawnSync(process.execPath,['scripts/migrate.ts'],{cwd:root,stdio:'inherit',env:process.env});if(migrated.status!==0)process.exit(migrated.status||1);
const child=spawn(process.execPath,['node_modules/next/dist/bin/next',mode,...(mode==='dev'?['--webpack']:[]),'--hostname','127.0.0.1','--port',process.env.PORT||'3100'],{cwd:root,stdio:'inherit',env:process.env});
const stateDir=path.resolve(process.env.DATA_DIR||'data');fs.mkdirSync(stateDir,{recursive:true});
const stateFile=path.join(stateDir,'.server.json');fs.writeFileSync(stateFile,JSON.stringify({pid:child.pid,parentPid:process.pid,cwd:root,port:process.env.PORT||'3100',mode}));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>{if(fs.existsSync(stateFile)&&JSON.parse(fs.readFileSync(stateFile,'utf8')).pid===child.pid)fs.unlinkSync(stateFile);process.exit(code||0)});

