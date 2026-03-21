import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import {
  adventureThemes,
  getAdventureThemeById,
  getRandomAdventureThemeId,
} from '../data/adventure-themes'
import { characterClasses } from '../data/classes'
import { useGameStore } from '../store/game-store'

export function AdventureThemePage() {
  const navigate = useNavigate()
  const selectedClassId = useGameStore((state) => state.selectedClassId)
  const storedTheme = useGameStore((state) => state.adventureTheme)
  const resetGame = useGameStore((state) => state.resetGame)
  const setAdventureTheme = useGameStore((state) => state.setAdventureTheme)
  const selectedJob = characterClasses.find((job) => job.id === selectedClassId)
  const [themeId, setThemeId] = useState(() => storedTheme ?? getRandomAdventureThemeId())

  const selectedTheme = useMemo(() => getAdventureThemeById(themeId), [themeId])

  useEffect(() => {
    document.title = '冒険テーマ | TRPG'
  }, [])

  useEffect(() => {
    setAdventureTheme(themeId)
  }, [themeId, setAdventureTheme])

  const handleRestart = () => {
    resetGame()
    navigate('/', { replace: true })
  }

  const handleRerollTheme = () => {
    const currentIndex = adventureThemes.findIndex((theme) => theme.id === themeId)
    const nextIndex = (currentIndex + 1 + Math.floor(Math.random() * (adventureThemes.length - 1))) % adventureThemes.length
    setThemeId(adventureThemes[nextIndex].id)
  }

  if (!selectedJob) {
    return <Navigate to="/class-select" replace />
  }

  if (!selectedTheme) {
    return <Navigate to="/ability-scores" replace />
  }

  return (
    <main className="page-shell" data-theme="light">
      <PageHeader
        title="冒険テーマ"
        backAction={{ label: '戻る', href: '/ability-scores', variant: 'outline' }}
        nextAction={{ label: '次へ', href: '/background', variant: 'primary' }}
        restartAction={{ label: '最初から', onClick: handleRestart, variant: 'error' }}
      />
      <section className="page-panel w-full max-w-[1440px] p-5 xl:p-6">
        <div className="page-stack gap-4">
          <section className="card border border-secondary/35 bg-gradient-to-br from-base-100 to-base-200/80">
            <div className="card-body gap-4 p-5 xl:grid xl:grid-cols-[minmax(0,1fr)_220px] xl:items-center">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-base-content/55">
                    今回の作風
                  </p>
                  <h2 className="mt-1 font-[var(--heading-font)] text-3xl text-neutral xl:text-4xl">
                    {selectedTheme.name}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-secondary xl:justify-self-end"
                onClick={handleRerollTheme}
              >
                ランダム
              </button>
              <p className="text-base leading-7 text-base-content xl:col-span-2">
                {selectedTheme.summary}
              </p>
              <p className="rounded-2xl border border-base-300 bg-base-100/75 px-4 py-3 text-sm leading-7 text-base-content/80 xl:col-span-2">
                {selectedTheme.vibe}
              </p>
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
            {adventureThemes.map((theme) => {
              const isSelected = theme.id === selectedTheme.id

              return (
                <button
                  key={theme.id}
                  type="button"
                  className={[
                    'card border p-4 text-left transition',
                    isSelected
                      ? 'border-primary bg-base-100 shadow-md'
                      : 'border-base-300 bg-base-100/70 hover:border-secondary hover:bg-base-100',
                  ].join(' ')}
                  onClick={() => setThemeId(theme.id)}
                >
                  <strong className="font-[var(--heading-font)] text-lg text-neutral">
                    {theme.name}
                  </strong>
                  <p className="mt-2 text-sm leading-6 text-base-content/75">
                    {theme.summary}
                  </p>
                </button>
              )
            })}
          </section>
        </div>
      </section>
    </main>
  )
}
