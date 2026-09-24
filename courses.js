/* ============================================================
   Droplet Labs · Paths — all content lives here.
   To add a course: copy one object in `courses`, change the fields,
   save. The 3D river, orbs, cards, search, totals and footer all
   rebuild from this list. Order here = order on the page.
   ============================================================ */
window.PATHS = {
  site: {
    home: 'https://dropletlabs.xyz/',
    email: 'support@dropletlabs.xyz'
  },

  /* Show the "next path is forming" placeholder after the last course. */
  showNext: true,

  courses: [
    {
      id: 'satoshi',
      color: '#F7931A',
      name: { en: 'Satoshi Path', zh: '聪之路' },
      subject: { en: 'Bitcoin', zh: '比特币' },
      line: {
        en: 'From zero to running a node, reading the source, and building a transaction by hand.',
        zh: '从零到能跑节点、读源码，亲手用代码构造一笔交易。'
      },
      ask: { en: 'Understand Bitcoin from first principles', zh: '从第一性原理看懂比特币' },
      stages: 11, lessons: 54, demos: 49,
      tags: { en: ['SHA-256', 'ECDSA', 'Mining', 'Lightning'], zh: ['SHA-256', 'ECDSA', '挖矿', '闪电网络'] },
      keywords: 'bitcoin btc satoshi hash sha ecdsa signature mining node lightning utxo transaction 比特币 聪 挖矿 节点 交易 闪电',
      url: 'https://evidex-cloud.github.io/nextdawn-satoshi-path/',
      glyph: '<path d="M8.5 5v14M8.5 5h5a3.25 3.25 0 0 1 0 6.5h-5M8.5 11.5h6a3.75 3.75 0 0 1 0 7.5h-6M10.5 2.8V5M13.5 2.8V5M10.5 19v2.2M13.5 19v2.2M6.5 5h2M6.5 19h2"/>'
    },
    {
      id: 'austrian',
      color: '#F2C14E',
      name: { en: 'Austrian Path', zh: '奥派之路' },
      subject: { en: 'Austrian economics', zh: '奥地利学派' },
      line: {
        en: 'Think like an Austrian economist, then aim it at network effects, social media, Bitcoin and AI.',
        zh: '学会像奥派经济学家一样思考，再用它看懂网络效应、社交媒体、比特币与 AI。'
      },
      ask: { en: 'Think like an Austrian economist', zh: '像奥派经济学家一样思考' },
      stages: 19, lessons: 96, demos: 96,
      tags: { en: ['Subjective value', 'Money', 'Business cycles', 'Network effects'], zh: ['主观价值', '货币', '商业周期', '网络效应'] },
      keywords: 'austrian economics mises hayek value money price business cycle inflation human action network 奥派 经济 米塞斯 哈耶克 货币 周期 通胀 价值',
      url: 'https://evidex-cloud.github.io/droplet-labs-austrian-path/',
      glyph: '<path d="M6.5 3h11M6.5 21h11M8 3v2.2a4 4 0 0 0 1.7 3.3L12 12l2.3 3.5A4 4 0 0 1 16 18.8V21M16 3v2.2a4 4 0 0 1-1.7 3.3L12 12l-2.3 3.5A4 4 0 0 0 8 18.8V21M10 18.5h4"/>'
    },
    {
      id: 'strategy',
      color: '#FB7F9C',
      name: { en: 'Strategy Path', zh: '博弈之路' },
      subject: { en: 'Game theory & mechanism design', zh: '博弈论与机制设计' },
      line: {
        en: 'Game theory, auctions and behavioral economics for founders who design the rules.',
        zh: '写给要设计规则的创业者：博弈论、拍卖与行为经济学。'
      },
      ask: { en: 'Design an auction that actually works', zh: '设计一场真正有效的拍卖' },
      stages: 21, lessons: 106, demos: 106,
      tags: { en: ['Nash equilibrium', 'Auctions', 'Mechanism design', 'Behavioral'], zh: ['纳什均衡', '拍卖', '机制设计', '行为经济学'] },
      keywords: 'game theory strategy nash equilibrium prisoner dilemma auction mechanism design incentive behavioral platform 博弈 纳什 囚徒 拍卖 机制 激励 行为',
      url: 'https://evidex-cloud.github.io/droplet-labs-strategy-path/',
      glyph: '<rect x="3.5" y="3.5" width="17" height="17" rx="2.5"/><path d="M12 3.5v17M3.5 12h17"/><circle cx="16.25" cy="16.25" r="1.6" fill="currentColor" stroke="none"/>'
    },
    {
      id: 'options',
      color: '#34D6C0',
      name: { en: 'Options Path', zh: '期权之路' },
      subject: { en: 'Options & perpetuals', zh: '期权与永续合约' },
      line: {
        en: 'From zero to the Greeks, spread design, Python pricing, and telling perps from futures.',
        zh: '从零到看懂希腊字母、设计组合策略、用 Python 定价回测，并分清永续与期货。'
      },
      ask: { en: 'Price an option by hand', zh: '亲手给一张期权定价' },
      stages: 13, lessons: 79, demos: 79,
      tags: { en: ['Greeks', 'Black–Scholes', 'Spreads', 'Perpetuals'], zh: ['希腊字母', 'Black–Scholes', '价差组合', '永续合约'] },
      keywords: 'options call put greeks delta gamma theta vega black scholes volatility spread straddle perpetual perps futures python 期权 希腊 波动率 永续 期货 定价',
      url: 'https://evidex-cloud.github.io/droplet-labs-options-path/',
      glyph: '<path d="M3.5 3.5v17h17"/><path d="M5.5 15.5h6.5l7.5-9"/><path d="M5.5 11.5h14" stroke-dasharray="1.5 2.5"/>'
    },
    {
      id: 'rwa',
      color: '#6AA8FF',
      name: { en: 'RWA Path', zh: 'RWA 之路' },
      subject: { en: 'Real-world assets', zh: '现实世界资产' },
      line: {
        en: 'Tokenize the real world: SPVs, NAV oracles, proof of reserve, regulation, and a project of your own.',
        zh: '把现实世界上链：SPV、NAV 预言机、储备证明、全球监管，并亲手设计一个项目。'
      },
      ask: { en: 'Tokenize a real-world asset', zh: '把一项现实资产代币化' },
      stages: 15, lessons: 65, demos: 65,
      tags: { en: ['ERC-3643', 'SPV', 'Proof of reserve', 'Regulation'], zh: ['ERC-3643', 'SPV', '储备证明', '监管'] },
      keywords: 'rwa real world asset tokenization token treasury bond spv nav oracle proof of reserve erc-3643 regulation compliance 现实资产 代币化 国债 预言机 储备 监管 合规',
      url: 'https://evidex-cloud.github.io/droplet-labs-rwa-path/',
      glyph: '<path d="M3 9.5 12 4l9 5.5M4.5 20.5h15M6 10.5v7M10 10.5v7M14 10.5v7M18 10.5v7M3.5 20.5h17"/>'
    },
    {
      id: 'agent',
      color: '#A393FF',
      name: { en: 'Agent Path', zh: '智能体之路' },
      subject: { en: 'AI agents × crypto', zh: 'AI 智能体 × 加密' },
      line: {
        en: 'Every layer behind an AI-agent marketplace, where AI meets crypto, from protocols to payments.',
        zh: '拆开 AI 智能体市场的每一层：AI 与加密的交汇处，从协议到支付。'
      },
      ask: { en: 'Build for the agent economy', zh: '为智能体经济而构建' },
      stages: 14, lessons: 68, demos: 68,
      tags: { en: ['MCP', 'x402', 'AP2', 'ERC-8004'], zh: ['MCP', 'x402', 'AP2', 'ERC-8004'] },
      keywords: 'ai agent agents llm mcp a2a x402 ap2 erc-8004 marketplace payments identity crypto protocol 智能体 代理 协议 支付 身份 市场',
      url: 'https://evidex-cloud.github.io/droplet-labs-agent-path/',
      glyph: '<circle cx="12" cy="5" r="2.2"/><circle cx="5" cy="18.5" r="2.2"/><circle cx="19" cy="18.5" r="2.2"/><circle cx="12" cy="13" r="1.4" fill="currentColor" stroke="none"/><path d="M12 7.2V11.6M6.7 17.1l4.1-3.1M17.3 17.1l-4.1-3.1M7.2 18.5h9.6"/>'
    }
  ]
};

