import { useEffect, useRef, useState } from 'react'

type MathJaxApi = {
  typesetPromise?: (elements?: HTMLElement[]) => Promise<void>
  typesetClear?: (elements?: HTMLElement[]) => void
}

type MathJaxWindow = Window & {
  MathJax?: MathJaxApi & Record<string, unknown>
}

const MATHJAX_SCRIPT_ID = 'mathjax-tex-svg-3'
const MATHJAX_CDN_URL = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js'
let mathJaxPromise: Promise<MathJaxApi> | null = null

function loadMathJax(): Promise<MathJaxApi> {
  const mathWindow = window as MathJaxWindow
  if (mathWindow.MathJax?.typesetPromise) return Promise.resolve(mathWindow.MathJax)
  if (mathJaxPromise) return mathJaxPromise

  mathJaxPromise = new Promise<MathJaxApi>((resolve, reject) => {
    mathWindow.MathJax = {
      ...(mathWindow.MathJax ?? {}),
      tex: {
        inlineMath: [['\\(', '\\)']],
        displayMath: [['\\[', '\\]']],
      },
      svg: { fontCache: 'global' },
    }

    const existing = document.getElementById(MATHJAX_SCRIPT_ID) as HTMLScriptElement | null
    const finish = () => {
      const api = (window as MathJaxWindow).MathJax
      if (api?.typesetPromise) resolve(api)
      else reject(new Error('MathJax yüklendi ancak typeset API oluşmadı.'))
    }

    if (existing) {
      existing.addEventListener('load', finish, { once: true })
      existing.addEventListener('error', () => reject(new Error('MathJax yüklenemedi.')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.id = MATHJAX_SCRIPT_ID
    script.src = MATHJAX_CDN_URL
    script.async = true
    script.addEventListener('load', finish, { once: true })
    script.addEventListener('error', () => reject(new Error('MathJax CDN yüklenemedi.')), { once: true })
    document.head.appendChild(script)
  }).catch((error: unknown) => {
    mathJaxPromise = null
    throw error
  })

  return mathJaxPromise
}

export function LatexFormula({ latex, ariaLabel }: { latex: string; ariaLabel: string }) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    let cancelled = false

    root.textContent = `\\[${latex}\\]`
    void loadMathJax()
      .then(async (mathJax) => {
        if (cancelled) return
        mathJax.typesetClear?.([root])
        root.textContent = `\\[${latex}\\]`
        await mathJax.typesetPromise?.([root])
        if (!cancelled) setFailed(false)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
    }
  }, [latex])

  return (
    <div className={`latex-formula${failed ? ' latex-formula--fallback' : ''}`} role="img" aria-label={ariaLabel}>
      <div ref={rootRef}>{`\\[${latex}\\]`}</div>
      {failed && <small>Matematiksel gösterim yüklenemedi; LaTeX kaynak biçimi gösteriliyor.</small>}
    </div>
  )
}
