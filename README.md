# KERIS

React + Vite 웹앱, Firebase(Firestore · Storage · Analytics) 연동, Firebase Hosting 배포.

## 시작하기

```bash
npm install       # 의존성 설치
npm run dev       # 로컬 개발 서버 (http://localhost:5173)
```

## 환경 변수

Firebase 설정은 `.env` 파일에서 읽어옵니다. `.env.example`을 복사해서 값을 채우세요.

```bash
cp .env.example .env
```

> Firebase **웹 apiKey**는 비밀 값이 아니라 공개 식별자입니다. 보안은 Firestore/Storage 보안 규칙과 App Check로 관리합니다.

## 빌드 & 배포

```bash
npm run build     # dist/ 폴더로 프로덕션 빌드
firebase deploy   # Firebase Hosting에 배포
# 또는 한 번에:
npm run deploy
```

배포 전 한 번만 로그인:

```bash
firebase login
```

## 폴더 구조

```
src/
  firebase.js   # Firebase 초기화 (db, storage, analytics)
  App.jsx       # 메인 컴포넌트 (Firestore 데모)
  main.jsx      # 진입점
firebase.json   # Hosting 설정 (public: dist)
.firebaserc     # 기본 프로젝트: keris-data
```
