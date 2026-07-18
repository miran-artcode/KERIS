/* =========================================================
   Firebase 연동 — 입장(교과+별명+PIN) · 실시간 참여 · 신호 ·
   설계안 점검 로그 · 퀴즈 · 액션플랜 · KPT · 발화 전사
   개인정보(실명·연락처)는 수집하지 않습니다.
   ========================================================= */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import {
  getFirestore, doc, getDoc, getDocs, setDoc, updateDoc, addDoc, collection,
  serverTimestamp, increment, query, orderBy, limit, onSnapshot, where
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyAgT_WfRaFk5LTLxhlkyhaxt46OTL5_HYM',
  authDomain: 'keris-data.firebaseapp.com',
  projectId: 'keris-data',
  storageBucket: 'keris-data.firebasestorage.app',
  messagingSenderId: '390419324634',
  appId: '1:390419324634:web:b2d619ef3bf6524b58cfe3'
};

let db = null;
try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (e) {
  console.warn('Firebase 초기화 실패 — 오프라인 모드로 동작합니다.', e);
}
export function hasDb() { return !!db; }

const SS_KEY = 'keris_session_v1';
const FACES = ['🦉','🌸','🌳','🌞','🏔️','🐢','🦁','📚','🖋️','🎨','🌊','⭐','🍀','🦋','🐘','🕊️','🌙','🌈','🎈','🎵','🥁','🏀','🖌️'];
export const SUBJECTS = { '음악': '♪', '미술': '🎨', '체육': '⚽', '손님': '👀', '강의자': '🎤' };

/* ---------- 유틸 ---------- */
function norm(s) { return (s || '').trim().replace(/\s+/g, ' '); }
function docId(subject, nickname) {
  return (subject + '__' + nickname).replace(/[\/#$\[\]\.]/g, '_');
}
async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
function pickFace(subject, nickname) {
  const s = subject + nickname;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return FACES[h % FACES.length];
}
function agoText(ts) {
  if (!ts || !ts.toDate) return '';
  const diff = Date.now() - ts.toDate().getTime();
  const m = Math.floor(diff / 60000);
  if (m < 2) return 'ON';
  if (m < 60) return m + '분 전';
  const h = Math.floor(m / 60);
  if (h < 24) return h + '시간 전';
  return Math.floor(h / 24) + '일 전';
}
export function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ---------- 세션 ---------- */
export function getSession() {
  try { return JSON.parse(localStorage.getItem(SS_KEY)); } catch (e) { return null; }
}
function saveSession(s) {
  try { localStorage.setItem(SS_KEY, JSON.stringify(s)); }
  catch (e) { throw new Error('브라우저 저장소가 차단되어 입장할 수 없습니다. 시크릿 모드를 끄거나 다른 브라우저로 시도해 주세요.'); }
}
export function logout() { localStorage.removeItem(SS_KEY); location.href = 'index.html'; }

/* ---------- 입장 (교과 + 별명 + PIN) ---------- */
export async function enter(subject, nickname, pin) {
  subject = norm(subject); nickname = norm(nickname); pin = norm(pin);
  if (!subject || subject.length > 10) throw new Error('교과를 선택해 주세요.');
  if (!nickname || nickname.length > 20) throw new Error('별명을 확인해 주세요. (20자 이내)');
  if (!/^\d{4}$/.test(pin)) throw new Error('비밀번호는 숫자 4자리로 입력해 주세요. 예) 1234');

  const face = pickFace(subject, nickname);
  const session = { subject, nickname, face, id: docId(subject, nickname) };

  if (!db) { saveSession(session); return { mode: 'offline', session }; }

  const pinHash = await sha256(subject + '|' + nickname + '|' + pin);
  const ref = doc(db, 'participants', session.id);

  let snap;
  try { snap = await getDoc(ref); }
  catch (e) { console.warn('Firestore 접근 실패', e); saveSession(session); return { mode: 'offline', session }; }

  if (snap.exists()) {
    const data = snap.data();
    if (data.pinHash && data.pinHash !== pinHash) {
      throw new Error('이미 같은 교과·별명으로 입장한 기록이 있는데, 비밀번호 4자리가 달라요. 다시 확인하거나 별명을 살짝 바꿔 보세요. 예) 소나무 → 소나무2');
    }
    await updateDoc(ref, { lastSeen: serverTimestamp(), loginCount: increment(1), page: '입장 로비', status: 'on' });
    saveSession(session);
    return { mode: 'returning', session, loginCount: (data.loginCount || 0) + 1 };
  }

  await setDoc(ref, {
    subject, nickname, pinHash, emoji: face,
    joinedAt: serverTimestamp(), lastSeen: serverTimestamp(),
    loginCount: 1, page: '입장 로비', status: 'on', state: ''
  });
  saveSession(session);
  return { mode: 'new', session };
}

/* ---------- 발자국(접속 상태 + 현재 위치) ---------- */
let curStep = '';
export function setStep(stepName) {
  curStep = String(stepName || '').slice(0, 40);
  const s = getSession();
  if (!s || !db) return;
  // subject/nickname 포함 — 문서가 없어도 create 규칙을 통과하도록
  setDoc(doc(db, 'participants', s.id), {
    subject: s.subject, nickname: s.nickname, emoji: s.face,
    step: curStep, lastSeen: serverTimestamp()
  }, { merge: true }).catch(() => {});
}
export function presence(pageName) {
  const s = getSession();
  if (!s || !db) return;
  const ref = doc(db, 'participants', s.id);
  const beat = () => {
    setDoc(ref, {
      subject: s.subject, nickname: s.nickname, emoji: s.face,
      lastSeen: serverTimestamp(), page: pageName, step: curStep, status: 'on'
    }, { merge: true }).catch(() => {});
  };
  beat();
  setInterval(beat, 45000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) beat(); });
}

