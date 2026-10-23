export type Actor={id:string;email:string;name:string;bio:string;avatarId:string;role:'owner'|'admin'|'member';publishStatus:string;status:string;isDemo?:boolean};
export function isAdmin(actor:Actor){return actor.role==='owner'||actor.role==='admin'}
export function canPublish(actor:Actor){return actor.status==='active'&&(isAdmin(actor)||actor.publishStatus==='approved')}
export function canEdit(actor:Actor,authorId:string){return canPublish(actor)&&actor.id===authorId}
export class HttpError extends Error {status:number;constructor(status:number,message:string){super(message);this.status=status}}
export function assert(value:unknown,status:number,message:string):asserts value{if(!value)throw new HttpError(status,message)}
