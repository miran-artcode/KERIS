import { useEffect, useState } from 'react'
import { collection, addDoc, getDocs, orderBy, query, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'
import './App.css'

export default function App() {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Firestore 'messages' 컬렉션 불러오기
  async function loadMessages() {
    try {
      setLoading(true)
      const q = query(collection(db, 'messages'), orderBy('createdAt', 'desc'))
      const snapshot = await getDocs(q)
      setMessages(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })))
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMessages()
  }, [])

  // 새 메시지 추가
  async function handleSubmit(e) {
    e.preventDefault()
    if (!text.trim()) return
    try {
      await addDoc(collection(db, 'messages'), {
        text: text.trim(),
        createdAt: serverTimestamp(),
      })
      setText('')
      loadMessages()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <main className="container">
      <h1>KERIS</h1>
      <p className="subtitle">React + Vite + Firebase</p>

      <form onSubmit={handleSubmit} className="form">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="메시지를 입력하세요…"
        />
        <button type="submit">추가</button>
      </form>

      {error && <p className="error">⚠️ {error}</p>}

      {loading ? (
        <p>불러오는 중…</p>
      ) : (
        <ul className="list">
          {messages.length === 0 && <li className="empty">아직 데이터가 없습니다.</li>}
          {messages.map((m) => (
            <li key={m.id}>{m.text}</li>
          ))}
        </ul>
      )}
    </main>
  )
}
