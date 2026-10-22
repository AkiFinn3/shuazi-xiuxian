// 秘境随机事件
import { rollItem } from '../game/loot.js';
import { Rng } from '../engine/rng.js';

const rng = new Rng();

/**
 * 事件定义：choices 里的 resolve 返回 { text, log, reward }
 */
export const EVENTS = [
  {
    id: 'wretch',
    title: '落难修士',
    text: '一个衣衫褴褛的修士跪在路边：「在下被妖兽打劫，只求道友施舍些灵石……」他袖口里似乎藏着什么。',
    choices: [
      {
        label: '给他 200 灵石',
        hint: '可能获得回报',
        resolve(game) {
          const s = game.state;
          if (s.coin < 200) return { text: '你摸了摸口袋，算了。' };
          s.coin -= 200;
          if (Math.random() < 0.55) {
            const item = rollItem(rng, Math.max(1, s.floor - 2), s.stats.luck || 0);
            game.addLoot(item);
            return { text: `他颤巍巍递来一件「${item.name}」：「多谢道友！」` };
          }
          return { text: '他千恩万谢地走了，什么也没给。' };
        },
      },
      { label: '摇头走开', hint: '省事', resolve: () => ({ text: '你绕开他，继续赶路。' }) },
    ],
  },
  {
    id: 'market',
    title: '路边黑市',
    text: '一个戴斗笠的摊主掀开布帘：「刚到的好货，童叟无欺——道友，看一眼？」',
    choices: [
      {
        label: '看看货',
        hint: '可能捡漏，也可能挨宰',
        resolve(game) {
          const s = game.state;
          const item = rollItem(rng, s.floor, 10);
          const price = 150 + item.power * 2;
          if (s.coin < price) return { text: `「${item.name}」，标价 ${price} 灵石。你摸了摸口袋，走了。` };
          s.coin -= price;
          game.addLoot(item);
          return { text: `你买下了一「${item.name}」，花了 ${price} 灵石。` };
        },
      },
      { label: '装作没看见', hint: '安全', resolve: () => ({ text: '斗笠人收起布帘，消失在人群里。' }) },
    ],
  },
  {
    id: 'spring',
    title: '灵泉',
    text: '山坳里有一眼清泉，灵气氤氲。泉水汩汩，泉底似乎沉着什么东西。',
    choices: [
      {
        label: '饮一口',
        hint: '恢复气血',
        resolve(game) {
          const s = game.state;
          s.hp = game.stats.maxHp;
          return { text: '泉水入喉，伤势尽消，气血充盈。' };
        },
      },
      {
        label: '探泉底',
        hint: '有机会获得材料',
        resolve(game) {
          const s = game.state;
          s.mats.core = (s.mats.core || 0) + 1;
          s.mats.herb = (s.mats.herb || 0) + 2;
          return { text: '你摸到一枚妖丹和几株灵草。' };
        },
      },
    ],
  },
  {
    id: 'cave',
    title: '古洞府',
    text: '石壁上裂开一道缝，里面透出微光。可能有宝贝，也可能有陷阱。',
    choices: [
      {
        label: '进去看看',
        hint: '赌一把',
        resolve(game) {
          const s = game.state;
          if (Math.random() < 0.5) {
            const item = rollItem(rng, s.floor + 2, 15);
            game.addLoot(item);
            return { text: `洞中石台上躺着一件「${item.name}」，品相极好。` };
          }
          const loss = Math.floor(s.coin * 0.15);
          s.coin -= loss;
          return { text: `洞里全是毒雾，你狼狈逃出，损失了 ${loss} 灵石。` };
        },
      },
      { label: '不贪', hint: '稳妥', resolve: () => ({ text: '你把裂缝重新掩上，转身离去。' }) },
    ],
  },
  {
    id: 'fox',
    title: '碰瓷的妖狐',
    text: '一只白狐倒在你必经之路上，睁着水汪汪的眼睛：「道友，撞了人得赔钱。」',
    choices: [
      {
        label: '赔它 100 灵石',
        hint: '它会缠上你',
        resolve(game) {
          const s = game.state;
          if (s.coin < 100) return { text: '你没钱。白狐翻了个白眼，跑了。' };
          s.coin -= 100;
          s.mats.herb = (s.mats.herb || 0) + 3;
          s.flags = s.flags || {};
          s.flags.foxFriend = true;
          return { text: '白狐叼来三株灵草算是赔礼，然后一路跟着你。' };
        },
      },
      {
        label: '一脚踢开',
        hint: '也许有惊喜',
        resolve(game) {
          if (Math.random() < 0.4) {
            game.state.mats.core = (game.state.mats.core || 0) + 1;
            return { text: '白狐被踢得滚了两圈，爬起来甩了甩尾巴，一枚妖丹掉在地上。' };
          }
          return { text: '白狐龇牙，化成一阵烟跑了。' };
        },
      },
    ],
  },
  {
    id: 'demonic',
    title: '心魔',
    text: '前方坐着一个与你一模一样的人，只是眼里没有光：「来啊，让我看看你修的是什么。」',
    choices: [
      {
        label: '战！',
        hint: '以战力硬撼',
        resolve(game) {
          const s = game.state;
          const win = Math.random() < 0.35 + s.stats.power / 4000;
          if (win) {
            const item = rollItem(rng, s.floor + 3, 20);
            game.addLoot(item);
            s.exp += Math.floor(200 + s.floor * 40);
            return { text: `心魔碎了，化作一枚「${item.name}」和一股暖流。` };
          }
          const loss = Math.floor(s.exp * 0.15);
          s.exp = Math.max(0, s.exp - loss);
          return { text: `你被心魔压着打了一顿，修为散了 ${loss}。` };
        },
      },
      { label: '闭目不动', hint: '稳妥', resolve: () => ({ text: '你不动，它也消散了。' }) },
    ],
  },
];

/** 抽一个事件 */
export function randomEvent() {
  return EVENTS[Math.floor(Math.random() * EVENTS.length)];
}
