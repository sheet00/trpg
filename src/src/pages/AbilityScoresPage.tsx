import { useEffect, useState } from 'react'
import { Navigate, Link, useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { characterClasses } from '../data/classes'
import {
  clearAllStoredGameData,
  defaultAbilityScores,
  getStoredAbilityScores,
  getStoredClassId,
  setStoredAbilityScores,
  type AbilityScores,
} from '../lib/character-storage'

const scoreCosts: Record<number, number> = {
  8: 0,
  9: 1,
  10: 2,
  11: 3,
  12: 4,
  13: 5,
  14: 7,
  15: 9,
}

const abilityDefinitions: Array<{
  key: keyof AbilityScores
  label: string
  short: string
  description: string
}> = [
  {
    key: 'strength',
    label: '筋力',
    short: 'STR',
    description: '近接攻撃や重量物の扱いに関わる。',
  },
  {
    key: 'dexterity',
    label: '敏捷',
    short: 'DEX',
    description: '回避、先制、隠密、遠隔攻撃に関わる。',
  },
  {
    key: 'constitution',
    label: '耐久',
    short: 'CON',
    description: '最大HPや過酷な状況への耐性に関わる。',
  },
  {
    key: 'intelligence',
    label: '知力',
    short: 'INT',
    description: '知識、調査、学術的な判断に関わる。',
  },
  {
    key: 'wisdom',
    label: '判断力',
    short: 'WIS',
    description: '知覚、洞察、直感、精神面の安定に関わる。',
  },
  {
    key: 'charisma',
    label: '魅力',
    short: 'CHA',
    description: '説得、威圧、存在感、意思の強さに関わる。',
  },
]

function getScoreCost(score: number) {
  return scoreCosts[score] ?? 0
}

function getTotalCost(scores: AbilityScores) {
  return abilityDefinitions.reduce(
    (total, ability) => total + getScoreCost(scores[ability.key]),
    0,
  )
}

function getModifier(score: number) {
  return Math.floor((score - 10) / 2)
}

export function AbilityScoresPage() {
  const navigate = useNavigate()
  const selectedClassId = getStoredClassId()
  const selectedJob = characterClasses.find((job) => job.id === selectedClassId)
  const [scores, setScores] = useState(() => getStoredAbilityScores())

  useEffect(() => {
    setStoredAbilityScores(scores)
  }, [scores])

  if (!selectedJob) {
    return <Navigate to="/class-select" replace />
  }

  const totalPoints = getTotalCost(scores)
  const remainingPoints = 27 - totalPoints

  const handleScoreChange = (abilityKey: keyof AbilityScores, nextValue: number) => {
    const nextScores = {
      ...scores,
      [abilityKey]: nextValue,
    }

    if (getTotalCost(nextScores) > 27) {
      return
    }

    setScores(nextScores)
  }

  const handleReset = () => {
    setScores(defaultAbilityScores)
  }

  const handleRestart = () => {
    clearAllStoredGameData()
    navigate('/class-select', { replace: true })
  }

  return (
    <main className="min-h-screen px-6 py-8" data-theme="light">
      <section className="mx-auto w-full max-w-[980px] rounded-[28px] border border-base-300 bg-base-100/95 p-7 shadow-[0_24px_48px_rgba(12,8,5,0.22)] backdrop-blur-sm">
        <div className="flex items-center justify-between gap-4">
          <PageHeader
            title="能力値"
            subtitle={selectedJob.name}
            backAction={{ label: '戻る', href: '/class-select', variant: 'outline' }}
            nextAction={{ label: '次へ', href: '/background', variant: 'primary' }}
            restartAction={{ label: '最初から', onClick: handleRestart, variant: 'error' }}
          />
        </div>

        <section className="stats mt-5 grid grid-cols-3 gap-3 bg-transparent shadow-none">
          <div className="stat rounded-2xl border border-base-300 bg-base-200/70">
            <span className="stat-title text-sm uppercase tracking-[0.18em] text-base-content/60">
              残りポイント
            </span>
            <strong className="stat-value mt-1 block font-[var(--heading-font)] text-2xl text-neutral">
              {remainingPoints}
            </strong>
          </div>
          <div className="stat rounded-2xl border border-base-300 bg-base-200/70">
            <span className="stat-title text-sm uppercase tracking-[0.18em] text-base-content/60">
              消費ポイント
            </span>
            <strong className="stat-value mt-1 block font-[var(--heading-font)] text-2xl text-neutral">
              {totalPoints} / 27
            </strong>
          </div>
          <div className="stat rounded-2xl border border-base-300 bg-base-200/70">
            <span className="stat-title text-sm uppercase tracking-[0.18em] text-base-content/60">
              選択クラス
            </span>
            <strong className="stat-value mt-1 block font-[var(--heading-font)] text-2xl text-neutral">
              {selectedJob.name}
            </strong>
          </div>
        </section>

        <section className="mt-5 flex flex-col gap-3">
          {abilityDefinitions.map((ability) => {
            const score = scores[ability.key]
            const modifier = getModifier(score)

            return (
              <div key={ability.key} className="card border border-base-300 bg-base-200/70">
                <div className="card-body gap-3 p-4">
                  <div className="flex items-baseline gap-3">
                    <span className="font-[var(--heading-font)] text-lg text-neutral">
                      {ability.short}: {ability.label}
                    </span>
                    <span className="text-base text-base-content/60">{ability.description}</span>
                  </div>
                  <div className="grid grid-cols-[minmax(0,1fr)_88px] items-center gap-4">
                    <input
                      type="range"
                      min="8"
                      max="15"
                      value={score}
                      className="range range-primary range-sm w-full"
                      onChange={(event) =>
                        handleScoreChange(ability.key, Number(event.target.value))
                      }
                    />
                    <span className="text-right text-base text-base-content">
                      {score} ({modifier >= 0 ? `+${modifier}` : modifier})
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </section>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            className="btn btn-outline btn-secondary"
            onClick={handleReset}
          >
            8にリセット
          </button>
        </div>
      </section>
    </main>
  )
}
