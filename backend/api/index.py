"""API соцсети Online — авторизация, посты, лайки, комментарии, подписки, сообщения, уведомления, админ"""
import json
import os
import hashlib
import uuid
import psycopg2
import psycopg2.extras

def get_db():
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    conn.autocommit = True
    return conn

def hash_password(pw):
    return hashlib.sha256(pw.encode()).hexdigest()

def json_response(status, body, headers_extra=None):
    h = {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Authorization'}
    if headers_extra:
        h.update(headers_extra)
    return {'statusCode': status, 'headers': h, 'body': json.dumps(body, default=str)}

def get_current_user(event, cur):
    auth = event.get('headers', {}).get('X-Authorization', '') or event.get('headers', {}).get('x-authorization', '')
    if not auth or not auth.startswith('Bearer '):
        return None
    token = auth[7:]
    cur.execute("SELECT u.* FROM users u JOIN sessions s ON u.id = s.user_id WHERE s.token = '%s' AND s.expires_at > NOW()" % token.replace("'", "''"))
    row = cur.fetchone()
    return row

def handler(event, context):
    """Главный API социальной сети Online"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Authorization', 'Access-Control-Max-Age': '86400'}, 'body': ''}

    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}
    action = params.get('action', 'health')
    body = {}
    if event.get('body'):
        try:
            body = json.loads(event['body'])
        except:
            body = {}

    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    try:
        if action == 'register' and method == 'POST':
            return register(cur, body)
        elif action == 'login' and method == 'POST':
            return login(cur, body)
        elif action == 'me' and method == 'GET':
            return get_me(event, cur)
        elif action == 'feed' and method == 'GET':
            return get_feed(event, cur, params)
        elif action == 'create_post' and method == 'POST':
            return create_post(event, cur, body)
        elif action == 'get_post' and method == 'GET':
            return get_post(event, cur, params)
        elif action == 'remove_post' and method == 'POST':
            return remove_post(event, cur, body)
        elif action == 'add_comment' and method == 'POST':
            return add_comment(event, cur, body)
        elif action == 'get_comments' and method == 'GET':
            return get_comments(event, cur, params)
        elif action == 'toggle_like' and method == 'POST':
            return toggle_like(event, cur, body)
        elif action == 'toggle_repost' and method == 'POST':
            return toggle_repost(event, cur, body)
        elif action == 'toggle_follow' and method == 'POST':
            return toggle_follow(event, cur, body)
        elif action == 'respond_follow' and method == 'POST':
            return respond_follow_request(event, cur, body)
        elif action == 'follow_list' and method == 'GET':
            return get_follow_list(event, cur, params)
        elif action == 'profile' and method == 'GET':
            return get_profile(event, cur, params)
        elif action == 'update_profile' and method == 'POST':
            return update_profile(event, cur, body)
        elif action == 'search' and method == 'GET':
            return search_users(event, cur, params)
        elif action == 'get_messages' and method == 'GET':
            return get_messages(event, cur, params)
        elif action == 'send_message' and method == 'POST':
            return send_message(event, cur, body)
        elif action == 'get_chats' and method == 'GET':
            return get_chats(event, cur, params)
        elif action == 'message_action' and method == 'POST':
            return message_action(event, cur, body)
        elif action == 'notifications' and method == 'GET':
            return get_notifications(event, cur, params)
        elif action == 'read_notifications' and method == 'POST':
            return mark_notifications_read(event, cur, body)
        elif action == 'get_stories' and method == 'GET':
            return get_stories(event, cur, params)
        elif action == 'create_story' and method == 'POST':
            return create_story(event, cur, body)
        elif action == 'report' and method == 'POST':
            return create_report(event, cur, body)
        elif action == 'toggle_block' and method == 'POST':
            return toggle_block(event, cur, body)
        elif action == 'admin_reports' and method == 'GET':
            return admin_get_reports(event, cur, params)
        elif action == 'admin_action' and method == 'POST':
            return admin_action(event, cur, body)
        elif action == 'admin_verify' and method == 'POST':
            return admin_verify(event, cur, body)
        elif action == 'request_verification' and method == 'POST':
            return request_verification(event, cur, body)
        elif action == 'upload' and method == 'POST':
            return upload_image(event, cur, body)
        elif action == 'health':
            return json_response(200, {'status': 'ok', 'service': 'Online Social Network'})
        else:
            return json_response(404, {'error': 'Not found'})
    finally:
        cur.close()
        conn.close()


def register(cur, body):
    username = body.get('username', '').strip().lower()
    email = body.get('email', '').strip().lower()
    password = body.get('password', '')
    if not username or not email or not password:
        return json_response(400, {'error': 'Заполните все поля'})
    if len(username) < 3:
        return json_response(400, {'error': 'Username минимум 3 символа'})
    if len(password) < 4:
        return json_response(400, {'error': 'Пароль минимум 4 символа'})
    cur.execute("SELECT id FROM users WHERE username = '%s' OR email = '%s'" % (username.replace("'","''"), email.replace("'","''")))
    if cur.fetchone():
        return json_response(400, {'error': 'Пользователь уже существует'})
    pw_hash = hash_password(password)
    cur.execute("INSERT INTO users (username, email, password_hash, display_name) VALUES ('%s', '%s', '%s', '%s') RETURNING id" % (username.replace("'","''"), email.replace("'","''"), pw_hash, username.replace("'","''")))
    user_id = cur.fetchone()['id']
    token = str(uuid.uuid4())
    cur.execute("INSERT INTO sessions (user_id, token) VALUES (%d, '%s')" % (user_id, token))
    return json_response(200, {'token': token, 'user': {'id': user_id, 'username': username, 'email': email}})


def login(cur, body):
    email = body.get('email', '').strip().lower()
    password = body.get('password', '')
    if not email or not password:
        return json_response(400, {'error': 'Заполните все поля'})
    pw_hash = hash_password(password)
    cur.execute("SELECT * FROM users WHERE email = '%s' AND password_hash = '%s'" % (email.replace("'","''"), pw_hash))
    user = cur.fetchone()
    if not user:
        return json_response(401, {'error': 'Неверный email или пароль'})
    if user['is_blocked']:
        return json_response(403, {'error': 'Аккаунт заблокирован'})
    token = str(uuid.uuid4())
    cur.execute("INSERT INTO sessions (user_id, token) VALUES (%d, '%s')" % (user['id'], token))
    return json_response(200, {'token': token, 'user': {'id': user['id'], 'username': user['username'], 'email': user['email'], 'display_name': user['display_name'], 'avatar_url': user['avatar_url'], 'is_admin': user['is_admin'], 'is_verified': user['is_verified'], 'theme': user['theme']}})


def get_me(event, cur):
    user = get_current_user(event, cur)
    if not user:
        return json_response(401, {'error': 'Не авторизован'})
    return json_response(200, {'user': {'id': user['id'], 'username': user['username'], 'email': user['email'], 'display_name': user['display_name'], 'avatar_url': user['avatar_url'], 'bio': user['bio'], 'is_private': user['is_private'], 'is_admin': user['is_admin'], 'is_verified': user['is_verified'], 'links': user['links'], 'privacy_settings': user['privacy_settings'], 'theme': user['theme'], 'messages_enabled': user['messages_enabled']}})


def get_feed(event, cur, params):
    page = int(params.get('page', '1'))
    limit = 20
    offset = (page - 1) * limit
    user = get_current_user(event, cur)
    user_id = user['id'] if user else 0

    cur.execute("""
        SELECT p.*, u.username, u.display_name, u.avatar_url, u.is_verified,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count,
        (SELECT COUNT(*) FROM reposts WHERE post_id = p.id) as reposts_count,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = %d) as is_liked,
        (SELECT COUNT(*) FROM reposts WHERE post_id = p.id AND user_id = %d) as is_reposted
        FROM posts p JOIN users u ON p.user_id = u.id
        WHERE p.is_removed = FALSE AND u.is_blocked = FALSE
        AND p.user_id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = %d)
        ORDER BY p.created_at DESC LIMIT %d OFFSET %d
    """ % (user_id, user_id, user_id, limit, offset))
    posts = cur.fetchall()
    return json_response(200, {'posts': posts})


def create_post(event, cur, body):
    user = get_current_user(event, cur)
    if not user:
        return json_response(401, {'error': 'Не авторизован'})
    content = body.get('content', '').strip()
    image_url = body.get('image_url', '')
    if not content and not image_url:
        return json_response(400, {'error': 'Напишите что-нибудь'})
    cur.execute("INSERT INTO posts (user_id, content, image_url) VALUES (%d, '%s', '%s') RETURNING id, created_at" % (user['id'], content.replace("'","''"), image_url.replace("'","''")))
    post = cur.fetchone()
    return json_response(200, {'post': {'id': post['id'], 'user_id': user['id'], 'content': content, 'image_url': image_url, 'created_at': post['created_at'], 'username': user['username'], 'display_name': user['display_name'], 'avatar_url': user['avatar_url'], 'is_verified': user['is_verified']}})


def get_post(event, cur, params):
    post_id = int(params.get('id', '0'))
    user = get_current_user(event, cur)
    user_id = user['id'] if user else 0
    cur.execute("""
        SELECT p.*, u.username, u.display_name, u.avatar_url, u.is_verified,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count,
        (SELECT COUNT(*) FROM reposts WHERE post_id = p.id) as reposts_count,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = %d) as is_liked,
        (SELECT COUNT(*) FROM reposts WHERE post_id = p.id AND user_id = %d) as is_reposted
        FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = %d AND p.is_removed = FALSE
    """ % (user_id, user_id, post_id))
    post = cur.fetchone()
    if not post:
        return json_response(404, {'error': 'Пост не найден'})
    return json_response(200, {'post': post})


def remove_post(event, cur, body):
    user = get_current_user(event, cur)
    if not user:
        return json_response(401, {'error': 'Не авторизован'})
    post_id = int(body.get('post_id', 0))
    cur.execute("SELECT user_id FROM posts WHERE id = %d" % post_id)
    post = cur.fetchone()
    if not post:
        return json_response(404, {'error': 'Пост не найден'})
    if post['user_id'] != user['id'] and not user['is_admin']:
        return json_response(403, {'error': 'Нет прав'})
    cur.execute("UPDATE posts SET is_removed = TRUE WHERE id = %d" % post_id)
    return json_response(200, {'success': True})


def add_comment(event, cur, body):
    user = get_current_user(event, cur)
    if not user:
        return json_response(401, {'error': 'Не авторизован'})
    post_id = int(body.get('post_id', 0))
    content = body.get('content', '').strip()
    parent_id = body.get('parent_id')
    if not content:
        return json_response(400, {'error': 'Пустой комментарий'})
    parent_sql = "NULL" if not parent_id else str(int(parent_id))
    cur.execute("INSERT INTO comments (post_id, user_id, parent_id, content) VALUES (%d, %d, %s, '%s') RETURNING id, created_at" % (post_id, user['id'], parent_sql, content.replace("'","''")))
    comment = cur.fetchone()
    cur.execute("SELECT user_id FROM posts WHERE id = %d" % post_id)
    post_owner = cur.fetchone()
    if post_owner and post_owner['user_id'] != user['id']:
        cur.execute("INSERT INTO notifications (user_id, type, from_user_id, post_id, comment_id, content) VALUES (%d, 'comment', %d, %d, %d, '%s')" % (post_owner['user_id'], user['id'], post_id, comment['id'], content[:100].replace("'","''")))
    return json_response(200, {'comment': {'id': comment['id'], 'post_id': post_id, 'user_id': user['id'], 'content': content, 'parent_id': parent_id, 'created_at': comment['created_at'], 'username': user['username'], 'display_name': user['display_name'], 'avatar_url': user['avatar_url'], 'is_verified': user['is_verified']}})


def get_comments(event, cur, params):
    post_id = int(params.get('post_id', '0'))
    user = get_current_user(event, cur)
    user_id = user['id'] if user else 0
    cur.execute("""
        SELECT c.*, u.username, u.display_name, u.avatar_url, u.is_verified,
        (SELECT COUNT(*) FROM likes WHERE comment_id = c.id) as likes_count,
        (SELECT COUNT(*) FROM likes WHERE comment_id = c.id AND user_id = %d) as is_liked,
        (SELECT user_id FROM posts WHERE id = c.post_id) as post_author_id,
        CASE WHEN EXISTS (SELECT 1 FROM likes WHERE comment_id = c.id AND user_id = (SELECT user_id FROM posts WHERE id = c.post_id)) THEN TRUE ELSE FALSE END as liked_by_author
        FROM comments c JOIN users u ON c.user_id = u.id WHERE c.post_id = %d ORDER BY c.created_at ASC
    """ % (user_id, post_id))
    comments = cur.fetchall()
    return json_response(200, {'comments': comments})


def toggle_like(event, cur, body):
    user = get_current_user(event, cur)
    if not user:
        return json_response(401, {'error': 'Не авторизован'})
    post_id = body.get('post_id')
    comment_id = body.get('comment_id')
    if post_id:
        cur.execute("SELECT id FROM likes WHERE user_id = %d AND post_id = %d" % (user['id'], int(post_id)))
        existing = cur.fetchone()
        if existing:
            cur.execute("UPDATE likes SET post_id = NULL WHERE id = %d" % existing['id'])
            return json_response(200, {'liked': False})
        else:
            cur.execute("INSERT INTO likes (user_id, post_id) VALUES (%d, %d)" % (user['id'], int(post_id)))
            cur.execute("SELECT user_id FROM posts WHERE id = %d" % int(post_id))
            po = cur.fetchone()
            if po and po['user_id'] != user['id']:
                cur.execute("INSERT INTO notifications (user_id, type, from_user_id, post_id) VALUES (%d, 'like', %d, %d)" % (po['user_id'], user['id'], int(post_id)))
            return json_response(200, {'liked': True})
    elif comment_id:
        cur.execute("SELECT id FROM likes WHERE user_id = %d AND comment_id = %d" % (user['id'], int(comment_id)))
        existing = cur.fetchone()
        if existing:
            cur.execute("UPDATE likes SET comment_id = NULL WHERE id = %d" % existing['id'])
            return json_response(200, {'liked': False})
        else:
            cur.execute("INSERT INTO likes (user_id, comment_id) VALUES (%d, %d)" % (user['id'], int(comment_id)))
            return json_response(200, {'liked': True})
    return json_response(400, {'error': 'Укажите post_id или comment_id'})


def toggle_repost(event, cur, body):
    user = get_current_user(event, cur)
    if not user:
        return json_response(401, {'error': 'Не авторизован'})
    post_id = int(body.get('post_id', 0))
    cur.execute("SELECT id FROM reposts WHERE user_id = %d AND post_id = %d" % (user['id'], post_id))
    existing = cur.fetchone()
    if existing:
        cur.execute("UPDATE reposts SET post_id = NULL WHERE id = %d" % existing['id'])
        return json_response(200, {'reposted': False})
    else:
        cur.execute("INSERT INTO reposts (user_id, post_id) VALUES (%d, %d)" % (user['id'], post_id))
        return json_response(200, {'reposted': True})


def toggle_follow(event, cur, body):
    user = get_current_user(event, cur)
    if not user:
        return json_response(401, {'error': 'Не авторизован'})
    target_id = int(body.get('user_id', 0))
    if target_id == user['id']:
        return json_response(400, {'error': 'Нельзя подписаться на себя'})
    cur.execute("SELECT id, status FROM follows WHERE follower_id = %d AND following_id = %d" % (user['id'], target_id))
    existing = cur.fetchone()
    if existing:
        cur.execute("UPDATE follows SET status = 'removed' WHERE id = %d" % existing['id'])
        return json_response(200, {'following': False})
    else:
        cur.execute("SELECT is_private FROM users WHERE id = %d" % target_id)
        target = cur.fetchone()
        if target and target['is_private']:
            cur.execute("INSERT INTO follows (follower_id, following_id, status) VALUES (%d, %d, 'pending')" % (user['id'], target_id))
            cur.execute("INSERT INTO notifications (user_id, type, from_user_id, content) VALUES (%d, 'follow_request', %d, 'Запрос на подписку')" % (target_id, user['id']))
            return json_response(200, {'following': False, 'pending': True})
        else:
            cur.execute("INSERT INTO follows (follower_id, following_id, status) VALUES (%d, %d, 'active')" % (user['id'], target_id))
            cur.execute("INSERT INTO notifications (user_id, type, from_user_id, content) VALUES (%d, 'follow', %d, 'Новый подписчик')" % (target_id, user['id']))
            return json_response(200, {'following': True})


def respond_follow_request(event, cur, body):
    user = get_current_user(event, cur)
    if not user:
        return json_response(401, {'error': 'Не авторизован'})
    follow_id = int(body.get('follow_id', 0))
    action = body.get('action', '')
    cur.execute("SELECT * FROM follows WHERE id = %d AND following_id = %d AND status = 'pending'" % (follow_id, user['id']))
    follow = cur.fetchone()
    if not follow:
        return json_response(404, {'error': 'Запрос не найден'})
    if action == 'accept':
        cur.execute("UPDATE follows SET status = 'active' WHERE id = %d" % follow_id)
        cur.execute("INSERT INTO notifications (user_id, type, from_user_id, content) VALUES (%d, 'follow_accepted', %d, 'Заявка принята')" % (follow['follower_id'], user['id']))
    else:
        cur.execute("UPDATE follows SET status = 'rejected' WHERE id = %d" % follow_id)
    return json_response(200, {'success': True})


def get_follow_list(event, cur, params):
    user = get_current_user(event, cur)
    if not user:
        return json_response(401, {'error': 'Не авторизован'})
    target_id = int(params.get('user_id', str(user['id'])))
    list_type = params.get('type', 'followers')

    if list_type == 'followers':
        cur.execute("SELECT u.id, u.username, u.display_name, u.avatar_url, u.is_verified FROM follows f JOIN users u ON f.follower_id = u.id WHERE f.following_id = %d AND f.status = 'active'" % target_id)
    elif list_type == 'following':
        cur.execute("SELECT u.id, u.username, u.display_name, u.avatar_url, u.is_verified FROM follows f JOIN users u ON f.following_id = u.id WHERE f.follower_id = %d AND f.status = 'active'" % target_id)
    elif list_type == 'friends':
        cur.execute("""
            SELECT u.id, u.username, u.display_name, u.avatar_url, u.is_verified
            FROM users u WHERE u.id IN (
                SELECT f1.following_id FROM follows f1
                JOIN follows f2 ON f1.following_id = f2.follower_id AND f1.follower_id = f2.following_id
                WHERE f1.follower_id = %d AND f1.status = 'active' AND f2.status = 'active'
            )
        """ % target_id)
    elif list_type == 'pending':
        cur.execute("SELECT f.id as follow_id, u.id, u.username, u.display_name, u.avatar_url, u.is_verified FROM follows f JOIN users u ON f.follower_id = u.id WHERE f.following_id = %d AND f.status = 'pending'" % target_id)
    else:
        return json_response(400, {'error': 'Неверный тип'})
    users_list = cur.fetchall()
    return json_response(200, {'users': users_list})


def get_profile(event, cur, params):
    username = params.get('username', '')
    user = get_current_user(event, cur)
    user_id = user['id'] if user else 0
    cur.execute("SELECT id, username, display_name, bio, avatar_url, is_private, is_verified, is_admin, links, privacy_settings, created_at FROM users WHERE username = '%s'" % username.replace("'","''"))
    profile = cur.fetchone()
    if not profile:
        return json_response(404, {'error': 'Пользователь не найден'})
    cur.execute("SELECT COUNT(*) as cnt FROM follows WHERE following_id = %d AND status = 'active'" % profile['id'])
    followers = cur.fetchone()['cnt']
    cur.execute("SELECT COUNT(*) as cnt FROM follows WHERE follower_id = %d AND status = 'active'" % profile['id'])
    following = cur.fetchone()['cnt']
    cur.execute("SELECT COUNT(*) as cnt FROM posts WHERE user_id = %d AND is_removed = FALSE" % profile['id'])
    posts_count = cur.fetchone()['cnt']
    is_following = False
    is_pending = False
    if user_id:
        cur.execute("SELECT status FROM follows WHERE follower_id = %d AND following_id = %d" % (user_id, profile['id']))
        f = cur.fetchone()
        if f:
            is_following = f['status'] == 'active'
            is_pending = f['status'] == 'pending'
    profile['followers_count'] = followers
    profile['following_count'] = following
    profile['posts_count'] = posts_count
    profile['is_following'] = is_following
    profile['is_pending'] = is_pending
    profile['is_own'] = user_id == profile['id']

    cur.execute("SELECT p.*, (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count, (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count, (SELECT COUNT(*) FROM reposts WHERE post_id = p.id) as reposts_count, (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = %d) as is_liked, (SELECT COUNT(*) FROM reposts WHERE post_id = p.id AND user_id = %d) as is_reposted FROM posts p WHERE p.user_id = %d AND p.is_removed = FALSE ORDER BY p.created_at DESC LIMIT 50" % (user_id, user_id, profile['id']))
    posts = cur.fetchall()
    profile['posts'] = posts
    return json_response(200, {'profile': profile})


def update_profile(event, cur, body):
    user = get_current_user(event, cur)
    if not user:
        return json_response(401, {'error': 'Не авторизован'})
    display_name = body.get('display_name', user['display_name'])
    bio = body.get('bio', user['bio'])
    avatar_url = body.get('avatar_url', user['avatar_url'])
    is_private = body.get('is_private', user['is_private'])
    links = body.get('links', user['links'])
    privacy_settings = body.get('privacy_settings', user['privacy_settings'])
    theme = body.get('theme', user['theme'])
    messages_enabled = body.get('messages_enabled', user['messages_enabled'])
    if isinstance(links, dict):
        links = json.dumps(links)
    if isinstance(privacy_settings, dict):
        privacy_settings = json.dumps(privacy_settings)
    cur.execute("UPDATE users SET display_name = '%s', bio = '%s', avatar_url = '%s', is_private = %s, links = '%s', privacy_settings = '%s', theme = '%s', messages_enabled = %s WHERE id = %d" % (
        str(display_name).replace("'","''"), str(bio).replace("'","''"), str(avatar_url).replace("'","''"),
        'TRUE' if is_private else 'FALSE', str(links).replace("'","''"), str(privacy_settings).replace("'","''"),
        str(theme).replace("'","''"), 'TRUE' if messages_enabled else 'FALSE', user['id']))
    return json_response(200, {'success': True})


def search_users(event, cur, params):
    user = get_current_user(event, cur)
    if not user:
        return json_response(401, {'error': 'Не авторизован'})
    q = params.get('q', '').strip()
    if not q:
        return json_response(200, {'users': []})
    cur.execute("SELECT id, username, display_name, avatar_url, is_verified, bio FROM users WHERE (username ILIKE '%%%s%%' OR display_name ILIKE '%%%s%%') AND is_blocked = FALSE LIMIT 20" % (q.replace("'","''"), q.replace("'","''")))
    users = cur.fetchall()
    return json_response(200, {'users': users})


def get_messages(event, cur, params):
    user = get_current_user(event, cur)
    if not user:
        return json_response(401, {'error': 'Не авторизован'})
    other_id = int(params.get('user_id', '0'))
    cur.execute("""
        SELECT m.*, su.username as sender_username, su.display_name as sender_name, su.avatar_url as sender_avatar,
        ru.username as receiver_username
        FROM messages m
        JOIN users su ON m.sender_id = su.id
        JOIN users ru ON m.receiver_id = ru.id
        WHERE ((m.sender_id = %d AND m.receiver_id = %d AND m.hidden_by_sender = FALSE) OR (m.sender_id = %d AND m.receiver_id = %d AND m.hidden_by_receiver = FALSE))
        ORDER BY m.created_at ASC LIMIT 100
    """ % (user['id'], other_id, other_id, user['id']))
    msgs = cur.fetchall()
    cur.execute("UPDATE messages SET is_read = TRUE WHERE sender_id = %d AND receiver_id = %d AND is_read = FALSE" % (other_id, user['id']))
    return json_response(200, {'messages': msgs})


def send_message(event, cur, body):
    user = get_current_user(event, cur)
    if not user:
        return json_response(401, {'error': 'Не авторизован'})
    receiver_id = int(body.get('receiver_id', 0))
    content = body.get('content', '').strip()
    reply_to_id = body.get('reply_to_id')
    if not content:
        return json_response(400, {'error': 'Пустое сообщение'})
    cur.execute("SELECT id FROM blocks WHERE blocker_id = %d AND blocked_id = %d" % (receiver_id, user['id']))
    if cur.fetchone():
        return json_response(403, {'error': 'Вы заблокированы'})
    cur.execute("SELECT messages_enabled FROM users WHERE id = %d" % receiver_id)
    recv = cur.fetchone()
    if recv and not recv['messages_enabled']:
        return json_response(403, {'error': 'Пользователь отключил сообщения'})
    reply_sql = "NULL" if not reply_to_id else str(int(reply_to_id))
    cur.execute("INSERT INTO messages (sender_id, receiver_id, content, reply_to_id) VALUES (%d, %d, '%s', %s) RETURNING id, created_at" % (user['id'], receiver_id, content.replace("'","''"), reply_sql))
    msg = cur.fetchone()
    cur.execute("INSERT INTO notifications (user_id, type, from_user_id, content) VALUES (%d, 'message', %d, '%s')" % (receiver_id, user['id'], content[:50].replace("'","''")))
    return json_response(200, {'message': {'id': msg['id'], 'sender_id': user['id'], 'receiver_id': receiver_id, 'content': content, 'created_at': msg['created_at']}})


def get_chats(event, cur, params):
    user = get_current_user(event, cur)
    if not user:
        return json_response(401, {'error': 'Не авторизован'})
    cur.execute("""
        SELECT DISTINCT ON (other_id) * FROM (
            SELECT m.*, CASE WHEN m.sender_id = %d THEN m.receiver_id ELSE m.sender_id END as other_id
            FROM messages m
            WHERE (m.sender_id = %d AND m.hidden_by_sender = FALSE) OR (m.receiver_id = %d AND m.hidden_by_receiver = FALSE)
        ) sub
        ORDER BY other_id, created_at DESC
    """ % (user['id'], user['id'], user['id']))
    chats = cur.fetchall()
    result = []
    for chat in chats:
        cur.execute("SELECT id, username, display_name, avatar_url, is_verified FROM users WHERE id = %d" % chat['other_id'])
        other_user = cur.fetchone()
        cur.execute("SELECT COUNT(*) as cnt FROM messages WHERE sender_id = %d AND receiver_id = %d AND is_read = FALSE" % (chat['other_id'], user['id']))
        unread = cur.fetchone()['cnt']
        result.append({'user': other_user, 'last_message': {'content': chat['content'], 'created_at': chat['created_at'], 'sender_id': chat['sender_id']}, 'unread_count': unread})
    return json_response(200, {'chats': result})


def message_action(event, cur, body):
    user = get_current_user(event, cur)
    if not user:
        return json_response(401, {'error': 'Не авторизован'})
    action = body.get('action', '')
    msg_id = int(body.get('message_id', 0))

    if action == 'edit':
        new_content = body.get('content', '').strip()
        cur.execute("UPDATE messages SET content = '%s', edited_at = NOW() WHERE id = %d AND sender_id = %d" % (new_content.replace("'","''"), msg_id, user['id']))
    elif action == 'pin':
        cur.execute("UPDATE messages SET is_pinned = NOT is_pinned WHERE id = %d AND (sender_id = %d OR receiver_id = %d)" % (msg_id, user['id'], user['id']))
    elif action == 'hide':
        cur.execute("SELECT sender_id FROM messages WHERE id = %d" % msg_id)
        msg = cur.fetchone()
        if msg:
            if msg['sender_id'] == user['id']:
                cur.execute("UPDATE messages SET hidden_by_sender = TRUE WHERE id = %d" % msg_id)
            else:
                cur.execute("UPDATE messages SET hidden_by_receiver = TRUE WHERE id = %d" % msg_id)
    elif action == 'clear_chat':
        other_id = int(body.get('user_id', 0))
        cur.execute("UPDATE messages SET hidden_by_sender = TRUE WHERE sender_id = %d AND receiver_id = %d" % (user['id'], other_id))
        cur.execute("UPDATE messages SET hidden_by_receiver = TRUE WHERE sender_id = %d AND receiver_id = %d" % (other_id, user['id']))
    return json_response(200, {'success': True})


def get_notifications(event, cur, params):
    user = get_current_user(event, cur)
    if not user:
        return json_response(401, {'error': 'Не авторизован'})
    cur.execute("""
        SELECT n.*, u.username as from_username, u.display_name as from_display_name, u.avatar_url as from_avatar
        FROM notifications n LEFT JOIN users u ON n.from_user_id = u.id
        WHERE n.user_id = %d ORDER BY n.created_at DESC LIMIT 50
    """ % user['id'])
    notifs = cur.fetchall()
    return json_response(200, {'notifications': notifs})


def mark_notifications_read(event, cur, body):
    user = get_current_user(event, cur)
    if not user:
        return json_response(401, {'error': 'Не авторизован'})
    cur.execute("UPDATE notifications SET is_read = TRUE WHERE user_id = %d AND is_read = FALSE" % user['id'])
    return json_response(200, {'success': True})


def get_stories(event, cur, params):
    user = get_current_user(event, cur)
    user_id = user['id'] if user else 0
    cur.execute("""
        SELECT s.*, u.username, u.display_name, u.avatar_url, u.is_verified
        FROM stories s JOIN users u ON s.user_id = u.id
        WHERE s.expires_at > NOW()
        AND (s.visibility = 'all'
            OR (s.visibility = 'followers' AND EXISTS (SELECT 1 FROM follows WHERE follower_id = %d AND following_id = s.user_id AND status = 'active'))
            OR (s.visibility = 'mutual' AND EXISTS (SELECT 1 FROM follows f1 JOIN follows f2 ON f1.following_id = f2.follower_id AND f1.follower_id = f2.following_id WHERE f1.follower_id = %d AND f1.following_id = s.user_id AND f1.status = 'active' AND f2.status = 'active'))
            OR s.user_id = %d)
        ORDER BY s.created_at DESC
    """ % (user_id, user_id, user_id))
    stories = cur.fetchall()
    return json_response(200, {'stories': stories})


def create_story(event, cur, body):
    user = get_current_user(event, cur)
    if not user:
        return json_response(401, {'error': 'Не авторизован'})
    image_url = body.get('image_url', '')
    visibility = body.get('visibility', 'all')
    if not image_url:
        return json_response(400, {'error': 'Нужно фото'})
    cur.execute("INSERT INTO stories (user_id, image_url, visibility) VALUES (%d, '%s', '%s') RETURNING id" % (user['id'], image_url.replace("'","''"), visibility.replace("'","''")))
    story = cur.fetchone()
    return json_response(200, {'story': {'id': story['id']}})


def create_report(event, cur, body):
    user = get_current_user(event, cur)
    if not user:
        return json_response(401, {'error': 'Не авторизован'})
    reason = body.get('reason', '').strip()
    reported_user_id = body.get('user_id')
    reported_post_id = body.get('post_id')
    user_sql = "NULL" if not reported_user_id else str(int(reported_user_id))
    post_sql = "NULL" if not reported_post_id else str(int(reported_post_id))
    cur.execute("INSERT INTO reports (reporter_id, reported_user_id, reported_post_id, reason) VALUES (%d, %s, %s, '%s')" % (user['id'], user_sql, post_sql, reason.replace("'","''")))
    return json_response(200, {'success': True})


def toggle_block(event, cur, body):
    user = get_current_user(event, cur)
    if not user:
        return json_response(401, {'error': 'Не авторизован'})
    target_id = int(body.get('user_id', 0))
    cur.execute("SELECT id FROM blocks WHERE blocker_id = %d AND blocked_id = %d" % (user['id'], target_id))
    existing = cur.fetchone()
    if existing:
        cur.execute("UPDATE blocks SET blocker_id = 0 WHERE id = %d" % existing['id'])
        return json_response(200, {'blocked': False})
    else:
        cur.execute("INSERT INTO blocks (blocker_id, blocked_id) VALUES (%d, %d)" % (user['id'], target_id))
        return json_response(200, {'blocked': True})


def admin_get_reports(event, cur, params):
    user = get_current_user(event, cur)
    if not user or not user['is_admin']:
        return json_response(403, {'error': 'Нет прав'})
    cur.execute("""
        SELECT r.*, ru.username as reporter_username,
        tu.username as reported_username
        FROM reports r
        LEFT JOIN users ru ON r.reporter_id = ru.id
        LEFT JOIN users tu ON r.reported_user_id = tu.id
        WHERE r.status = 'pending' ORDER BY r.created_at DESC
    """)
    reports = cur.fetchall()
    cur.execute("SELECT v.*, u.username FROM verification_requests v JOIN users u ON v.user_id = u.id WHERE v.status = 'pending' ORDER BY v.created_at DESC")
    verifications = cur.fetchall()
    return json_response(200, {'reports': reports, 'verifications': verifications})


def admin_action(event, cur, body):
    user = get_current_user(event, cur)
    if not user or not user['is_admin']:
        return json_response(403, {'error': 'Нет прав'})
    action = body.get('action', '')
    if action == 'block_user':
        target_id = int(body.get('user_id', 0))
        cur.execute("UPDATE users SET is_blocked = TRUE WHERE id = %d" % target_id)
    elif action == 'unblock_user':
        target_id = int(body.get('user_id', 0))
        cur.execute("UPDATE users SET is_blocked = FALSE WHERE id = %d" % target_id)
    elif action == 'remove_post':
        post_id = int(body.get('post_id', 0))
        cur.execute("UPDATE posts SET is_removed = TRUE WHERE id = %d" % post_id)
    elif action == 'resolve_report':
        report_id = int(body.get('report_id', 0))
        cur.execute("UPDATE reports SET status = 'resolved' WHERE id = %d" % report_id)
    return json_response(200, {'success': True})


def admin_verify(event, cur, body):
    user = get_current_user(event, cur)
    if not user or not user['is_admin']:
        return json_response(403, {'error': 'Нет прав'})
    request_id = int(body.get('request_id', 0))
    action = body.get('action', '')
    if action == 'approve':
        cur.execute("SELECT user_id FROM verification_requests WHERE id = %d" % request_id)
        vr = cur.fetchone()
        if vr:
            cur.execute("UPDATE users SET is_verified = TRUE WHERE id = %d" % vr['user_id'])
            cur.execute("UPDATE verification_requests SET status = 'approved' WHERE id = %d" % request_id)
    else:
        cur.execute("UPDATE verification_requests SET status = 'rejected' WHERE id = %d" % request_id)
    return json_response(200, {'success': True})


def request_verification(event, cur, body):
    user = get_current_user(event, cur)
    if not user:
        return json_response(401, {'error': 'Не авторизован'})
    cur.execute("SELECT id FROM verification_requests WHERE user_id = %d AND status = 'pending'" % user['id'])
    if cur.fetchone():
        return json_response(400, {'error': 'Заявка уже подана'})
    cur.execute("INSERT INTO verification_requests (user_id) VALUES (%d)" % user['id'])
    return json_response(200, {'success': True})


def upload_image(event, cur, body):
    user = get_current_user(event, cur)
    if not user:
        return json_response(401, {'error': 'Не авторизован'})
    import base64
    import boto3
    image_data = body.get('image', '')
    image_type = body.get('type', 'post')
    if not image_data:
        return json_response(400, {'error': 'Нет изображения'})
    if ',' in image_data:
        image_data = image_data.split(',')[1]
    file_bytes = base64.b64decode(image_data)
    ext = 'jpg'
    content_type = 'image/jpeg'
    if body.get('content_type', '').endswith('png'):
        ext = 'png'
        content_type = 'image/png'
    filename = "%s/%s_%s.%s" % (image_type, user['id'], uuid.uuid4().hex[:8], ext)
    s3 = boto3.client('s3', endpoint_url='https://bucket.poehali.dev', aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'], aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'])
    s3.put_object(Bucket='files', Key=filename, Body=file_bytes, ContentType=content_type)
    cdn_url = "https://cdn.poehali.dev/projects/%s/bucket/%s" % (os.environ['AWS_ACCESS_KEY_ID'], filename)
    return json_response(200, {'url': cdn_url})