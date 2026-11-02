import { Component } from 'react'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'

/**
 * ErrorBoundary — catches render-time errors anywhere below it so a single
 * failing component can never blank the whole application. Renders a
 * premium recovery card instead of a white screen.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, message: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message ?? 'Unknown render error' }
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info?.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, message: null })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    const onHome = () => {
      this.handleReset()
      if (typeof window !== 'undefined') window.location.href = '/'
    }

    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-3xl border border-slate-200/70 bg-white p-8 text-center shadow-lift dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500/10 to-amber-500/10 text-rose-500 ring-1 ring-rose-500/20">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">Something went wrong</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            An unexpected error interrupted this view. Your data is safe — try again, or head back to the home page.
          </p>
          {this.props.showDetails && this.state.message && (
            <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 font-mono text-[11px] text-slate-400 dark:bg-slate-800/60 dark:text-slate-500">
              {this.state.message}
            </p>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 transition-all hover:brightness-110"
            >
              <RefreshCw className="h-4 w-4" /> Try again
            </button>
            <button
              onClick={onHome}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-all hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
            >
              <Home className="h-4 w-4" /> Back to home
            </button>
          </div>
        </div>
      </div>
    )
  }
}

export { ErrorBoundary }
export default ErrorBoundary
