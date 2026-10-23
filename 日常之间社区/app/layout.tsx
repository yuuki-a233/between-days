import type {Metadata} from 'next';import './globals.css';
export const metadata:Metadata={title:'日常之间 · 创作与生活',description:'收藏创作，分享笔记，和同样好奇的人一起记录生活。',icons:{icon:'/favicon.svg'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="zh-CN" data-scroll-behavior="smooth"><body>{children}</body></html>}
