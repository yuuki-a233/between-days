import {betterAuth} from 'better-auth';
import {emailOTP} from 'better-auth/plugins';
import {APIError} from 'better-auth/api';
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import nodemailer from 'nodemailer';
import {db,get,run,migrateCommunity} from './db.ts';
import {baseURL,secret,localMode,mailMode,dataDir,ownerEmail,testAccounts,closedBeta} from './config.ts';
migrateCommunity();
export function emailAllowed(email:string){const value=email.toLowerCase();return !closedBeta||value===ownerEmail||(localMode&&testAccounts.some(a=>a.email===value))||!!get('SELECT email FROM test_access WHERE email=?',value)}
export const auth=betterAuth({
 appName:'日常之间',baseURL,secret,database:db,trustedOrigins:[baseURL],
 emailAndPassword:{enabled:false},
 session:{expiresIn:60*60*24*7,updateAge:60*60*24,cookieCache:{enabled:false}},
 rateLimit:{enabled:true,storage:'database',window:60,max:30,customRules:{'/email-otp/send-verification-otp':{window:60,max:3},'/sign-in/email-otp':{window:60,max:8}}},
 plugins:[emailOTP({otpLength:6,expiresIn:300,allowedAttempts:5,storeOTP:'hashed',async sendVerificationOTP({email,otp,type}){
  if(!emailAllowed(email))throw new APIError('FORBIDDEN',{message:'封闭测试期间，请先由站长或管理员添加测试邮箱。'});
  const profile=get('SELECT status FROM profiles WHERE email=?',email.toLowerCase());
  if(profile?.status==='banned')throw new APIError('FORBIDDEN',{message:'这个账号已停用，请联系站长。'});
  const title='日常之间 · 登录验证码';
  if(localMode&&mailMode==='local'){
   const dir=path.join(dataDir,'local-mail');fs.mkdirSync(dir,{recursive:true});
   fs.writeFileSync(path.join(dir,crypto.randomUUID()+'.json'),JSON.stringify({id:crypto.randomUUID(),to:email,subject:title,otp,type,createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+300000).toISOString()}),{mode:0o600});
  }else{
   const transport=nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||465),secure:process.env.SMTP_SECURE!=='false',auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}});
   await transport.sendMail({from:process.env.SMTP_FROM,to:email,subject:title,text:`你的验证码是 ${otp}，5 分钟内有效。如果不是你本人操作，请忽略这封邮件。`});
  }
 }})]
});
export async function ensureProfile(user:{id:string;email:string;name:string}){
 const existing=get('SELECT id FROM profiles WHERE id=?',user.id);
 if(!existing){const email=user.email.toLowerCase(),test=localMode?testAccounts.find(x=>x.email===email):undefined;
  const role=email===ownerEmail?'owner':test?.role==='admin'?'admin':'member';
  run('INSERT OR IGNORE INTO profiles (id,email,name,role,created_at) VALUES (?,?,?,?,?)',user.id,email,test?.name||'新朋友',role,new Date().toISOString());
 }
 return get('SELECT id,email,name,bio,avatar_id AS avatarId,role,publish_status AS publishStatus,status FROM profiles WHERE id=?',user.id)!;
}
