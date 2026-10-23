import Blog from './blog';
import { getChatGPTUser } from './chatgpt-auth';
export const dynamic = 'force-dynamic';
export default async function Home() {
  const user = await getChatGPTUser();
  return <Blog signedIn={!!user} userId={user?.userId ?? ''} />;
}
