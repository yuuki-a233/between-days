import {community} from '@/lib/community';import {HttpError} from '@/lib/permissions';import {ZodError} from 'zod';
export const runtime='nodejs';export const dynamic='force-dynamic';
async function handle(request:Request,context:{params:Promise<{path:string[]}>}){
 try{const result=await community(request,(await context.params).path);if(result instanceof Response)return result;return Response.json(result,{headers:{'Cache-Control':'no-store'}})}
 catch(error){if(error instanceof HttpError)return Response.json({error:error.message},{status:error.status});if(error instanceof ZodError)return Response.json({error:'请检查填写内容：'+error.issues.map(x=>x.path.join('.')+' '+x.message).slice(0,2).join('；')},{status:400});console.error('Community request failed',error);return Response.json({error:'操作未能完成，请稍后重试。'},{status:500})}
}
export const GET=handle,POST=handle,PATCH=handle,PUT=handle,DELETE=handle;
