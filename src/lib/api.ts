const API_URL = "https://functions.poehali.dev/46d264f1-7635-4fd3-a51b-034b2068eb7d";

function getToken(): string | null {
  return localStorage.getItem("online_token");
}

export function setToken(token: string) {
  localStorage.setItem("online_token", token);
}

export function clearToken() {
  localStorage.removeItem("online_token");
}

async function request(action: string, method: string = "GET", body?: any, extraParams?: Record<string, string>) {
  const params = new URLSearchParams({ action, ...extraParams });
  const url = `${API_URL}?${params.toString()}`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok && data.error) throw new Error(data.error);
  return data;
}

export const api = {
  register: (username: string, email: string, password: string) =>
    request("register", "POST", { username, email, password }),
  login: (email: string, password: string) =>
    request("login", "POST", { email, password }),
  me: () => request("me", "GET"),
  feed: (page = 1) => request("feed", "GET", undefined, { page: String(page) }),
  createPost: (content: string, image_url?: string) =>
    request("create_post", "POST", { content, image_url }),
  getPost: (id: number) => request("get_post", "GET", undefined, { id: String(id) }),
  removePost: (post_id: number) => request("remove_post", "POST", { post_id }),
  addComment: (post_id: number, content: string, parent_id?: number) =>
    request("add_comment", "POST", { post_id, content, parent_id }),
  getComments: (post_id: number) =>
    request("get_comments", "GET", undefined, { post_id: String(post_id) }),
  toggleLike: (post_id?: number, comment_id?: number) =>
    request("toggle_like", "POST", { post_id, comment_id }),
  toggleRepost: (post_id: number) => request("toggle_repost", "POST", { post_id }),
  toggleFollow: (user_id: number) => request("toggle_follow", "POST", { user_id }),
  respondFollow: (follow_id: number, action: string) =>
    request("respond_follow", "POST", { follow_id, action }),
  followList: (user_id: number, type: string) =>
    request("follow_list", "GET", undefined, { user_id: String(user_id), type }),
  profile: (username: string) =>
    request("profile", "GET", undefined, { username }),
  updateProfile: (data: any) => request("update_profile", "POST", data),
  search: (q: string) => request("search", "GET", undefined, { q }),
  getMessages: (user_id: number) =>
    request("get_messages", "GET", undefined, { user_id: String(user_id) }),
  sendMessage: (receiver_id: number, content: string, reply_to_id?: number) =>
    request("send_message", "POST", { receiver_id, content, reply_to_id }),
  getChats: () => request("get_chats", "GET"),
  messageAction: (action: string, message_id?: number, content?: string, user_id?: number) =>
    request("message_action", "POST", { action, message_id, content, user_id }),
  notifications: () => request("notifications", "GET"),
  readNotifications: () => request("read_notifications", "POST"),
  getStories: () => request("get_stories", "GET"),
  createStory: (image_url: string, visibility: string) =>
    request("create_story", "POST", { image_url, visibility }),
  report: (reason: string, user_id?: number, post_id?: number) =>
    request("report", "POST", { reason, user_id, post_id }),
  toggleBlock: (user_id: number) => request("toggle_block", "POST", { user_id }),
  adminReports: () => request("admin_reports", "GET"),
  adminAction: (action: string, user_id?: number, post_id?: number, report_id?: number) =>
    request("admin_action", "POST", { action, user_id, post_id, report_id }),
  adminVerify: (request_id: number, action: string) =>
    request("admin_verify", "POST", { request_id, action }),
  requestVerification: () => request("request_verification", "POST"),
  upload: (image: string, type: string, content_type?: string) =>
    request("upload", "POST", { image, type, content_type }),
};

export default api;
