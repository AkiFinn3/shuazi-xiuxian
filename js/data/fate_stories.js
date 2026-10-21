// 器灵小故事：条件触发，一次性
export const FATE_STORIES = [
  {
    id: 'fs1', title: '第一句话', cond: { tier: 1 },
    text: '器灵在你耳边轻轻响了一声：「……主公？我叫器灵，还请多关照。」\n你心想，这称呼听着像跑江湖的。',
  },
  {
    id: 'fs2', title: '名字', cond: { kills: 30 },
    text: '「你给我起个名字吧。」\n「你不是已经有名字了吗？」\n「那是兵器的名字。我是器灵，得有个自己的。」\n你想了想，叫它「二狗」。它沉默了很久。',
  },
  {
    id: 'fs3', title: '第一次进化', cond: { tier: 2 },
    text: '剑身一颤，剑鸣如龙。\n「我醒了。」它说，「以后不用你亲手砍了。」\n你握剑的手忽然轻了很多。',
  },
  {
    id: 'fs4', title: '抱怨', cond: { kills: 300 },
    text: '「主人，我们今天砍了三百三十七只。」\n「嗯。」\n「其中二百九十一只长得一模一样。」\n「……妖兽都长那样。」\n「我记仇。」',
  },
  {
    id: 'fs5', title: '第一件被吸收的词缀', cond: { absorbed: 1 },
    text: '它吞下那道词缀，像吃糖。\n「唔，攻速。有点甜。」\n你开始怀疑器灵是不是把词缀当零嘴了。',
  },
  {
    id: 'fs6', title: '你死了', cond: { deaths: 1 },
    text: '「……又是我扛着回来的。」\n「谢谢。」\n「不客气。反正我也没地方去。」',
  },
  {
    id: 'fs7', title: '化形', cond: { tier: 3 },
    text: '剑光收敛，化作一个模糊的人形，晃了晃，站稳。\n「这样，说话方便些。」\n「……你连脸都没有。」\n「审美可以以后再说。」',
  },
  {
    id: 'fs8', title: '有人', cond: { partner: 1 },
    text: '「她是谁？」\n「道侣。」\n「哦。」它沉默了很久，「……那我以后话少点。」',
  },
  {
    id: 'fs9', title: '雷劫', cond: { realm: 3 },
    text: '「上面那团雷云很凶。」\n「我知道。」\n「……怕吗？」\n「怕。但有你在。」\n「那我就当一回盾。」',
  },
  {
    id: 'fs10', title: '圆满', cond: { tier: 4 },
    text: '人器合一那一刻，你听见它长长地舒了一口气。\n「终于不用分开了。」\n「……你等这一天很久了？」\n「从你在破庙里把我捡起来那天。」',
  },
];

/** 条件判定 */
export function storyUnlocked(state, story) {
  const s = state;
  const c = story.cond || {};
  if (c.tier && !(s.fate && s.fate.tier >= c.tier)) return false;
  if (c.kills && (s.stats.kills || 0) < c.kills) return false;
  if (c.deaths && (s.stats.deaths || 0) < c.deaths) return false;
  if (c.realm && s.realm < c.realm) return false;
  if (c.partner && !s.partner) return false;
  if (c.absorbed && !((s.fate && s.fate.affixes) && Object.keys(s.fate.affixes).length)) return false;
  return true;
}
