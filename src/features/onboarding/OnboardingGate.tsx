import { useEffect, useState } from 'react'
import { api } from '@/services/api-client'
import { useQueryClient } from '@tanstack/react-query'

interface Slide {
  sort_order: number
  title: string
  body: string
  image_url?: string
}

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<'loading' | 'onboarding' | 'release' | 'done'>('loading')
  const [slides, setSlides] = useState<Slide[]>([])
  const [releaseCards, setReleaseCards] = useState<Slide[]>([])
  const [index, setIndex] = useState(0)
  const qc = useQueryClient()

  useEffect(() => {
    async function load() {
      try {
        const status = await api.get<{
          needsOnboarding: boolean
          needsReleaseCards: boolean
          appVersion: string
        }>('/api/onboarding/status')

        if (status.needsOnboarding) {
          const s = await api.get<Slide[]>('/api/onboarding/slides')
          if (s.length === 0) {
            await api.post('/api/onboarding/complete')
            const st2 = await api.get<{ needsReleaseCards: boolean }>('/api/onboarding/status')
            if (st2.needsReleaseCards) {
              setReleaseCards(await api.get<Slide[]>('/api/onboarding/release-cards'))
              setPhase('release')
            } else setPhase('done')
            return
          }
          setSlides(s)
          setPhase('onboarding')
          return
        }
        if (status.needsReleaseCards) {
          const r = await api.get<Slide[]>('/api/onboarding/release-cards')
          if (r.length === 0) {
            await api.post('/api/onboarding/release-seen', {})
            setPhase('done')
            return
          }
          setReleaseCards(r)
          setPhase('release')
          return
        }
        setPhase('done')
      } catch {
        setPhase('done')
      }
    }
    load()
  }, [])

  const finishOnboarding = async () => {
    await api.post('/api/onboarding/complete')
    const status = await api.get<{ needsReleaseCards: boolean }>('/api/onboarding/status')
    if (status.needsReleaseCards) {
      const r = await api.get<Slide[]>('/api/onboarding/release-cards')
      setReleaseCards(r)
      setIndex(0)
      setPhase('release')
    } else {
      setPhase('done')
      qc.invalidateQueries({ queryKey: ['onboarding'] })
    }
  }

  const finishRelease = async () => {
    await api.post('/api/onboarding/release-seen', {})
    setPhase('done')
    qc.invalidateQueries({ queryKey: ['onboarding'] })
  }

  if (phase === 'loading') {
    return (
      <div id="app" className="items-center justify-center flex min-h-screen text-white/60">
        Loading...
      </div>
    )
  }

  const list = phase === 'onboarding' ? slides : releaseCards
  const current = list[index]

  if ((phase === 'onboarding' || phase === 'release') && current) {
    const isLast = index >= list.length - 1
    return (
      <div id="app" className="flex flex-col min-h-screen p-6 justify-center">
        <div className="glass-block flex flex-col gap-4 text-center max-w-md mx-auto w-full">
          <h2 className="heading-2xl">{current.title}</h2>
          <p className="text-14">{current.body}</p>
          <div className="flex gap-2 justify-center mt-4">
            {!isLast ? (
              <button type="button" className="btn btn--white w-full" onClick={() => setIndex(i => i + 1)}>
                Next
              </button>
            ) : (
              <button
                type="button"
                className="btn btn--white w-full"
                onClick={phase === 'onboarding' ? finishOnboarding : finishRelease}
              >
                {phase === 'onboarding' ? 'Get started' : 'Continue'}
              </button>
            )}
          </div>
          <p className="text-12 text-white/40">
            {index + 1} / {list.length}
          </p>
        </div>
      </div>
    )
  }

  if (phase === 'done') {
    return <>{children}</>
  }

  return null
}
