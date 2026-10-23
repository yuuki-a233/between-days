import {get,run,transaction} from './db.ts';
export function seedSamples(){
 if(get('SELECT id FROM profiles WHERE id=?','demo-editor'))return;
 const now=new Date().toISOString();
 transaction(()=>{
 run("INSERT INTO profiles(id,email,name,bio,role,publish_status,is_demo,created_at) VALUES(?,?,?,?,?,?,1,?)",'demo-editor','sample@example.test','日常编辑部','这是用于体验排版与互动的示例账号。','member','approved',now);
 const samples=[
 {id:'sample-code',kind:'work',category:'代码',title:'把灵感装进口袋',body:'一个轻量的灵感收集小工具，从生活里的小需求开始。\n\n## 从一个想法开始\n记录灵感、归类标签，再给它一点点生长的空间。\n\n```typescript\nconst ideas = ["保持好奇", "开始创造"];\nideas.forEach(idea => console.log(idea));\n```\n\n这是示例作品，欢迎上传你的源码或项目包。'},
 {id:'sample-note',kind:'note',category:'学习笔记',title:'关于留白的几页笔记',body:'把零散的想法写下来，慢慢整理成自己的理解。\n\n## 今天记住的事\n- 留白，让重点更清晰。\n- 整理，是为了下一次更好地开始。\n- 先记下来，再慢慢想明白。\n\n> 笔记不是标准答案，而是思考留下的脚印。\n\n这是示例笔记，可试着评论或收藏。'},
 {id:'sample-journal',kind:'journal',category:'生活',title:'给自己留一个慢下来的下午',body:'有时候，最好的安排就是不安排。\n\n煮一杯茶，翻几页书，看窗外的光一点点挪动。没有什么特别的事发生，却觉得这一天被好好地度过了。\n\n想把这些细小的时刻收好。以后翻到这里，还能记得当时的温度。\n\n这是一篇示例日常。'},
 {id:'sample-photo',kind:'work',category:'摄影',title:'写给远方的一封信',body:'把路上遇见的风景，收进一封没有地址的信里。\n\n这是一组示例摄影作品的介绍。真正的故事，等你来填写。'}
 ];
 samples.forEach((p,i)=>{const time=new Date(Date.now()-i*86400000).toISOString();run('INSERT INTO posts(id,author_id,kind,category,title,body,is_demo,created_at,updated_at) VALUES(?,?,?,?,?,?,1,?,?)',p.id,'demo-editor',p.kind,p.category,p.title,p.body,time,time)});
 });
}
