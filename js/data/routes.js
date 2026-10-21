// 道侣专属任务链：好感、条件、剧情、结局
export const ROUTES = {
  suqingluan: {
    partner: '苏青鸾',
    title: '剑心',
    steps: [
      {
        id: 'sq1', name: '同门切磋', desc: '在秘境中击杀 200 只妖兽（她要看你出剑）',
        goal: { type: 'kills', target: 200 },
        condition: { affinity: 20, realm: 1 },
        reward: { affinity: 10, coin: 800 },
        line: '「……你的剑，比上次快了。」她收剑入鞘，「但还是太慢。」',
      },
      {
        id: 'sq2', name: '夜巡', desc: '通关第 20 层秘境',
        goal: { type: 'floor', target: 20 },
        condition: { affinity: 40 },
        reward: { affinity: 15, mats: { iron: 8 } },
        line: '「昨夜守了一整宿。」她把披风解下来扔给你，「手冷，给你的。」',
      },
      {
        id: 'sq3', name: '双剑', desc: '炼制 5 炉丹药，替她备好伤药',
        goal: { type: 'craft', target: 5 },
        condition: { affinity: 60 },
        reward: { affinity: 20, coin: 3000 },
        line: '「下次出剑，」她终于站到你左边，「我站左边。」',
      },
    ],
    ending: {
      go: '飞升那日，她把剑插在云台边缘：「走吧。这次我走在你左边。」剑光缠上你的手腕，凉得让人安心。',
      stay: '她没有跟你走。留在剑峰那日，她只说：「你飞你的。我在这里看着。」后来每次雷劫落下，剑峰都会亮一次——她在替你挡。',
    },
  },
  ajiuyu: {
    partner: '阿九',
    title: '狐火',
    steps: [
      {
        id: 'aj1', name: '狐疑', desc: '拾取 15 件装备（她替你收着）',
        goal: { type: 'drops', target: 15 },
        condition: { affinity: 20, realm: 1 },
        reward: { affinity: 10, mats: { core: 3 } },
        line: '「你又扔了一件。」她把袖子里的旧剑翻出来，「这件是第一次见面时你掉的……我留着了。」',
      },
      {
        id: 'aj2', name: '狐火', desc: '通关第 30 层秘境',
        goal: { type: 'floor', target: 30 },
        condition: { affinity: 40 },
        reward: { affinity: 15, mats: { herb: 10 } },
        line: '「我数过了，你今天杀了 {kills} 只。」她蹲在火边烤一只野兔，「一只也没多，一只也没少。」',
      },
      {
        id: 'aj3', name: '九尾', desc: '击败 3 只守关妖兽',
        goal: { type: 'boss', target: 3 },
        condition: { affinity: 60 },
        reward: { affinity: 20, coin: 3000 },
        line: '「九条尾巴都露出来了。」她笑着说，「别怕，不是要吃你——是高兴。」',
      },
    ],
    ending: {
      go: '她化成九尾狐原形，趴在你云舟的头顶：「飞吧。我给你看路。」一路云海，都是她指的方向。',
      stay: '她没走。窝在妖市顶棚上打盹，尾巴垂下来当帘子。偶尔有迷路的修士，她会指路——往你飞升的那条路。',
    },
  },
  danxia: {
    partner: '丹霞仙子',
    title: '丹心',
    steps: [
      {
        id: 'dx1', name: '试药', desc: '炼制 3 炉丹药（失败品她一口喝了）',
        goal: { type: 'craft', target: 3 },
        condition: { affinity: 20, realm: 1 },
        reward: { affinity: 10, mats: { herb: 6 } },
        line: '「这一炉火候差了三息。」她皱眉，忽然又笑了，「不过你炼的，我不挑。」',
      },
      {
        id: 'dx2', name: '真心丹', desc: '与丹霞仙子交谈 5 次',
        goal: { type: 'talk', target: 5 },
        condition: { affinity: 40 },
        reward: { affinity: 15, coin: 1500 },
        line: '「……」她把一个小瓶塞进你手里，「这是真心丹。吃了我就……」她跑了，炉子差点炸。',
      },
      {
        id: 'dx3', name: '开炉', desc: '强化装备 8 次（她替你护法）',
        goal: { type: 'upgrade', target: 8 },
        condition: { affinity: 60 },
        reward: { affinity: 20, mats: { jade: 6 } },
        line: '「成了？」她吹了吹炉灰，「那这枚上品丹给你。以后……以后我炼的都给你留着。」',
      },
    ],
    ending: {
      go: '丹炉没带上。她把最后一炉丹喂了火，与你同乘一炉清气上行：「这回不炼丹了，炼你。」——她说的是玩笑。',
      stay: '她留在丹阁，把那枚真心丹的半成品封进丹炉：「等下一个愿意陪我试药的人。」药香三年不散。',
    },
  },
  yunwuyue: {
    partner: '云无月',
    title: '雷心',
    steps: [
      {
        id: 'yw1', name: '问心雷', desc: '通关第 40 层秘境（她在云上看着）',
        goal: { type: 'floor', target: 40 },
        condition: { affinity: 25, realm: 3 },
        reward: { affinity: 15, coin: 4000 },
        line: '「你的雷劫，我收了七成。」她背对着你，「……别回头。我怕你看见我的表情。」',
      },
      {
        id: 'yw2', name: '雷池', desc: '炼制 8 炉丹药（雷池太冷，她要人陪）',
        goal: { type: 'craft', target: 8 },
        condition: { affinity: 45 },
        reward: { affinity: 15, mats: { core: 6 } },
        line: '「雷池很冷。」她终于肯看你一眼，「……坐近些。别越线。」',
      },
      {
        id: 'yw3', name: '道心', desc: '通关第 60 层秘境（她这一关会亲自落雷）',
        goal: { type: 'floor', target: 60 },
        condition: { affinity: 65 },
        reward: { affinity: 25, coin: 8000 },
        line: '「……」九霄雷散尽，她站在原地很久，最后只说了三个字，「道心乱矣。」——是你乱的。',
      },
    ],
    ending: {
      go: '雷池随你一同升入仙界。她说：「我修了千年剑道，从未想过为谁停下来。」顿了顿，「现在停了。」',
      stay: '她留在雷池，替你镇着天劫。此后你每飞升一层，天上就会落一道比往年轻的雷——是她手软了。',
    },
  },
};

/** 取某 NPC 的路线状态 */
export function routeOf(npcKey) {
  return ROUTES[npcKey] || null;
}
