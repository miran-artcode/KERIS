import React, { useState, useEffect, useRef, useCallback } from "react";

/* ─────────────────────────────────────────────
   2026 AI활용 선도교사연수 · 집합⑪·⑫ 진행 웹앱
   복습(⑨ 이론) → 설계안 자가점검(4P) → 스피드 퀴즈 → ⑪ → ⑫
   교사 활동은 공유 저장소에 로그로 남고, 강의자 대시보드가
   이 로그를 ⑪차시 학습분석의 라이브 예시로 사용한다.
   ───────────────────────────────────────────── */

const C = {
  navy: "#2A2550", mag: "#B5397D", magSoft: "#F9EEF4",
  lav: "#F3EFFA", lavLine: "#DCD3EF", ink: "#3A3A46", gray: "#8B8898",
  good: "#2E8B57", goodBg: "#EAF6EF", warn: "#B5821F", warnBg: "#FBF4E4",
  bad: "#B04A5A", badBg: "#FBEEF0", blue: "#3B5BA5", blueBg: "#EEF2FB",
};
const SUBJ = { music: { label: "음악", icon: "♪" }, art: { label: "미술", icon: "🎨" }, pe: { label: "체육", icon: "⚽" } };
const ADMIN_CODE = "1112";

/* ── 저장소 유틸 ── */
async function sGet(key) { try { const r = await window.storage.get(key, true); return r ? JSON.parse(r.value) : null; } catch { return null; } }
async function sSet(key, val) { try { await window.storage.set(key, JSON.stringify(val), true); return true; } catch { return false; } }

const now = () => Date.now();
const fmtT = (ms) => { const s = Math.round(ms / 1000); return s < 60 ? s + "초" : Math.floor(s / 60) + "분 " + (s % 60) + "초"; };
const clock = (t) => new Date(t).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

/* ── 공용 UI ── */
const Card = ({ children, style, onClick }) => (
  <div onClick={onClick} style={{ background: "#fff", border: `1px solid ${C.lavLine}`, borderRadius: 14, padding: "16px 18px", ...style }}>{children}</div>
);
const Tag = ({ children, color = C.mag, bg = C.magSoft }) => (
  <span style={{ display: "inline-block", background: bg, color, borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 700, marginRight: 6 }}>{children}</span>
);
const Btn = ({ children, onClick, kind = "primary", disabled, style }) => {
  const base = { border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 14, fontWeight: 700, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.45 : 1, fontFamily: "inherit" };
  const kinds = {
    primary: { background: C.mag, color: "#fff" },
    ghost: { background: C.lav, color: C.navy },
    line: { background: "#fff", color: C.mag, border: `1.5px solid ${C.mag}` },
  };
  return <button disabled={disabled} onClick={onClick} style={{ ...base, ...kinds[kind], ...style }}>{children}</button>;
};
const Input = (props) => (
  <input {...props} style={{ width: "100%", boxSizing: "border-box", border: `1.5px solid ${C.lavLine}`, borderRadius: 10, padding: "10px 12px", fontSize: 14, fontFamily: "inherit", outline: "none", ...props.style }} />
);
const TA = (props) => (
  <textarea {...props} style={{ width: "100%", boxSizing: "border-box", border: `1.5px solid ${C.lavLine}`, borderRadius: 10, padding: "10px 12px", fontSize: 14, fontFamily: "inherit", outline: "none", resize: "vertical", minHeight: 70, lineHeight: 1.55, ...props.style }} />
);
const Check = ({ label, checked, onChange }) => (
  <label style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "7px 0", cursor: "pointer", fontSize: 13.5, color: C.ink, lineHeight: 1.5 }}>
    <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} style={{ marginTop: 3, accentColor: C.mag }} />
    <span>{label}</span>
  </label>
);
const Note = ({ children, tone = "note" }) => {
  const m = { note: [C.warnBg, C.warn], good: [C.goodBg, C.good], bad: [C.badBg, C.bad], blue: [C.blueBg, C.blue] }[tone];
  return <div style={{ background: m[0], borderRadius: 10, padding: "10px 14px", fontSize: 13, color: C.ink, lineHeight: 1.6, margin: "8px 0" }}>
    <span style={{ color: m[1], fontWeight: 800 }}>{{ note: "확인 ", good: "통과 ", bad: "점검 필요 ", blue: "안내 " }[tone]}</span>{children}
  </div>;
};

/* ═══════════ ⑨ 복습 이론 카드 ═══════════ */
const THEORY = [
  {
    id: "backward", title: "백워드 설계 3단계", tag: "설계의 뼈대",
    body: "Stage 1 도착점(핵심 아이디어·성취기준) → Stage 2 평가 증거(수행 과제+기타 증거) → Stage 3 학습 경험(차시 배열)의 순서로 설계한다. 활동을 먼저 정하면 도착점이 흐려진다 — 설계안 양식의 항목 순서가 이 순서를 따른다.",
    check: "내 설계안은 활동이 아니라 핵심 아이디어부터 채워져 있다.",
  },
  {
    id: "coreidea", title: "핵심 아이디어 — 사실·개념·일반화 3층", tag: "4P 첫 칸",
    body: "1층 사실(개별 정보) → 2층 개념(추상 명사: 균형·리듬·전술) → 3층 일반화(주어+개념+동사의 한 문장). 핵심 아이디어 칸에는 3층 문장을 쓴다. 단원이 끝나고 한 달 뒤에도 학생 머리에 남을 문장인지가 기준이다.",
    check: "내 핵심 아이디어는 사실 나열이 아니라 개념 간 관계를 담은 한 문장이다.",
  },
  {
    id: "inquiry", title: "탐구질문 4종", tag: "질문 설계",
    body: "사실적(답이 정해짐: 무엇·언제) / 개념적(개념 관계를 묻음: 어떻게 연결되는가) / 논쟁적(입장이 갈림: AI가 만든 것도 창작인가) / 반성적(자기 과정을 되돌아봄). 단원에는 개념적 질문이 중심에 있고, 사실적 질문은 그리로 가는 디딤돌이다.",
    check: "내 탐구질문에는 개념적 질문이 최소 1개 있다.",
  },
  {
    id: "grasps", title: "GRASPS — 수행 과제의 6요소", tag: "평가 과제",
    body: "Goal(목표) · Role(역할) · Audience(실제 청중) · Situation(제약이 있는 상황) · Product(산출물) · Standards(기준). 청중이 '교사'뿐이면 실제성이 무너진다 — 전교생·학부모·마을 주민처럼 진짜 청중을 정한다.",
    check: "내 수행 과제의 청중(A)은 교사가 아닌 실제 청중이다.",
  },
  {
    id: "rubric", title: "루브릭 = 대화 도구", tag: "과정중심평가",
    body: "숫자 채점표가 아니라 행동 서술로 쓴다. 수준 4부터 작성, '우수함' 같은 형용사 금지, 한 칸에는 한 변수만, 학생이 읽고 이해할 언어로. 심화·기본·기초 피드백 칸도 같은 원칙으로 쓴다.",
    check: "내 평가 칸의 서술은 형용사가 아니라 관찰 가능한 행동으로 되어 있다.",
  },
  {
    id: "four", title: "AI 수업설계 4원칙 · 도구 3기준", tag: "AI·도구",
    body: "맥락성·지식구성·상호작용·맞춤교육의 네 다리가 균형인지 보고, 도구는 효과성·편의성·안전성 3기준을 모두 통과할 때만 넣는다. 표현 단계의 학생 핵심 행위는 AI가 대체하지 않는다.",
    check: "내 설계안의 AI 도구는 창작 4단계 중 어느 단계에 붙는지 정해져 있다.",
  },
];

