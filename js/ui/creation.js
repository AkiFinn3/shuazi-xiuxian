// 创角：道号、出身、形象
import { ORIGINS, APPEARANCES } from '../data/config.js';
import { openModal, closeModal, toast } from './modal.js';
import { SPRITES } from '../data/sprites.js';
import { nameReactions } from '../game/easter.js';

const SUGGESTED = ['元始天尊', '李长寿', '韩跑跑', '隔壁老王', '无名氏', '道友请留步', '本人已闭关'];

export function openCreation(onDone) {
  let origin = ORIGINS[4].key;
  let appearance = ORIGINS[4].appearance;

  openModal((box, close) => {
    box.innerHTML = `
      <h2>谁让这个刷子修仙的</h2>
      <p class="muted">—— 取材自一位不愿透露姓名的挂机刷子</p>
      <div class="warnbox">
        本作含成人向情感暗示（不露骨），建议 18 岁以上。修与不修，全看你能刷多久。
      </div>
      <div class="creation">
        <div>
          <div class="preview">
            <canvas id="cdPreview" width="120" height="150"></canvas>
            <div class="nameplate" id="cdName">无名散修</div>
          </div>
          <div class="field mt8">
            <label>道号（1-10 字）</label>
            <input type="text" id="cdNameInput" maxlength="10" placeholder="给自己起个名号" />
            <div class="chips" id="cdChips"></div>
          </div>
        </div>
        <div>
          <div class="field">
            <label>出身</label>
            <div class="origins" id="cdOrigins"></div>
          </div>
          <div class="field">
            <label>形象</label>
            <div class="appearances" id="cdAppearances"></div>
          </div>
          <div class="row end mt8">
            <button class="btn btn-ghost" id="cdRandom">随机道号</button>
            <button class="btn btn-gold" id="cdStart">开始修仙</button>
          </div>
          <p class="muted mt8" id="cdHint">小提示：道号会被 NPC 念出来，想好再起。</p>
        </div>
      </div>`;

    // 出身
    const originBox = box.querySelector('#cdOrigins');
    ORIGINS.forEach((o) => {
      const el = document.createElement('div');
      el.className = 'origin' + (o.key === origin ? ' on' : '');
      el.innerHTML = `<b>${o.name}</b><span>${o.desc}</span>`;
      el.onclick = () => {
        origin = o.key;
        appearance = o.appearance;
        [...originBox.children].forEach((c) => c.classList.remove('on'));
        el.classList.add('on');
        buildAppearances();
        drawPreview();
      };
      originBox.appendChild(el);
    });

    // 形象
    function buildAppearances() {
      const box2 = box.querySelector('#cdAppearances');
      box2.innerHTML = '';
      APPEARANCES.forEach((a) => {
        const el = document.createElement('div');
        el.className = 'app-pick' + (a.key === appearance ? ' on' : '');
        el.title = a.name;
        const c = document.createElement('canvas');
        c.width = 44; c.height = 52;
        el.appendChild(c);
        el.onclick = () => {
          appearance = a.key;
          [...box2.children].forEach((x) => x.classList.remove('on'));
          el.classList.add('on');
          drawPreview();
        };
        box2.appendChild(el);
        // 异步画预览
        const meta = SPRITES.anims[`hero/${a.key}_idle`];
        if (!meta) return;
        const img = new Image();
        img.onload = () => {
          const ctx = c.getContext('2d');
          ctx.imageSmoothingEnabled = false;
          const [cw, ch] = meta.cell;
          const scale = Math.min(44 / cw, 52 / ch);
          const w = cw * scale, h = ch * scale;
          ctx.drawImage(img, 0, 0, cw, ch, (44 - w) / 2, 52 - h, w, h);
        };
        img.src = meta.src;
      });
    }

    function drawPreview() {
      const c = box.querySelector('#cdPreview');
      const ctx = c.getContext('2d');
      ctx.clearRect(0, 0, c.width, c.height);
      const meta = SPRITES.anims[`hero/${appearance}_idle`];
      const nameEl = box.querySelector('#cdName');
      const input = box.querySelector('#cdNameInput');
      nameEl.textContent = input.value.trim() || '无名散修';
      if (!meta) return;
      const img = new Image();
      img.onload = () => {
        ctx.imageSmoothingEnabled = false;
        const [cw, ch] = meta.cell;
        const scale = Math.min(c.width / cw, (c.height - 10) / ch);
        const w = cw * scale, h = ch * scale;
        ctx.drawImage(img, 0, 0, cw, ch, (c.width - w) / 2, c.height - h - 4, w, h);
      };
      img.src = meta.src;
    }

    // 建议道号
    const chipBox = box.querySelector('#cdChips');
    SUGGESTED.forEach((n) => {
      const el = document.createElement('span');
      el.className = 'chip';
      el.textContent = n;
      el.onclick = () => {
        box.querySelector('#cdNameInput').value = n;
        drawPreview();
        box.querySelector('#cdHint').textContent = nameReactions(n)[0] || '小提示：道号会被 NPC 念出来。';
      };
      chipBox.appendChild(el);
    });

    const input = box.querySelector('#cdNameInput');
    input.oninput = drawPreview;
    input.onkeydown = (e) => { if (e.key === 'Enter') start(); };

    box.querySelector('#cdRandom').onclick = () => {
      input.value = SUGGESTED[Math.floor(Math.random() * SUGGESTED.length)];
      drawPreview();
    };

    function start() {
      const name = (input.value || '').trim();
      if (!name) {
        toast('总得有个道号吧');
        input.focus();
        return;
      }
      if (name.length > 10) {
        toast('道号太长了，仙门不收');
        return;
      }
      const reaction = nameReactions(name)[0];
      close();
      if (reaction) toast(reaction, '#e8c46a');
      onDone({ name, origin, appearance });
    }

    box.querySelector('#cdStart').onclick = start;

    buildAppearances();
    drawPreview();
    setTimeout(() => input.focus(), 60);
  }, { width: '780px', dismissible: false });
}
