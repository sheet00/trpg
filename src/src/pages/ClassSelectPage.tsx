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
    <main className="min-h-screen px-6 py-8" data-theme="light">
      <section className="mx-auto w-full max-w-[1380px] rounded-[28px] border border-base-300 bg-base-100/95 p-8 shadow-[0_24px_48px_rgba(12,8,5,0.22)] backdrop-blur-sm">
        <p className="text-xs uppercase tracking-[0.24em] text-base-content/60">
          Solo TRPG / Character Setup
        </p>
        <h1 className="mt-3 font-[var(--heading-font)] text-5xl leading-none text-neutral">
          冒険のはじまりに、職業を選ぶ
        </h1>
        <p className="mt-5 max-w-3xl text-base text-base-content">
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
                  <span className="text-[15px] leading-7 text-base-content">{job.summary}</span>
                  <div className="flex flex-wrap gap-2">
                    <span className="badge badge-outline border-secondary text-secondary">
                      戦い方: {job.style}
                    </span>
                    <span className="badge badge-outline border-accent text-accent">
                      特徴: {job.feature}
                    </span>
                    <span className="badge badge-outline border-base-300 text-base-content/70">
                      難しさ: {job.difficulty}
                    </span>
                  </div>
                  <ul className="ml-4 flex list-disc flex-col gap-1 text-sm text-base-content">
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
            <p className="text-xs uppercase tracking-[0.24em] text-base-content/60">
              現在の選択
            </p>
            <p className="mt-2 font-[var(--heading-font)] text-[30px] text-neutral">
              {selectedJob.name}
            </p>
            <dl className="mt-4 flex gap-8 text-sm">
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
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleNext}
          >
            能力値の割り振りへ進む
          </button>
        </section>
      </section>
    </main>
  )
}
