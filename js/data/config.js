// 全局配置与数值表（改这里就能调整平衡）

export const VIEW = { w: 640, h: 360, ground: 300 };

/* ---------------- 品质 ---------------- */
export const RARITIES = [
  { key: 'fan', name: '凡品', color: '#6E7A72', affixes: 0, weight: 58, mult: 1.00 },
  { key: 'ling', name: '灵品', color: '#3F7C5A', affixes: 1, weight: 25, mult: 1.12 },
  { key: 'xuan', name: '玄品', color: '#2F6FA3', affixes: 2, weight: 10.5, mult: 1.26 },
  { key: 'di', name: '地品', color: '#7C4E9E', affixes: 3, weight: 4.2, mult: 1.44 },
  { key: 'tian', name: '天品', color: '#B7791F', affixes: 4, weight: 1.7, mult: 1.66 },
  { key: 'xian', name: '仙品', color: '#A93B49', affixes: 5, weight: 0.6, mult: 1.95 },
];

/* ---------------- 部位 ---------------- */
export const SLOTS = [
  { key: 'weapon', name: '兵器', icon: 'sword', base: { atk: [4, 2.4] } },
  { key: 'helmet', name: '头冠', icon: 'crown', base: { hp: [20, 7], def: [1, 0.30] } },
  { key: 'robe', name: '法袍', icon: 'robe', base: { def: [2, 0.8], hp: [14, 5] } },
  { key: 'boots', name: '靴', icon: 'boot', base: { aspd: [1.2, 0.05], def: [1, 0.25] } },
  { key: 'pendant', name: '玉佩', icon: 'jade', base: { atk: [2, 1.1], crit: [0.8, 0.05] } },
  { key: 'ring', name: '灵戒', icon: 'ring', base: { crit: [0.5, 0.04], lifesteal: [0.5, 0.03], coin: [3, 0.4] } },
];

/* ---------------- 词缀池 ---------------- */
export const AFFIXES = [
  { key: 'atk', name: '攻击', stat: 'atk', base: 2, per: 0.9, w: 10, fmt: 'flat' },
  { key: 'hp', name: '气血', stat: 'hp', base: 8, per: 3.0, w: 10, fmt: 'flat' },
  { key: 'def', name: '防御', stat: 'def', base: 1, per: 0.40, w: 9, fmt: 'flat' },
  { key: 'crit', name: '暴击', stat: 'crit', base: 0.6, per: 0.06, w: 6, fmt: 'pct' },
  { key: 'critDmg', name: '暴伤', stat: 'critDmg', base: 2, per: 0.25, w: 5, fmt: 'pct' },
  { key: 'aspd', name: '攻速', stat: 'aspd', base: 0.4, per: 0.05, w: 5, fmt: 'pct' },
  { key: 'lifesteal', name: '吸血', stat: 'lifesteal', base: 0.3, per: 0.03, w: 3, fmt: 'pct' },
  { key: 'luck', name: '幸运', stat: 'luck', base: 1, per: 0.06, w: 4, fmt: 'flat' },
  { key: 'coin', name: '灵石获取', stat: 'coin', base: 2, per: 0.30, w: 3, fmt: 'pct' },
  { key: 'spirit', name: '修为获取', stat: 'spirit', base: 2, per: 0.30, w: 3, fmt: 'pct' },
  { key: 'elem', name: '元素伤害', stat: 'elem', base: 1, per: 0.12, w: 4, fmt: 'pct' },
  { key: 'pierce', name: '破防', stat: 'pierce', base: 1, per: 0.25, w: 3, fmt: 'flat' },
];

/* 战力权重（用于自动装备与比较） */
export const POWER_WEIGHT = {
  atk: 1, hp: 0.12, def: 0.6, crit: 4, critDmg: 1.2, aspd: 8,
  lifesteal: 10, luck: 3, coin: 0.6, spirit: 0.6, elem: 1.5, pierce: 2,
};

