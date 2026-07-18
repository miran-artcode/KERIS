/* =========================================================
   슬라이드 꾸미기 오버레이 — 공용 렌더러
   강의자가 콘솔에서 얹은 텍스트·사진·영상·가리개를
   콘솔·청중 화면·참가자 화면에 똑같이 그린다.
   좌표는 슬라이드(16:9) 기준 퍼센트, 글자 크기는 가로 1600px 기준.
   ========================================================= */
import { watchOverlays, toEmbed } from './app.js?v=1';

let MAP = {};
const subs = [];
let started = false;

export function overlayStore(cb) {
  subs.push(cb);
  if (!started) {
    started = true;
    watchOverlays((m) => { MAP = m; subs.forEach((f) => { try { f(MAP); } catch (e) {} }); });
  }
  cb(MAP);
}
export function itemsFor(n) { return MAP['s' + n] || []; }

/* items를 box(슬라이드와 같은 크기의 div)에 그린다. scale = boxWidth/1600 */
export function renderItems(box, items, scale, interactiveVideo) {
  box.innerHTML = '';
  (items || []).forEach((it) => {
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;left:' + (it.x || 0) + '%;top:' + (it.y || 0) + '%;width:' + (it.w || 10) + '%;height:' + (it.h || 10) + '%;overflow:hidden';
    if (it.t === 'box') {
      el.style.background = it.bg || '#FFFFFF';
    } else if (it.t === 'txt') {
      el.style.font = '600 ' + ((it.s || 40) * scale) + 'px \'IBM Plex Sans KR\',sans-serif';
      el.style.lineHeight = '1.4';
      el.style.color = it.c || '#17172E';
      el.style.whiteSpace = 'pre-wrap';
      el.style.wordBreak = 'keep-all';
      if (it.bg) el.style.background = it.bg;
      el.textContent = it.text || '';
    } else if (it.t === 'img') {
      const im = document.createElement('img');
      im.src = it.u || '';
      im.style.cssText = 'width:100%;height:100%;object-fit:contain;display:block';
      el.appendChild(im);
    } else if (it.t === 'vid') {
      const f = document.createElement('iframe');
      f.src = toEmbed(it.u || '').replace('?autoplay=1', '');
      f.style.cssText = 'width:100%;height:100%;border:0';
      f.allow = 'autoplay; fullscreen; encrypted-media';
      f.allowFullscreen = true;
      if (interactiveVideo) f.style.pointerEvents = 'auto';
      el.appendChild(f);
    }
    box.appendChild(el);
  });
}

/* container 안에 슬라이드와 같은 위치·크기의 오버레이 박스를 붙인다.
   opts.fill=true 면 컨테이너 전체(이미지가 컨테이너를 꽉 채우는 경우),
   아니면 16:9 contain으로 계산. getSlide()는 현재 슬라이드 번호(1부터). */
export function attachOverlay(container, getSlide, opts = {}) {
  const box = document.createElement('div');
  box.style.cssText = 'position:absolute;pointer-events:none;z-index:' + (opts.z || 5);
  container.appendChild(box);
  function layout() {
    const cw = container.clientWidth, ch = container.clientHeight;
    let w, h;
    if (opts.fill) { w = cw; h = ch; }
    else if (cw / ch > 16 / 9) { h = ch; w = ch * 16 / 9; }
    else { w = cw; h = cw * 9 / 16; }
    box.style.width = w + 'px'; box.style.height = h + 'px';
    box.style.left = ((cw - w) / 2) + 'px'; box.style.top = ((ch - h) / 2) + 'px';
    box.dataset.scale = String(w / 1600);
    redraw();
  }
  function redraw() {
    renderItems(box, itemsFor(getSlide()), parseFloat(box.dataset.scale || '1'), !!opts.interactiveVideo);
  }
  window.addEventListener('resize', layout);
  overlayStore(redraw);
  layout();
  return { box, layout, redraw };
}