/* ---------- 신호 (진도·이해·막힘·재미) ----------
   kind: ok(따라가고 있어요) | confused(조금 헷갈려요) | stuck(막혔어요, 도움!)
         | laugh(😂) | wow(👏) — 상태(state)는 ok/confused/stuck만 갱신 */
export async function sendSignal(kind, whereText) {
  const s = getSession();
  if (!s || !db) return false;
  const stateKinds = ['ok', 'confused', 'stuck'];
  let ok = false;
  try {
    await addDoc(collection(db, 'signals'), {
      pid: s.id, subject: s.subject, nickname: s.nickname, emoji: s.face,
      kind: String(kind).slice(0, 12),
      where: String(whereText || document.body.dataset.page || '').slice(0, 60),
      step: curStep, ts: serverTimestamp()
    });
    ok = true; // 신호 자체는 기록됨
  } catch (e) { console.warn('signal', e); }
  if (ok && stateKinds.indexOf(kind) >= 0) {
    // 상태 갱신 실패는 신호 성공과 분리 (subject/nickname 포함 — 문서 부재 시에도 통과)
    setDoc(doc(db, 'participants', s.id), {
      subject: s.subject, nickname: s.nickname, emoji: s.face,
      state: kind, stateAt: serverTimestamp()
    }, { merge: true }).catch((e) => console.warn('signal state', e));
  }
  return ok;
}
export function watchSignals(cb, n) {
  if (!db) return () => {};
  const q = query(collection(db, 'signals'), orderBy('ts', 'desc'), limit(n || 60));
  return onSnapshot(q, (qs) => {
    const rows = [];
    qs.forEach((d) => rows.push({ id: d.id, ...d.data() }));
    cb(rows);
  }, () => {});
}