/* ---------------- 出身 ---------------- */
export const ORIGINS = [
  {
    key: 'sword', name: '剑修', desc: '攻击 +12%，暴击 +3%',
    appearance: 'swordsman',
    bonus: { atkPct: 0.12, crit: 3 },
  },
  {
    key: 'dan', name: '丹修', desc: '修为 +20%，灵石 +10%',
    appearance: 'fanscholar',
    bonus: { spiritPct: 0.20, coinPct: 0.10 },
  },
  {
    key: 'qi', name: '器修', desc: '防御 +15%，气血 +10%',
    appearance: 'saber',
    bonus: { defPct: 0.15, hpPct: 0.10 },
  },
  {
    key: 'ti', name: '体修', desc: '气血 +18%，吸血 +2%',
    appearance: 'monk',
    bonus: { hpPct: 0.18, lifesteal: 2 },
  },
  {
    key: 'san', name: '散修', desc: '灵石 +18%，幸运 +5%',
    appearance: 'twinblade',
    bonus: { coinPct: 0.18, luck: 5 },
  },
];

/* ---------------- 十境 ---------------- */
export const REALMS = [
  { name: '炼气', stages: ['初期', '中期', '后期', '圆满'], need: 0 },
  { name: '筑基', stages: ['初期', '中期', '后期', '圆满'], need: 10 },
  { name: '金丹', stages: ['初期', '中期', '后期', '圆满'], need: 20 },
  { name: '元婴', stages: ['初期', '中期', '后期', '圆满'], need: 30 },
  { name: '化神', stages: ['初期', '中期', '后期', '圆满'], need: 40 },
  { name: '炼虚', stages: ['初期', '中期', '后期', '圆满'], need: 50 },
  { name: '合体', stages: ['初期', '中期', '后期', '圆满'], need: 60 },
  { name: '大乘', stages: ['初期', '中期', '后期', '圆满'], need: 70 },
  { name: '渡劫', stages: ['初期', '中期', '后期', '圆满'], need: 80 },
  { name: '真仙', stages: ['初期', '中期', '后期', '圆满'], need: 90 },
];