/* ═══════════ 스피드 퀴즈 ═══════════ */
const QUIZ = [
  { q: "백워드 설계에서 가장 먼저 정하는 것은?", opts: ["재미있는 활동", "도착점(핵심 아이디어)", "사용할 AI 도구", "차시 수"], a: 1, cat: "⑨ 복습" },
  { q: "핵심 아이디어 3층 중 '일반화' 문장의 형태는?", opts: ["사실 나열", "개념 단어 하나", "주어+개념+동사 한 문장", "질문형"], a: 2, cat: "⑨ 복습" },
  { q: "GRASPS의 A(Audience)로 가장 좋은 것은?", opts: ["담당 교사", "채점 프로그램", "전교생과 학부모", "본인"], a: 2, cat: "⑨ 복습" },
  { q: "루브릭 수준 서술에서 피해야 하는 것은?", opts: ["행동 동사", "학생 언어", "'우수함' 같은 형용사", "한 칸 한 변수"], a: 2, cat: "⑨ 복습" },
  { q: "창작 4단계 중 AI가 학생 핵심 행위를 대체하면 안 되는 단계는?", opts: ["발상", "구체화", "표현", "공유"], a: 2, cat: "⑨ 복습" },
  { q: "도구 선택 3대 기준이 아닌 것은?", opts: ["효과성", "편의성", "유행성", "안전성"], a: 2, cat: "⑨ 복습" },
  { q: "2023년 소니 국제사진전에서 AI 생성 이미지로 수상 후 거부한 작가는?", opts: ["보리스 엘다크센", "데이비드 호크니", "뱅크시", "무라카미 다카시"], a: 0, cat: "미술 스몰토크" },
  { q: "AI 밴드 '벨벳 선다운' 논란과 대비되어, 스템 분리 AI로 완성돼 그래미를 받은 곡은?", opts: ["퀸 신곡", "비틀즈 Now and Then", "아바 신곡", "너바나 미공개곡"], a: 1, cat: "음악 스몰토크" },
  { q: "카타르 월드컵부터 오프사이드 판정을 도운 기술 SAOT의 뜻은?", opts: ["자동 슛 판정", "반자동 오프사이드 판독", "심판 보조 통신", "골라인 판독"], a: 1, cat: "체육 스몰토크" },
  { q: "국제체조연맹이 도입한 AI 채점 지원 시스템의 이름은?", opts: ["JSS", "GYM-AI", "ScoreNet", "FIG-Eye"], a: 0, cat: "체육 스몰토크" },
  { q: "학습분석학 4수준의 순서로 옳은 것은?", opts: ["처방→예측→진단→기술", "기술→진단→예측→처방", "진단→기술→처방→예측", "예측→기술→진단→처방"], a: 1, cat: "⑪ 예열" },
  { q: "데이터 분석의 목적으로 가장 알맞은 것은?", opts: ["예쁜 그래프 제작", "다음 수업의 행동 변화", "학생 서열화", "보고서 분량 확보"], a: 1, cat: "⑪ 예열" },
];
const QUIZ_SEC = 15;

/* ═══════════ 설계안 점검 위저드 정의 ═══════════ */
const EX = {
  coreidea: {
    music: "음악의 요소는 의도적으로 조직될 때 감정과 분위기를 만든다.",
    art: "조형 요소의 관계는 작품의 의미와 분위기를 결정한다.",
    pe: "규칙은 참여자의 조건에 맞게 조정될 때 모두의 참여를 가능하게 한다.",
  },
  inquiry: {
    music: ["이 곡의 박자는 무엇인가? (사실적)", "리듬과 긴장감은 어떻게 연결되는가? (개념적)", "AI가 만든 노래도 내 창작인가? (논쟁적)"],
    art: ["보색이란 무엇인가? (사실적)", "색의 대비는 시선의 흐름을 어떻게 만드는가? (개념적)", "AI 생성 이미지를 참고한 작품은 누구의 것인가? (논쟁적)"],
    pe: ["오프사이드 규칙은 무엇인가? (사실적)", "규칙의 변형은 경기 참여를 어떻게 바꾸는가? (개념적)", "AI 판정은 심판을 대체해야 하는가? (논쟁적)"],
  },
};
const ADJ_RE = /(우수|훌륭|뛰어남|잘함|미흡|성실|열심히|매우 잘|잘 함|잘함)/;

const STEPS = [
  { id: "info", title: "기본 정보", sub: "단원 개요" },
  { id: "coreidea", title: "핵심 아이디어", sub: "3층 일반화 문장" },
  { id: "inquiry", title: "탐구질문", sub: "4종 · 구체성" },
  { id: "standard", title: "성취기준·재구성 의도", sub: "Stage 1 마무리" },
  { id: "assess", title: "과정중심평가", sub: "심화·기본·기초 피드백" },
  { id: "tools", title: "AI·디지털 도구", sub: "4단계 매칭 · 3기준" },
  { id: "final", title: "최종 체크리스트", sub: "제출 전 점검" },
];

/* ═══════════ 메인 앱 ═══════════ */
export default function App() {
  const [role, setRole] = useState(null); // null | teacher | admin
  const [me, setMe] = useState(null);     // {id,name,subject}
  return (
    <div style={{ fontFamily: "'Pretendard','Apple SD Gothic Neo','Malgun Gothic',sans-serif", background: "#FBFAFD", minHeight: "100vh", color: C.ink }}>
      {!role && <Gate onTeacher={(t) => { setMe(t); setRole("teacher"); }} onAdmin={() => setRole("admin")} />}
      {role === "teacher" && <TeacherApp me={me} onExit={() => { setRole(null); setMe(null); }} />}
      {role === "admin" && <AdminApp onExit={() => setRole(null)} />}
    </div>
  );
}

