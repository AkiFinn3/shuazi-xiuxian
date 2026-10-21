// 技能：随境界解锁，自动施放
export const SKILLS = [
  {
    key: 'sword',
    name: '剑气斩',
    glyph: '斩',
    unlockLevel: 2,
    cd: 6,
    desc: '剑气横扫全场，造成 220% 攻击伤害',
    color: '#8ad6ff',
  },
  {
    key: 'fly',
    name: '御剑术',
    glyph: '御',
    unlockRealm: 1,
    cd: 13,
    desc: '8 秒内攻速 +60%，并造成 120% 攻击伤害',
    color: '#6fd6b0',
  },
  {
    key: 'thunder',
    name: '九霄雷法',
    glyph: '雷',
    unlockRealm: 2,
    cd: 21,
    desc: '天雷降世，对最强者造成 600% 攻击伤害',
    color: '#c08cff',
  },
];

/** 技能是否已解锁 */
export function isUnlocked(skill, state) {
  if (skill.unlockRealm !== undefined) return state.realm >= skill.unlockRealm;
  if (skill.unlockLevel !== undefined) {
    return state.realm * 4 + state.stage + 1 >= skill.unlockLevel;
  }
  return true;
}

export function unlockedSkills(state) {
  return SKILLS.filter((s) => isUnlocked(s, state));
}
