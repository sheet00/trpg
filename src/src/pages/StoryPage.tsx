import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import gmPrompt from '../assets/02_gm.md?raw'
import judgePrompt from '../assets/03_judge.md?raw'
import { characterClasses } from '../data/classes'
import {
  getStoredActiveItemIds,
  getStoredBackgroundData,
  getStoredAbilityScores,
  getStoredClassId,
  getStoredDiceRoll,
  getStoredJudgeResult,
  getStoredPlayerAction,
  getStoredSelectedItems,
  getStoredStories,
  getStoredStoryScene,
  setStoredActiveItemIds,
  setStoredDiceRoll,
  setStoredJudgeResult,
  setStoredPlayerAction,
  setStoredStoryScene,
  setStoredStories,
  type JudgeResult,
  type StoryScene,
} from '../lib/character-storage'

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY
const MODEL_NAME = import.meta.env.VITE_MODEL_ID

const abilityLabels = {
  strength: '筋力',
  dexterity: '敏捷',
  constitution: '耐久',
  intelligence: '知力',
  wisdom: '判断力',
  charisma: '魅力',
} as const

function getAbilityRows() {
  const scores = getStoredAbilityScores()

  return [
    ['筋力', scores.strength],
    ['敏捷', scores.dexterity],
    ['耐久', scores.constitution],
    ['知力', scores.intelligence],
    ['判断力', scores.wisdom],
    ['魅力', scores.charisma],
  ] as const
}

function extractTextContent(content: unknown) {
  if (typeof content === 'string') {
    return content
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') {
          return item
        }

        if (
          typeof item === 'object' &&
          item !== null &&
          'type' in item &&
          item.type === 'text' &&
          'text' in item &&
          typeof item.text === 'string'
        ) {
          return item.text
        }

        return ''
      })
      .join('\n')
      .trim()
  }

  return ''
}

function getAbilityModifier(ability: string | null) {
  const scores = getStoredAbilityScores()

  switch (ability) {
    case 'strength':
      return Math.floor((scores.strength - 10) / 2)
    case 'dexterity':
      return Math.floor((scores.dexterity - 10) / 2)
    case 'constitution':
      return Math.floor((scores.constitution - 10) / 2)
    case 'intelligence':
      return Math.floor((scores.intelligence - 10) / 2)
    case 'wisdom':
      return Math.floor((scores.wisdom - 10) / 2)
    case 'charisma':
      return Math.floor((scores.charisma - 10) / 2)
    default:
      return 0
  }
}

