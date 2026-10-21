// NPC 名册：立绘、定位、好感阶段、对话
// 好感阶段：0 初识 / 1 熟络 / 2 知己 / 3 心动 / 4 道侣
export const AFFINITY_STAGES = ['初识', '熟络', '知己', '心动', '道侣'];
export const AFFINITY_THRESHOLD = [0, 20, 45, 70, 100];

export const NPCS = [
  {
    key: 'qingyun',
    name: '青云子',
    title: '青云宗掌门',
    portrait: 'xf_npc_scholar',
    role: '掌门',
    desc: '掌门。修为高深，脾气一般，最爱说「因果自负」。',
    gifts: ['lingzhi', 'coin'],
    lines: [
      { at: 0, text: '{name}，你来了。修行路上，装备只是外物，心性才是根本。' },
      { at: 1, text: '听说你又在秘境里泡了三个时辰？年轻人，火气太旺。' },
      { at: 2, text: '你这一身气机倒是比上次浑厚许多。嗯，根骨尚可。' },
      { at: 3, text: '……你站在这儿发什么呆。罢了，坐下说话。' },
      { at: 4, text: '掌门也是人。你若真要喊我一声师父，我便应了。' },
    ],
  },
  {
    key: 'danxia',
    name: '丹霞仙子',
    title: '丹阁掌柜',
    portrait: 'xf_npc_alchemist',
    role: '炼丹',
    romance: true,
    desc: '丹阁掌柜。笑起来很温柔，试药的时候不太温柔。',
    gifts: ['herb', 'core'],
    lines: [
      { at: 0, text: '新来的小修士？炉子刚开，来帮我看着火。' },
      { at: 1, text: '{name}，你上回送我的那株灵芝我收了。炼成了上品丹，多的那份算你的。' },
      { at: 2, text: '你知道吗？真心丹其实……算了，没什么。你别看我。' },
      { at: 3, text: '你站在丹炉前的样子，比什么道法都好看。别、别乱说。' },
      { at: 4, text: '双修也好，炼丹也好，都不如下炉陪我说说话。' },
    ],
  },
  {
    key: 'tiechui',
    name: '铁锤真人',
    title: '器阁长老',
    portrait: 'xf_npc_blacksmith',
    role: '炼器',
    desc: '器阁长老。锤子比人话多，打造的装备能把人砸醒。',
    gifts: ['iron', 'bone'],
    lines: [
      { at: 0, text: '哟，新来的？会抡锤吗？算了，看你这细胳膊，还是算了吧。' },
      { at: 1, text: '你送的玄铁我收了。放心，我不白拿——给你打了把剑，手艺一般，凑合用。' },
      { at: 2, text: '你这身装备是自己打的？不对，手法太糙。……不过料子选得不差。' },
      { at: 3, text: '锤子不会说谎：你在长进。别让我说第二遍。' },
      { at: 4, text: '以后你我的炉子并着烧。锤子声吵，但热闹。' },
    ],
  },
  {
    key: 'jiadaoren',
    name: '贾道人',
    title: '黑市商人',
    portrait: 'xf_npc_peddler',
    role: '商店',
    desc: '黑市商人。货真不真随缘，价格一定很真。',
    gifts: ['coin'],
    lines: [
      { at: 0, text: '新面孔？看货还是看人？看人是要钱的。' },
      { at: 1, text: '{name}啊，来了。老规矩，好货不便宜，便宜没好货。' },
      { at: 2, text: '给你个内部价。别问我怎么知道你买得起——修士的灵石都长一个样。' },
      { at: 3, text: '我这儿只有货，没有话本子。你要的那点心思，恕不奉陪。' },
      { at: 4, text: '生意归生意。……下回别再给我送那种不退货的礼。' },
    ],
  },
  {
    key: 'zhoubuping',
    name: '周不平',
    title: '摆烂师兄',
    portrait: 'xf_npc_beggar',
    role: '闲人',
    desc: '同门师兄。天赋一般，晒太阳一流。',
    gifts: ['wine'],
    lines: [
      { at: 0, text: '新来的师弟？坐，一起发呆。你看那道云，像不像一把烧红的剑。' },
      { at: 1, text: '你已经刷了 {min} 分钟了。我不是说你不该刷，我就是提一句。真的。' },
      { at: 2, text: '说真的，我挺佩服你的。我要是能刷一半，早成金丹了。……一半也行。' },
      { at: 3, text: '你别看我了，我什么都没说。真的，我这就走。……再坐五分钟。' },
      { at: 4, text: '跟你在一起，我好像也能努力一下。糟糕。' },
    ],
  },
  {
    key: 'suqingluan',
    name: '苏青鸾',
    title: '剑修师姐',
    portrait: 'xf_npc_princess',
    role: '战修',
    romance: true,
    desc: '剑峰师姐。冷面毒舌，从不服输。',
    gifts: ['core', 'iron'],
    lines: [
      { at: 0, text: '又来一个刷子。剑峰不收废物。' },
      { at: 1, text: '{name}，你的剑使得太糙了。……我不是关心你，只是看着难受。' },
      { at: 2, text: '昨日你守到天亮，我看见了。别说是我说的。' },
      { at: 3, text: '我让你别跟着我。……你跟着做什么？' },
      { at: 4, text: '双剑合璧，不是说说而已。站过来，近一点。' },
    ],
  },
  {
    key: 'ajiuyu',
    name: '阿九',
    title: '九尾狐妖',
    portrait: 'xf_npc_fairy',
    role: '妖修',
    romance: true,
    desc: '秘境里捡来的九尾狐。嘴甜，手更快。',
    gifts: ['herb', 'wine'],
    lines: [
      { at: 0, text: '呀，捡到个活的。要不要跟我走？……开玩笑的啦。' },
      { at: 1, text: '{name}，你上次扔掉的那件白装我捡回来了。别说是我拿的。' },
      { at: 2, text: '我们狐族把喜欢的东西藏起来。你那堆破烂，我替你收着了。' },
      { at: 3, text: '你今天……有没有受伤？过来让我看看。……尾巴不是给你摸的！' },
      { at: 4, text: '说了不许笑。你一笑我尾巴就……算了。' },
    ],
  },
  {
    key: 'yunwuyue',
    name: '云无月',
    title: '太上雷尊 · 师尊',
    portrait: 'xf_npc_taoist',
    role: '师尊',
    romance: true,
    desc: '执掌天劫雷池的师尊。冷得像雷，心思却藏不住。',
    gifts: ['core', 'herb'],
    lines: [
      { at: 0, text: '修行者当断情绝欲。……你，把衣服穿好。' },
      { at: 1, text: '{name}，渡劫的时候我会手下留情。……只三成。别告诉别人。' },
      { at: 2, text: '我的道心最近很乱。都怪你。……不许问为什么。' },
      { at: 3, text: '雷池夜里很安静。你若要来，我……我在。' },
      { at: 4, text: '云无月活了很久，第一次觉得不够长。……说这种话做什么。' },
    ],
  },
  {
    key: 'lingcao',
    name: '灵草婆',
    title: '药庐主人',
    portrait: 'xf_npc_granny',
    role: '药商',
    desc: '药庐主人。卖灵草，也卖唠叨。',
    gifts: ['coin'],
    lines: [
      { at: 0, text: '灵草三灵石一株，童叟无欺。买不买？不买也看看。' },
      { at: 1, text: '年轻人熬夜伤身。要不要买株宁神草？便宜。' },
    ],
  },
  {
    key: 'suanming',
    name: '算命先生',
    title: '街边卦师',
    portrait: 'xf_npc_fortune',
    role: '卦师',
    desc: '街边卦师。算得准不准，看你给不给钱。',
    gifts: ['coin'],
    lines: [
      { at: 0, text: '这位道友，面带菜色……啊不是，面色。' },
      { at: 1, text: '卦上说，你今日宜刷怪，忌看卦。' },
    ],
  },
];

/** 好感度 -> 阶段索引 */
export function affinityStage(value) {
  let stage = 0;
  for (let i = 0; i < AFFINITY_THRESHOLD.length; i++) {
    if (value >= AFFINITY_THRESHOLD[i]) stage = i;
  }
  return stage;
}

/** 取某 NPC 在当前好感下的台词 */
export function npcLine(npc, affinity, playerName, min) {
  const stage = affinityStage(affinity);
  const candidates = npc.lines.filter((l) => l.at <= stage);
  if (!candidates.length) return npc.lines[0].text;
  const pool = candidates.filter((l) => l.at === stage);
  const line = (pool.length ? pool : candidates)[Math.floor(Math.random() * (pool.length || candidates.length))];
  return line.text
    .replace('{name}', playerName)
    .replace('{min}', String(min || 0));
}
