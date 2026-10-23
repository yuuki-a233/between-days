CREATE TABLE IF NOT EXISTS profiles (
 id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, bio TEXT NOT NULL DEFAULT '', avatar_id TEXT NOT NULL DEFAULT '',
 role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('owner','admin','member')), publish_status TEXT NOT NULL DEFAULT 'none', status TEXT NOT NULL DEFAULT 'active', is_demo INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS posts (
 id TEXT PRIMARY KEY, author_id TEXT NOT NULL REFERENCES profiles(id), kind TEXT NOT NULL, category TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL,
 cover_id TEXT NOT NULL DEFAULT '', attachment_id TEXT NOT NULL DEFAULT '', link TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'published', is_demo INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS posts_feed ON posts(status,created_at DESC,id);
CREATE TABLE IF NOT EXISTS files (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES profiles(id), name TEXT NOT NULL, mime TEXT NOT NULL, size INTEGER NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS comments (id TEXT PRIMARY KEY, post_id TEXT NOT NULL REFERENCES posts(id), author_id TEXT NOT NULL REFERENCES profiles(id), parent_id TEXT REFERENCES comments(id), body TEXT NOT NULL, deleted INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS comments_post ON comments(post_id,created_at);
CREATE TABLE IF NOT EXISTS likes (user_id TEXT NOT NULL REFERENCES profiles(id), post_id TEXT NOT NULL REFERENCES posts(id), created_at TEXT NOT NULL, PRIMARY KEY(user_id,post_id));
CREATE TABLE IF NOT EXISTS bookmarks (user_id TEXT NOT NULL REFERENCES profiles(id), post_id TEXT NOT NULL REFERENCES posts(id), created_at TEXT NOT NULL, PRIMARY KEY(user_id,post_id));
CREATE TABLE IF NOT EXISTS applications (user_id TEXT PRIMARY KEY REFERENCES profiles(id), reason TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', reviewed_by TEXT, reviewed_at TEXT, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS reports (id TEXT PRIMARY KEY, reporter_id TEXT NOT NULL REFERENCES profiles(id), target_type TEXT NOT NULL, target_id TEXT NOT NULL, reason TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open', created_at TEXT NOT NULL, resolved_by TEXT, resolved_at TEXT);
CREATE UNIQUE INDEX IF NOT EXISTS one_open_report ON reports(reporter_id,target_type,target_id) WHERE status='open';
CREATE TABLE IF NOT EXISTS audit (id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, action TEXT NOT NULL, target_id TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS test_access (email TEXT PRIMARY KEY, added_by TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS request_limits (key TEXT PRIMARY KEY, window_start INTEGER NOT NULL, hits INTEGER NOT NULL);