export function StoryPage() {
  const selectedClassId = getStoredClassId()
  const selectedJob = characterClasses.find((job) => job.id === selectedClassId)
  const selectedItems = getStoredSelectedItems()
  const backgroundData = getStoredBackgroundData()
  const abilityRows = getAbilityRows()
  const [generatedScene, setGeneratedScene] = useState<StoryScene | null>(() =>
    getStoredStoryScene(),
  )
  const [judgeResult, setJudgeResult] = useState<JudgeResult | null>(() =>
    getStoredJudgeResult(),
  )
  const [diceRoll, setDiceRoll] = useState<number | null>(() => getStoredDiceRoll())
  const [rollingValue, setRollingValue] = useState<number>(1)
  const [activeItemIds, setActiveItemIdsState] = useState<string[]>(() =>
    getStoredActiveItemIds(),
  )
  const [playerAction, setPlayerActionState] = useState(() => getStoredPlayerAction())
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  if (!selectedJob || selectedItems.length === 0 || !backgroundData) {
    return <Navigate to="/background" replace />
  }

  const availableActiveItemIds = activeItemIds.filter((itemId) =>
    selectedItems.some((item) => item.id === itemId),
  )
  const activeItems = selectedItems.filter((item) =>
    availableActiveItemIds.includes(item.id),
  )
  const isRolling = judgeResult?.needs_roll === true && diceRoll === null

  useEffect(() => {
    if (!isRolling) {
      return
    }

    const intervalId = window.setInterval(() => {
      setRollingValue(Math.floor(Math.random() * 20) + 1)
    }, 80)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [isRolling])

  const setPlayerAction = (value: string) => {
    setPlayerActionState(value)
    setStoredPlayerAction(value)
  }

  const handleToggleActiveItem = (itemId: string) => {
    const nextIds = availableActiveItemIds.includes(itemId)
      ? availableActiveItemIds.filter((currentItemId) => currentItemId !== itemId)
      : [...availableActiveItemIds, itemId]

    setActiveItemIdsState(nextIds)
    setStoredActiveItemIds(nextIds)
  }

  const handleGenerateScene = async () => {
    if (!OPENROUTER_API_KEY || !MODEL_NAME) {
      setErrorMessage('.env の API 設定が不足しています。')
      return
    }

    setIsLoading(true)
    setErrorMessage('')

    const userPrompt = [
      '# background',
      `title: ${backgroundData.intro_title}`,
      `text: ${backgroundData.intro_text}`,
      '',
      '# character',
      `class: ${selectedJob.name}`,
      '',
      '# status',
      ...abilityRows.map(([label, value]) => `${label}: ${value}`),
      '',
      '# items',
      ...selectedItems.map(
        (item) =>
          `- ${item.name} | ${item.category} | ${item.description}`,
      ),
    ].join('\n')

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'D&D',
        },
        body: JSON.stringify({
          model: MODEL_NAME,
          messages: [
            { role: 'system', content: gmPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'story_scene_response',
              strict: true,
              schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  scene_title: { type: 'string' },
                  scene_text: { type: 'string' },
                },
                required: ['scene_title', 'scene_text'],
              },
            },
          },
        }),
      })

      const data = (await response.json()) as {
        error?: { message?: string }
        choices?: Array<{ message?: { content?: unknown } }>
      }

      if (!response.ok) {
        throw new Error(data.error?.message ?? `HTTP error: ${response.status}`)
      }

      const content = extractTextContent(data.choices?.[0]?.message?.content)

      if (!content) {
        throw new Error('生成結果が空でした。')
      }

      const parsed = JSON.parse(content) as StoryScene
      setGeneratedScene(parsed)
      setStoredStoryScene(parsed)
      setStoredStories([parsed])
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'シーン生成中に不明なエラーが発生しました。',
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleStartTurn = async () => {
    if (!OPENROUTER_API_KEY || !MODEL_NAME) {
      setErrorMessage('.env の API 設定が不足しています。')
      return
    }

    const trimmedAction = playerAction.trim()

    if (!trimmedAction) {
      setErrorMessage('ユーザー行動を入力してください。')
      return
    }

    setIsLoading(true)
    setErrorMessage('')

    const storedStories = getStoredStories()
    const stories = storedStories.length > 0 ? storedStories : generatedScene ? [generatedScene] : []

    const userPrompt = [
      '# background',
      `title: ${backgroundData.intro_title}`,
      `text: ${backgroundData.intro_text}`,
      '',
      '# stories',
      JSON.stringify(stories, null, 2),
      '',
      '# character',
      `class: ${selectedJob.name}`,
      '',
      '# status',
      ...abilityRows.map(([label, value]) => `${label}: ${value}`),
      '',
      '# owned_items',
      ...selectedItems.map(
        (item) => `- ${item.name} | ${item.category} | ${item.description}`,
      ),
      '',
      '# active_items',
      ...(activeItems.length > 0
        ? activeItems.map(
            (item) => `- ${item.name} | ${item.category} | ${item.description}`,
          )
        : ['- なし']),
      '',
      '# player_action',
      trimmedAction,
    ].join('\n')

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'D&D',
        },
        body: JSON.stringify({
          model: MODEL_NAME,
          messages: [
            { role: 'system', content: judgePrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'judge_turn_response',
              strict: true,
              schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  needs_roll: { type: 'boolean' },
                  ability: {
                    anyOf: [
                      {
                        type: 'string',
                        enum: [
                          'strength',
                          'dexterity',
                          'constitution',
                          'intelligence',
                          'wisdom',
                          'charisma',
                        ],
                      },
                      { type: 'null' },
                    ],
                  },
                  skill: {
                    anyOf: [{ type: 'string' }, { type: 'null' }],
                  },
                  difficulty: {
                    anyOf: [{ type: 'integer' }, { type: 'null' }],
                  },
                  message: { type: 'string' },
                },
                required: ['needs_roll', 'ability', 'skill', 'difficulty', 'message'],
              },
            },
          },
        }),
      })

      const data = (await response.json()) as {
        error?: { message?: string }
        choices?: Array<{ message?: { content?: unknown } }>
      }

      if (!response.ok) {
        throw new Error(data.error?.message ?? `HTTP error: ${response.status}`)
      }

      const content = extractTextContent(data.choices?.[0]?.message?.content)

      if (!content) {
        throw new Error('判定結果が空でした。')
      }

      const parsed = JSON.parse(content) as JudgeResult
      setJudgeResult(parsed)
      setStoredJudgeResult(parsed)
      setDiceRoll(null)
      setStoredDiceRoll(null)
      setRollingValue(Math.floor(Math.random() * 20) + 1)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'ターン開始中に不明なエラーが発生しました。',
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleRollDice = () => {
    if (!isRolling) {
      return
    }

    setDiceRoll(rollingValue)
    setStoredDiceRoll(rollingValue)
  }

  const modifier = judgeResult?.needs_roll ? getAbilityModifier(judgeResult.ability) : 0
  const displayRoll = diceRoll ?? (isRolling ? rollingValue : null)
  const totalRoll = displayRoll !== null ? displayRoll + modifier : null
  const isSuccess =
    totalRoll !== null && judgeResult?.difficulty !== null
      ? totalRoll >= judgeResult.difficulty
      : null

  return (
    <main className="min-h-screen px-4 py-6" data-theme="light">
      <section className="mx-auto w-full max-w-[1240px] rounded-[28px] border border-base-300 bg-base-100/95 p-5 shadow-[0_24px_48px_rgba(12,8,5,0.22)] backdrop-blur-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-[var(--heading-font)] text-4xl text-neutral">
              物語開始
            </h1>
          </div>
          <Link
            to="/background"
            className="btn btn-outline"
          >
            背景設定へ戻る
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-[360px_minmax(0,1fr)] gap-4">
          <aside className="flex flex-col gap-5">
            <section className="card border border-base-300 bg-base-200/70">
              <div className="card-body p-4">
              <h2 className="font-[var(--heading-font)] text-2xl text-neutral">
                キャラクター
              </h2>
              <p className="mt-3 text-base text-base-content">{selectedJob.name}</p>
              <div className="mt-4 flex flex-col gap-2 text-sm text-base-content">
                {abilityRows.map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-4">
                    <span className="text-base-content/60">{label}</span>
                    <strong className="text-neutral">{value}</strong>
                  </div>
                ))}
              </div>
              </div>
            </section>

            <section className="card border border-base-300 bg-base-200/70">
              <div className="card-body p-4">
              <h2 className="font-[var(--heading-font)] text-2xl text-neutral">
                選択したアイテム
              </h2>
              <p className="mt-2 text-sm text-base-content/60">
                行動時に使うアイテムを選択してください。
              </p>
              <div className="mt-4 flex flex-col gap-3">
                {selectedItems.map((item) => (
                  <label
                    key={item.id}
                    className={[
                      'card grid cursor-pointer grid-cols-[20px_minmax(0,1fr)] gap-3 border p-3 transition',
                      availableActiveItemIds.includes(item.id)
                        ? 'border-primary bg-base-100'
                        : 'border-base-300 bg-base-100/75 hover:border-secondary hover:bg-base-100',
                    ].join(' ')}
                  >
                    <input
                      type="checkbox"
                      checked={availableActiveItemIds.includes(item.id)}
                      onChange={() => handleToggleActiveItem(item.id)}
                      className="checkbox checkbox-primary checkbox-sm mt-1"
                    />
                    <div>
                      <div className="flex items-baseline justify-between gap-4">
                        <strong className="text-base text-neutral">
                          {item.name}
                        </strong>
                        <span className="badge badge-outline badge-sm border-base-300 text-base-content/70">
                          {item.category}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-base-content">
                        {item.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
              </div>
            </section>
          </aside>

          <section className="card border border-base-300 bg-base-200/70">
            <div className="card-body p-5">
            <h2 className="font-[var(--heading-font)] text-3xl text-neutral">
              本編開始
            </h2>
            <div className="mt-4">
              <button
                type="button"
                className="btn btn-primary disabled:opacity-50"
                onClick={handleGenerateScene}
                disabled={isLoading}
              >
                {isLoading ? '生成中...' : 'シーン生成'}
              </button>
            </div>
            {errorMessage ? (
              <p className="alert alert-error mt-4 text-sm">
                {errorMessage}
              </p>
            ) : null}
            <div className="card mt-4 border border-base-300 bg-base-100/85">
              <div className="card-body p-4">
              {generatedScene ? (
                <div>
                  <h3 className="font-[var(--heading-font)] text-2xl text-neutral">
                    {generatedScene.scene_title}
                  </h3>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-base-content">
                    {generatedScene.scene_text}
                  </p>
                </div>
              ) : null}
              </div>
            </div>
            <div className="card mt-4 border border-base-300 bg-base-100/85">
              <div className="card-body p-4">
              <p className="text-sm text-base-content/60">今回使うアイテム</p>
              {activeItems.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {activeItems.map((item) => (
                    <span
                      key={item.id}
                      className="badge badge-primary h-auto px-3 py-3 text-sm"
                    >
                      {item.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-base-content">
                  まだ選択されていません。
                </p>
              )}
              </div>
            </div>
            <div className="mt-4">
              <label
                htmlFor="player-action"
                className="text-sm text-base-content/60"
              >
                ユーザー行動
              </label>
              <textarea
                id="player-action"
                value={playerAction}
                onChange={(event) => setPlayerAction(event.target.value)}
                placeholder="どう行動するか入力"
                className="textarea textarea-bordered mt-2 min-h-[140px] w-full bg-base-100 text-sm leading-7 text-base-content placeholder:text-base-content/50"
              />
            </div>
            {judgeResult ? (
              <div className="card mt-4 border border-base-300 bg-base-100/85">
                <div className="card-body p-4">
                <p className="text-sm leading-7 text-base-content">
                  {judgeResult.message}
                </p>
                {judgeResult.needs_roll ? (
                  <div className="mt-3 flex flex-wrap gap-3 text-sm text-base-content">
                    <span className="badge badge-outline h-auto border-base-300 px-3 py-2">
                      能力値: {judgeResult.ability}
                    </span>
                    <span className="badge badge-outline h-auto border-base-300 px-3 py-2">
                      技能: {judgeResult.skill}
                    </span>
                    <span className="badge badge-outline h-auto border-base-300 px-3 py-2">
                      難易度: {judgeResult.difficulty}
                    </span>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-base-content/60">
                    判定不要
                  </p>
                )}
                </div>
              </div>
            ) : null}
            {judgeResult?.needs_roll ? (
              <div className="card mt-4 border border-base-300 bg-base-100/85">
                <div className="card-body p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-base-content/60">d20 判定</p>
                    <p className="mt-1 text-sm text-base-content">
                      {judgeResult.ability
                        ? `${abilityLabels[judgeResult.ability as keyof typeof abilityLabels]}修正 ${modifier >= 0 ? `+${modifier}` : modifier}`
                        : '修正値 0'}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary disabled:opacity-50"
                    onClick={handleRollDice}
                    disabled={!isRolling}
                  >
                    決定
                  </button>
                </div>
                <div className="stats stats-vertical mt-4 grid grid-cols-5 gap-3 bg-transparent shadow-none lg:stats-horizontal">
                  <div className="stat rounded-2xl border border-primary bg-base-100 text-center">
                    <p className="stat-title text-base-content/60">出目</p>
                    <p className="stat-value mt-2 text-4xl font-bold leading-none text-neutral">
                      {displayRoll ?? '-'}
                    </p>
                  </div>
                  <div className="stat rounded-xl border border-base-300 bg-base-200/70">
                    <p className="stat-title text-base-content/60">修正値</p>
                    <p className="stat-value mt-1 text-lg font-semibold text-neutral">
                      {modifier >= 0 ? `+${modifier}` : modifier}
                    </p>
                  </div>
                  <div className="stat rounded-xl border border-base-300 bg-base-200/70">
                    <p className="stat-title text-base-content/60">合計</p>
                    <p className="stat-value mt-1 text-lg font-semibold text-neutral">
                      {totalRoll ?? '-'}
                    </p>
                  </div>
                  <div className="stat rounded-xl border border-base-300 bg-base-200/70">
                    <p className="stat-title text-base-content/60">目標値</p>
                    <p className="stat-value mt-1 text-lg font-semibold text-neutral">
                      {judgeResult.difficulty ?? '-'}
                    </p>
                  </div>
                  <div className="stat rounded-xl border border-base-300 bg-base-200/70">
                    <p className="stat-title text-base-content/60">結果</p>
                    <p className="stat-value mt-1 text-lg font-semibold text-neutral">
                      {isSuccess === null ? '-' : isSuccess ? '成功' : '失敗'}
                    </p>
                  </div>
                </div>
                </div>
              </div>
            ) : null}
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleStartTurn}
                disabled={isLoading}
              >
                {isLoading ? '判定中...' : 'ターン開始'}
              </button>
            </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}
