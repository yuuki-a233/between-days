import {DatabaseSync,type SQLInputValue} from 'node:sqlite';
import fs from 'node:fs';import path from 'node:path';
import {dataDir} from './config.ts';
const globalDB=globalThis as typeof globalThis & {communityDB?:DatabaseSync};
export const db=globalDB.communityDB??new DatabaseSync(path.join(dataDir,'community.sqlite'));
globalDB.communityDB=db;
db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
export function all<T=Record<string,any>>(sql:string,...args:SQLInputValue[]):T[]{return db.prepare(sql).all(...args) as T[]}
export function get<T=Record<string,any>>(sql:string,...args:SQLInputValue[]):T|undefined{return db.prepare(sql).get(...args) as T|undefined}
export function run(sql:string,...args:SQLInputValue[]){return db.prepare(sql).run(...args)}
export function transaction<T>(fn:()=>T):T{db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result}catch(e){db.exec('ROLLBACK');throw e}}
export function migrateCommunity(){db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)');for(const name of fs.readdirSync(path.resolve('migrations')).filter(x=>x.endsWith('.sql')).sort()){if(!get('SELECT name FROM schema_migrations WHERE name=?',name))transaction(()=>{db.exec(fs.readFileSync(path.resolve('migrations',name),'utf8'));run('INSERT INTO schema_migrations VALUES (?,?)',name,new Date().toISOString())})}}
