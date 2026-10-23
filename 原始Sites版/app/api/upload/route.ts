import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
const imageTypes=['image/jpeg','image/png','image/webp','image/gif'];
const documentExtensions=new Set(['zip','pdf','docx','md','txt','ipynb','py','js','jsx','ts','tsx','html','css','scss','json','java','go','rs','c','cpp','h','hpp','sql','sh','yml','yaml','r','vue','svelte']);
export async function POST(request:Request){
 const user=await getChatGPTUser(); if(!user)return Response.json({error:'请先登录。'},{status:401});
 if(Number(request.headers.get('content-length')||0)>22*1024*1024)return Response.json({error:'文件不能超过 20 MB。'},{status:413});
 const form=await request.formData();const file=form.get('file');
 if(!(file instanceof File)||file.size===0||file.size>20*1024*1024)return Response.json({error:'请选择不超过 20 MB 的文件。'},{status:400});
 const isImage=imageTypes.includes(file.type),extension=file.name.split('.').pop()?.toLowerCase()||'';
 if(!isImage&&!documentExtensions.has(extension))return Response.json({error:'支持图片、源码、ZIP、Markdown、TXT、PDF、Word 和 Jupyter 笔记。'},{status:400});
 const key=crypto.randomUUID();
 const contentType=isImage?file.type:extension==='pdf'?'application/pdf':'application/octet-stream';
 await env.BUCKET!.put(key,await file.arrayBuffer(),{httpMetadata:{contentType},customMetadata:{name:file.name,owner:user.userId}});
 return Response.json({url:'/api/files/'+key,name:file.name});
}