/* ---------- 실시간 명단 ---------- */
const STATE_ICON = { ok: '🟢', confused: '🟡', stuck: '🔴' };
export function watchRoster(listEl, countEl, totalEl) {
  if (!db) {
    if (listEl) listEl.innerHTML = '<div style="color:rgba(255,255,255,.6);font-size:15px;padding:12px">지금은 연결이 어려워요. 입장은 그대로 가능합니다.</div>';
    return;
  }
  const q = query(collection(db, 'participants'), orderBy('lastSeen', 'desc'), limit(80));
  onSnapshot(q, (qs) => {
    let online = 0, shown = 0;
    const rows = [];
    qs.forEach((d) => {
      const p = d.data();
      if (p.status === 'hidden') return;
      if (p.lastSeen && p.lastSeen.toDate && (Date.now() - p.lastSeen.toDate().getTime()) > 24 * 3600 * 1000) return;
      shown++;
      const ago = agoText(p.lastSeen);
      const isOn = ago === 'ON';
      if (isOn) online++;
      const st = isOn && p.state && STATE_ICON[p.state] ? ' ' + STATE_ICON[p.state] : '';
      rows.push(
        '<div class="who">' +
          '<span class="face">' + esc(p.emoji || '🙂') + '</span>' +
          '<span><span class="nm">' + esc(p.nickname || '') + st + '</span>' +
          '<br><span class="sc">' + esc(p.subject || '') + (SUBJECTS[p.subject] ? ' ' + SUBJECTS[p.subject] : '') + '</span></span>' +
          '<span class="st">' + (isOn ? '<span class="on">● 접속 중</span>' : esc(ago)) +
          '<br>' + esc(p.page || '') + '</span>' +
        '</div>'
      );
    });
    if (listEl) listEl.innerHTML = rows.join('') || '<div style="color:rgba(255,255,255,.6);font-size:15px;padding:12px">아직 아무도 없어요. 첫 번째로 입장해 보세요!</div>';
    if (countEl) countEl.textContent = online;
    if (totalEl) totalEl.textContent = shown;
  }, (err) => {
    console.warn('roster', err);
    if (listEl) listEl.innerHTML = '<div style="color:rgba(255,255,255,.6);font-size:15px;padding:12px">명단을 불러오지 못했어요. 입장은 그대로 가능합니다.</div>';
  });
}

/* ---------- 응원 ---------- */
export async function sendCheer(text) {
  const s = getSession();
  if (!s || !db) return false;
  try {
    await addDoc(collection(db, 'cheers'), {
      subject: s.subject, nickname: s.nickname, emoji: s.face,
      text: String(text).slice(0, 40), ts: serverTimestamp()
    });
    return true;
  } catch (e) { console.warn('cheer', e); return false; }
}
export function watchCheers(feedEl) {
  if (!db || !feedEl) return;
  const q = query(collection(db, 'cheers'), orderBy('ts', 'desc'), limit(20));
  onSnapshot(q, (qs) => {
    const rows = [];
    qs.forEach((d) => {
      const c = d.data();
      rows.push('<div>' + esc(c.emoji || '') + ' <b>' + esc(c.nickname || '') + '</b> · ' + esc(c.subject || '') + ' — ' + esc(c.text || '') + '</div>');
    });
    feedEl.innerHTML = rows.join('');
  }, () => {});
}

/* ---------- ⑨ 복습 카드 체크 ---------- */
export async function saveReview(cards) {
  const s = getSession();
  if (!s || !db) return false;
  try {
    await setDoc(doc(db, 'reviews', s.id), {
      subject: s.subject, nickname: s.nickname, cards, updatedAt: serverTimestamp()
    }, { merge: true });
    return true;
  } catch (e) { return false; }
}
export async function loadReview() {
  const s = getSession();
  if (!s || !db) return null;
  try { const d = await getDoc(doc(db, 'reviews', s.id)); return d.exists() ? d.data() : null; } catch (e) { return null; }
}

