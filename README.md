# BEYOND THE SCORE — 창작교과 데이터·환류 연수 사이트

2026 AI활용 선도교사 연수 **집합 ⑪·⑫** (음악·미술·체육 통합) 진행용 웹사이트.
순수 HTML/CSS/JS + Firebase(Firestore 실시간·Hosting). 빌드 도구 없음.

- 호스팅: https://keris-data.web.app
- 구조·설계 원형: seoul-20260716 강의 사이트 (동일 뼈대, 대상·내용 교체)

## 페이지 구성 (`public/`)

| 페이지 | 역할 |
|---|---|
| `index.html` | 입장 로비 — **교과 + 별명 + PIN 4자리** 로그인(개인정보 無), 실시간 명단·응원 |
| `home.html` | 연수 홈 — 라이브 슬라이드 동기화 + 참여 퀴즈 패널 |
| `warmup.html` | 웜업 — ⑨차시 복습 카드 6장(체크 저장) + 스피드 퀴즈 12문항 + 실시간 리더보드 + 설계안 양식 뷰어 |
| `wizard.html` | 설계안 자가점검 7단계 — 자동 점검(형용사 감지 등), 교과별 예시, **단계 체류 로그** |
| `cases.html` | 사례 산책 — 교과별 영상(유튜브 임베드)·검증된 최신 연구 |
| `s11.html` | 집합⑪ 데이터 분석 강의 + **라이브 랩: 내 데이터 열어 보기** |
| `s12.html` | 집합⑫ 환류 — 갤러리 워크(상호 크리틱), 연수실 전체 데이터 해석, 액션 플랜, KPT 회고 |
| `research.html` | 연구 자료실 — 전 링크 접속 검증(2026-07) |
| `presenter.html` | **강의자 콘솔** — 슬라이드 송출(3덱)·퀴즈 발사·실시간 모니터(막힌 사람 우선 정렬)·발화 전사·데이터 내보내기 |

## 핵심 설계

- **로그인**: `교과__별명` 문서 id + PIN sha256 해시(재입장 충돌 방지만). 실명·연락처 미수집.
- **신호 독**: 모든 세션 페이지 우하단 — 🟢따라옴/🟡헷갈림/🔴막힘/😂. 참가자 상태가 강의자 모니터에 실시간 표시.
- **데이터가 곧 교재**: 사이트에서 쌓인 로그(체류·신호·퀴즈)를 ⑪에서 각자, ⑫에서 전체가 직접 해석.
- **강의자 입장**: index 푸터 `Console` 링크 → 코드 `1112` → 교과 '강의자'로 입장.
- **슬라이드**: `slides12/`(⑫·33장) · `slides11/`(⑨ 복습·50장) · `slidesplan/`(설계안 양식·7장) — PPTX에서 PNG로 내보냄.

## Firestore 컬렉션

`participants`(상태·현재 위치) · `signals`(신호 이벤트) · `cheers` · `reviews`(복습 체크) ·
`wizards`(설계안 응답) · `wizardlogs`(단계 체류) · `speedquiz` · `participations`(라이브 퀴즈, create-only=1인 1회) ·
`plans`(액션 플랜) · `critiques`(갤러리 크리틱) · `kpt` · `live/state`(슬라이드 동기화) · `overlays` · `transcripts`(발화 전사)

보안 규칙: `firestore.rules` — 읽기 공개(워크숍 모델), 쓰기는 필드 크기·타입 제한, 삭제 전면 금지.

## 배포

```bash
firebase deploy                      # hosting + firestore rules
firebase deploy --only hosting      # 사이트만
```

## 연수 종료 후

- 강의자 콘솔 → 내보내기(JSON/CSV/KPT)로 원자료 보관 후, Firebase 콘솔에서 컬렉션 삭제(개인정보 안내 준수).
- 원본 강의 자료(pptx·jsx·이전 홈페이지)는 저장소 루트에 백업되어 있음.
