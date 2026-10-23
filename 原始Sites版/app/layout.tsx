import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'日常之间 · 作品与生活',description:'收藏创作，记录生活。一个安放作品、灵感与日常的个人空间。',icons:{icon:'/favicon.svg'}};
export default function Layout({children}:{children:React.ReactNode}) {return <html lang="zh-CN"><body>{children}</body></html>}
