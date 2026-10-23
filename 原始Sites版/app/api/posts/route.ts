import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
export async function GET(){
 const result=await env.DB!.prepare('SELECT id, owner_id AS ownerId, kind, category, title, body, cover, attachment, attachment_name AS attachmentName, link, created_at AS createdAt FROM posts ORDER BY created_at DESC').all();
 return Response.json(result.results,{headers:{'Cache-Control':'no-store'}});
}
export async function POST(request:Request){
 const user=await getChatGPTUser(); if(!user) return Response.json({error:'请先登录，再发布内容。'},{status:401});
 const data=await request.json() as Record<string,string>;
 const title=String(data.title||'').trim(), body=String(data.body||'').trim();
 if(!title||title.length>100||!body||body.length>20000||!['work','journal'].includes(data.kind))return Response.json({error:'请填写标题（100 字以内）和正文（20000 字以内）。'},{status:400});
 let link=String(data.link||'').trim();
 if(link){try{const url=new URL(link);if(url.protocol!=='https:'||url.username||url.password||link.length>2000)throw new Error();link=url.href}catch{return Response.json({error:'请输入有效的 https 项目或笔记链接。'},{status:400})}}
 const id=data.id||crypto.randomUUID();const cover=String(data.cover||''), attachment=String(data.attachment||'');
 if([cover,attachment].some(x=>x&&!/^\/api\/files\/[a-f0-9-]+$/.test(x)))return Response.json({error:'文件地址无效，请重新上传。'},{status:400});
 if(data.id){
 const old=await env.DB!.prepare('SELECT owner_id FROM posts WHERE id = ?').bind(id).first<{owner_id:string}>();
 if(!old||old.owner_id!==user.userId)return Response.json({error:'无法编辑这篇内容。'},{status:403});
 await env.DB!.prepare('UPDATE posts SET kind=?, category=?, title=?, body=?, cover=?, attachment=?, attachment_name=?, link=? WHERE id=? AND owner_id=?').bind(data.kind,String(data.category||'其他').slice(0,30),title,body,cover,attachment,String(data.attachmentName||'').slice(0,200),link,id,user.userId).run();
 }else{
 await env.DB!.prepare('INSERT INTO posts (id,owner_id,kind,category,title,body,cover,attachment,attachment_name,link,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').bind(id,user.userId,data.kind,String(data.category||'其他').slice(0,30),title,body,cover,attachment,String(data.attachmentName||'').slice(0,200),link,new Date().toISOString()).run();
 }
 return Response.json({id});
}
export async function DELETE(request:Request){
 const user=await getChatGPTUser();if(!user)return new Response('Unauthorized',{status:401});
 const {id}=await request.json() as {id:string};
 const old=await env.DB!.prepare('SELECT id FROM posts WHERE id=? AND owner_id=?').bind(id,user.userId).first();
 if(!old)return new Response('Not found',{status:404});
 await env.DB!.prepare('DELETE FROM posts WHERE id=? AND owner_id=?').bind(id,user.userId).run();
 return Response.json({ok:true});
}