/* Interface copy. {n} = number of courses as a word, {lessons} etc. are live totals. */
window.COPY = {
  en: {
    nav: { paths: 'Paths', how: 'How it works', labs: 'Droplet Labs', visit: 'Visit Droplet Labs' },
    hero: {
      kicker: '{count} free courses · {lessons} lessons · EN / 中文',
      title: '{N} paths into *the new economy.*',
      sub: 'Free, bilingual, hands-on courses from Droplet Labs. Money, markets, strategy, assets and AI agents, taken from zero to deep.',
      search: 'Search',
      go: 'Find my path',
      noMatch: 'No path matches yet. Try "bitcoin", "auction" or "agents".',
      scroll: 'Scroll to follow the river'
    },
    river: {
      eyebrow: 'The paths',
      title: 'Follow the river.',
      sub: 'Each path is one line from first intuition to expert craft. Scroll to travel from droplet to droplet.'
    },
    step: { stages: 'Stages', lessons: 'Lessons', demos: 'Demos', start: 'Start the path' },
    grid: {
      eyebrow: 'Every path',
      title: 'Pick any path.',
      sub: 'Each course runs in your browser. No sign-up, no fee.',
      open: 'Open',
      nextName: 'Next path',
      nextLine: 'A new droplet is forming. More courses are on the way.'
    },
    stats: { paths: 'Paths', lessons: 'Lessons', demos: 'Interactive demos', stages: 'Stages', langs: 'Languages' },
    how: {
      eyebrow: 'How it works',
      title: 'How every path works.',
      items: [
        { h: 'Shallow to deep', p: 'One main line per subject. Each lesson builds on the last, from first intuition to expert craft.' },
        { h: 'Play with the idea', p: 'Every lesson ships an in-browser demo. Many do the real math: hashes, signatures, payoffs, auctions.' },
        { h: 'Yours, on your device', p: 'Local-first and bilingual. No account, and your progress stays in your browser.' }
      ]
    },
    labs: {
      eyebrow: 'Made by Droplet Labs',
      title: 'An ocean is made of countless droplets.',
      sub: 'These paths are the education work of Droplet Labs. We also research and build agent systems for small businesses.',
      cta: 'Visit dropletlabs.xyz',
      mail: 'Write to us'
    },
    foot: { paths: 'Paths', labs: 'Droplet Labs', site: 'Website', note: 'For education only. Not investment advice.', top: 'Back to top' },
    orb: 'Click to travel'
  },
  zh: {
    nav: { paths: '课程', how: '学习方式', labs: 'Droplet Labs', visit: '访问 Droplet Labs' },
    hero: {
      kicker: '{count} 门免费课程 · {lessons} 节课 · 中文 / EN',
      title: '{N}条路，*通往新经济。*',
      sub: 'Droplet Labs 出品的免费、双语、可动手的课程。货币、市场、博弈、资产与 AI 智能体，从零走到深处。',
      search: '搜索',
      go: '找到我的路',
      noMatch: '暂时没有匹配的课程。试试「比特币」「拍卖」或「智能体」。',
      scroll: '向下滚动，顺流而行'
    },
    river: {
      eyebrow: '课程',
      title: '顺流而下。',
      sub: '每条路都是一条主线，从第一直觉走到专家手艺。向下滚动，从一滴水走到下一滴。'
    },
    step: { stages: '阶段', lessons: '课', demos: '演示', start: '开始学习' },
    grid: {
      eyebrow: '全部课程',
      title: '任选一条路。',
      sub: '每门课都在浏览器里运行。无需注册，完全免费。',
      open: '进入',
      nextName: '下一条路',
      nextLine: '新的一滴正在凝结。更多课程在路上。'
    },
    stats: { paths: '条路', lessons: '节课', demos: '个交互演示', stages: '个阶段', langs: '种语言' },
    how: {
      eyebrow: '学习方式',
      title: '每条路都这样走。',
      items: [
        { h: '由浅入深', p: '每门课一条主线，每节课都建立在上一节之上，从第一直觉走到专家手艺。' },
        { h: '动手玩', p: '每节课都配浏览器内的交互演示，很多是真算：哈希、签名、盈亏、拍卖。' },
        { h: '属于你', p: '本地优先、中英双语。无需账号，进度只存在你的浏览器里。' }
      ]
    },
    labs: {
      eyebrow: '由 Droplet Labs 打造',
      title: '海洋，由无数水滴汇成。',
      sub: '这些课程是 Droplet Labs 的教育工作。我们也为中小企业研究和构建智能体系统。',
      cta: '访问 dropletlabs.xyz',
      mail: '联系我们'
    },
    foot: { paths: '课程', labs: 'Droplet Labs', site: '官网', note: '仅供教育，不构成投资建议。', top: '回到顶部' },
    orb: '点击前往'
  }
};
