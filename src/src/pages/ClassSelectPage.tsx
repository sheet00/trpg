import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { characterClasses } from '../data/classes'
import { getStoredClassId, setStoredClassId } from '../lib/character-storage'

export function ClassSelectPage() {
  const navigate = useNavigate()
  const [selectedClass, setSelectedClass] = useState(
    () => getStoredClassId() ?? characterClasses[0].id,
  )
  const selectedJob =
    characterClasses.find((job) => job.id === selectedClass) ?? characterClasses[0]

  const handleSelectClass = (classId: string) => {
    setSelectedClass(classId)
    setStoredClassId(classId)
  }

  const handleNext = () => {
    setStoredClassId(selectedClass)
    navigate('/ability-scores')
  }

  return (
    <main className="min-h-screen px-6 py-8">
      <section className="mx-auto w-full max-w-[1380px] rounded-[28px] border border-[color:var(--border)] bg-[color:var(--panel)]/95 p-8 shadow-[0_24px_48px_rgba(12,8,5,0.22)] backdrop-blur-sm">
        <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--muted-text)]">
          Solo TRPG / Character Setup
        </p>
        <h1 className="mt-3 font-[var(--heading-font)] text-5xl leading-none text-[color:var(--heading-text)]">
          冒険のはじまりに、職業を選ぶ
        </h1>
        <p className="mt-5 max-w-3xl text-base text-[color:var(--body-text)]">
          あなたの職業を決めてください。
        </p>

        <div className="mt-9 grid grid-cols-3 gap-6">
          {characterClasses.map((job) => {
            const isSelected = job.id === selectedClass

            return (
              <button
                key={job.id}
                type="button"
                className={[
                  'flex w-full flex-col gap-3 rounded-2xl border bg-white/35 px-6 py-6 text-left transition',
                  'border-[color:var(--border)] text-[color:var(--body-text)] hover:bg-white/55',
                  isSelected ? 'border-[color:var(--heading-text)] bg-white/70 shadow-[0_12px_24px_rgba(12,8,5,0.08)]' : '',
                ].join(' ')}
                onClick={() => handleSelectClass(job.id)}
              >
                <strong className="font-[var(--heading-font)] text-[30px] leading-none text-[color:var(--heading-text)]">
                  {job.name}
                </strong>
                <span className="text-[15px] leading-7">{job.summary}</span>
                <div className="flex flex-col gap-1 text-sm text-[color:var(--muted-text)]">
                  <span>戦い方: {job.style}</span>
                  <span>特徴: {job.feature}</span>
                  <span>難しさ: {job.difficulty}</span>
                </div>
                <ul className="ml-4 flex list-disc flex-col gap-1 text-sm text-[color:var(--body-text)]">
                  {job.traits.map((trait) => (
                    <li key={trait}>{trait}</li>
                  ))}
                </ul>
              </button>
            )
          })}
        </div>

        <section className="mt-8 flex items-end justify-between gap-8 border-t border-[color:var(--border)] pt-6">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--muted-text)]">
              現在の選択
            </p>
            <p className="mt-2 font-[var(--heading-font)] text-[30px] text-[color:var(--heading-text)]">
              {selectedJob.name}
            </p>
            <dl className="mt-4 flex gap-8 text-sm">
              <div className="flex flex-col gap-1">
                <dt className="text-[color:var(--muted-text)]">戦い方:</dt>
                <dd>{selectedJob.style}</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-[color:var(--muted-text)]">特徴:</dt>
                <dd>{selectedJob.feature}</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-[color:var(--muted-text)]">難しさ:</dt>
                <dd>{selectedJob.difficulty}</dd>
              </div>
            </dl>
            <p className="mt-4 max-w-3xl text-base text-[color:var(--body-text)]">
              {selectedJob.summary}
            </p>
          </div>
          <button
            type="button"
            className="rounded-xl border border-[color:var(--heading-text)] px-5 py-3 text-sm font-medium text-[color:var(--heading-text)] transition hover:bg-[color:var(--heading-text)] hover:text-[color:var(--panel)]"
            onClick={handleNext}
          >
            能力値の割り振りへ進む
          </button>
        </section>
      </section>
    </main>
  )
}
