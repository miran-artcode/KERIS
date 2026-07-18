/* 단계 마법사 + 프롬프트 복사 + 슬라이드 뷰어 + 워터마크 — 로그인 없이도 동작하는 순수 UI */
(function () {
  'use strict';

  /* ---------- 단계 마법사 ---------- */
  var steps = Array.prototype.slice.call(document.querySelectorAll('.step'));
  if (steps.length) {
    var bar = document.getElementById('stepbar');
    var cur = 0;

    function stepFromHash() {
      var m = (location.hash || '').match(/step-(\d+)/);
      if (!m) return 0;
      var n = parseInt(m[1], 10) - 1;
      return (n >= 0 && n < steps.length) ? n : 0;
    }

    function render() {
      steps.forEach(function (s, i) { s.classList.toggle('show', i === cur); });
      if (bar) {
        Array.prototype.forEach.call(bar.children, function (b, i) {
          b.classList.toggle('now', i === cur);
          b.classList.toggle('done', i < cur);
        });
      }
      var el = document.querySelector('.step.show');
      if (el) {
        var counts = el.querySelectorAll('.step-count');
        Array.prototype.forEach.call(counts, function (c) {
          c.textContent = (cur + 1) + ' / ' + steps.length + ' 단계';
        });
      }
      /* 페이지가 단계 전환을 알 수 있게 이벤트 발행 (체류 로그용) */
      document.dispatchEvent(new CustomEvent('wizard:step', { detail: { index: cur, total: steps.length } }));
    }

    function go(n, push) {
      cur = Math.max(0, Math.min(steps.length - 1, n));
      if (push !== false) {
        location.hash = 'step-' + (cur + 1);
      }
      render();
      var top = document.getElementById('wizard-top');
      if (top) top.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if (bar) {
      steps.forEach(function (s, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = i + 1;
        b.setAttribute('aria-label', (i + 1) + '단계로 이동');
        b.addEventListener('click', function () { go(i); });
        bar.appendChild(b);
      });
    }

    document.addEventListener('click', function (e) {
      var t = e.target.closest('[data-step-next]');
      if (t) { e.preventDefault(); go(cur + 1); return; }
      var p = e.target.closest('[data-step-prev]');
      if (p) { e.preventDefault(); go(cur - 1); }
    });

    window.addEventListener('hashchange', function () { cur = stepFromHash(); render(); });
    cur = stepFromHash();
    render();
  }

  /* ---------- 슬라이드 뷰어 (.deckview[data-dir][data-total]) ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('.deckview[data-dir]'), function (dv) {
    var dir = dv.dataset.dir;
    var total = parseInt(dv.dataset.total, 10) || 1;
    var cur = 1;
    var img = document.createElement('img');
    img.alt = dv.dataset.alt || '슬라이드';
    img.loading = 'lazy';
    var nav = document.createElement('div');
    nav.className = 'dv-nav';
    nav.innerHTML = '<button type="button" data-d="-1">◀ 이전</button>' +
      '<span class="dv-num"></span>' +
      '<button type="button" data-d="1">다음 ▶</button>';
    dv.appendChild(img); dv.appendChild(nav);
    function show() {
      img.src = dir + '/s' + cur + '.png';
      nav.querySelector('.dv-num').textContent = cur + ' / ' + total;
    }
    nav.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-d]');
      if (!b) return;
      cur = Math.max(1, Math.min(total, cur + parseInt(b.dataset.d, 10)));
      show();
    });
    show();
  });

  /* ---------- 보안: 이미지 우클릭·저장·인쇄 억제 (텍스트 복사는 허용) ---------- */
  document.addEventListener('contextmenu', function (e) {
    var t = e.target;
    if (t && (t.tagName === 'IMG' || t.tagName === 'SVG' || (t.closest && t.closest('.deckview')))) e.preventDefault();
  });
  document.addEventListener('keydown', function (e) {
    var k = (e.key || '').toLowerCase();
    if ((e.ctrlKey || e.metaKey) && ['s', 'p'].indexOf(k) >= 0) { e.preventDefault(); }
  });
  document.addEventListener('dragstart', function (e) {
    if (e.target && (e.target.tagName === 'IMG' || e.target.tagName === 'SVG')) e.preventDefault();
  });

  /* ---------- 유출 억제 워터마크: 보는 사람의 교과·별명이 화면 전체에 깔림 ---------- */
  (function watermark() {
    var label = '© 2026 Miran Hwang · KERIS 선도교사 연수';
    try {
      var s = JSON.parse(localStorage.getItem('keris_session_v1') || 'null');
      if (s && s.nickname) label = s.subject + ' · ' + s.nickname + ' · ' + label;
    } catch (err) {}
    var wm = document.createElement('div');
    wm.className = 'wm';
    wm.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < 48; i++) {
      var sp = document.createElement('span');
      sp.textContent = label;
      wm.appendChild(sp);
    }
    if (document.body) document.body.appendChild(wm);
  })();

  /* ---------- 프롬프트·발문 복사 버튼 ---------- */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.copy-btn');
    if (!btn) return;
    var card = btn.closest('.prompt-card');
    var pre = card && card.querySelector('pre');
    if (!pre) return;
    var text = pre.textContent.trim();
    function done() {
      var old = btn.textContent;
      btn.textContent = '복사 완료 ✓';
      btn.classList.add('ok');
      setTimeout(function () { btn.textContent = old; btn.classList.remove('ok'); }, 2200);
    }
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (err) {}
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () { fallback(); });
    } else { fallback(); }
  });
})();