/* ── 입장 화면 ── */
function Gate({ onTeacher, onAdmin }) {
  const [name, setName] = useState("");
  const [subj, setSubj] = useState(null);
  const [code, setCode] = useState("");
  const [mode, setMode] = useState("teacher");
  const [busy, setBusy] = useState(false);
  const enter = async () => {
    if (!name.trim() || !subj) return;
    setBusy(true);
    const id = name.trim().replace(/\s+/g, "") + "_" + subj;
    const existing = await sGet("t:" + id);
    const rec = existing || { id, name: name.trim(), subject: subj, createdAt: now(), logs: [], wizard: {}, review: {}, quiz: null, checkins: [] };
    rec.logs.push({ t: now(), type: "enter", detail: "앱 입장" });
    await sSet("t:" + id, rec);
    const roster = (await sGet("roster")) || [];
    if (!roster.find((r) => r.id === id)) { roster.push({ id, name: rec.name, subject: subj }); await sSet("roster", roster); }
    setBusy(false);
    onTeacher({ id, name: rec.name, subject: subj });
  };
  return (
    <div style={{ maxWidth: 460, margin: "0 auto", padding: "48px 20px" }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: C.mag, letterSpacing: 2 }}>2026 AI활용 선도교사 연수</div>
        <h1 style={{ color: C.navy, fontSize: 26, margin: "8px 0 4px" }}>집합⑪·⑫ 진행 페이지</h1>
        <div style={{ fontSize: 13, color: C.gray }}>복습 · 설계안 점검 · 퀴즈 · 데이터 분석 · 평가와 환류</div>
      </div>
      <Card>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <Btn kind={mode === "teacher" ? "primary" : "ghost"} style={{ flex: 1 }} onClick={() => setMode("teacher")}>선생님 입장</Btn>
          <Btn kind={mode === "admin" ? "primary" : "ghost"} style={{ flex: 1 }} onClick={() => setMode("admin")}>강의자 입장</Btn>
        </div>
        {mode === "teacher" ? (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 6 }}>이름</div>
            <Input placeholder="예: 김서준" value={name} onChange={(e) => setName(e.target.value)} />
            <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, margin: "14px 0 6px" }}>교과</div>
            <div style={{ display: "flex", gap: 8 }}>
              {Object.entries(SUBJ).map(([k, v]) => (
                <Btn key={k} kind={subj === k ? "primary" : "ghost"} style={{ flex: 1 }} onClick={() => setSubj(k)}>{v.icon} {v.label}</Btn>
              ))}
            </div>
            <Btn style={{ width: "100%", marginTop: 18 }} disabled={!name.trim() || !subj || busy} onClick={enter}>{busy ? "입장 중…" : "시작하기"}</Btn>
            <div style={{ fontSize: 11.5, color: C.gray, marginTop: 10, lineHeight: 1.5 }}>이 앱의 활동 기록(진행 단계·응답·퀴즈 점수)은 연수 진행을 위해 강의자 대시보드에 공유되고, ⑪차시 학습분석 실습의 예시 데이터로 함께 사용됩니다.</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 6 }}>강의자 코드</div>
            <Input placeholder="코드 입력" type="password" value={code} onChange={(e) => setCode(e.target.value)} />
            <Btn style={{ width: "100%", marginTop: 14 }} disabled={code !== ADMIN_CODE} onClick={onAdmin}>대시보드 열기</Btn>
            {code && code !== ADMIN_CODE && <div style={{ fontSize: 12, color: C.bad, marginTop: 8 }}>코드가 맞지 않습니다.</div>}
          </>
        )}
      </Card>
    </div>
  );
}

/* ═══════════ 교사 앱 ═══════════ */
const TABS = [
  { id: "home", label: "홈" },
  { id: "review", label: "⑨ 복습" },
  { id: "wizard", label: "설계안 점검" },
  { id: "quiz", label: "스피드 퀴즈" },
  { id: "s11", label: "⑪ 데이터 분석" },
  { id: "s12", label: "⑫ 평가·환류" },
];