/* ---------------- 秘境章节 ---------------- */
export const CHAPTERS = [
  {
    name: '青云山脚', terrain: 'bamboo',
    mobs: ['wolf', 'bat', 'snake'], boss: 'ninetail', desc: '山雾未散，妖兽低鸣。',
    props: {
      far: ['bg/bg_far_01_00', 'bg/bg_far_01_02'],
      moon: 'bg/bg_far_01_03',
      mid: ['bg/bg_mid_01_03', 'bg/bg_mid_01_04', 'bg/bg_mid_01_05'],
      near: ['bg/bg_near_01_01', 'bg/bg_near_01_02', 'bg/bg_near_01_04'],
      deco: ['bg/bg_xianxia_deco_01_00', 'bg/bg_xianxia_deco_01_01', 'bg/bg_xianxia_deco_01_02'],
    },
  },
  {
    name: '落霞古渡', terrain: 'bluestone',
    mobs: ['ghost', 'skeleton', 'waterghost'], boss: 'fallenimmortal', desc: '古渡无人，水声如咽。',
    props: {
      far: ['bg/bg_far_02_01', 'bg/bg_far_02_02'],
      moon: 'bg/bg_far_01_03',
      mid: ['bg/bg_mid_01_01', 'bg/bg_mid_02_04', 'bg/bg_xianxia_mid_03_02'],
      near: ['bg/bg_near_02_00', 'bg/bg_near_02_01', 'bg/bg_near_02_03'],
      deco: ['bg/bg_xianxia_deco_01_02', 'bg/bg_xianxia_deco_01_03', 'bg/bg_xianxia_deco_01_05'],
    },
  },
  {
    name: '赤炎熔谷', terrain: 'redclay',
    mobs: ['foxfire', 'soldier', 'swordspirit'], boss: 'jiaolong', desc: '岩浆映红，天穹如铁。',
    props: {
      far: ['bg/bg_far_01_02', 'bg/bg_far_02_03', 'bg/bg_xianxia_far_03_02'],
      mid: ['bg/bg_xianxia_mid_04_00', 'bg/bg_xianxia_mid_04_04', 'bg/bg_xianxia_mid_04_05'],
      near: ['bg/bg_xianxia_near_03_00', 'bg/bg_near_01_00', 'bg/bg_near_02_02'],
      deco: ['bg/bg_xianxia_deco_01_03', 'bg/bg_xianxia_deco_01_02', 'bg/bg_xianxia_deco_01_00'],
    },
  },
  {
    name: '云海仙宫', terrain: 'cloud',
    mobs: ['treant', 'thunderbird', 'golem'], boss: 'ninetail', desc: '云中有殿，殿中无人。',
    props: {
      far: ['bg/bg_xianxia_far_03_00', 'bg/bg_xianxia_far_03_04', 'bg/bg_xianxia_far_03_05'],
      mid: ['bg/bg_xianxia_mid_03_00', 'bg/bg_xianxia_mid_03_01', 'bg/bg_xianxia_mid_04_01'],
      near: ['bg/bg_xianxia_near_03_01', 'bg/bg_xianxia_near_03_03', 'bg/bg_xianxia_near_03_04'],
      deco: ['bg/bg_xianxia_deco_01_04', 'bg/bg_xianxia_deco_01_01', 'bg/bg_xianxia_deco_01_00'],
    },
  },
  {
    name: '幽冥鬼市', terrain: 'bluestone',
    mobs: ['paperdoll', 'ghost', 'jiangshi'], boss: 'fallenimmortal', desc: '鬼市开张，纸钱满地。',
    props: {
      far: ['bg/bg_xianxia_far_04_03', 'bg/bg_xianxia_mid_04_02'],
      moon: 'bg/bg_far_01_03',
      mid: ['bg/bg_near_02_03', 'bg/bg_near_02_01', 'bg/bg_xianxia_near_03_00'],
      near: ['bg/bg_near_01_04', 'bg/bg_near_02_05', 'bg/bg_near_01_05'],
      deco: ['bg/bg_xianxia_deco_01_03', 'bg/bg_xianxia_deco_01_02', 'bg/bg_xianxia_deco_01_00'],
    },
  },
  {
    name: '桃林妖域', terrain: 'bamboo',
    mobs: ['peachspirit', 'foxdemon', 'toad'], boss: 'jiaolong', desc: '桃香醉人，妖言惑耳。',
    props: {
      far: ['bg/bg_xianxia_mid_04_06', 'bg/bg_xianxia_mid_03_04', 'bg/bg_far_01_02'],
      mid: ['bg/bg_mid_02_05', 'bg/bg_xianxia_mid_04_01', 'bg/bg_mid_01_04'],
      near: ['bg/bg_near_01_01', 'bg/bg_near_02_04', 'bg/bg_xianxia_near_03_02'],
      deco: ['bg/bg_xianxia_deco_01_00', 'bg/bg_xianxia_deco_01_01', 'bg/bg_xianxia_deco_01_05'],
    },
  },
];

