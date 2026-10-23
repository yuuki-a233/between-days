import {env} from 'cloudflare:workers';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!/^[a-f0-9-]+$/.test(id))return new Response('Not found',{status:404});
 const file=await env.BUCKET!.get(id);if(!file)return new Response('Not found',{status:404});
 const headers=new Headers();file.writeHttpMetadata(headers);headers.set('X-Content-Type-Options','nosniff');headers.set('Cache-Control','private, max-age=3600');
 headers.set('Content-Length',String(file.size));
 if(!file.httpMetadata?.contentType?.startsWith('image/'))headers.set('Content-Disposition',"attachment; filename*=UTF-8''"+encodeURIComponent(file.customMetadata?.name||'portfolio.pdf'));
 return new Response(file.body,{headers});
}
