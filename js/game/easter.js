// 彩蛋：道号专属反应、随机吐槽
const NAME_REACTIONS = {
  '元始天尊': ['掌门沉默了三秒：「……你开心就好。」', '丹霞仙子：「这名字，是不是有点大了点？」'],
  '韩立': ['铁锤真人：「你跟谁学的名字？」', '贾道人：「这名字值三万灵石，要不要？」'],
  '叶凡': ['周不平：「你这名字，我好像在哪儿听过。」'],
  '孙悟空': ['云无月：「悟空？悟空是谁。」', '掌门：「……道号需谨慎。」'],
  '隔壁老王': ['周不平：「老王，你家鸡还在吗？」'],
  '李长寿': ['丹霞仙子：「你这道号，倒像是想活很久。」'],
  '韩跑跑': ['铁锤真人：「跑得掉吗？」'],
  '无名': ['系统提示：道号「无名」，很好，敷衍。'],
  '刷子': ['系统提示：道号与职业高度契合。'],
};

const DEFAULT_REACTIONS = [
  '掌门打量了你一眼：「道号不错。」',
  '周不平：「名字起得挺随便啊。」',
  '丹霞仙子：「道友好名字，来，试试这炉丹。」',
];

export function nameReactions(name) {
  if (!name) return [];
  if (NAME_REACTIONS[name]) return NAME_REACTIONS[name];
  const key = name.trim();
  for (const k of Object.keys(NAME_REACTIONS)) {
    if (key.includes(k)) return NAME_REACTIONS[k];
  }
  return [DEFAULT_REACTIONS[Math.floor(Math.random() * DEFAULT_REACTIONS.length)]];
}

export function hasSpecialName(name) {
  if (!name) return false;
  return Object.keys(NAME_REACTIONS).some((k) => name.includes(k));
}