/* 설계안×이론 체크(웜업) — reviews 문서의 plan 필드에 병합 저장 */
export async function savePlanCheck(plan) {
  const s = getSession();
  if (!s || !db) return false;
  try {
    await setDoc(doc(db, 'reviews', s.id), {
      subject: s.subject, nickname: s.nickname, plan, updatedAt: serverTimestamp()
    }, { merge: true });
    return true;
  } catch (e) { return false; }
}
export function watchReviews(cb) {
  if (!db) return () => {};
  return onSnapshot(collection(db, 'reviews'), (qs) => {
    const rows = [];
    qs.forEach((d) => rows.push({ id: d.id, ...d.data() }));
    cb(rows);
  }, () => {});
}

/* ---------- 과제 확인 (페이지별 간단 체크) ---------- */
export async function saveTask(section, key, val) {
  const s = getSession();
  if (!s || !db) return false;
  try {
    await setDoc(doc(db, 'tasks', s.id), {
      subject: s.subject, nickname: s.nickname,
      [section]: { [key]: (typeof val === 'string') ? val.slice(0, 200) : !!val },
      updatedAt: serverTimestamp()
    }, { merge: true });
    return true;
  } catch (e) { return false; }
}
export async function loadTasks() {
  const s = getSession();
  if (!s || !db) return null;
  try { const d = await getDoc(doc(db, 'tasks', s.id)); return d.exists() ? d.data() : null; } catch (e) { return null; }
}
export function watchTasks(cb) {
  if (!db) return () => {};
  return onSnapshot(collection(db, 'tasks'), (qs) => {
    const rows = [];
    qs.forEach((d) => rows.push({ id: d.id, ...d.data() }));
    cb(rows);
  }, () => {});
}

/* 과제 카드 공용 바인딩: [data-task] 체크박스 · [data-tasktext] 한 줄 입력 */
export function initTaskCard(section) {
  const boxes = document.querySelectorAll('[data-task]');
  const texts = document.querySelectorAll('[data-tasktext]');
  if (!boxes.length && !texts.length) return;
  loadTasks().then((t) => {
    const sec = (t && t[section]) || {};
    boxes.forEach(b => { if (sec[b.dataset.task]) b.checked = true; });
    texts.forEach(x => { if (typeof sec[x.dataset.tasktext] === 'string') x.value = sec[x.dataset.tasktext]; });
  });
  document.addEventListener('change', (e) => {
    const b = e.target.closest('[data-task]');
    if (b) saveTask(section, b.dataset.task, b.checked);
  });
  let tT = null;
  document.addEventListener('input', (e) => {
    const x = e.target.closest('[data-tasktext]');
    if (!x) return;
    clearTimeout(tT);
    tT = setTimeout(() => saveTask(section, x.dataset.tasktext, x.value), 900);
  });
}

/* ---------- 설계안 자가점검 (위저드) ---------- */
export async function saveWizard(data) {
  const s = getSession();
  if (!s || !db) return false;
  try {
    await setDoc(doc(db, 'wizards', s.id), {
      subject: s.subject, nickname: s.nickname, ...data, updatedAt: serverTimestamp()
    }, { merge: true });
    return true;
  } catch (e) { return false; }
}
export async function loadWizard() {
  const s = getSession();
  if (!s || !db) return null;
  try { const d = await getDoc(doc(db, 'wizards', s.id)); return d.exists() ? d.data() : null; } catch (e) { return null; }
}
/* 단계 체류 로그 — ⑪·⑫ 학습분석 실습의 표본 데이터가 된다 */
export async function logWizardStep(stepId, stepTitle, dwellSec, dir) {
  const s = getSession();
  if (!s || !db) return false;
  try {
    await addDoc(collection(db, 'wizardlogs'), {
      pid: s.id, subject: s.subject, nickname: s.nickname,
      stepId: String(stepId).slice(0, 20), stepTitle: String(stepTitle).slice(0, 40),
      dwellSec: Math.max(0, Math.min(7200, dwellSec | 0)), dir: String(dir).slice(0, 8),
      ts: serverTimestamp()
    });
    return true;
  } catch (e) { return false; }
}
export function watchWizards(cb) {
  if (!db) return () => {};
  return onSnapshot(collection(db, 'wizards'), (qs) => {
    const rows = [];
    qs.forEach((d) => rows.push({ id: d.id, ...d.data() }));
    cb(rows);
  }, () => {});
}

