import crypto from 'node:crypto';import fs from 'node:fs/promises';import path from 'node:path';
import {auth,ensureProfile,emailAllowed} from './auth.ts';
import {all,get,run,transaction} from './db.ts';
import {assert,HttpError,isAdmin,canPublish,canEdit,type Actor} from './permissions.ts';
import {baseURL,fileDir,localMode,testAccounts,closedBeta} from './config.ts';
import {z} from 'zod';
const now=()=>new Date().toISOString();const id=()=>crypto.randomUUID();
const actorSelect='id,email,name,bio,avatar_id AS avatarId,role,publish_status AS publishStatus,status';
export async function actorFor(request:Request):Promise<Actor>{
 const session=await auth.api.getSession({headers:request.headers});assert(session,401,'请先登录，再继续。');
 assert(emailAllowed(session.user.email),403,'这个邮箱尚未加入封闭测试。');
 const profile=await ensureProfile(session.user) as Actor;assert(profile.status==='active',403,'这个账号已被停用，请联系站长。');return profile;
}
export function checkOrigin(request:Request){const origin=request.headers.get('origin');assert(origin===new URL(baseURL).origin,403,'请求来源无效，请刷新页面后重试。')}
function limit(key:string,max:number,seconds:number){const start=Math.floor(Date.now()/1000/seconds)*seconds;const record=get('SELECT window_start,hits FROM request_limits WHERE key=?',key);if(record&&record.window_start===start){assert(record.hits<max,429,'操作有些频繁，请稍后再试。');run('UPDATE request_limits SET hits=hits+1 WHERE key=?',key)}else run('INSERT INTO request_limits VALUES (?,?,1) ON CONFLICT(key) DO UPDATE SET window_start=excluded.window_start,hits=1',key,start)}
function audit(actor:Actor,action:string,target:string){run('INSERT INTO audit VALUES(?,?,?,?,?)',id(),actor.id,action,target,now())}
function publicProfile(profile:any){return {id:profile.id,name:profile.name,bio:profile.bio,avatarId:profile.avatarId||'',role:profile.role,isDemo:!!profile.isDemo}}
const postSelect=`SELECT p.*, f.name AS attachment_name, u.name AS author_name,u.avatar_id AS author_avatar,u.role AS author_role,
 (SELECT COUNT(*) FROM likes l WHERE l.post_id=p.id) AS like_count,
 (SELECT COUNT(*) FROM comments c WHERE c.post_id=p.id AND c.deleted=0) AS comment_count,
 EXISTS(SELECT 1 FROM likes l WHERE l.post_id=p.id AND l.user_id=?) AS liked,
 EXISTS(SELECT 1 FROM bookmarks b WHERE b.post_id=p.id AND b.user_id=?) AS bookmarked
 FROM posts p JOIN profiles u ON u.id=p.author_id LEFT JOIN files f ON f.id=p.attachment_id`;
