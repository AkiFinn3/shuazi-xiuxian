// 主循环：固定步长逻辑 + rAF 渲染
export class Loop {
  constructor(update, render, step = 1 / 60) {
    this.update = update;
    this.render = render;
    this.step = step;
    this.acc = 0;
    this.last = 0;
    this.running = false;
    this.rafId = 0;
    this.fps = 60;
    this._fpsAcc = 0;
    this._fpsCount = 0;
    this._tick = this._tick.bind(this);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.rafId = requestAnimationFrame(this._tick);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  _tick(now) {
    if (!this.running) return;
    let delta = (now - this.last) / 1000;
    this.last = now;
    if (delta > 0.25) delta = 0.25;   // 切后台回来不要一次性补太多
    this.acc += delta;

    let guard = 0;
    while (this.acc >= this.step && guard++ < 8) {
      this.update(this.step);
      this.acc -= this.step;
    }
    this.render(delta, this.acc / this.step);

    this._fpsAcc += delta;
    this._fpsCount++;
    if (this._fpsAcc >= 0.5) {
      this.fps = Math.round(this._fpsCount / this._fpsAcc);
      this._fpsAcc = 0;
      this._fpsCount = 0;
    }
    this.rafId = requestAnimationFrame(this._tick);
  }
}