function TeacherApp({ me, onExit }) {
  const [tab, setTab] = useState("home");
  const [rec, setRec] = useState(null);
  const enteredAt = useRef(now());
  const saveTimer = useRef(null);

  /* 레코드 로드 */
  useEffect(() => { (async () => setRec(await sGet("t:" + me.id)))(); }, [me.id]);

  /* 저장(디바운스) */
  const persist = useCallback((r) => {
    setRec({ ...r });
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => sSet("t:" + me.id, r), 800);
  }, [me.id]);

  const log = useCallback((type, detail) => {
    if (!rec) return;
    rec.logs.push({ t: now(), type, detail });
    if (rec.logs.length > 400) rec.logs = rec.logs.slice(-400);
    persist(rec);
  }, [rec, persist]);

  /* 탭 이동 = 체류 로그 */
  const go = (next) => {
    if (!rec) return;
    const dwell = now() - enteredAt.current;
    rec.logs.push({ t: now(), type: "page", detail: `${TABS.find(x => x.id === tab)?.label} 체류 ${fmtT(dwell)} → ${TABS.find(x => x.id === next)?.label} 이동` });
    rec.lastPage = next; rec.lastSeen = now();
    enteredAt.current = now();
    persist(rec);
    setTab(next);
  };

  if (!rec) return <div style={{ padding: 60, textAlign: "center", color: C.gray }}>기록을 불러오는 중…</div>;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 16px 60px" }}>
      <header style={{ position: "sticky", top: 0, background: "#FBFAFDee", backdropFilter: "blur(6px)", zIndex: 5, padding: "14px 0 10px", borderBottom: `1px solid ${C.lavLine}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 800, color: C.mag, letterSpacing: 1.5 }}>집합⑪·⑫</span>
            <span style={{ fontSize: 13, color: C.gray, marginLeft: 8 }}>{SUBJ[me.subject].icon} {me.name} 선생님</span>
          </div>
          <button onClick={onExit} style={{ background: "none", border: "none", color: C.gray, fontSize: 12, cursor: "pointer" }}>나가기</button>
        </div>
        <nav style={{ display: "flex", gap: 6, marginTop: 10, overflowX: "auto" }}>
          {TABS.map((t) => (
            <button key={t.id} onClick={() => go(t.id)} style={{ whiteSpace: "nowrap", border: "none", borderRadius: 999, padding: "7px 13px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", background: tab === t.id ? C.navy : C.lav, color: tab === t.id ? "#fff" : C.navy }}>{t.label}</button>
          ))}
        </nav>
      </header>

      <main style={{ paddingTop: 18 }}>
        {tab === "home" && <Home me={me} rec={rec} go={go} />}
        {tab === "review" && <Review me={me} rec={rec} persist={persist} log={log} />}
        {tab === "wizard" && <Wizard me={me} rec={rec} persist={persist} log={log} />}
        {tab === "quiz" && <Quiz me={me} rec={rec} persist={persist} log={log} />}
        {tab === "s11" && <Session n={11} rec={rec} persist={persist} log={log} />}
        {tab === "s12" && <Session n={12} rec={rec} persist={persist} log={log} />}
      </main>
    </div>
  );
}

/* ── 홈 ── */
function Home({ me, rec, go }) {
  const reviewDone = THEORY.filter((t) => rec.review[t.id]).length;
  const wizDone = STEPS.filter((s) => rec.wizard[s.id]?.done).length;
  const items = [
    { id: "review", t: "① ⑨차시 복습", d: `여섯 개 이론 카드로 어제 배운 설계 언어를 되살립니다. (${reviewDone}/6 확인)` },
    { id: "wizard", t: "② 내 설계안 자가점검", d: `제출용 4P 설계안을 핵심 아이디어부터 순서대로 점검합니다. (${wizDone}/${STEPS.length} 단계)` },
    { id: "quiz", t: "③ 스피드 퀴즈", d: rec.quiz ? `기록 ${rec.quiz.score}점 — 다시 도전할 수 있습니다.` : "빠르고 정확할수록 높은 점수. 12문항." },
    { id: "s11", t: "④ 집합⑪ 데이터 분석", d: "지금 이 앱에 쌓이는 여러분의 활동 로그가 분석 실습의 예시가 됩니다." },
    { id: "s12", t: "⑤ 집합⑫ 평가·환류", d: "⑪의 분석 결과를 평가 설계와 다음 수업 개선으로 연결합니다." },
  ];
  return (
    <div>
      <div style={{ background: `linear-gradient(135deg, ${C.lav}, ${C.magSoft})`, borderRadius: 16, padding: "20px 22px", marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: C.mag }}>오늘의 흐름</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.navy, margin: "6px 0" }}>복습 → 설계안 점검 → ⑪ 데이터 분석 → ⑫ 평가·환류</div>
        <div style={{ fontSize: 13, lineHeight: 1.6 }}>{SUBJ[me.subject].label} 교과의 예시가 각 단계에 함께 표시됩니다. 순서대로 진행해 주시고, 막히는 지점에서는 <b>도움 요청</b> 버튼을 눌러 주세요 — 강의자가 바로 확인합니다.</div>
      </div>
      {items.map((it) => (
        <Card key={it.id} onClick={() => go(it.id)} style={{ marginBottom: 10, cursor: "pointer" }}>
          <div style={{ fontWeight: 800, color: C.navy, fontSize: 15 }}>{it.t}</div>
          <div style={{ fontSize: 13, color: C.gray, marginTop: 4, lineHeight: 1.5 }}>{it.d}</div>
        </Card>
      ))}
    </div>
  );
}

/* ── ⑨ 복습 ── */
function Review({ me, rec, persist, log }) {
  return (
    <div>
      <h2 style={{ color: C.navy, fontSize: 19, margin: "4px 0 4px" }}>⑨차시 복습 — 여섯 개의 설계 언어</h2>
      <div style={{ fontSize: 13, color: C.gray, marginBottom: 14 }}>카드를 읽고, 아래 확인 문장에 스스로 체크합니다. 이 여섯 개가 다음 탭의 점검 기준이 됩니다.</div>
      {THEORY.map((t, i) => (
        <Card key={t.id} style={{ marginBottom: 12 }}>
          <Tag>{t.tag}</Tag>
          <div style={{ fontWeight: 800, color: C.navy, fontSize: 15.5, margin: "6px 0" }}>{i + 1}. {t.title}</div>
          <div style={{ fontSize: 13.5, lineHeight: 1.7 }}>{t.body}</div>
          <div style={{ marginTop: 10, borderTop: `1px dashed ${C.lavLine}`, paddingTop: 6 }}>
            <Check label={t.check} checked={rec.review[t.id]} onChange={(v) => { rec.review[t.id] = v; log("review", `${t.title} ${v ? "확인" : "확인 해제"}`); persist(rec); }} />
          </div>
        </Card>
      ))}
      <Note tone="blue">여섯 개 모두 체크되면 「설계안 점검」 탭으로 이동합니다. 확인이 어려운 카드는 그대로 두셔도 됩니다 — 그 카드가 점검에서 집중할 지점이 됩니다.</Note>
    </div>
  );
}

/* ── 설계안 점검 위저드 ── */
function Wizard({ me, rec, persist, log }) {
  const [step, setStep] = useState(rec.wizard.pos || 0);
  const stepEnter = useRef(now());
  const w = rec.wizard;
  const cur = STEPS[step];
  const S = w[cur.id] || (w[cur.id] = {});

  const save = () => persist(rec);
  const move = (n) => {
    const dwell = now() - stepEnter.current;
    log("wizard", `${cur.title} 단계 체류 ${fmtT(dwell)}${n > step ? " → 다음" : " → 이전"}`);
    if (n > step) { S.done = true; }
    w.pos = n; stepEnter.current = now(); save(); setStep(n);
  };
  const help = () => { log("help", `${cur.title} 단계에서 도움 요청 🚩`); save(); };

  /* 자동 점검 */
  const ci = w.coreidea?.text || "";
  const ciChecks = [
    { ok: ci.length >= 15, msg: "한 문장으로 관계를 담기에는 짧습니다. 15자 이상으로 서술해 보세요." },
    { ok: /(다|한다|된다|만든다|가능하게 한다)\.?$/.test(ci.trim()), msg: "동사로 끝나는 서술문이어야 합니다. ('~은 ~할 때 ~한다')" },
    { ok: !/(예:|등이 있다|종류|첫째|1\.|①)/.test(ci), msg: "사실 나열의 흔적이 보입니다. 개별 사실이 아니라 개념 사이의 관계를 쓰세요." },
  ];
  const aiFields = ["adv", "mid", "base"];
  const adjWarn = aiFields.some((f) => ADJ_RE.test(w.assess?.[f] || ""));

  return (
    <div>
      <h2 style={{ color: C.navy, fontSize: 19, margin: "4px 0" }}>내 설계안 자가점검</h2>
      <div style={{ fontSize: 13, color: C.gray, marginBottom: 10 }}>제출용 4P 설계안을 옆에 두고, 항목 순서대로 옮겨 적으며 점검합니다. 백워드 순서(도착점 → 평가 → 도구)와 같습니다.</div>
      {/* 진행바 */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {STEPS.map((s, i) => (
          <div key={s.id} onClick={() => move(i)} title={s.title} style={{ flex: 1, height: 8, borderRadius: 4, cursor: "pointer", background: i === step ? C.mag : w[s.id]?.done ? C.navy : C.lavLine }} />
        ))}
      </div>
      <Card>
        <Tag>{`STEP ${step + 1}/${STEPS.length}`}</Tag><Tag color={C.navy} bg={C.lav}>{cur.sub}</Tag>
        <div style={{ fontWeight: 800, color: C.navy, fontSize: 17, margin: "8px 0 12px" }}>{cur.title}</div>

        {cur.id === "info" && (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 6 }}>학년·학기 / 단원명</div>
            <Input placeholder="예: 중2 1학기 / 리듬으로 말하기" value={S.unit || ""} onChange={(e) => { S.unit = e.target.value; save(); }} />
            <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, margin: "12px 0 6px" }}>차시 수 / 대상</div>
            <Input placeholder="예: 6차시 / 2학년 3반 28명" value={S.scope || ""} onChange={(e) => { S.scope = e.target.value; save(); }} />
            <Note tone="blue">설계안 표지의 기본 정보 칸과 같은 내용입니다. 여기 적으신 단원으로 이후 모든 점검이 진행됩니다.</Note>
          </>
        )}

        {cur.id === "coreidea" && (
          <>
            <div style={{ fontSize: 13.5, lineHeight: 1.7, marginBottom: 8 }}>설계안의 첫 칸입니다. <b>주어(개념) + 관계 + 동사</b>의 한 문장으로, 단원이 끝난 뒤에도 학생에게 남을 일반화를 씁니다.</div>
            <Note tone="blue">{SUBJ[me.subject].label} 예시 — “{EX.coreidea[me.subject]}”</Note>
            <TA placeholder="내 단원의 핵심 아이디어 한 문장" value={w.coreidea?.text || ""} onChange={(e) => { w.coreidea = { ...(w.coreidea || {}), text: e.target.value }; save(); }} />
            {ci && ciChecks.map((c, i) => !c.ok && <Note key={i} tone="bad">{c.msg}</Note>)}
            {ci && ciChecks.every((c) => c.ok) && <Note tone="good">문장 형식이 일반화의 꼴을 갖췄습니다. 마지막으로 스스로 물어보세요 — 한 달 뒤에도 학생에게 남을 문장인가요?</Note>}
          </>
        )}

        {cur.id === "inquiry" && (
          <>
            <div style={{ fontSize: 13.5, lineHeight: 1.7 }}>탐구질문은 핵심 아이디어로 가는 길입니다. 네 종류 중 <b>개념적 질문이 중심</b>에 있어야 하고, 사실적 질문은 디딤돌입니다.</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, margin: "10px 0" }}>
              {[["사실적", "답이 정해짐 · 무엇/언제"], ["개념적", "개념 관계 · 어떻게 연결되는가"], ["논쟁적", "입장이 갈림 · ~해야 하는가"], ["반성적", "내 과정 돌아보기"]].map(([t, d]) => (
                <div key={t} style={{ background: C.lav, borderRadius: 10, padding: "8px 10px" }}>
                  <b style={{ color: C.navy, fontSize: 12.5 }}>{t}</b><div style={{ fontSize: 11.5, color: C.gray }}>{d}</div>
                </div>
              ))}
            </div>
            <Note tone="blue">{SUBJ[me.subject].label} 예시 — {EX.inquiry[me.subject].map((x, i) => <span key={i}>“{x}” </span>)}</Note>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <Input placeholder={`탐구질문 ${i + 1}`} value={w.inquiry?.["q" + i] || ""} onChange={(e) => { w.inquiry = { ...(w.inquiry || {}) }; w.inquiry["q" + i] = e.target.value; save(); }} />
                <select value={w.inquiry?.["t" + i] || ""} onChange={(e) => { w.inquiry = { ...(w.inquiry || {}) }; w.inquiry["t" + i] = e.target.value; save(); }} style={{ border: `1.5px solid ${C.lavLine}`, borderRadius: 10, fontFamily: "inherit", fontSize: 13, padding: "0 6px" }}>
                  <option value="">유형</option><option>사실적</option><option>개념적</option><option>논쟁적</option><option>반성적</option>
                </select>
              </div>
            ))}
            {(() => {
              const types = [0, 1, 2].map((i) => w.inquiry?.["t" + i]).filter(Boolean);
              if (!types.length) return null;
              return types.includes("개념적")
                ? <Note tone="good">개념적 질문이 포함됐습니다. 각 질문이 “예/아니오”로 끝나지 않고 학생의 설명을 끌어내는지 소리 내어 읽어 확인해 보세요.</Note>
                : <Note tone="bad">개념적 질문이 아직 없습니다. 핵심 아이디어의 두 개념을 넣어 “~은 ~을 어떻게 바꾸는가?” 꼴로 만들어 보세요.</Note>;
            })()}
          </>
        )}

        {cur.id === "standard" && (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 6 }}>관련 성취기준 (코드 포함)</div>
            <TA placeholder="예: [9음01-02] …" value={S.std || ""} onChange={(e) => { S.std = e.target.value; save(); }} />
            <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, margin: "12px 0 6px" }}>단원 재구성 의도</div>
            <TA placeholder="교과서 순서 대신 이 단원을 이렇게 재구성한 이유" value={S.intent || ""} onChange={(e) => { S.intent = e.target.value; save(); }} />
            <Note tone="blue">재구성 의도에는 “학생의 삶·지역과 어떻게 연결했는가(맥락성)”가 한 줄 들어가면 4원칙 진단에서 튼튼해집니다.</Note>
          </>
        )}

        {cur.id === "assess" && (
          <>
            <div style={{ fontSize: 13.5, lineHeight: 1.7, marginBottom: 8 }}>평가 요소 하나를 정하고, <b>심화·기본·기초</b> 수준별 피드백을 행동 서술로 씁니다. 루브릭 원칙: 수준 높은 쪽부터, 형용사 대신 행동, 학생이 읽을 언어.</div>
            <Input placeholder="평가 요소 (예: 리듬 구성의 의도 설명)" value={w.assess?.elem || ""} onChange={(e) => { w.assess = { ...(w.assess || {}) , elem: e.target.value }; save(); }} />
            {[["adv", "심화 피드백", "예: 두 개 이상의 요소 관계를 근거로 의도를 설명하고 대안을 제시한 학생에게 —"], ["mid", "기본 피드백", "예: 한 요소의 효과를 설명한 학생에게 —"], ["base", "기초 피드백", "예: 요소를 지목했지만 효과 설명이 없는 학생에게 —"]].map(([f, t, ph]) => (
              <div key={f} style={{ marginTop: 10 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: C.navy, marginBottom: 4 }}>{t}</div>
                <TA placeholder={ph} value={w.assess?.[f] || ""} onChange={(e) => { w.assess = { ...(w.assess || {}) }; w.assess[f] = e.target.value; save(); }} style={{ minHeight: 54 }} />
              </div>
            ))}
            {adjWarn && <Note tone="bad">‘우수·미흡·성실’ 같은 평가 형용사가 감지됐습니다. 학생이 무엇을 하면 그 수준인지, 관찰 가능한 행동으로 바꿔 보세요.</Note>}
            {!adjWarn && (w.assess?.adv || "") && <Note tone="good">행동 서술의 형태입니다. 세 수준이 같은 변수(예: ‘설명의 근거 수’) 하나로 갈리는지 확인해 보세요.</Note>}
          </>
        )}

        {cur.id === "tools" && (
          <>
            <div style={{ fontSize: 13.5, lineHeight: 1.7, marginBottom: 8 }}>도구는 창작 4단계 중 <b>어느 단계에 붙는지</b> 먼저 정합니다. 표현 단계의 학생 핵심 행위는 대체하지 않습니다.</div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: C.navy, marginBottom: 4 }}>사용할 도구와 배치 단계</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <Input placeholder="도구 유형 (예: 자료 기반 대화형 AI)" value={w.tools?.name || ""} onChange={(e) => { w.tools = { ...(w.tools || {}) , name: e.target.value }; save(); }} />
              <select value={w.tools?.stage || ""} onChange={(e) => { w.tools = { ...(w.tools || {}) , stage: e.target.value }; save(); }} style={{ border: `1.5px solid ${C.lavLine}`, borderRadius: 10, fontFamily: "inherit", fontSize: 13, padding: "0 6px" }}>
                <option value="">단계</option><option>발상</option><option>구체화</option><option>표현(참고용)</option><option>공유</option>
              </select>
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: C.navy, margin: "8px 0 2px" }}>3기준 · 5질문 점검</div>
            {[["c1", "단원의 도착점에 실제로 기여한다 (효과성)"], ["c2", "학생의 핵심 행위를 대체하지 않는다"], ["c3", "연령·개인정보·저작권이 확보된다 (안전성)"], ["c4", "50분 안에 로그인·사용·저장이 된다 (편의성)"], ["c5", "사전 리허설을 마쳤다 / 플랜 B가 있다"]].map(([f, t]) => (
              <Check key={f} label={t} checked={w.tools?.[f]} onChange={(v) => { w.tools = { ...(w.tools || {}) }; w.tools[f] = v; save(); }} />
            ))}
            {w.tools && ["c1","c2","c3","c4","c5"].every((f) => w.tools[f]) && <Note tone="good">다섯 개 모두 통과 — 단원에 도입할 수 있는 상태입니다.</Note>}
          </>
        )}

        {cur.id === "final" && (
          <>
            <div style={{ fontSize: 13.5, lineHeight: 1.7, marginBottom: 8 }}>제출 전 마지막 점검입니다. 체크되지 않는 항목이 남는다면, 해당 단계로 돌아가 보완합니다.</div>
            {[["f1", "핵심 아이디어가 주어+개념+동사의 한 문장이다"], ["f2", "개념적 탐구질문이 최소 1개 있다"], ["f3", "성취기준 코드와 재구성 의도가 적혀 있다"], ["f4", "수준별 피드백이 형용사 없이 행동으로 서술됐다"], ["f5", "도구의 배치 단계와 3기준 점검이 끝났다"], ["f6", "AI·디지털 도구 활용 유의사항(개인정보·저작권 안내)을 적었다"]].map(([f, t]) => (
              <Check key={f} label={t} checked={S[f]} onChange={(v) => { S[f] = v; save(); }} />
            ))}
            {["f1","f2","f3","f4","f5","f6"].every((f) => S[f]) && <Note tone="good">모든 항목 통과 — 이 내용을 4P 양식에 옮겨 적으면 제출 준비가 끝납니다. 수고하셨습니다.</Note>}
          </>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18, gap: 8 }}>
          <Btn kind="ghost" disabled={step === 0} onClick={() => move(step - 1)}>이전</Btn>
          <Btn kind="line" onClick={help}>🚩 도움 요청</Btn>
          <Btn disabled={step === STEPS.length - 1} onClick={() => move(step + 1)}>다음</Btn>
        </div>
      </Card>
    </div>
  );
}

/* ── 스피드 퀴즈 ── */
function Quiz({ me, rec, persist, log }) {
  const [state, setState] = useState("ready"); // ready | play | done
  const [i, setI] = useState(0);
  const [left, setLeft] = useState(QUIZ_SEC);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState(null);
  const timer = useRef(null);

  const start = () => { setState("play"); setI(0); setScore(0); setPicked(null); setLeft(QUIZ_SEC); log("quiz", "퀴즈 시작"); };
  useEffect(() => {
    if (state !== "play" || picked !== null) return;
    timer.current = setInterval(() => setLeft((l) => { if (l <= 1) { clearInterval(timer.current); setPicked(-1); return 0; } return l - 1; }), 1000);
    return () => clearInterval(timer.current);
  }, [state, i, picked]);

  const answer = (idx) => { if (picked !== null) return; clearInterval(timer.current); setPicked(idx); if (idx === QUIZ[i].a) setScore((s) => s + 100 + left * 10); };
  const next = () => {
    if (i + 1 < QUIZ.length) { setI(i + 1); setPicked(null); setLeft(QUIZ_SEC); }
    else {
      const final = score;
      rec.quiz = { score: final, at: now() };
      log("quiz", `퀴즈 종료 · ${final}점`);
      persist(rec); setState("done");
    }
  };

  if (state === "ready") return (
    <Card>
      <h2 style={{ color: C.navy, fontSize: 19, marginTop: 0 }}>스피드 퀴즈 — 빠르고 정확하게</h2>
      <div style={{ fontSize: 13.5, lineHeight: 1.7 }}>12문항. 문항당 {QUIZ_SEC}초. 정답이면 <b>100점 + 남은 초 × 10점</b>. ⑨차시 복습과 음악·미술·체육 스몰토크가 섞여 있습니다.</div>
      {rec.quiz && <Note tone="blue">현재 기록 {rec.quiz.score}점 — 재도전하면 더 높은 점수로 갱신됩니다.</Note>}
      <Btn style={{ marginTop: 12 }} onClick={start}>시작</Btn>
    </Card>
  );
  if (state === "done") return (
    <Card style={{ textAlign: "center" }}>
      <div style={{ fontSize: 13, color: C.gray }}>최종 점수</div>
      <div style={{ fontSize: 42, fontWeight: 900, color: C.mag }}>{Math.max(score, rec.quiz?.score || 0)}점</div>
      <div style={{ fontSize: 13, color: C.gray, marginBottom: 12 }}>순위는 강의자 화면의 리더보드에서 확인됩니다.</div>
      <Btn kind="ghost" onClick={start}>다시 도전</Btn>
    </Card>
  );
  const q = QUIZ[i];
  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Tag>{q.cat}</Tag>
        <div style={{ fontWeight: 900, fontSize: 20, color: left <= 5 ? C.bad : C.navy }}>{left}s</div>
      </div>
      <div style={{ height: 6, background: C.lavLine, borderRadius: 3, margin: "8px 0 14px" }}>
        <div style={{ height: 6, borderRadius: 3, width: `${(left / QUIZ_SEC) * 100}%`, background: left <= 5 ? C.bad : C.mag, transition: "width 1s linear" }} />
      </div>
      <div style={{ fontWeight: 800, color: C.navy, fontSize: 16, marginBottom: 12 }}>{i + 1}. {q.q}</div>
      {q.opts.map((o, idx) => {
        let bg = "#fff", bd = C.lavLine;
        if (picked !== null) { if (idx === q.a) { bg = C.goodBg; bd = C.good; } else if (idx === picked) { bg = C.badBg; bd = C.bad; } }
        return <div key={idx} onClick={() => answer(idx)} style={{ border: `1.5px solid ${bd}`, background: bg, borderRadius: 10, padding: "11px 14px", marginBottom: 8, cursor: "pointer", fontSize: 14 }}>{o}</div>;
      })}
      {picked !== null && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: picked === q.a ? C.good : C.bad }}>{picked === q.a ? `정답 +${100 + left * 10}점` : picked === -1 ? "시간 초과" : "오답"}　누적 {score}점</div>
          <Btn onClick={next}>{i + 1 < QUIZ.length ? "다음 문항" : "결과 보기"}</Btn>
        </div>
      )}
    </Card>
  );
}

/* ── ⑪·⑫ 세션 페이지 (본 자료는 추후 삽입) ── */
const S11 = {
  title: "집합⑪ · AI·디지털 기반 교수학습 데이터 분석",
  sub: "20–21차시 · 100분 · 역량 C2(학습데이터 분석·활용)",
  agenda: [
    ["데이터 이해 (0.5H)", "교육 데이터를 보는 다섯 관점 · 창작교과(음악·미술·체육)의 데이터 유형 · 학습분석학 4수준(기술→진단→예측→처방)"],
    ["대시보드 핸즈온 (1.5H · 핵심)", "위젯을 직접 읽고, 같은 학생의 데이터를 겹쳐 보며 신뢰성(빠진 값·튀는 값·편향)을 점검"],
    ["개인 vs 학급 → 실천 전환", "분석 결과를 학생 맞춤 피드백 문장 또는 다음 수업의 SMART 계획으로 바꾼다 — 시각화에서 멈추지 않는다"],
  ],
  live: "지금 이 앱이 하나의 예시입니다. 여러분의 페이지 이동·체류 시간·막힘 표시가 그대로 학습 로그로 쌓이고 있고, 강의자 화면에서 그 로그를 함께 열어 '데이터에서 학생의 맥락을 읽는 법'을 실습합니다.",
};
const S12 = {
  title: "집합⑫ · AI·디지털 기반 평가와 환류",
  sub: "22–23차시 · 100분 · 역량 C3 계열(평가·환류 설계)",
  agenda: [
    ["평가 설계 점검", "⑪의 분석 보고서를 의사결정 근거로 삼아, 과정중심평가의 요소·도구·피드백을 다시 본다"],
    ["환류 설계", "AI 분석과 교사 관찰 기록을 교차검증해 타당하게 해석하고, 차기 수업 개선 계획으로 옮긴다"],
    ["마이크로티칭·갤러리 워크", "점검한 설계안의 한 장면을 동료 앞에서 시연하고 상호 피드백"],
  ],
  live: "⑫에서는 오늘 점검한 설계안의 평가 칸이 재료가 됩니다. 자가점검 탭의 응답을 다시 열어 두시면 진행이 빠릅니다.",
};

function Session({ n, rec, persist, log }) {
  const D = n === 11 ? S11 : S12;
  const key = "s" + n;
  const checkin = (kind) => {
    rec.checkins.push({ t: now(), session: n, kind });
    log("checkin", `⑪⑫`.charAt(n - 11) + ` ${kind}`);
    persist(rec);
  };
  const mine = rec.checkins.filter((c) => c.session === n);
  return (
    <div>
      <h2 style={{ color: C.navy, fontSize: 19, margin: "4px 0" }}>{D.title}</h2>
      <div style={{ fontSize: 13, color: C.gray, marginBottom: 12 }}>{D.sub}</div>
      {D.agenda.map(([t, d], i) => (
        <Card key={i} style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 800, color: C.navy, fontSize: 14.5 }}>{i + 1}. {t}</div>
          <div style={{ fontSize: 13, lineHeight: 1.6, marginTop: 4 }}>{d}</div>
        </Card>
      ))}
      <Note tone="blue">{D.live}</Note>
      <Card style={{ background: C.lav, border: "none" }}>
        <div style={{ fontWeight: 800, color: C.navy, fontSize: 14, marginBottom: 8 }}>강의 자료</div>
        <div style={{ fontSize: 13, color: C.gray, lineHeight: 1.6 }}>이 자리에는 KERIS 집합{n === 11 ? "⑪" : "⑫"} 강의 슬라이드가 들어갑니다 (자료 준비 중). 강의는 화면 공유로 진행되고, 아래 버튼으로 이해 상태를 알려 주세요.</div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <Btn kind="line" onClick={() => checkin("이해했어요 ✓")}>여기까지 이해했어요</Btn>
          <Btn kind="line" onClick={() => checkin("질문 있어요 🚩")}>질문 있어요</Btn>
        </div>
        {mine.length > 0 && <div style={{ fontSize: 12, color: C.gray, marginTop: 8 }}>보낸 신호 {mine.length}건 · 마지막 {clock(mine[mine.length - 1].t)}</div>}
      </Card>
    </div>
  );
}

/* ═══════════ 강의자 대시보드 ═══════════ */
function AdminApp({ onExit }) {
  const [data, setData] = useState([]);
  const [busy, setBusy] = useState(false);
  const [sel, setSel] = useState(null);
  const [tab, setTab] = useState("progress");

  const refresh = async () => {
    setBusy(true);
    const roster = (await sGet("roster")) || [];
    const recs = [];
    for (const r of roster) { const t = await sGet("t:" + r.id); if (t) recs.push(t); }
    recs.sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));
    setData(recs); setBusy(false);
  };
  useEffect(() => { refresh(); }, []);

  const wizStat = (r) => STEPS.map((s) => r.wizard?.[s.id]?.done ? "●" : (r.wizard?.pos === STEPS.findIndex(x=>x.id===s.id) ? "◐" : "○")).join(" ");
  const helps = data.flatMap((r) => r.logs.filter((l) => l.type === "help" || (l.type === "checkin" && l.detail.includes("질문"))).map((l) => ({ ...l, name: r.name })));
  helps.sort((a, b) => b.t - a.t);
  const board = data.filter((r) => r.quiz).sort((a, b) => b.quiz.score - a.quiz.score);

  /* 단계별 평균 체류(로그의 '체류' 항목 파싱) — ⑪ 시연용 집계 */
  const dwellAgg = {};
  data.forEach((r) => r.logs.forEach((l) => {
    if (l.type !== "wizard" || !l.detail.includes("체류")) return;
    const step = l.detail.split(" 단계")[0];
    const m = l.detail.match(/체류 (?:(\d+)분 )?(\d+)초/);
    if (!m) return;
    const sec = (parseInt(m[1] || 0) * 60) + parseInt(m[2]);
    (dwellAgg[step] = dwellAgg[step] || []).push(sec);
  }));

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 16px 60px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0 10px", borderBottom: `1px solid ${C.lavLine}` }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 800, color: C.mag, letterSpacing: 1.5 }}>강의자 대시보드</span>
          <h1 style={{ color: C.navy, fontSize: 20, margin: "4px 0 0" }}>집합⑪·⑫ 진행 현황</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn kind="ghost" onClick={refresh}>{busy ? "불러오는 중…" : "↻ 새로고침"}</Btn>
          <Btn kind="line" onClick={onExit}>나가기</Btn>
        </div>
      </header>
      <nav style={{ display: "flex", gap: 6, margin: "12px 0" }}>
        {[["progress", "진행 현황"], ["help", `도움 요청 (${helps.length})`], ["quiz", "퀴즈 리더보드"], ["logs", "로그 스트림 · ⑪ 시연"]].map(([id, l]) => (
          <button key={id} onClick={() => setTab(id)} style={{ border: "none", borderRadius: 999, padding: "7px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", background: tab === id ? C.navy : C.lav, color: tab === id ? "#fff" : C.navy }}>{l}</button>
        ))}
      </nav>

      {tab === "progress" && (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ background: C.lav, color: C.navy }}>
              {["이름", "교과", "현재 위치", "복습", "설계안 단계 (●완료 ◐진행)", "퀴즈", "마지막 활동"].map((h) => <th key={h} style={{ padding: "10px 10px", textAlign: "left", fontSize: 12 }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.id} onClick={() => setSel(sel === r.id ? null : r.id)} style={{ borderTop: `1px solid ${C.lavLine}`, cursor: "pointer", background: sel === r.id ? C.magSoft : "#fff" }}>
                  <td style={{ padding: "9px 10px", fontWeight: 700, color: C.navy }}>{r.name}</td>
                  <td style={{ padding: "9px 10px" }}>{SUBJ[r.subject]?.icon} {SUBJ[r.subject]?.label}</td>
                  <td style={{ padding: "9px 10px" }}>{TABS.find((t) => t.id === r.lastPage)?.label || "홈"}</td>
                  <td style={{ padding: "9px 10px" }}>{THEORY.filter((t) => r.review?.[t.id]).length}/6</td>
                  <td style={{ padding: "9px 10px", letterSpacing: 2, color: C.mag }}>{wizStat(r)}</td>
                  <td style={{ padding: "9px 10px", fontWeight: 700 }}>{r.quiz ? r.quiz.score : "—"}</td>
                  <td style={{ padding: "9px 10px", color: C.gray }}>{r.lastSeen ? clock(r.lastSeen) : "—"}</td>
                </tr>
              ))}
              {!data.length && <tr><td colSpan={7} style={{ padding: 24, textAlign: "center", color: C.gray }}>아직 입장한 선생님이 없습니다. 새로고침으로 갱신하세요.</td></tr>}
            </tbody>
          </table>
          {sel && (() => {
            const r = data.find((x) => x.id === sel); if (!r) return null;
            return (
              <div style={{ padding: 16, borderTop: `2px solid ${C.mag}` }}>
                <div style={{ fontWeight: 800, color: C.navy, marginBottom: 6 }}>{r.name} 선생님 · 응답 상세</div>
                <div style={{ fontSize: 13, lineHeight: 1.8 }}>
                  <b>핵심 아이디어:</b> {r.wizard?.coreidea?.text || <i style={{color:C.gray}}>미작성</i>}<br />
                  <b>탐구질문:</b> {[0,1,2].map((i) => r.wizard?.inquiry?.["q"+i]).filter(Boolean).join(" / ") || <i style={{color:C.gray}}>미작성</i>}<br />
                  <b>도구:</b> {r.wizard?.tools?.name || <i style={{color:C.gray}}>미작성</i>} {r.wizard?.tools?.stage ? `(${r.wizard.tools.stage} 단계)` : ""}
                </div>
                <div style={{ fontSize: 12, color: C.gray, marginTop: 8 }}>최근 로그 5건 — {r.logs.slice(-5).map((l) => `[${clock(l.t)}] ${l.detail}`).join(" · ")}</div>
              </div>
            );
          })()}
        </Card>
      )}

      {tab === "help" && (
        <div>
          {helps.length === 0 && <Card><div style={{ color: C.gray, fontSize: 13 }}>도움 요청이 아직 없습니다.</div></Card>}
          {helps.map((h, i) => (
            <Card key={i} style={{ marginBottom: 8, borderLeft: `4px solid ${C.bad}` }}>
              <b style={{ color: C.navy }}>{h.name}</b> <span style={{ fontSize: 12, color: C.gray }}>{clock(h.t)}</span>
              <div style={{ fontSize: 13.5, marginTop: 2 }}>{h.detail}</div>
            </Card>
          ))}
        </div>
      )}

      {tab === "quiz" && (
        <Card>
          <div style={{ fontWeight: 800, color: C.navy, marginBottom: 10 }}>스피드 퀴즈 리더보드</div>
          {board.map((r, i) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 4px", borderBottom: `1px solid ${C.lavLine}` }}>
              <div style={{ width: 32, fontWeight: 900, fontSize: 17, color: i < 3 ? C.mag : C.gray }}>{i + 1}</div>
              <div style={{ flex: 1, fontWeight: 700, color: C.navy }}>{SUBJ[r.subject]?.icon} {r.name}</div>
              <div style={{ fontWeight: 900, color: C.navy }}>{r.quiz.score}점</div>
            </div>
          ))}
          {!board.length && <div style={{ color: C.gray, fontSize: 13 }}>기록이 아직 없습니다.</div>}
        </Card>
      )}

      {tab === "logs" && (
        <div>
          <Note tone="blue">⑪차시 시연용 화면입니다. “이 로그에서 각 선생님에게 무슨 일이 있었는지 읽어 봅시다”라는 발문과 함께 열어 주세요. 아래 집계는 학습분석 4수준 중 ‘기술(무슨 일이 있었나)’에 해당하고, 해석과 처방은 함께 대화로 만듭니다.</Note>
          <Card style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 800, color: C.navy, marginBottom: 8 }}>설계안 단계별 평균 체류 시간</div>
            {Object.entries(dwellAgg).map(([step, arr]) => {
              const avg = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
              const max = Math.max(...Object.values(dwellAgg).map((a) => a.reduce((x, y) => x + y, 0) / a.length), 1);
              return (
                <div key={step} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <div style={{ width: 140, fontSize: 12.5, color: C.navy, fontWeight: 700 }}>{step}</div>
                  <div style={{ flex: 1, height: 14, background: C.lav, borderRadius: 7 }}>
                    <div style={{ height: 14, borderRadius: 7, background: C.mag, width: `${Math.min(100, (avg / max) * 100)}%` }} />
                  </div>
                  <div style={{ width: 70, fontSize: 12, color: C.gray, textAlign: "right" }}>{fmtT(avg * 1000)} · {arr.length}건</div>
                </div>
              );
            })}
            {!Object.keys(dwellAgg).length && <div style={{ color: C.gray, fontSize: 13 }}>설계안 점검 로그가 쌓이면 여기 집계가 표시됩니다.</div>}
            <div style={{ fontSize: 12, color: C.gray, marginTop: 8 }}>체류가 긴 단계 = 어려움의 신호일 수도, 깊은 몰입의 신호일 수도 있습니다. 어느 쪽인지는 도움 요청 로그·응답 내용과 교차해서 읽습니다 — 데이터는 답이 아니라 질문입니다.</div>
          </Card>
          <Card style={{ maxHeight: 380, overflowY: "auto" }}>
            <div style={{ fontWeight: 800, color: C.navy, marginBottom: 8 }}>전체 로그 스트림 (최신순)</div>
            {data.flatMap((r) => r.logs.map((l) => ({ ...l, name: r.name }))).sort((a, b) => b.t - a.t).slice(0, 120).map((l, i) => (
              <div key={i} style={{ fontSize: 12.5, padding: "5px 0", borderBottom: `1px solid ${C.lav}` }}>
                <span style={{ color: C.gray }}>[{clock(l.t)}]</span> <b style={{ color: C.navy }}>{l.name}</b> — {l.detail}
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* 강의자 노트 */}
      <Card style={{ marginTop: 16, background: C.warnBg, border: "none" }}>
        <div style={{ fontWeight: 800, color: C.warn, marginBottom: 6 }}>강의자 운영 노트</div>
        <div style={{ fontSize: 13, lineHeight: 1.8 }}>
          진행 순서 — ① 입장·복습(15분): 여섯 카드 중 체크가 안 되는 카드를 각자 하나 고르게 하고 그 이유를 짝과 나누게 합니다. ② 설계안 자가점검(40분): 순회하며 「도움 요청」 탭을 수시로 확인하고, 핵심 아이디어 단계 체류가 긴 분부터 다가갑니다. ③ 스피드 퀴즈(10분): ⑪ 시작 전 환기용 — 리더보드를 화면에 띄워 짧게 시상합니다. ④ ⑪ 강의: 로그 스트림 탭을 함께 열어 "지금 우리 연수실의 데이터"로 학습분석을 시연합니다. 특정 선생님을 지목하지 말고 익명화된 패턴 중심으로 읽습니다. ⑤ ⑫ 강의: 진행 현황의 응답 상세(핵심 아이디어·평가 칸)를 재료로 평가·환류를 연결합니다. 새로고침 버튼은 1~2분 간격으로 눌러 주시면 충분합니다.
        </div>
      </Card>
    </div>
  );
}
