import { memo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Check, Copy, Sparkles } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Avatar } from '@/components/ui/avatar'
import { formatDate } from '@/utils/format'

function MarkdownContent({ content }) {
  return (
    <div className="markdown-body space-y-2.5 text-[13.5px] leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="leading-relaxed">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-slate-900 dark:text-white">{children}</strong>,
          ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          h1: ({ children }) => <p className="pt-1 text-base font-bold text-slate-900 dark:text-white">{children}</p>,
          h2: ({ children }) => <p className="pt-1 text-base font-bold text-slate-900 dark:text-white">{children}</p>,
          h3: ({ children }) => <p className="pt-1 text-[15px] font-bold text-slate-900 dark:text-white">{children}</p>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-indigo-400/60 bg-indigo-50/50 py-1.5 pl-3.5 pr-2 dark:bg-indigo-500/5">{children}</blockquote>
          ),
          code: ({ className, children }) => {
            const isBlock = className?.includes('language-') || String(children).includes('\n')
            if (isBlock) {
              return (
                <pre className="overflow-x-auto rounded-xl bg-slate-900 p-3.5 text-xs leading-relaxed text-slate-100 dark:bg-black/50">
                  <code className="font-mono">{children}</code>
                </pre>
              )
            }
            return (
              <code className="rounded-md bg-indigo-50 px-1.5 py-0.5 font-mono text-[12px] text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                {children}
              </code>
            )
          },
          table: ({ children }) => (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-slate-50 dark:bg-slate-800/60">{children}</thead>,
          th: ({ children }) => <th className="border-b border-slate-200 px-3 py-2 text-left font-semibold dark:border-slate-700">{children}</th>,
          td: ({ children }) => <td className="border-b border-slate-100 px-3 py-2 dark:border-slate-800">{children}</td>,
          tr: ({ children }) => <tr>{children}</tr>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(text).catch(() => {})
        setCopied(true)
        setTimeout(() => setCopied(false), 1600)
      }}
      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-500/10 hover:text-slate-600 dark:hover:text-slate-300"
      aria-label="Copy message"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

const ChatMessage = memo(function ChatMessage({ message, senderName = 'You', avatarGradient, showActions = true }) {
  const isUser = message.role === 'user'
  return (
    <div className={cn('flex w-full gap-3', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="relative mt-0.5 shrink-0">
          <div className="absolute inset-0 animate-pulse-ring rounded-full" style={{ animationDuration: '3s' }} />
          <div className="relative flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 via-blue-600 to-teal-500 text-white shadow-lg shadow-indigo-500/25">
            <Sparkles className="h-4 w-4" />
          </div>
        </div>
      )}
      <div className={cn('max-w-[85%] sm:max-w-[75%]', isUser && 'flex flex-col items-end')}>
        <div
          className={cn(
            'relative rounded-3xl px-4 py-3 shadow-sm',
            isUser
              ? 'rounded-br-lg bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-indigo-500/20'
              : 'rounded-bl-lg border border-slate-200/80 bg-white text-slate-700 dark:border-slate-700/60 dark:bg-slate-800/80 dark:text-slate-200'
          )}
        >
          {isUser ? <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed">{message.text}</p> : <MarkdownContent content={message.text} />}
        </div>
        <div className={cn('mt-1 flex items-center gap-2', isUser && 'flex-row-reverse')}>
          <span className="text-[10px] font-medium text-slate-400">
            {isUser ? senderName : 'MediXO Mentor'} · {message.time ? formatDate(message.time, 'hh:mm a') : 'now'}
          </span>
          {showActions && !isUser && <CopyButton text={message.text} />}
        </div>
      </div>
      {isUser && <Avatar name={senderName} size="sm" className="mt-0.5" />}
    </div>
  )
})

function TypingDots() {
  return (
    <div className="flex w-full gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 via-blue-600 to-teal-500 text-white shadow-lg shadow-indigo-500/25">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="flex items-center gap-1.5 rounded-3xl rounded-bl-lg border border-slate-200/80 bg-white px-4 py-3.5 shadow-sm dark:border-slate-700/60 dark:bg-slate-800/80">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-typing-dot rounded-full bg-indigo-500 dark:bg-indigo-300"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  )
}

export { ChatMessage, TypingDots, MarkdownContent }
export default ChatMessage