/* ---------- 스피드 퀴즈 기록 ---------- */
export async function saveSpeedQuiz(score, detail) {
  const s = getSession();
  if (!s || !db) return false;
  try {
    const prev = await getDoc(doc(db, 'speedquiz', s.id));
    const best = prev.exists() ? Math.max(prev.data().score || 0, score) : score;
    await setDoc(doc(db, 'speedquiz', s.id), {
      subject: s.subject, nickname: s.nickname, emoji: s.face,
      score: best, lastScore: score, tries: increment(1),
      detail: (detail || []).slice(0, 20), updatedAt: serverTimestamp()
    }, { merge: true });
    return true;
  } catch (e) { return false; }
}
export function watchSpeedBoard(cb) {
  if (!db) return () => {};
  const q = query(collection(db, 'speedquiz'), orderBy('score', 'desc'), limit(30));
  return onSnapshot(q, (qs) => {
    const rows = [];
    qs.forEach((d) => rows.push({ id: d.id, ...d.data() }));
    cb(rows);
  }, () => {});
}

/* ---------- 강의 슬라이드 실시간 동기화 ---------- */
export async function publishSlide(deck, slide, total, quiz = '', media = '') {
  if (!db) return false;
  try {
    await setDoc(doc(db, 'live', 'state'), {
      deck, slide, total,
      quiz: String(quiz || ''), media: String(media || '').slice(0, 300),
      ts: serverTimestamp()
    });
    return true;
  } catch (e) { console.warn('publishSlide', e); return false; }
}
export function watchLive(cb) {
  if (!db) return;
  onSnapshot(doc(db, 'live', 'state'), (snap) => {
    if (snap.exists()) cb(snap.data());
  }, () => {});
}
export function toEmbed(url) {
  try {
    const u = new URL(url.startsWith('http') ? url : 'https://' + url);
    const h = u.hostname.replace(/^www\./, '');
    if (h === 'youtu.be') return 'https://www.youtube.com/embed/' + u.pathname.slice(1) + '?autoplay=1';
    if (h === 'youtube.com' || h === 'm.youtube.com') {
      if (u.pathname.startsWith('/shorts/')) return 'https://www.youtube.com/embed/' + u.pathname.split('/')[2] + '?autoplay=1';
      if (u.searchParams.get('v')) return 'https://www.youtube.com/embed/' + u.searchParams.get('v') + '?autoplay=1';
    }
    if (h === 'vimeo.com' && /^\/\d+/.test(u.pathname)) return 'https://player.vimeo.com/video' + u.pathname + '?autoplay=1';
    return u.href;
  } catch (e) { return url; }
}
export function isEmbeddable(url) {
  const e = toEmbed(url);
  return /youtube\.com\/embed\/|player\.vimeo\.com\//.test(e);
}

/* ---------- 슬라이드 꾸미기(오버레이) ---------- */
export function watchOverlays(cb) {
  if (!db) return () => {};
  return onSnapshot(collection(db, 'overlays'), (qs) => {
    const map = {};
    qs.forEach((d) => { const m = d.data(); map[d.id] = (m && m.items) || []; });
    cb(map);
  }, () => {});
}
export async function saveOverlay(slide, items) {
  if (!db) return { ok: false, reason: 'offline' };
  try {
    await setDoc(doc(db, 'overlays', 's' + slide), { items: items.slice(0, 30), updatedAt: serverTimestamp() });
    return { ok: true };
  } catch (e) { console.warn('saveOverlay', e); return { ok: false, reason: String(e && e.message || e) }; }
}

