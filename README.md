# 热研库线上论文数据库

这是一个可直接部署的论文数据库前端，使用 Supabase 保存云端数据。界面覆盖医疗散热、余热回收、热泵储热和竞赛综述，支持：

- 邮箱免密码登录与多设备同步；
- 新增、编辑、删除和检索论文；
- 按分类、阅读状态、相关性筛选；
- 记录热源、热汇、医疗场景、余热路线、方法和局限；
- JSON、CSV、BibTeX 批量导入；
- JSON 备份和 CSV 模板下载；
- 未配置云端时的浏览器本机试用模式。

首轮已经录入 **14 篇经过题录核验的论文**，覆盖隔离病房热管热回收、医院排风热泵、手术室净零、介入/植入式医疗设备散热、可穿戴人体余热、相变储热与低品位余热商业化。检索来源、筛选标准和 DOI 列表见 [`seed-sources.md`](seed-sources.md)。

## 当前交付状态

前端、数据结构和部署配置已经完成。要获得真正的线上地址，还需要：

1. 一个 Supabase 项目和邮箱登录配置；
2. 把 Supabase URL 和 anon public key 写入 `assets/config.js`；
3. 把 `web` 文件夹部署到 Netlify、Vercel 或学校支持的静态托管。

这三步需要账号权限或正式域名。本项目没有预填、也没有伪造任何数据库凭据。

## 第一步：创建云端数据库

1. 登录 [Supabase](https://supabase.com/)，创建一个新项目。
2. 进入 `SQL Editor`，完整运行 [`supabase/schema.sql`](supabase/schema.sql)。
3. 进入 `Authentication -> Providers`，确认 `Email` 登录已启用。
4. 进入 `Project Settings -> API`，找到：
   - `Project URL`
   - `anon public` key
5. 打开 [`assets/config.js`](assets/config.js)，填写：

```js
window.PAPER_HUB_CONFIG = {
  supabaseUrl: "https://你的项目.supabase.co",
  supabaseAnonKey: "你的 anon public key",
  siteName: "热研库",
  defaultCategory: "医疗散热",
  recentYearWindow: 5
};
```

只能填写 anon public key。不要把 `service_role` key、数据库密码或 GitHub token 放进网页。

建库 SQL 已开启行级安全策略：登录用户只能读取、修改和删除自己的论文，匿名访问者不能直接访问 `papers` 表。

## 第二步：配置登录回跳网址

在 Supabase 的 `Authentication -> URL Configuration` 中：

- `Site URL` 填正式网站地址，例如 `https://your-site.netlify.app`；
- `Redirect URLs` 加入同一个正式地址；
- 本地调试时可加入 `http://localhost:8080`。

登录使用邮箱魔法链接，不需要密码。邮件到达后再打开邮箱里的链接，页面会自动恢复登录状态。

## 第三步：部署

### 方式 A：Netlify Drop

适合先快速上线：

1. 打开 [Netlify Drop](https://app.netlify.com/drop)。
2. 把整个 `web` 文件夹拖入页面。
3. 获得 `https://随机名称.netlify.app` 地址。
4. 回到 Supabase，把该地址填入 `Site URL` 和 `Redirect URLs`。

`netlify.toml` 已放在本目录，部署根目录应为 `web`。

### 方式 B：Vercel

1. 把项目推送到 GitHub。
2. 在 Vercel 新建项目，`Root Directory` 选择 `web`。
3. 框架选择 `Other`，不需要构建命令。
4. 部署后复制正式域名，填回 Supabase 登录回跳配置。

`vercel.json` 已包含基础安全响应头。

### 方式 C：学校提供的静态空间

若学院提供静态网站空间，把 `web` 内的文件原样上传，确保：

- `index.html` 位于网站根目录；
- `assets/` 和 `supabase/` 的相对路径保持；
- 网站支持 HTTPS，否则 Supabase 登录链接可能无法正常回跳。

## 本地预览

没有云端配置时，直接打开 `index.html` 可以使用本机模式。数据保存在浏览器 `localStorage`，清理浏览器数据后会消失，因此应定期使用“数据库设置 -> 导出本机数据”。

配置云端后，建议通过本地静态服务器预览：

```bash
cd web
npx serve .
```

然后访问终端显示的 `http://localhost:3000` 或类似地址。

## 数据结构

主表 `papers` 的关键字段：

| 字段 | 含义 |
|---|---|
| `title` / `title_en` | 中英文题名 |
| `authors` / `year` / `venue` | 作者、年份、来源 |
| `doi` / `url` | 稳定标识和原文链接 |
| `category` | 医疗散热、余热回收、热泵与储热等 |
| `status` | 待核验、已核验、已摘要、已精读、已引用 |
| `medical_scene` | 具体医疗场景 |
| `thermal_route` | 散热或余热利用路线 |
| `methods` | 实验、仿真、系统边界和方法 |
| `key_finding` | 带条件的一句话结论 |
| `limitations` | 局限、反证和待核验点 |
| `relevance` | 与本研究的 1～5 级相关性 |

数组字段 `authors` 和 `tags` 使用 PostgreSQL `text[]` 保存。

## 导入格式

### CSV

可在“导入”窗口中下载模板。支持中文表头：

```text
中文题名,英文题名,作者,年份,来源,DOI,链接,分类,状态,数据类型,关键词,医疗场景,散热余热路线,方法,一句话结论,局限,笔记,相关性
```

作者和关键词均可用中文或英文分号分隔。

### JSON

支持数组，或 `{ "papers": [...] }` 对象。推荐定期导出 JSON 作为数据库之外的独立备份。

### BibTeX

支持常见 `@article`、`@inproceedings` 等条目，自动提取题名、作者、年份、来源、DOI、URL 和摘要。导入后状态默认是“待核验”，必须回到原文核对。

## 上线前检查

- [ ] `schema.sql` 已完整执行，`papers` 表存在。
- [ ] `papers` 的 RLS 已启用。
- [ ] Supabase Email Provider 已开启。
- [ ] `Site URL` 和 `Redirect URLs` 已填写正式 HTTPS 地址。
- [ ] `config.js` 中只有 anon public key。
- [ ] 使用两个邮箱各登录一次，确认彼此看不到对方数据。
- [ ] 新增、编辑、删除、导入和导出均测试通过。
- [ ] 从另一个设备登录，确认云端同步。
- [ ] 导出一份 JSON 备份。

## 维护建议

- 每周导出一次 JSON 备份；云数据库不是唯一备份。
- 批量导入前先导出旧数据。
- 论文题名、作者、DOI 和性能数字以原文为准。
- 涉及患者数据、临床原始数据或导师未公开资料时，不要上传到这个个人数据库。
- 若未来需要课题组共享，不要直接关闭 RLS；应另建成员与共享权限模型。
