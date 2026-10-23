import {Suspense} from 'react';import CommunityApp from '@/components/community-app';
export default function Page(){return <Suspense fallback={<div style={{padding:80,textAlign:'center'}}>正在翻开这一页…</div>}><CommunityApp/></Suspense>}
