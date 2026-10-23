import {spawnSync,spawn} from 'node:child_process';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');process.chdir(root);process.env.NEXT_TELEMETRY_DISABLED='1';
const [major,minor]=process.versions.node.split('.').map(Number);
if(major<24||(major===24&&minor<15)){console.error('需要 Node.js 24.15 或更新版本。');process.exit(1)}
try { const response=await fetch('http://localhost:3100/api/community/me',{signal:AbortSignal.timeout(15000)}); const state=await response.json(); if(response.ok&&state.localMode===true&&state.closedBeta===true){console.log('本地社区已在运行，请打开 http://localhost:3100');process.exit(0)} } catch {}
if(!fs.existsSync('node_modules/next/package.json')){
 console.log('首次启动正在安装依赖，请保持窗口打开。');
 const result=spawnSync(process.execPath,['vendor/npm/bin/npm-cli.js','ci','--no-audit','--no-fund'],{cwd:root,stdio:'inherit'});
 if(result.status!==0){console.error('依赖安装未完成，请检查网络后重新启动。');process.exit(result.status||1)}
}
console.log('本地地址：http://localhost:3100 。保持此窗口打开，按 Ctrl+C 停止。');
const child=spawn(process.execPath,['scripts/launch.mjs','dev'],{cwd:root,stdio:'inherit'});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));child.on('exit',code=>process.exit(code||0));
