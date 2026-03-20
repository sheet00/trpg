import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import gmPrompt from '../assets/02_gm.md?raw'
import continueGmPrompt from '../assets/04_gm.md?raw'
import judgePrompt from '../assets/03_judge.md?raw'
import { PageHeader } from '../components/PageHeader'
import { characterClasses } from '../data/classes'
import {
  clearStoredStoryTurnsAfter,
  clearAllStoredGameData,
  createEmptyStoryTurn,
  getStoredActiveItemIds,
  getStoredBackgroundData,
  getStoredAbilityScores,
  getStoredClassId,
  getStoredDiceRoll,
  getStoredJudgeResult,
  getStoredPlayerAction,
  getStoredSelectedItems,
  getStoredStoryScene,
  getStoredStoryTurn,
  getStoredStoryTurns,
  setStoredSelectedItems,
  setStoredActiveItemIds,
  setStoredDiceRoll,
  setStoredJudgeResult,
  setStoredPlayerAction,
  setStoredStoryScene,
  setStoredStoryTurn,
  setStoredStories,
  type JudgeResult,
  type StoryScene,
  type StoryTurn,
} from '../lib/character-storage'

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY
const MODEL_NAME = import.meta.env.VITE_MODEL_ID
const IS_DEV = import.meta.env.DEV

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

function getTurnOutcome(turn: StoryTurn) {
  if (!turn.judgeResult?.needs_roll) {
    return turn.judgeResult ? '判定不要' : null
  }

  if (turn.diceRoll === null || turn.judgeResult.difficulty === null) {
    return null
  }

  const modifier = getAbilityModifier(turn.judgeResult.ability)
  const total = turn.diceRoll + modifier

  return total >= turn.judgeResult.difficulty ? '成功' : '失敗'
}