function serializePost(p:any,full=false){const {body,...rest}=p;return {id:rest.id,authorId:rest.author_id,kind:rest.kind,category:rest.category,title:rest.title,body:full?body:undefined,excerpt:body.replace(/[#>*`]/g,'').slice(0,160),coverId:rest.cover_id,attachmentId:rest.attachment_id,attachmentName:rest.attachment_name||'',link:rest.link,status:rest.status,isDemo:!!rest.is_demo,createdAt:rest.created_at,updatedAt:rest.updated_at,likeCount:rest.like_count,commentCount:rest.comment_count,liked:!!rest.liked,bookmarked:!!rest.bookmarked,author:{id:rest.author_id,name:rest.author_name,avatarId:rest.author_avatar,role:rest.author_role}}}
function visiblePost(postId:string){const p=get('SELECT * FROM posts WHERE id=? AND status=?',postId,'published');assert(p,404,'这篇内容已删除或暂时不可见。');return p}
function validateFile(fileId:string,actor:Actor,imageOnly=false){if(!fileId)return;const f=get('SELECT * FROM files WHERE id=? AND owner_id=?',fileId,actor.id);assert(f,403,'只能使用自己上传的附件。');if(imageOnly)assert(f.mime.startsWith('image/'),400,'封面和头像必须使用图片。')}
const postSchema=z.object({kind:z.enum(['work','note','journal']),category:z.string().trim().min(1).max(30),title:z.string().trim().min(1).max(100),body:z.string().trim().min(1).max(20000),coverId:z.string().max(80).default(''),attachmentId:z.string().max(80).default(''),link:z.string().max(2000).default('')});
const extensions=new Set('zip pdf docx md txt ipynb py js jsx ts tsx html css scss json java go rs c cpp h hpp sql sh yml yaml r vue svelte'.split(' '));
function imageMime(bytes:Uint8Array){if(bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)return'image/jpeg';if(Buffer.from(bytes.slice(0,8)).equals(Buffer.from([137,80,78,71,13,10,26,10])))return'image/png';if(Buffer.from(bytes.slice(0,6)).toString().startsWith('GIF8'))return'image/gif';if(Buffer.from(bytes.slice(0,4)).toString()==='RIFF'&&Buffer.from(bytes.slice(8,12)).toString()==='WEBP')return'image/webp';return''}
async function upload(request:Request,actor:Actor){
 assert(canPublish(actor)||request.headers.get('x-upload-purpose')==='avatar',403,'获得发布资格后才能上传作品附件。');limit('upload:'+actor.id,30,3600);
 assert(Number(request.headers.get('content-length')||0)<=22*1024*1024,413,'文件不能超过 20 MB。');
 const form=await request.formData(),file=form.get('file');assert(file instanceof File&&file.size>0&&file.size<=20*1024*1024,400,'请选择不超过 20 MB 的文件。');
 const bytes=Buffer.from(await file.arrayBuffer()),mime=imageMime(bytes),ext=file.name.split('.').pop()?.toLowerCase()||'';
 const isAvatar=request.headers.get('x-upload-purpose')==='avatar';
 if(isAvatar)assert(mime&&file.size<=2*1024*1024,400,'头像支持 JPG、PNG、GIF、WebP，最大 2 MB。');
 assert(mime||extensions.has(ext),400,'支持图片、代码、ZIP、Markdown、文本、PDF、Word 和 Jupyter 笔记。');
 const fileId=id(),filename=file.name.replace(/[\x00-\x1f/\\]/g,'_').slice(0,180);
 await fs.writeFile(path.join(fileDir,fileId),bytes,{flag:'wx'});
 try{run('INSERT INTO files VALUES(?,?,?,?,?,?)',fileId,actor.id,filename,mime||'application/octet-stream',file.size,now())}catch(e){await fs.unlink(path.join(fileDir,fileId));throw e}
 return {id:fileId,name:filename,mime:mime||'application/octet-stream',size:file.size};
}
async function fileResponse(fileId:string,actor:Actor){
 assert(/^[a-f0-9-]{36}$/.test(fileId),404,'文件不存在。');const f=get('SELECT * FROM files WHERE id=?',fileId);assert(f,404,'文件不存在。');
 const visible=!!get("SELECT id FROM posts WHERE (cover_id=? OR attachment_id=?) AND status='published'",fileId,fileId)||!!get("SELECT id FROM profiles WHERE avatar_id=? AND status='active'",fileId);
 // Once a file is referenced by a post, hidden/deleted posts also hide its files from authors.
 const referenced=!!get('SELECT id FROM posts WHERE cover_id=? OR attachment_id=?',fileId,fileId);
 assert(visible||(!referenced&&f.owner_id===actor.id),404,'文件暂时不可访问。');
 let bytes:Buffer;try{bytes=await fs.readFile(path.join(fileDir,fileId))}catch{throw new HttpError(404,'文件不存在。')}
 const headers:Record<string,string>={'Content-Type':f.mime,'Content-Length':String(bytes.length),'X-Content-Type-Options':'nosniff','Cache-Control':'private, no-store','Content-Security-Policy':"default-src 'none'; sandbox"};
 if(!f.mime.startsWith('image/'))headers['Content-Disposition']="attachment; filename*=UTF-8''"+encodeURIComponent(f.name);
 return new Response(new Uint8Array(bytes),{headers});
}
export async function community(request:Request,segments:string[]){
 const [resource,item,action]=segments,method=request.method;
 if(method!=='GET')checkOrigin(request);
 if(resource==='me'&&method==='GET'&&!item){
  try{const actor=await actorFor(request);return {user:actor,canPublish:canPublish(actor),localMode,testAccounts:localMode?testAccounts:[],closedBeta,application:get('SELECT reason,status,updated_at AS updatedAt FROM applications WHERE user_id=?',actor.id)||null}}
  catch(e){if(e instanceof HttpError&&e.status===401)return{user:null,localMode,testAccounts:localMode?testAccounts:[],closedBeta};throw e}
 }
 const actor=await actorFor(request);
 if(resource==='upload'&&method==='POST')return upload(request,actor);
 if(resource==='files'&&method==='GET')return fileResponse(item,actor);
 if(resource==='posts'){
  if(method==='GET'&&!item){
   const url=new URL(request.url),query=(url.searchParams.get('q')||'').trim().slice(0,100),kind=url.searchParams.get('kind'),category=url.searchParams.get('category'),author=url.searchParams.get('author'),mine=url.searchParams.get('mine')==='true',bookmarks=url.searchParams.get('bookmarks')==='true';
   const page=Math.max(1,Math.min(10000,Math.trunc(Number(url.searchParams.get('page')))||1)),clauses=[mine?"p.status IN ('published','hidden')":"p.status='published'"],args:any[]=[];
   if(mine){clauses.push('p.author_id=?');args.push(actor.id)}else if(author){clauses.push('p.author_id=?');args.push(author)}
   if(kind&&['work','note','journal'].includes(kind)){clauses.push('p.kind=?');args.push(kind)}
   if(category){clauses.push('p.category=?');args.push(category)}
   if(query){clauses.push('(p.title LIKE ? ESCAPE \'\\\' OR p.body LIKE ? ESCAPE \'\\\')');const term='%'+query.replace(/[\\%_]/g,'\\$&')+'%';args.push(term,term)}
   if(bookmarks){clauses.push('EXISTS(SELECT 1 FROM bookmarks b WHERE b.post_id=p.id AND b.user_id=?)');args.push(actor.id)}
   const items=all(postSelect+' WHERE '+clauses.join(' AND ')+' ORDER BY p.created_at DESC,p.id DESC LIMIT 13 OFFSET ?',actor.id,actor.id,...args,(page-1)*12);
   return {items:items.slice(0,12).map(p=>serializePost(p)),nextPage:items.length>12?page+1:null};
  }
  if(method==='GET'&&item&&!action){visiblePost(item);const p=get(postSelect+' WHERE p.id=?',actor.id,actor.id,item);return {post:serializePost(p,true)}}
  if((method==='POST'&&!item)||(method==='PATCH'&&item&&!action)){
   assert(canPublish(actor),403,'请先申请发布资格，由站长或管理员批准后再发布。');limit('publish:'+actor.id,30,3600);
   const data=postSchema.parse(await request.json());if(item){const old=get('SELECT * FROM posts WHERE id=? AND status<>?',item,'deleted');assert(old,404,'内容不存在。');assert(canEdit(actor,old.author_id),403,'只能编辑自己的内容。');assert(old.status==='published',403,'已下架内容不能直接编辑，请联系管理员。')}
   validateFile(data.coverId,actor,true);validateFile(data.attachmentId,actor);
   if(data.link){let link:URL;try{link=new URL(data.link)}catch{throw new HttpError(400,'请输入有效的 HTTPS 链接。')}assert(link.protocol==='https:'&&!link.username&&!link.password,400,'项目链接必须使用 HTTPS。')}
   const postId=item||id(),time=now();
   if(item)run('UPDATE posts SET kind=?,category=?,title=?,body=?,cover_id=?,attachment_id=?,link=?,updated_at=? WHERE id=?',data.kind,data.category,data.title,data.body,data.coverId,data.attachmentId,data.link,time,postId);
   else run('INSERT INTO posts(id,author_id,kind,category,title,body,cover_id,attachment_id,link,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)',postId,actor.id,data.kind,data.category,data.title,data.body,data.coverId,data.attachmentId,data.link,time,time);
   return {id:postId};
  }
  if(method==='DELETE'&&item&&!action){const p=get('SELECT author_id FROM posts WHERE id=? AND status<>?',item,'deleted');assert(p,404,'内容不存在。');assert(p.author_id===actor.id,403,'只能删除自己的内容。');run("UPDATE posts SET status='deleted',updated_at=? WHERE id=?",now(),item);return{ok:true}}
  if(action==='like'||action==='bookmark'){
   assert(method==='PUT',405,'请求方式不支持。');visiblePost(item);const {active}=z.object({active:z.boolean()}).parse(await request.json()),table=action==='like'?'likes':'bookmarks';
   if(active)run(`INSERT OR IGNORE INTO ${table} VALUES(?,?,?)`,actor.id,item,now());else run(`DELETE FROM ${table} WHERE user_id=? AND post_id=?`,actor.id,item);return {active};
  }
  if(action==='comments'){
   visiblePost(item);
   if(method==='GET')return {items:all(`SELECT c.id,c.body,c.parent_id AS parentId,c.deleted,c.created_at AS createdAt,u.id AS authorId,u.name AS authorName,u.avatar_id AS avatarId FROM comments c JOIN profiles u ON u.id=c.author_id WHERE c.post_id=? ORDER BY c.created_at ASC,c.id ASC LIMIT 500`,item).map(c=>({...c,body:c.deleted?'这条评论已删除。':c.body}))};
   if(method==='POST'){limit('comment:'+actor.id,20,60);const data=z.object({body:z.string().trim().min(1).max(2000),parentId:z.string().max(80).nullable().optional()}).parse(await request.json());let parent=data.parentId||null;if(parent){const c=get('SELECT id,parent_id FROM comments WHERE id=? AND post_id=? AND deleted=0',parent,item);assert(c,400,'回复的评论不存在。');parent=c.parent_id||c.id}const commentId=id();run('INSERT INTO comments VALUES(?,?,?,?,?,0,?)',commentId,item,actor.id,parent,data.body,now());return{id:commentId}}
  }
 }
 if(resource==='comments'&&method==='DELETE'){
  const comment=get('SELECT * FROM comments WHERE id=? AND deleted=0',item);assert(comment,404,'评论不存在。');assert(comment.author_id===actor.id||isAdmin(actor),403,'无法删除他人的评论。');visiblePost(comment.post_id);
  run("UPDATE comments SET deleted=1,body='' WHERE id=?",item);if(comment.author_id!==actor.id)audit(actor,'delete-comment',item);return{ok:true};
 }
 if(resource==='profiles'&&method==='GET'){
  const profile=get(`SELECT id,name,bio,avatar_id AS avatarId,role,is_demo AS isDemo FROM profiles WHERE id=? AND status='active'`,item);assert(profile,404,'这个主页暂时不可用。');
  return {profile:publicProfile(profile),postCount:get("SELECT COUNT(*) AS n FROM posts WHERE author_id=? AND status='published'",item)!.n};
 }
 if(resource==='profile'&&method==='PATCH'){
  const data=z.object({name:z.string().trim().min(1).max(30),bio:z.string().trim().max(300),avatarId:z.string().max(80).default('')}).parse(await request.json());validateFile(data.avatarId,actor,true);
  run('UPDATE profiles SET name=?,bio=?,avatar_id=? WHERE id=?',data.name,data.bio,data.avatarId,actor.id);return{ok:true};
 }
 if(resource==='applications'&&method==='POST'){
  assert(!canPublish(actor),409,'你已经拥有发布资格。');limit('application:'+actor.id,5,3600);const {reason}=z.object({reason:z.string().trim().min(5).max(1000)}).parse(await request.json());
  run("INSERT INTO applications(user_id,reason,status,updated_at) VALUES(?,?,'pending',?) ON CONFLICT(user_id) DO UPDATE SET reason=excluded.reason,status='pending',reviewed_by=NULL,reviewed_at=NULL,updated_at=excluded.updated_at",actor.id,reason,now());
  run("UPDATE profiles SET publish_status='pending' WHERE id=?",actor.id);return{ok:true};
 }
 if(resource==='reports'&&method==='POST'){
  limit('report:'+actor.id,10,3600);const data=z.object({targetType:z.enum(['post','comment']),targetId:z.string().max(80),reason:z.string().trim().min(2).max(1000)}).parse(await request.json());
  if(data.targetType==='post')visiblePost(data.targetId);else{const c=get('SELECT post_id FROM comments WHERE id=? AND deleted=0',data.targetId);assert(c,404,'评论不存在。');visiblePost(c.post_id)}
  run('INSERT OR IGNORE INTO reports(id,reporter_id,target_type,target_id,reason,created_at) VALUES(?,?,?,?,?,?)',id(),actor.id,data.targetType,data.targetId,data.reason,now());return{ok:true};
 }
 if(resource==='admin'){
  assert(isAdmin(actor),403,'需要管理员权限。');
  if(method==='GET'&&!item)return {
   users:all(`SELECT ${actorSelect},is_demo AS isDemo,created_at AS createdAt FROM profiles WHERE is_demo=0 ORDER BY created_at DESC`),
   applications:all('SELECT a.*,u.name,u.email FROM applications a JOIN profiles u ON u.id=a.user_id ORDER BY a.updated_at DESC'),
   posts:all("SELECT p.id,p.title,p.kind,p.status,p.created_at AS createdAt,u.name AS authorName FROM posts p JOIN profiles u ON u.id=p.author_id WHERE p.status<>'deleted' ORDER BY p.created_at DESC LIMIT 200"),
   reports:all("SELECT r.*,u.name AS reporterName,CASE WHEN r.target_type='post' THEN p.title ELSE c.body END AS targetText,CASE WHEN r.target_type='post' THEN p.id ELSE c.post_id END AS postId FROM reports r JOIN profiles u ON u.id=r.reporter_id LEFT JOIN posts p ON r.target_type='post' AND p.id=r.target_id LEFT JOIN comments c ON r.target_type='comment' AND c.id=r.target_id ORDER BY r.created_at DESC LIMIT 200"),
   audit:all('SELECT a.*,u.name AS actorName FROM audit a LEFT JOIN profiles u ON u.id=a.actor_id ORDER BY a.created_at DESC LIMIT 100'),
   testAccess:all('SELECT email,created_at AS createdAt FROM test_access ORDER BY created_at DESC')
  };
  if(item==='users'&&method==='POST'){
   const data=z.object({userId:z.string().min(1).max(100),action:z.enum(['approve','reject','revoke','ban','unban','promote','demote'])}).parse(await request.json());
   const target=get(`SELECT ${actorSelect} FROM profiles WHERE id=?`,data.userId) as Actor|undefined;assert(target,404,'用户不存在。');assert(target.id!==actor.id&&target.role!=='owner',403,'不能修改自己或站长的权限。');
   assert(actor.role==='owner'||target.role==='member',403,'管理员不能修改其他管理员。');
   if(['promote','demote'].includes(data.action))assert(actor.role==='owner',403,'只有站长能设置管理员。');
   transaction(()=>{
    const t=now();
    if(['approve','reject','revoke'].includes(data.action)){assert(target.role==='member',400,'管理员已经拥有发布资格。');const status=data.action==='approve'?'approved':data.action==='reject'?'rejected':'revoked';run('UPDATE profiles SET publish_status=? WHERE id=?',status,target.id);run('UPDATE applications SET status=?,reviewed_by=?,reviewed_at=?,updated_at=? WHERE user_id=?',status,actor.id,t,t,target.id)}
    if(data.action==='ban'){run("UPDATE profiles SET status='banned' WHERE id=?",target.id);run('DELETE FROM session WHERE userId=?',target.id)}
    if(data.action==='unban')run("UPDATE profiles SET status='active' WHERE id=?",target.id);
    if(data.action==='promote'){assert(target.status==='active',400,'请先恢复该账号。');run("UPDATE profiles SET role='admin' WHERE id=?",target.id)}
    if(data.action==='demote')run("UPDATE profiles SET role='member' WHERE id=?",target.id);
    audit(actor,data.action,target.id);
   });return{ok:true};
  }
  if(item==='posts'&&method==='POST'){
   const data=z.object({postId:z.string().max(80),action:z.enum(['hide','restore'])}).parse(await request.json());assert(get("SELECT id FROM posts WHERE id=? AND status<>'deleted'",data.postId),404,'内容不存在。');
   run('UPDATE posts SET status=?,updated_at=? WHERE id=?',data.action==='hide'?'hidden':'published',now(),data.postId);audit(actor,data.action+'-post',data.postId);return{ok:true};
  }
  if(item==='reports'&&method==='POST'){
   const data=z.object({reportId:z.string().max(80)}).parse(await request.json());assert(get('SELECT id FROM reports WHERE id=?',data.reportId),404,'举报不存在。');run("UPDATE reports SET status='resolved',resolved_by=?,resolved_at=? WHERE id=?",actor.id,now(),data.reportId);audit(actor,'resolve-report',data.reportId);return{ok:true};
  }
  if(item==='test-access'&&method==='POST'){
   const data=z.object({email:z.email().transform(x=>x.toLowerCase())}).parse(await request.json());run('INSERT OR IGNORE INTO test_access VALUES(?,?,?)',data.email,actor.id,now());audit(actor,'invite-test-email',data.email);return{ok:true};
  }
 }
 throw new HttpError(404,'这个页面或操作不存在。');
}
