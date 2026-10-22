/* USTIL 开放论坛 — 种子数据（原创内容）
   仅前端演示用；后续可替换为 Backen 接口。 */

export const CATEGORIES = [
  { id: "general", name: "综合讨论", tone: "clay", desc: "社区公告、闲聊与一切与开源校园生活相关的话题" },
  { id: "starter", name: "开源入门", tone: "cactus", desc: "Git/GitHub、许可证、第一份 PR —— 新手友好区" },
  { id: "sig", name: "项目实践 · SIG", tone: "sky", desc: "USTIL 各兴趣小组的项目进展、设计与协作" },
  { id: "events", name: "活动与竞赛", tone: "plum", desc: "黑客松、开源之夏、工作坊与讲座的预告和复盘" },
  { id: "help", name: "求助问答", tone: "peach", desc: "环境配置、编译报错、代码评审求助" },
  { id: "hire", name: "招募与协作", tone: "clay", desc: "组队参赛、项目招新、跨校合作" },
];

export const TAGS = [
  "Git", "RISC-V", "Linux", "Rust", "Web", "AI4Science", "开源之夏",
  "Hackathon", "文档", "新手村", "Hacktoberfest", "供应链",
];

export const USERS = {
  lin: { id: "lin", name: "林晚舟", initials: "LW", tone: "clay", role: "社区维护者", points: 1284 },
  zhao: { id: "zhao", name: "赵一鸣", initials: "ZY", tone: "sky", role: "SIG-OS 成员", points: 866 },
  chen: { id: "chen", name: "陈小满", initials: "CX", tone: "cactus", role: "大二 · 新加入", points: 210 },
  qin: { id: "qin", name: "秦亦然", initials: "QY", tone: "plum", role: "SIG-Web 组长", points: 1032 },
  su: { id: "su", name: "苏禾", initials: "SH", tone: "clay", role: "活动策划", points: 745 },
  he: { id: "he", name: "何知远", initials: "HZ", tone: "sky", role: "SIG-Compiler 成员", points: 592 },
};

