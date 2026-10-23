import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
export const dataDir=path.resolve(process.env.DATA_DIR||'data');
fs.mkdirSync(dataDir,{recursive:true});
const isBuild=process.env.APP_BUILD==='1';
export const localMode=process.env.NODE_ENV!=='production';
export const mailMode=process.env.MAIL_MODE||(localMode?'local':'smtp');
export const baseURL=process.env.APP_URL||'http://localhost:3100';
export const ownerEmail=(process.env.OWNER_EMAIL||(localMode||isBuild?'owner@between-days.test':'')).trim().toLowerCase();
export const testAccounts=[{email:'owner@between-days.test',name:'小间 · 站长',role:'owner'},{email:'admin@between-days.test',name:'蓝笺 · 管理员',role:'admin'},{email:'member@between-days.test',name:'新朋友 · 普通用户',role:'member'}];
if(!localMode&&!isBuild){
 if(process.env.APP_MODE!=='production'||mailMode!=='smtp')throw new Error('生产环境必须设置 APP_MODE=production、MAIL_MODE=smtp；禁止使用本地测试收件箱。');
 if(!ownerEmail||ownerEmail.endsWith('.test')||!process.env.SMTP_HOST||!process.env.SMTP_FROM||!process.env.SMTP_USER||!process.env.SMTP_PASS)throw new Error('请完整设置站长邮箱和 SMTP 发信配置。');
 if(!process.env.AUTH_SECRET||process.env.AUTH_SECRET.length<32||!baseURL.startsWith('https://'))throw new Error('生产环境必须设置至少 32 位 AUTH_SECRET 与 HTTPS APP_URL。');
}
const runtimeFile=path.join(dataDir,'.runtime.json');
let localSecret='';
if(localMode){if(fs.existsSync(runtimeFile))localSecret=JSON.parse(fs.readFileSync(runtimeFile,'utf8')).secret;if(!localSecret){localSecret=crypto.randomBytes(48).toString('hex');fs.writeFileSync(runtimeFile,JSON.stringify({secret:localSecret}),{mode:0o600});}}
export const secret=process.env.AUTH_SECRET||localSecret||(isBuild?'build-only-placeholder-secret-not-for-runtime':''), closedBeta=process.env.CLOSED_BETA!=='false';
export const fileDir=path.join(dataDir,'uploads');fs.mkdirSync(fileDir,{recursive:true});
