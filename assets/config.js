/*
 * 线上数据库配置
 *
 * 留空时：使用浏览器本机存储，适合先体验界面。
 * 填写后：使用 Supabase 登录和云端论文库。
 *
 * 安全边界：
 * - 这里只能填写 Supabase 的 anon public key。
 * - 绝不要把 service_role key、数据库密码或其他私钥写入网页文件。
 */
window.PAPER_HUB_CONFIG = {
  supabaseUrl: "",
  supabaseAnonKey: "",
  siteName: "热研库",
  defaultCategory: "医疗散热",
  recentYearWindow: 5
};