export const POSTS = [
  {
    id: "p1", pinned: true, solved: false, cat: "general",
    title: "【社区公约 v1.2】USTIL 开放论坛的六条共识",
    excerpt: "开放、友善、可复现、署名、渐进、留痕 —— 我们希望这里成为全校最舒服的开源讨论角落。以下是每一条的完整说明与示例……",
    author: "lin", createdAt: "2026-10-12T09:20:00", likes: 156, views: 2841, tags: ["新手村", "文档"],
    body: [
      "开放原子 USTIL 论坛从建站第一天起就挂在 Git 仓库上：本页的内容、样式与构建脚本全部开源。既然社区以「开放」为名，我们也用开放的方式约定彼此的相处方式。",
      "**一、开放优先。** 能公开讨论的就不要私聊解决；一个问题被解答一次，后来者就能被解答一百次。",
      "**二、友善是底线。** 对观点犀利，对人温和。新人的「低级问题」往往是文档缺口的最好线索。",
      "**三、可复现。** 求助请附上环境、版本与最小复现步骤 —— 这既是对他人的尊重，也是对自己时间的保护。",
      "**四、署名。** 转载、引用、二次分发请保留原作者署名与出处链接；代码片段默认按 MIT 理解，除非另有说明。",
      "**五、渐进贡献。** 从改一个错别字开始，到提交第一个 PR，到维护一个 SIG —— 社区的每个阶段都有你的位置。",
      "**六、留痕。** 决策写进纪要，讨论沉淀成文档。今天我们随手记录的一句话，可能就是下一届同学的入门指南。",
    ],
    replies: [
      { id: "r1", author: "zhao", createdAt: "2026-10-12T10:02:00", likes: 24, body: ["「新人的低级问题往往是文档缺口的最好线索」—— 这句应该刻在每个 SIG 的门上。"], nested: false },
      { id: "r2", author: "chen", createdAt: "2026-10-12T11:35:00", likes: 12, body: ["刚加入一周，感觉第三条最实用。之前提问总是被反问环境版本，现在学会了先贴 `uname -a` 和报错全文。"], nested: true },
    ],
  },
  {
    id: "p2", pinned: false, solved: true, cat: "starter",
    title: "第一次提 PR 之前，我希望有人告诉我的五件事",
    excerpt: "从 fork 到 rebase，从 commit message 到 code review 礼仪 —— 一个大二学生的真实踩坑记录，附带我们整理的 PR 检查清单。",
    author: "chen", createdAt: "2026-10-18T20:14:00", likes: 98, views: 1633, tags: ["Git", "新手村"],
    body: [
      "上个月我给社区的官网仓库提了人生第一个 PR，紧张到连续改了七次 commit message。回头看看，这些坑其实都有标准解法。",
      "**1. 先开 Issue 再动手。** 尤其是行为变更类的修改，先和维护者对齐方向，避免写了三天的代码被礼貌拒绝。",
      "**2. 一个 PR 只做一件事。** 「顺手重构」是 review 噩梦的开始。",
      "**3. Commit message 说清楚「为什么」。** 改了什么看 diff 就知道，为什么改才需要文字记录。",
      "**4. Rebase 而不是 merge 主分支。** 保持线性历史，维护者会感谢你。",
      "**5. 被要求修改不是批评。** Review 是一起把代码变好的过程，不是考试。",
      "清单我整理成了一页纸，放在 SIG-Web 的共享文档里，欢迎补充。",
    ],
    replies: [
      { id: "r3", author: "qin", createdAt: "2026-10-18T21:40:00", likes: 31, body: ["作为经常 review 的人补充一条：PR 描述里放一张改动前后的截图，能省掉一轮往返。"] },
      { id: "r4", author: "he", createdAt: "2026-10-19T08:12:00", likes: 9, body: ["rebase 那条深有体会，我们 SIG 的仓库曾经一个 PR 里混进 37 个 merge commit……"] },
      { id: "r5", author: "chen", createdAt: "2026-10-19T09:01:00", likes: 6, body: ["已把大家的补充并入清单，v1.1 在附件里。"], nested: true },
    ],
  },
  {
    id: "p3", pinned: false, solved: false, cat: "sig",
    title: "SIG-Compiler 双周报 #4：自研 RISC-V 教学编译器进展",
    excerpt: "本期完成了指令选择的 DSL 原型，寄存器分配从朴素着色换成线性扫描，编译速度提升约 2.3 倍。下周开始接 LLVM IR 的类型系统……",
    author: "he", createdAt: "2026-10-20T18:30:00", likes: 64, views: 921, tags: ["RISC-V", "Rust"],
    body: [
      "SIG-Compiler 的第四份双周报，欢迎在楼下提问或直接来周三的线下例会。",
      "**进展：** 指令选择改用内部 DSL 描述 pattern，新增目标只需要写一张表；寄存器分配换成了线性扫描，SPEC 教学子集上编译时间从 1.8s 降到 0.78s。",
      "**踩坑：** DSL 的错误提示比 DSL 本身还难写，目前还是「静默选错 pattern」的状态，下周优先修。",
      "**招募：** 需要两位同学一起补测试用例，会写 Python 脚本就行，不要求编译原理基础。",
    ],
    replies: [
      { id: "r6", author: "zhao", createdAt: "2026-10-20T19:12:00", likes: 11, body: ["线性扫描换成 LSRA 之后 spill 的质量如何？有没有跑过压力用例？"] },
      { id: "r7", author: "he", createdAt: "2026-10-20T19:48:00", likes: 8, body: ["压力用例只跑了随机生成的表达式树，深度 20 以上开始出现冗余 spill，数据在仓库 bench/ 目录。"] },
    ],
  },
  {
    id: "p4", pinned: false, solved: false, cat: "events",
    title: "11.08 秋季黑客松「开源 48 小时」报名开启（附选题池）",
    excerpt: "48 小时、12 支队伍、3 个赛道：工具链 / AI 应用 / 校园数字公益。提供算力补贴与技术导师，作品默认开源并进入社区孵化通道……",
    author: "su", createdAt: "2026-10-21T12:00:00", likes: 121, views: 2107, tags: ["Hackathon"],
    body: [
      "去年冬天的黑客松有 7 支队伍把作品坚持维护到了今年，今年我们把规模扩大了一倍。",
      "**时间：** 11 月 8 日 10:00 — 11 月 10 日 10:00，主会场在创新港 B3 联合办公区，同时开放线上席位。",
      "**赛道：** 工具链（开发者效率）、AI 应用（负责任的 AI）、校园数字公益（真实需求、真实用户）。",
      "**支持：** 每支队伍 500 元算力补贴 + 一位技术导师 + 一次中期路演。作品以 OSI 认可许可证开源即可参与评奖。",
      "报名截止 11 月 1 日，组队帖发在「招募与协作」板块，单人报名也可以，我们会帮你匹配队友。",
    ],
    replies: [
      { id: "r8", author: "lin", createdAt: "2026-10-21T13:22:00", likes: 15, body: ["补充：上届获奖的两个项目 maintainer 今年会来当导师，机会难得。"] },
    ],
  },
  {
    id: "p5", pinned: false, solved: true, cat: "help",
    title: "求助：M1 MacBook 上交叉编译 RISC-V 目标时链接阶段报 undefined reference",
    excerpt: "用 riscv64-unknown-elf-gcc 编译课程实验的内核镜像，链接时 libc.a 里的符号全部 undefined，检查过 -march/-mabi 参数是一致的……",
    author: "zhao", createdAt: "2026-10-21T15:45:00", likes: 17, views: 486, tags: ["RISC-V", "Linux"],
    body: [
      "环境：M1 MacBook Pro，Homebrew 装的 `riscv64-unknown-elf-gcc 13.2`，目标 `rv64imac/lp64`。",
      "编译每个 .o 都正常，链接时出现一长串 `undefined reference to memcpy` 之类的符号，`-print-file-name=libc.a` 看起来路径也没问题。",
      "已经排除：-march/-mabi 不一致、忘了加 `-nostdlib` 之外的裸机参数。",
    ],
    replies: [
      { id: "r9", author: "he", createdAt: "2026-10-21T16:10:00", likes: 22, body: ["裸机链接 `-nostdlib` 会把 libc 整个排除掉，你看到的 undefined 是正常的。要么去掉 `-nostdlib`，要么自己实现 memcpy/memset 这批 freestanding 符号 —— 教学内核一般选后者。"] },
      { id: "r10", author: "zhao", createdAt: "2026-10-21T16:35:00", likes: 7, body: ["原来是这样！自己补了 memcpy/memset 之后镜像正常跑起来了，谢谢！问题已解决。"], nested: true },
    ],
  },
  {
    id: "p6", pinned: false, solved: false, cat: "hire",
    title: "SIG-Web 招新：我们需要一位愿意写文档的你（不要求会写代码）",
    excerpt: "社区官网要补「新手指南」和「SIG 手册」两个栏目，需要能把技术翻译成人话的同学。写作能力 > 代码能力，有校刊/公众号经验加分……",
    author: "qin", createdAt: "2026-10-19T22:05:00", likes: 73, views: 1188, tags: ["文档"],
    body: [
      "我们的文档现状：API 注释很全，但新人从零到第一次贡献的路径，目前散落在 5 个不同的聊天记录里。",
      "希望你：能把「fork 仓库」这件事写成三步图解；能给一篇技术周报挑出 10 个说人话的修改点；愿意把「写文档」当作和写代码同等重要的贡献。",
      "回报：正式的 SIG 成员身份、社区周边、以及你的名字会出现在每一个文档页面的致谢栏。",
    ],
    replies: [
      { id: "r11", author: "su", createdAt: "2026-10-19T22:41:00", likes: 10, body: ["投一票 —— 文档写得好的社区，新人留存率肉眼可见地高。"] },
    ],
  },
  {
    id: "p7", pinned: false, solved: false, cat: "general",
    title: "把论坛的搜索做得「像人话」：一次关于中文分词的讨论",
    excerpt: "目前的搜索是字符串包含匹配，搜「怎么参与」找不到「如何加入」。我们讨论了三种方案：空格切分、bigram 索引、接开源分词器，各自的代价是……",
    author: "lin", createdAt: "2026-10-17T14:25:00", likes: 45, views: 774, tags: ["Web"],
    body: [
      "先抛结论：短期内用 bigram 索引 + 拼音首字母兜底，长期把分词下沉到后端。",
      "为什么不用现成分词器：论坛的词表需要随社区热词更新（比如「开源之夏」「SIG」），静态词典很快就过时。",
      "欢迎大家在楼下贴自己觉得「搜不到」的查询词，我们会把它们加进回归用例。",
    ],
    replies: [
      { id: "r12", author: "qin", createdAt: "2026-10-17T15:02:00", likes: 14, body: ["贴一个：搜「报名」找不到「黑客松」的帖子，但搜「黑客松」可以。"] },
      { id: "r13", author: "lin", createdAt: "2026-10-17T15:31:00", likes: 9, body: ["收到，这条进了用例 #17。同义词表先手工维护一版。"] },
    ],
  },
  {
    id: "p8", pinned: false, solved: false, cat: "starter",
    title: "许可证入门：MIT、Apache-2.0 和 GPL 到底该怎么选",
    excerpt: "给课程项目选许可证不是仪式感，它决定了别人能不能用你的代码、要不要公开衍生作品。用三个真实案例把选择逻辑讲清楚……",
    author: "su", createdAt: "2026-10-14T10:10:00", likes: 87, views: 1402, tags: ["新手村", "供应链"],
    body: [
      "**想让别人随便用：MIT。** 短、宽容、几乎所有场景兼容，代价是别人可以闭源二次分发。",
      "**想要专利保护与署名：Apache-2.0。** 明确的专利授权条款 + 商标限制，企业友好。",
      "**想让衍生作品也开源：GPL-3.0。** 传染性最强，适合立场鲜明的独立项目。",
      "一句话版本：拿不准就 MIT；和企业生态对接选 Apache；希望作品保持自由选 GPL。社区项目库的默认模板是 Apache-2.0。",
    ],
    replies: [],
  },
];

export const EVENTS = [
  { day: "08", month: "NOV", title: "秋季黑客松「开源 48 小时」", sub: "创新港 B3 + 线上 · 报名中" },
  { day: "13", month: "NOV", title: "SIG-Compiler 开放例会", sub: "理工楼 402 · 每周三 19:00" },
  { day: "22", month: "NOV", title: "文档工作坊：把技术写成人话", sub: "图书馆报告厅" },
  { day: "06", month: "DEC", title: "年度开源之夜 + 项目路演", sub: "大礼堂 · 全校开放" },
];

export const HOME_STATS = { members: "1,286", topics: "3,412", projects: "36", events: "48" };
