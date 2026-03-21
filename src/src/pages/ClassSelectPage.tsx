import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { characterClasses } from '../data/classes'
import { useGameStore } from '../store/game-store'

export function ClassSelectPage() {
  const navigate = useNavigate()
  const storedSelectedClassId = useGameStore((state) => state.selectedClassId)
  const resetGame = useGameStore((state) => state.resetGame)
  const setSelectedClassId = useGameStore((state) => state.setSelectedClassId)
  const [selectedClass, setSelectedClass] = useState(
    () => storedSelectedClassId ?? characterClasses[0].id,
  )
  const selectedJob =
    characterClasses.find((job) => job.id === selectedClass) ?? characterClasses[0]

  const handleSelectClass = (classId: string) => {
    setSelectedClass(classId)
    setSelectedClassId(classId)
  }

  const handleNext = () => {
    setSelectedClassId(selectedClass)
    navigate('/ability-scores')
  }

  const handleRestart = () => {
    resetGame()
    navigate('/', { replace: true })
  }

  useEffect(() => {
    document.title = 'クラス選択 | TRPG'
  }, [])

  return (
    <main className="page-shell" data-theme="light">
      <PageHeader
        title="冒険のはじまりに、職業を選ぶ"
        backAction={{ label: '戻る', disabled: true, variant: 'outline' }}
        nextAction={{ label: '次へ', onClick: handleNext, variant: 'primary' }}
        restartAction={{ label: '最初から', onClick: handleRestart, variant: 'error' }}
      />
      <section className="page-panel w-full max-w-[1380px] p-8">
        <p className="text-sm uppercase tracking-[0.24em] text-base-content/60">
          Solo TRPG / Character Setup
        </p>

        <div className="mt-9 grid grid-cols-3 gap-6">
          {characterClasses.map((job) => {
            const isSelected = job.id === selectedClass

            return (
              <button
                key={job.id}
                type="button"
                className={[
                  'card border text-left transition',
                  isSelected
                    ? 'border-primary bg-base-100 shadow-xl ring-1 ring-primary/20'
                    : 'border-base-300 bg-base-200/70 hover:border-secondary hover:bg-base-100',
                ].join(' ')}
                onClick={() => handleSelectClass(job.id)}
              >
                <div className="card-body gap-4 p-6">
                  <strong className="font-[var(--heading-font)] text-[30px] leading-none text-neutral">
                    {job.name}
                  </strong>
                  <span className="text-base leading-7 text-base-content">{job.summary}</span>
                  <div className="flex flex-wrap gap-2">
                    <span className="badge badge-outline border-secondary text-secondary">
                      戦い方: {job.style}
                    </span>
                    <span className="badge badge-outline border-accent text-accent">
                      特徴: {job.feature}
                    </span>
                    <span className="badge badge-outline border-base-300 px-3 py-2 text-sm text-base-content/70">
                      難しさ: {job.difficulty}
                    </span>
                  </div>
                  <ul className="ml-4 flex list-disc flex-col gap-1 text-base text-base-content">
                    {job.traits.map((trait) => (
                      <li key={trait}>{trait}</li>
                    ))}
                  </ul>
                </div>
              </button>
            )
          })}
        </div>

        <section className="mt-8 flex items-end justify-between gap-8 border-t border-base-300 pt-6">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-base-content/60">
              現在の選択
            </p>
            <p className="mt-2 font-[var(--heading-font)] text-[30px] text-neutral">
              {selectedJob.name}
            </p>
            <dl className="mt-4 flex gap-8 text-base">
              <div className="flex flex-col gap-1">
                <dt className="text-base-content/60">戦い方:</dt>
                <dd>{selectedJob.style}</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-base-content/60">特徴:</dt>
                <dd>{selectedJob.feature}</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-base-content/60">難しさ:</dt>
                <dd>{selectedJob.difficulty}</dd>
              </div>
            </dl>
            <p className="mt-4 max-w-3xl text-base text-base-content">
              {selectedJob.summary}
            </p>
          </div>
          <div />
        </section>
      </section>
    </main>
  )
}
