import fs from 'node:fs';import path from 'node:path';
import {localMode,mailMode,dataDir} from '@/lib/config';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request:Request){
 const host=new URL(request.url).hostname;
 if(!localMode||mailMode!=='local'||!['localhost','127.0.0.1','[::1]'].includes(host))return new Response('Not found',{status:404});
 const dir=path.join(dataDir,'local-mail');
 const messages=fs.existsSync(dir)?fs.readdirSync(dir).filter(x=>x.endsWith('.json')).map(x=>JSON.parse(fs.readFileSync(path.join(dir,x),'utf8'))).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,30):[];
 return Response.json({messages},{headers:{'Cache-Control':'no-store'}});
}
