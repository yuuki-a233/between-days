import {localMode,fileDir} from '../lib/config.ts';import {all,run,transaction} from '../lib/db.ts';import fs from 'node:fs';import path from 'node:path';
if(!localMode)throw new Error('仅允许重置本机开发环境。');
const posts=all("SELECT id FROM posts WHERE title LIKE 'QA · %'");
transaction(()=>{
 for(const p of posts){run('DELETE FROM reports WHERE target_id=? OR target_id IN(SELECT id FROM comments WHERE post_id=?)',p.id,p.id);run('DELETE FROM likes WHERE post_id=?',p.id);run('DELETE FROM bookmarks WHERE post_id=?',p.id);run('DELETE FROM comments WHERE post_id=? AND parent_id IS NOT NULL',p.id);run('DELETE FROM comments WHERE post_id=?',p.id);run('DELETE FROM posts WHERE id=?',p.id)}
 const members=all("SELECT id FROM profiles WHERE email IN('owner@between-days.test','admin@between-days.test','member@between-days.test')");for(const u of members){run('DELETE FROM applications WHERE user_id=?',u.id);run('DELETE FROM audit WHERE actor_id=?',u.id)}
 run("UPDATE profiles SET publish_status='none',status='active',bio='' WHERE email IN('owner@between-days.test','admin@between-days.test','member@between-days.test')");
 run("UPDATE profiles SET role='owner' WHERE email='owner@between-days.test'");run("UPDATE profiles SET role='admin' WHERE email='admin@between-days.test'");run("UPDATE profiles SET role='member' WHERE email='member@between-days.test'");
});
for(const f of all("SELECT id FROM files WHERE name LIKE 'qa-%'")){if(/^[a-f0-9-]{36}$/.test(f.id)){const target=path.resolve(fileDir,f.id);if(path.dirname(target)!==path.resolve(fileDir))throw new Error('Invalid fixture path');if(fs.existsSync(target))fs.unlinkSync(target);run('DELETE FROM files WHERE id=?',f.id)}}
console.log('Only QA-prefixed content and the three dedicated test identities were reset.');