/* ---------------- 妖兽 ---------------- */
export const MOBS = {
  wolf: { name: '妖狼', hp: 30, atk: 6, def: 1, exp: 7, coin: 4, scale: 1, speed: 34 },
  bat: { name: '蝠妖', hp: 24, atk: 5, def: 0, exp: 6, coin: 3, scale: 0.85, speed: 46, flying: true },
  snake: { name: '妖蛇', hp: 36, atk: 7, def: 1, exp: 8, coin: 5, scale: 0.95, speed: 28 },
  ghost: { name: '游魂', hp: 30, atk: 6, def: 0, exp: 7, coin: 4, scale: 0.9, speed: 40, flying: true },
  skeleton: { name: '骷髅', hp: 44, atk: 8, def: 2, exp: 9, coin: 5, scale: 1, speed: 30 },
  waterghost: { name: '水鬼', hp: 38, atk: 7, def: 1, exp: 8, coin: 4, scale: 0.95, speed: 36 },
  foxfire: { name: '狐火', hp: 36, atk: 8, def: 1, exp: 9, coin: 5, scale: 0.85, speed: 44, flying: true },
  soldier: { name: '鬼卒', hp: 56, atk: 10, def: 3, exp: 11, coin: 7, scale: 1.05, speed: 26 },
  swordspirit: { name: '剑灵', hp: 50, atk: 11, def: 2, exp: 12, coin: 7, scale: 1, speed: 38 },
  treant: { name: '树精', hp: 78, atk: 9, def: 5, exp: 13, coin: 8, scale: 1.15, speed: 18 },
  thunderbird: { name: '雷鸟', hp: 52, atk: 12, def: 2, exp: 13, coin: 8, scale: 0.95, speed: 50, flying: true },
  golem: { name: '石傀', hp: 96, atk: 12, def: 7, exp: 15, coin: 9, scale: 1.2, speed: 16 },
  paperdoll: { name: '纸人', hp: 44, atk: 9, def: 1, exp: 10, coin: 6, scale: 0.95, speed: 32 },
  jiangshi: { name: '僵尸', hp: 62, atk: 10, def: 3, exp: 11, coin: 6, scale: 1, speed: 24 },
  peachspirit: { name: '桃妖', hp: 58, atk: 11, def: 2, exp: 12, coin: 7, scale: 0.95, speed: 34 },
  foxdemon: { name: '狐妖', hp: 54, atk: 11, def: 2, exp: 12, coin: 7, scale: 0.95, speed: 40 },
  toad: { name: '蛤蟆精', hp: 70, atk: 12, def: 4, exp: 13, coin: 8, scale: 1.1, speed: 20 },
};

export const BOSSES = {
  ninetail: { name: '九尾狐', hp: 420, atk: 15, def: 4, exp: 90, coin: 60, scale: 1 },
  fallenimmortal: { name: '堕落剑仙', hp: 620, atk: 19, def: 6, exp: 150, coin: 100, scale: 1 },
  jiaolong: { name: '蛟龙', hp: 900, atk: 23, def: 8, exp: 240, coin: 160, scale: 1 },
};

/* ---------------- 平衡常量 ---------------- */
export const BALANCE = {
  playerBase: { atk: 13, hp: 140, def: 3 },
  playerAtkPerLevel: 1.17,
  playerHpPerLevel: 1.17,
  playerDefPerLevel: 1.15,
  expBase: 55,
  expGrowth: 1.46,
  enemyHpGrowth: 1.205,
  enemyAtkGrowth: 1.15,
  enemyExpGrowth: 1.225,
  enemyCoinGrowth: 1.205,
  dropChance: 0.22,          // 每只怪掉落装备的概率
  waveSize: [1, 2],
  bossEvery: 10,             // 每 10 层出 Boss
  reviveTime: 2.5,
  offlineCapHours: 12,
  offlineRate: 0.6,
  bagSize: 60,
  autoSalvageBelow: 'xuan',  // 默认自动分解玄品以下
  autoEquipBetter: true,
};

/* ---------------- 角色外观 ---------------- */
export const APPEARANCES = [
  { key: 'swordsman', name: '剑客' },
  { key: 'heroine', name: '女侠' },
  { key: 'spearman', name: '枪客' },
  { key: 'monk', name: '武僧' },
  { key: 'archer', name: '弓手' },
  { key: 'fanscholar', name: '折扇书生' },
  { key: 'staffbeggar', name: '铁杖散人' },
  { key: 'saber', name: '刀客' },
  { key: 'twinblade', name: '双刀客' },
];

/* ---------------- 词缀显示名 ---------------- */
export const STAT_LABEL = {
  atk: '攻击', hp: '气血', def: '防御', crit: '暴击', critDmg: '暴伤',
  aspd: '攻速', lifesteal: '吸血', luck: '幸运', coin: '灵石获取',
  spirit: '修为获取', elem: '元素伤害', pierce: '破防',
};
