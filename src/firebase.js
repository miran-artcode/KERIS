// Firebase 초기화 및 서비스 export
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getAnalytics, isSupported } from 'firebase/analytics'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig)

// Firestore (데이터베이스)
export const db = getFirestore(app)

// Storage (파일/이미지)
export const storage = getStorage(app)

// Analytics — 브라우저에서 지원될 때만 초기화
export let analytics = null
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app)
  }
})

export default app