export function StoryPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedClassId = getStoredClassId()
  const selectedJob = characterClasses.find((job) => job.id === selectedClassId)
  const selectedItems = getStoredSelectedItems()
  const backgroundData = getStoredBackgroundData()
  const abilityRows = getAbilityRows()
  const turnFromSearchParams = Number(searchParams.get('turn') ?? '1')
  const currentTurnNumber =
    Number.isInteger(turnFromSearchParams) && turnFromSearchParams > 0 ? turnFromSearchParams : 1
  const [generatedScene, setGeneratedScene] = useState<StoryScene | null>(null)
  const [judgeResult, setJudgeResult] = useState<JudgeResult | null>(null)
  const [diceRoll, setDiceRoll] = useState<number | null>(null)
  const [rollingValue, setRollingValue] = useState<number>(1)
  const [activeItemIds, setActiveItemIdsState] = useState<string[]>([])
  const [playerAction, setPlayerActionState] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSceneLoading, setIsSceneLoading] = useState(false)
  const [isJudgeLoading, setIsJudgeLoading] = useState(false)

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
    if (searchParams.get('turn') === String(currentTurnNumber)) {
      return
    }

    setSearchParams({ turn: String(currentTurnNumber) }, { replace: true })
  }, [currentTurnNumber, searchParams, setSearchParams])

  useEffect(() => {
    let storedTurn = getStoredStoryTurn(currentTurnNumber)

    if (
      currentTurnNumber === 1 &&
      storedTurn.scene === null &&
      storedTurn.activeItemIds.length === 0 &&
      storedTurn.playerAction === '' &&
      storedTurn.judgeResult === null &&
      storedTurn.diceRoll === null
    ) {
      const migratedTurn = {
        turnNumber: 1,
        scene: getStoredStoryScene(),
        activeItemIds: getStoredActiveItemIds(),
        playerAction: getStoredPlayerAction(),
        judgeResult: getStoredJudgeResult(),
        diceRoll: getStoredDiceRoll(),
      }

      const hasLegacyState =
        migratedTurn.scene !== null ||
        migratedTurn.activeItemIds.length > 0 ||
        migratedTurn.playerAction !== '' ||
        migratedTurn.judgeResult !== null ||
        migratedTurn.diceRoll !== null

      if (hasLegacyState) {
        setStoredStoryTurn(migratedTurn)
        storedTurn = migratedTurn
      }
    }

    setGeneratedScene(storedTurn.scene)
    setJudgeResult(storedTurn.judgeResult)
    setDiceRoll(storedTurn.diceRoll)
    setActiveItemIdsState(storedTurn.activeItemIds)
    setPlayerActionState(storedTurn.playerAction)
    setErrorMessage('')
  }, [currentTurnNumber])

  useEffect(() => {
    document.title = `第${currentTurnNumber}章：${generatedScene?.scene_title ?? '幕開け'} | TRPG`
  }, [currentTurnNumber, generatedScene?.scene_title])

  useEffect(() => {
    const storedTurn = getStoredStoryTurn(currentTurnNumber)

    if (generatedScene || storedTurn.scene || isSceneLoading) {
      return
    }

    void handleGenerateScene()
  }, [currentTurnNumber, generatedScene, isSceneLoading])

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

  const persistTurn = (updater: (turn: StoryTurn) => StoryTurn) => {
    const currentTurn = getStoredStoryTurn(currentTurnNumber)
    setStoredStoryTurn(updater(currentTurn))
  }

  const persistCurrentTurnState = () => {
    setStoredStoryTurn({
      turnNumber: currentTurnNumber,
      scene: generatedScene,
      activeItemIds: availableActiveItemIds,
      playerAction,
      judgeResult,
      diceRoll,
    })
  }

  const clearFutureTurns = () => {
    clearStoredStoryTurnsAfter(currentTurnNumber)

    const nextStories = getStoredStoryTurns()
      .filter((turn) => turn.turnNumber <= currentTurnNumber)
      .map((turn) => turn.scene)
      .filter((scene): scene is StoryScene => scene !== null)

    setStoredStories(nextStories)
  }

  const setPlayerAction = (value: string) => {
    setPlayerActionState(value)
    setStoredPlayerAction(value)
    persistTurn((turn) => ({
      ...turn,
      playerAction: value,
    }))
  }

  const handleToggleActiveItem = (itemId: string) => {
    const nextIds = availableActiveItemIds.includes(itemId)
      ? availableActiveItemIds.filter((currentItemId) => currentItemId !== itemId)
      : [...availableActiveItemIds, itemId]

    setActiveItemIdsState(nextIds)
    setStoredActiveItemIds(nextIds)
    persistTurn((turn) => ({
      ...turn,
      activeItemIds: nextIds,
    }))
  }

  const handleGenerateScene = async () => {
    if (!OPENROUTER_API_KEY || !MODEL_NAME) {
      setErrorMessage('.env の API 設定が不足しています。')
      return
    }

    setIsSceneLoading(true)
    setErrorMessage('')

    const storyTurns = getStoredStoryTurns()
      .filter((turn) => turn.turnNumber < currentTurnNumber)
      .map((turn) => ({
        turnNumber: turn.turnNumber,
        scene: turn.scene,
        playerAction: turn.playerAction,
        activeItemIds: turn.activeItemIds,
        judgeResult: turn.judgeResult,
        diceRoll: turn.diceRoll,
        outcome: getTurnOutcome(turn),
      }))
    const previousTurn = storyTurns.at(-1) ?? null
    const systemPrompt = currentTurnNumber === 1 ? gmPrompt : continueGmPrompt

    const userPrompt = [
      '# background',
      JSON.stringify(
        {
          title: backgroundData.intro_title,
          text: backgroundData.intro_text,
        },
        null,
        2,
      ),
      '',
      '# character',
      JSON.stringify(
        {
          class: selectedJob.name,
          abilityScores: Object.fromEntries(abilityRows),
        },
        null,
        2,
      ),
      '',
      '# items',
      JSON.stringify(selectedItems, null, 2),
      '',
      '# story_history',
      JSON.stringify(storyTurns, null, 2),
    ].join('\n')

    const continuePrompt =
      currentTurnNumber === 1
        ? userPrompt
        : [
            userPrompt,
            '',
            '# previous_turn',
            JSON.stringify(previousTurn, null, 2),
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
            { role: 'system', content: systemPrompt },
            { role: 'user', content: continuePrompt },
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
                  items: {
                    type: 'array',
                    items: {
                      type: 'object',
                      additionalProperties: false,
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        description: { type: 'string' },
                        category: { type: 'string' },
                      },
                      required: ['id', 'name', 'description', 'category'],
                    },
                  },
                },
                required: ['scene_title', 'scene_text', 'items'],
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
      clearFutureTurns()
      const nextActiveItemIds = availableActiveItemIds.filter((itemId) =>
        parsed.items.some((item) => item.id === itemId),
      )
      setGeneratedScene(parsed)
      setStoredSelectedItems(parsed.items)
      setActiveItemIdsState(nextActiveItemIds)
      setStoredActiveItemIds(nextActiveItemIds)
      setStoredStoryScene(parsed)
      const nextStories = getStoredStoryTurns()
        .filter((turn) => turn.turnNumber <= currentTurnNumber)
        .map((turn) =>
          turn.turnNumber === currentTurnNumber ? parsed : turn.scene,
        )
        .filter((scene): scene is StoryScene => scene !== null)

      setStoredStories(nextStories)
      persistTurn((turn) => ({
        ...turn,
        scene: parsed,
      }))
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'シーン生成中に不明なエラーが発生しました。',
      )
    } finally {
      setIsSceneLoading(false)
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

    try {
      setIsJudgeLoading(true)
      setErrorMessage('')

      const storyTurns = getStoredStoryTurns()
        .filter((turn) => turn.turnNumber <= currentTurnNumber)
        .map((turn) => ({
          turnNumber: turn.turnNumber,
          scene: turn.scene,
          playerAction: turn.playerAction,
          activeItemIds: turn.activeItemIds,
          judgeResult: turn.judgeResult,
          diceRoll: turn.diceRoll,
          outcome: getTurnOutcome(turn),
        }))

      const userPrompt = [
        '# background',
        JSON.stringify(
          {
            title: backgroundData.intro_title,
            text: backgroundData.intro_text,
          },
          null,
          2,
        ),
        '',
        '# character',
        JSON.stringify(
          {
            class: selectedJob.name,
            abilityScores: Object.fromEntries(abilityRows),
          },
          null,
          2,
        ),
        '',
        '# owned_items',
        JSON.stringify(selectedItems, null, 2),
        '',
        '# active_items',
        JSON.stringify(activeItems, null, 2),
        '',
        '# story_history',
        JSON.stringify(storyTurns, null, 2),
        '',
        '# current_turn',
        JSON.stringify(
          {
            turnNumber: currentTurnNumber,
            scene: generatedScene,
            playerAction: trimmedAction,
            activeItemIds: availableActiveItemIds,
          },
          null,
          2,
        ),
      ].join('\n')

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
      clearFutureTurns()
      setJudgeResult(parsed)
      setStoredJudgeResult(parsed)
      setDiceRoll(null)
      setStoredDiceRoll(null)
      setRollingValue(Math.floor(Math.random() * 20) + 1)
      persistTurn((turn) => ({
        ...turn,
        judgeResult: parsed,
        diceRoll: null,
        playerAction: trimmedAction,
        activeItemIds: availableActiveItemIds,
      }))
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'ターン開始中に不明なエラーが発生しました。',
      )
    } finally {
      setIsJudgeLoading(false)
    }
  }

  const handleRollDice = () => {
    if (!isRolling) {
      return
    }

    setDiceRoll(rollingValue)
    setStoredDiceRoll(rollingValue)
    persistTurn((turn) => ({
      ...turn,
      diceRoll: rollingValue,
    }))
  }

  const handleRerollDice = () => {
    if (!judgeResult?.needs_roll || diceRoll === null || !IS_DEV) {
      return
    }

    const rerolledValue = Math.floor(Math.random() * 20) + 1
    setDiceRoll(rerolledValue)
    setStoredDiceRoll(rerolledValue)
    persistTurn((turn) => ({
      ...turn,
      diceRoll: rerolledValue,
    }))
  }

  const handleAdvanceTurn = () => {
    persistCurrentTurnState()
    setJudgeResult(null)
    setStoredJudgeResult(null)
    setDiceRoll(null)
    setStoredDiceRoll(null)
    const nextTurnNumber = currentTurnNumber + 1
    const nextTurn = getStoredStoryTurn(nextTurnNumber)

    if (
      nextTurn.scene === null &&
      nextTurn.activeItemIds.length === 0 &&
      nextTurn.playerAction === '' &&
      nextTurn.judgeResult === null &&
      nextTurn.diceRoll === null
    ) {
      setStoredStoryTurn(createEmptyStoryTurn(nextTurnNumber))
    }

    setSearchParams({ turn: String(nextTurnNumber) })
  }

  const handlePreviousTurn = () => {
    persistCurrentTurnState()

    if (currentTurnNumber === 1) {
      navigate('/background')
      return
    }

    setSearchParams({ turn: String(currentTurnNumber - 1) })
  }

  const handleRestart = () => {
    clearAllStoredGameData()
    navigate('/class-select', { replace: true })
  }

  const modifier = judgeResult?.needs_roll ? getAbilityModifier(judgeResult.ability) : 0
  const displayRoll = diceRoll ?? (isRolling ? rollingValue : null)
  const totalRoll = displayRoll !== null ? displayRoll + modifier : null
  const isPlayerActionEmpty = playerAction.trim().length === 0
  const isStartTurnDisabled = isJudgeLoading || isPlayerActionEmpty || !generatedScene
  const isSuccess =
    totalRoll !== null && judgeResult?.difficulty !== null
      ? totalRoll >= judgeResult.difficulty
      : null

  return (
    <main className="page-shell px-4" data-theme="light">
      <PageHeader
        title={`第${currentTurnNumber}章：${generatedScene?.scene_title ?? '幕開け'}`}
        backAction={{
          label: '戻る',
          onClick: handlePreviousTurn,
          variant: 'outline',
        }}
        nextAction={{ label: '次へ', onClick: handleAdvanceTurn, variant: 'primary' }}
        restartAction={{ label: '最初から', onClick: handleRestart, variant: 'error' }}
      />
      <section className="page-panel w-full max-w-[1240px] p-5">

        <div className="mt-4 grid grid-cols-[360px_minmax(0,1fr)] gap-4">
          <aside className="flex flex-col gap-5">
            <section className="card border border-base-300 bg-base-200/70">
              <div className="card-body p-4">
              <h2 className="font-[var(--heading-font)] text-2xl text-neutral">
                キャラクター
              </h2>
              <p className="mt-3 text-lg text-base-content">{selectedJob.name}</p>
              <div className="mt-4 flex flex-col gap-2 text-base text-base-content">
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
              <p className="mt-2 text-base text-base-content/60">
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
                        <span className="badge badge-outline border-base-300 px-3 py-2 text-sm text-base-content/70">
                          {item.category}
                        </span>
                      </div>
                      <p className="mt-2 text-base leading-7 text-base-content">
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
            {errorMessage ? (
              <p className="alert alert-error text-base">
                {errorMessage}
              </p>
            ) : null}
            <div className="card border border-base-300 bg-base-100/85">
              <div className="card-body p-4">
              {generatedScene ? (
                <div>
                  <h3 className="font-[var(--heading-font)] text-2xl text-neutral">
                    {generatedScene.scene_title}
                  </h3>
                  <p className="mt-3 whitespace-pre-wrap text-base leading-8 text-base-content">
                    {generatedScene.scene_text}
                  </p>
                </div>
              ) : (
                <p className="text-base text-base-content">
                  シーンを生成しています。しばらく待つと、このターンの状況が表示されます。
                </p>
              )}
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className="btn btn-primary disabled:opacity-50"
                onClick={handleGenerateScene}
                disabled={isSceneLoading}
              >
                {isSceneLoading ? '生成中...' : 'シーン再生成'}
              </button>
            </div>
            <div className="card mt-4 border border-base-300 bg-base-100/85">
              <div className="card-body p-4">
              <p className="text-base text-base-content/60">今回使うアイテム</p>
              {activeItems.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {activeItems.map((item) => (
                    <span
                      key={item.id}
                      className="badge badge-primary h-auto px-3 py-3 text-base"
                    >
                      {item.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-base text-base-content">
                  まだ選択されていません。
                </p>
              )}
              </div>
            </div>
            <div className="mt-4">
              <label
                htmlFor="player-action"
                className="text-base text-base-content/60"
              >
                ユーザー行動
              </label>
              <textarea
                id="player-action"
                value={playerAction}
                onChange={(event) => setPlayerAction(event.target.value)}
                placeholder="どう行動するか入力"
                className="textarea textarea-bordered mt-2 min-h-[140px] w-full bg-base-100 text-base leading-8 text-base-content placeholder:text-base-content/50"
              />
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleStartTurn}
                  disabled={isStartTurnDisabled}
                >
                  {isJudgeLoading ? '判定中...' : 'ターン開始'}
                </button>
              </div>
            </div>
            {judgeResult ? (
              <div className="card mt-4 border border-base-300 bg-base-100/85">
                <div className="card-body p-4">
                <p className="text-base leading-8 text-base-content">
                  {judgeResult.message}
                </p>
                {judgeResult.needs_roll ? (
                  <div className="mt-3 flex flex-wrap gap-3 text-base text-base-content">
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
                  <p className="mt-3 text-base text-base-content/60">
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
                    <p className="text-base text-base-content/60">d20 判定</p>
                    <p className="mt-1 text-base text-base-content">
                      {judgeResult.ability
                        ? `${abilityLabels[judgeResult.ability as keyof typeof abilityLabels]}修正 ${modifier >= 0 ? `+${modifier}` : modifier}`
                        : '修正値 0'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {IS_DEV ? (
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={handleRerollDice}
                        disabled={diceRoll === null}
                      >
                        振り直し
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="btn btn-primary disabled:opacity-50"
                      onClick={handleRollDice}
                      disabled={!isRolling}
                    >
                      決定
                    </button>
                  </div>
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
                {diceRoll !== null ? (
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleAdvanceTurn}
                    >
                      次へ
                    </button>
                  </div>
                ) : null}
                </div>
              </div>
            ) : null}
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}
