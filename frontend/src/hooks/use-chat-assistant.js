/**
 * useChatAssistant — shared conversational state + send/loading/error handling
 * for AI chat UIs (student AI Tutor, faculty Teaching Assistant).
 *
 * Centralizes: messages · input · send · loading · error fallback · newChat.
 * Each UI keeps its own shell (sidebar, thread list, scroll handling) and
 * passes in its own `ask` mutation, fallback reply and callbacks — so AI
 * behaviour is unchanged, only the duplicated plumbing is shared.
 */
import { useState } from 'react'

function useChatAssistant({ ask, fallbackReply = () => '', getThreadId = null, onAssistantMessage = null, onError = null }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const send = async (text) => {
    const trimmed = text?.trim()
    if (!trimmed || loading) return
    const userMsg = { id: `u_${Date.now()}`, role: 'user', text: trimmed, time: new Date().toISOString() }
    setMessages((m) => [...m, userMsg])
    setInput('')
    setLoading(true)
    try {
      const params = { text: trimmed }
      if (getThreadId) params.threadId = getThreadId()
      const { reply } = await ask(params)
      const aiMsg = { id: `a_${Date.now()}`, role: 'assistant', text: reply, time: new Date().toISOString() }
      setMessages((m) => [...m, aiMsg])
      onAssistantMessage?.(userMsg, aiMsg)
    } catch {
      const fallback = fallbackReply?.(trimmed)
      if (fallback) {
        const aiMsg = { id: `a_${Date.now()}`, role: 'assistant', text: fallback, time: new Date().toISOString() }
        setMessages((m) => [...m, aiMsg])
        onAssistantMessage?.(userMsg, aiMsg)
      }
      onError?.()
    } finally {
      setLoading(false)
    }
  }

  const newChat = () => setMessages([])

  return { messages, setMessages, input, setInput, loading, send, newChat }
}

export { useChatAssistant }
export default useChatAssistant