/* ---------- 참여 퀴즈: 응답 저장 (1인 1퀴즈 1회) ---------- */
export async function submitQuizAnswer(quizId, slide, answerText, points, responseTime) {
  const s = getSession();
  if (!db || !s) return { ok: false, reason: 'offline' };
  const id = (s.id + '__' + quizId).replace(/[\/#$\[\]\.]/g, '_');
  try {
    await setDoc(doc(db, 'participations', id), {
      pid: s.id, subject: s.subject, nickname: s.nickname,
      slide: Math.max(0, Math.min(500, slide | 0)),
      quizId: String(quizId).slice(0, 30),
      answer: String(answerText).slice(0, 100),
      points: Math.max(0, Math.min(1000, points | 0)),
      responseTime: Math.max(0, Math.min(59999, responseTime | 0)),
      ts: serverTimestamp()
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: 'already' };
  }
}
export function watchQuizAnswers(quizId, cb) {
  if (!db) return () => {};
  const q = query(collection(db, 'participations'), where('quizId', '==', quizId));
  return onSnapshot(q, (qs) => {
    const rows = [];
    qs.forEach((d) => rows.push(d.data()));
    cb(rows);
  }, () => {});
}

/* ---------- 액션 플랜 (⑫ 최소 실행 단위) + 갤러리 워크 ---------- */
export async function savePlan(data) {
  const s = getSession();
  if (!s || !db) return false;
  try {
    await setDoc(doc(db, 'plans', s.id), {
      subject: s.subject, nickname: s.nickname, emoji: s.face,
      ...data, updatedAt: serverTimestamp()
    }, { merge: true });
    return true;
  } catch (e) { return false; }
}
export async function loadPlan() {
  const s = getSession();
  if (!s || !db) return null;
  try { const d = await getDoc(doc(db, 'plans', s.id)); return d.exists() ? d.data() : null; } catch (e) { return null; }
}
export function watchPlans(cb) {
  if (!db) return () => {};
  return onSnapshot(collection(db, 'plans'), (qs) => {
    const rows = [];
    qs.forEach((d) => rows.push({ id: d.id, ...d.data() }));
    cb(rows);
  }, () => {});
}
/* 갤러리 워크 크리틱: 장점 1 + 개선점 1 구조 */
export async function sendCritique(planId, strength, improve) {
  const s = getSession();
  if (!s || !db) return false;
  try {
    await addDoc(collection(db, 'critiques'), {
      planId: String(planId).slice(0, 60),
      from: s.nickname, fromSubject: s.subject, emoji: s.face,
      strength: String(strength).slice(0, 200), improve: String(improve).slice(0, 200),
      ts: serverTimestamp()
    });
    return true;
  } catch (e) { return false; }
}
export function watchCritiques(cb) {
  if (!db) return () => {};
  const q = query(collection(db, 'critiques'), orderBy('ts', 'desc'), limit(200));
  return onSnapshot(q, (qs) => {
    const rows = [];
    qs.forEach((d) => rows.push({ id: d.id, ...d.data() }));
    cb(rows);
  }, () => {});
}

/* ---------- KPT 회고 ---------- */
export async function saveKpt(data) {
  const s = getSession();
  if (!s || !db) return false;
  try {
    await setDoc(doc(db, 'kpt', s.id), {
      subject: s.subject, nickname: s.nickname, ...data, updatedAt: serverTimestamp()
    }, { merge: true });
    return true;
  } catch (e) { return false; }
}
export async function loadKpt() {
  const s = getSession();
  if (!s || !db) return null;
  try { const d = await getDoc(doc(db, 'kpt', s.id)); return d.exists() ? d.data() : null; } catch (e) { return null; }
}
export function watchKpt(cb) {
  if (!db) return () => {};
  return onSnapshot(collection(db, 'kpt'), (qs) => {
    const rows = [];
    qs.forEach((d) => rows.push({ id: d.id, ...d.data() }));
    cb(rows);
  }, () => {});
}

/* ---------- 강의자 발화 전사 (Web Speech API → Firestore) ---------- */
export async function addTranscript(text) {
  if (!db) return false;
  try {
    await addDoc(collection(db, 'transcripts'), { text: String(text).slice(0, 500), ts: serverTimestamp() });
    return true;
  } catch (e) { return false; }
}
export function watchTranscripts(cb, n) {
  if (!db) return () => {};
  const q = query(collection(db, 'transcripts'), orderBy('ts', 'desc'), limit(n || 100));
  return onSnapshot(q, (qs) => {
    const rows = [];
    qs.forEach((d) => rows.push({ id: d.id, ...d.data() }));
    cb(rows);
  }, () => {});
}

/* ---------- 내 데이터 / 전체 데이터 (⑪·⑫ 분석 실습용) ---------- */
export async function fetchMyData() {
  const s = getSession();
  if (!s || !db) return null;
  const out = { session: s, signals: [], wizardlogs: [], participations: [], wizard: null, review: null, speedquiz: null };
  try {
    const [sg, wl, pt, wz, rv, sq] = await Promise.all([
      getDocs(query(collection(db, 'signals'), where('pid', '==', s.id))),
      getDocs(query(collection(db, 'wizardlogs'), where('pid', '==', s.id))),
      getDocs(query(collection(db, 'participations'), where('pid', '==', s.id))),
      getDoc(doc(db, 'wizards', s.id)),
      getDoc(doc(db, 'reviews', s.id)),
      getDoc(doc(db, 'speedquiz', s.id)),
    ]);
    sg.forEach((d) => out.signals.push(d.data()));
    wl.forEach((d) => out.wizardlogs.push(d.data()));
    pt.forEach((d) => out.participations.push(d.data()));
    out.wizard = wz.exists() ? wz.data() : null;
    out.review = rv.exists() ? rv.data() : null;
    out.speedquiz = sq.exists() ? sq.data() : null;
    return out;
  } catch (e) { console.warn('fetchMyData', e); return out; }
}
export async function fetchAllData() {
  if (!db) return null;
  const out = { participants: [], signals: [], wizardlogs: [], participations: [], speedquiz: [], transcripts: [], kpt: [], plans: [] };
  try {
    const [pp, sg, wl, pt, sq, tr, kp, pl] = await Promise.all([
      getDocs(query(collection(db, 'participants'), limit(300))),
      getDocs(query(collection(db, 'signals'), orderBy('ts', 'desc'), limit(1500))),
      getDocs(query(collection(db, 'wizardlogs'), orderBy('ts', 'desc'), limit(1500))),
      getDocs(query(collection(db, 'participations'), limit(1500))),
      getDocs(query(collection(db, 'speedquiz'), limit(300))),
      getDocs(query(collection(db, 'transcripts'), orderBy('ts', 'desc'), limit(500))),
      getDocs(query(collection(db, 'kpt'), limit(300))),
      getDocs(query(collection(db, 'plans'), limit(300))),
    ]);
    pp.forEach((d) => out.participants.push({ id: d.id, ...d.data() }));
    sg.forEach((d) => out.signals.push(d.data()));
    wl.forEach((d) => out.wizardlogs.push(d.data()));
    pt.forEach((d) => out.participations.push(d.data()));
    sq.forEach((d) => out.speedquiz.push({ id: d.id, ...d.data() }));
    tr.forEach((d) => out.transcripts.push(d.data()));
    kp.forEach((d) => out.kpt.push({ id: d.id, ...d.data() }));
    pl.forEach((d) => out.plans.push({ id: d.id, ...d.data() }));
    return out;
  } catch (e) { console.warn('fetchAllData', e); return out; }
}

/* ---------- 강의자 판별 ---------- */
export function isInstructor(s) {
  s = s || getSession();
  return !!(s && s.subject === '강의자');
}

/* ---------- 참가자 관리 (강의자 화면 전용) ---------- */
export function watchParticipants(cb) {
  if (!db) return () => {};
  const q = query(collection(db, 'participants'), orderBy('lastSeen', 'desc'), limit(200));
  return onSnapshot(q, (qs) => {
    const rows = [];
    qs.forEach((d) => rows.push({ id: d.id, ...d.data() }));
    cb(rows);
  }, () => {});
}
export async function setParticipantStatus(id, status) {
  if (!db) return false;
  try {
    await updateDoc(doc(db, 'participants', id), { status });
    return true;
  } catch (e) { console.warn('setParticipantStatus', e); return false; }
}

/* ---------- 신호 독 (모든 세션 페이지 공통) ---------- */
export function initSignalDock() {
  const s = getSession();
  if (!s || isInstructor(s)) return;
  const dock = document.createElement('div');
  dock.className = 'signal-dock';
  dock.innerHTML =
    '<div class="sd-title"><span>📡 지금 나의 상태</span><button type="button" title="접기" id="sd-min">—</button></div>' +
    '<div class="sd-btns">' +
      '<button type="button" class="sd-ok" data-k="ok">🟢 따라가고<br>있어요</button>' +
      '<button type="button" class="sd-confused" data-k="confused">🟡 조금<br>헷갈려요</button>' +
      '<button type="button" class="sd-stuck" data-k="stuck">🔴 막혔어요<br>도와주세요!</button>' +
      '<button type="button" class="sd-fun" data-k="laugh">😂 빵 터짐</button>' +
    '</div>' +
    '<div class="sd-note">누르는 순간 강의자 화면에 표시됩니다. 부담 없이, 자주 눌러 주세요 — 이 신호가 오늘 수업의 데이터가 됩니다.</div>';
  document.body.appendChild(dock);
  document.body.style.paddingBottom = '140px'; // 독이 하단 버튼을 가리지 않도록
  if (window.innerWidth < 700) dock.classList.add('min'); // 모바일은 접힌 상태로 시작
  dock.querySelector('#sd-min').addEventListener('click', () => dock.classList.toggle('min'));
  dock.querySelector('.sd-title').addEventListener('click', (e) => {
    if (dock.classList.contains('min') && !e.target.closest('#sd-min')) dock.classList.remove('min');
  });
  dock.querySelector('.sd-btns').addEventListener('click', async (e) => {
    const b = e.target.closest('button[data-k]');
    if (!b) return;
    b.disabled = true;
    const old = b.innerHTML;
    await sendSignal(b.dataset.k);
    b.innerHTML = '전송됨 ✓';
    setTimeout(() => { b.innerHTML = old; b.disabled = false; }, 1400);
  });
}

/* ---------- 페이지 공통 부팅 ---------- */
export function boot() {
  const body = document.body;
  const page = body.dataset.page || '';
  const needSession = body.hasAttribute('data-require-session');
  const s = getSession();

  if (needSession && !s) { location.replace('index.html'); return; }

  const userEl = document.getElementById('nav-user');
  if (userEl && s) {
    userEl.innerHTML = '<span class="dot"></span> ' + esc(s.face) + ' ' + esc(s.nickname) +
      ' · ' + esc(s.subject) + ' &nbsp;<a href="#" id="logout-link" style="font-size:13px">나가기</a>';
    const lk = document.getElementById('logout-link');
    if (lk) lk.addEventListener('click', (e) => { e.preventDefault(); logout(); });
  }

  if (s && isInstructor(s)) {
    const links = document.querySelector('.nav-links');
    if (links && !document.getElementById('console-link')) {
      const a = document.createElement('a');
      a.id = 'console-link';
      a.href = 'presenter.html';
      a.textContent = '🎤 강의자 콘솔';
      links.appendChild(a);
    }
  }

  if (s && page) presence(page);
  if (s && body.hasAttribute('data-signal-dock')) initSignalDock();

  const mini = document.getElementById('mini-online');
  if (mini && db) {
    const q = query(collection(db, 'participants'), orderBy('lastSeen', 'desc'), limit(80));
    onSnapshot(q, (qs) => {
      let online = 0;
      qs.forEach((d) => { if (agoText(d.data().lastSeen) === 'ON') online++; });
      mini.textContent = online;
    }, () => {});
  }
}
