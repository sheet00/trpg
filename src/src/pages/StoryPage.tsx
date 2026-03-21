import { useEffect, useState, useRef } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import gmPrompt from '../assets/02_gm.md?raw'
import judgePrompt from '../assets/03_judge.md?raw'
import scene1Prompt from '../assets/11_scene_1.md?raw'
import scene2Prompt from '../assets/12_scene_2.md?raw'
import scene3Prompt from '../assets/13_scene_3.md?raw'
import scene4Prompt from '../assets/14_scene_4.md?raw'
import scene5Prompt from '../assets/15_scene_5.md?raw'
import { PageHeader } from '../components/PageHeader'
import { characterClasses } from '../data/classes'
import {
  createEmptyStorySceneState,
  type JudgeResult,
  type SelectedItem,
  type StoryScene,
  type StorySceneState,
} from '../lib/character-storage'
import { postChatCompletion } from '../lib/api-client'
import { useGameStore } from '../store/game-store'
import { formatTextWithLineBreaks } from '../lib/text-utils'
const IS_DEV = import.meta.env.DEV

const abilityLabels = {
  strength: '筋力',
  dexterity: '敏捷',
  constitution: '耐久',
  intelligence: '知力',
  wisdom: '判断力',
  charisma: '魅力',
} as const

const DIFFICULTY_MIN = 5
const DIFFICULTY_MAX = 20

function getAbilityRows(scores: Record<string, number>) {
  return [
    ['筋力', scores.strength],
    ['敏捷', scores.dexterity],
    ['耐久', scores.constitution],
    ['知力', scores.intelligence],
    ['判断力', scores.wisdom],
    ['魅力', scores.charisma],
  ] as const
}

function getAbilityModifier(scores: Record<string, number>, ability: string | null) {
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

function getSceneOutcomeWithScores(sceneState: StorySceneState, abilityScores: Record<string, number>) {
  if (!sceneState.judgeResult?.needs_roll) {
    return sceneState.judgeResult ? '判定不要' : null
  }

  if (sceneState.diceRoll === null || sceneState.judgeResult.difficulty === null) {
    return null
  }

  const modifier = getAbilityModifier(abilityScores, sceneState.judgeResult.ability)
  const total = sceneState.diceRoll + modifier

  return total >= sceneState.judgeResult.difficulty ? '成功' : '失敗'
}

function getSceneResolution(sceneState: StorySceneState, abilityScores: Record<string, number>) {
  if (!sceneState.judgeResult) {
    return null
  }

  const outcome = getSceneOutcomeWithScores(sceneState, abilityScores)

  return {
    result: outcome,
    summary: sceneState.judgeResult.message,
    success_result: sceneState.judgeResult.success_result,
    failure_result: sceneState.judgeResult.failure_result,
    hp_change_on_success: sceneState.judgeResult.hp_change_on_success,
    hp_change_on_failure: sceneState.judgeResult.hp_change_on_failure,
    resolved_outcome: sceneState.resolvedOutcome,
    resolved_result_text: sceneState.resolvedResultText,
    resolved_hp_change: sceneState.resolvedHpChange,
  }
}

function getHpChangeFromResolvedRoll(
  judgeResult: JudgeResult | null,
  abilityScores: Record<string, number>,
  diceRoll: number | null,
) {
  if (!judgeResult?.needs_roll || diceRoll === null || judgeResult.difficulty === null) {
    return 0
  }

  const modifier = getAbilityModifier(abilityScores, judgeResult.ability)
  const total = diceRoll + modifier

  return total >= judgeResult.difficulty
    ? judgeResult.hp_change_on_success
    : judgeResult.hp_change_on_failure
}

function applyHpChange(baseHp: number, maxHp: number, hpChange: number) {
  return Math.max(0, Math.min(maxHp, baseHp + hpChange))
}

function getResolvedOutcomeData(
  judgeResult: JudgeResult | null,
  abilityScores: Record<string, number>,
  diceRoll: number | null,
) {
  if (!judgeResult) {
    return {
      outcome: null,
      resultText: '',
      hpChange: 0,
    }
  }

  if (!judgeResult.needs_roll) {
    return {
      outcome: '判定不要' as const,
      resultText: judgeResult.success_result,
      hpChange: judgeResult.hp_change_on_success,
    }
  }

  if (diceRoll === null || judgeResult.difficulty === null) {
    return {
      outcome: null,
      resultText: '',
      hpChange: 0,
    }
  }

  const modifier = getAbilityModifier(abilityScores, judgeResult.ability)
  const total = diceRoll + modifier
  const isSuccess = total >= judgeResult.difficulty

  return {
    outcome: isSuccess ? ('成功' as const) : ('失敗' as const),
    resultText: isSuccess
      ? judgeResult.success_result
      : (judgeResult.failure_result ?? ''),
    hpChange: isSuccess
      ? judgeResult.hp_change_on_success
      : judgeResult.hp_change_on_failure,
  }
}

function getDifficultyGaugeValue(difficulty: number | null) {
  if (difficulty === null) {
    return null
  }

  return Math.max(DIFFICULTY_MIN, Math.min(DIFFICULTY_MAX, difficulty))
}

function getSceneDirectionPrompt(sceneNumber: number) {
  switch (sceneNumber) {
    case 1:
      return scene1Prompt
    case 2:
      return scene2Prompt
    case 3:
      return scene3Prompt
    case 4:
      return scene4Prompt
    case 5:
      return scene5Prompt
    default:
      return ''
  }
}

function buildSceneUserPrompt(params: {
  currentSceneNumber: number
  backgroundData: { intro_title: string; intro_text: string }
  selectedJobName: string
  abilityRows: readonly (readonly [string, number])[]
  maxHp: number
  currentHp: number
  sceneItems: SelectedItem[]
  storyScenes: Array<{
    sceneNumber: number
    scene: StoryScene | null
    status: {
      maxHp: number
      currentHp: number
    }
    items: SelectedItem[]
    playerAction: string
    activeItemIds: string[]
    resolution: ReturnType<typeof getSceneResolution>
  }>
}) {
  const {
    currentSceneNumber,
    backgroundData,
    selectedJobName,
    abilityRows,
    maxHp,
    currentHp,
    sceneItems,
    storyScenes,
  } = params
  const previousScene = storyScenes.at(-1) ?? null
  const sceneDirectionPrompt = getSceneDirectionPrompt(currentSceneNumber)

  return [
    '# current_scene_number',
    JSON.stringify(currentSceneNumber, null, 2),
    '',
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
        class: selectedJobName,
        abilityScores: Object.fromEntries(abilityRows),
        status: {
          maxHp,
          currentHp,
        },
      },
      null,
      2,
    ),
    '',
    '# items',
    JSON.stringify(sceneItems, null, 2),
    '',
    '# story_history',
    JSON.stringify(storyScenes, null, 2),
    '',
    '# previous_scene',
    JSON.stringify(previousScene, null, 2),
    '',
    '# scene_direction',
    sceneDirectionPrompt,
  ].join('\n')
}

export function StoryPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedClassId = useGameStore((state) => state.selectedClassId)
  const abilityScores = useGameStore((state) => state.abilityScores)
  const backgroundData = useGameStore((state) => state.backgroundData)
  const sceneStates = useGameStore((state) => state.sceneStates)
  const stories = useGameStore((state) => state.stories)
  const resetGame = useGameStore((state) => state.resetGame)
  const getSceneState = useGameStore((state) => state.getSceneState)
  const setStories = useGameStore((state) => state.setStories)
  const setEndingStartSceneNumber = useGameStore((state) => state.setEndingStartSceneNumber)
  const setSceneState = useGameStore((state) => state.setSceneState)
  const updateSceneState = useGameStore((state) => state.updateSceneState)
  const clearSceneStatesAfter = useGameStore((state) => state.clearSceneStatesAfter)
  const finalizeSceneSnapshot = useGameStore((state) => state.finalizeSceneSnapshot)
  const initializeNextSceneFromCurrent = useGameStore((state) => state.initializeNextSceneFromCurrent)
  const selectedJob = characterClasses.find((job) => job.id === selectedClassId)
  const abilityRows = getAbilityRows(abilityScores)
  const sceneFromSearchParams = Number(searchParams.get('scene') ?? searchParams.get('turn') ?? '1')
  const currentSceneNumber =
    Number.isInteger(sceneFromSearchParams) && sceneFromSearchParams > 0 ? sceneFromSearchParams : 1
  const [rollingValue, setRollingValue] = useState<number>(1)
  const [errorMessage, setErrorMessage] = useState('')
  const [isSceneLoading, setIsSceneLoading] = useState(false)
  const [isJudgeLoading, setIsJudgeLoading] = useState(false)
  const isGeneratingRef = useRef<number | null>(null)
  const autoGeneratedSceneNumbersRef = useRef<Set<number>>(new Set())
  const currentSceneState = getSceneState(currentSceneNumber)
  const generatedScene = currentSceneState.scene
  const judgeResult = currentSceneState.judgeResult
  const diceRoll = currentSceneState.diceRoll
  const sceneItems = currentSceneState.items
  const activeItemIds = currentSceneState.activeItemIds
  const playerAction = currentSceneState.playerAction
  const maxHp = currentSceneState.maxHp
  const currentHp = currentSceneState.currentHp
  const hpRatio = maxHp > 0 ? Math.max(0, Math.min(100, (currentHp / maxHp) * 100)) : 0

  const availableActiveItemIds = activeItemIds.filter((itemId) =>
    sceneItems.some((item) => item.id === itemId),
  )
  const activeItems = sceneItems.filter((item) =>
    availableActiveItemIds.includes(item.id),
  )
  const isRolling = judgeResult?.needs_roll === true && diceRoll === null

  useEffect(() => {
    if (searchParams.get('scene') === String(currentSceneNumber)) {
      return
    }

    setSearchParams({ scene: String(currentSceneNumber) }, { replace: true })
  }, [currentSceneNumber, searchParams, setSearchParams])

  useEffect(() => {
    console.log('[StoryPage] currentSceneState snapshot', {
      currentSceneNumber,
      sceneTitle: currentSceneState.scene?.scene_title ?? null,
      maxHp: currentSceneState.maxHp,
      currentHp: currentSceneState.currentHp,
      itemsCount: currentSceneState.items.length,
      activeItemIds: currentSceneState.activeItemIds,
      playerAction: currentSceneState.playerAction,
      judgeDifficulty: currentSceneState.judgeResult?.difficulty ?? null,
      judgeMessage: currentSceneState.judgeResult?.message ?? null,
      diceRoll: currentSceneState.diceRoll,
    })
  }, [currentSceneNumber, currentSceneState])

  useEffect(() => {
    if (!selectedJob || !backgroundData) {
      return
    }

    let storedSceneState = getSceneState(currentSceneNumber)

    if (
      currentSceneNumber === 1 &&
      storedSceneState.scene === null &&
      storedSceneState.activeItemIds.length === 0 &&
      storedSceneState.playerAction === '' &&
      storedSceneState.judgeResult === null &&
      storedSceneState.diceRoll === null
    ) {
      const previousSceneState = getSceneState(0)
      const migratedSceneState = {
        sceneNumber: 1,
        scene: stories.find((_, index) => index === 0) ?? null,
        maxHp: previousSceneState.maxHp,
        currentHp: previousSceneState.currentHp,
        items: previousSceneState.items,
        activeItemIds: previousSceneState.activeItemIds,
        playerAction: previousSceneState.playerAction,
        judgeResult: previousSceneState.judgeResult,
        diceRoll: previousSceneState.diceRoll,
      }

      const hasLegacyState =
        migratedSceneState.scene !== null ||
        migratedSceneState.items.length > 0 ||
        migratedSceneState.activeItemIds.length > 0 ||
        migratedSceneState.playerAction !== '' ||
        migratedSceneState.judgeResult !== null ||
        migratedSceneState.diceRoll !== null

      if (hasLegacyState) {
        setSceneState(migratedSceneState)
        storedSceneState = migratedSceneState
      }
    }

    const shouldHydrateFromPreviousScene =
      currentSceneNumber > 0 &&
      storedSceneState.scene === null &&
      storedSceneState.items.length === 0 &&
      storedSceneState.activeItemIds.length === 0 &&
      storedSceneState.playerAction === '' &&
      storedSceneState.judgeResult === null &&
      storedSceneState.diceRoll === null &&
      storedSceneState.maxHp === 0 &&
      storedSceneState.currentHp === 0

    if (shouldHydrateFromPreviousScene) {
      const previousSceneState = getSceneState(currentSceneNumber - 1)

      if (
        previousSceneState.items.length > 0 ||
        previousSceneState.maxHp > 0 ||
        previousSceneState.currentHp > 0
      ) {
        storedSceneState = {
          ...storedSceneState,
          maxHp: previousSceneState.maxHp,
          currentHp: previousSceneState.currentHp,
          items: previousSceneState.items,
        }
        console.log('[StoryPage] hydrateFromPreviousScene', {
          currentSceneNumber,
          fromSceneNumber: currentSceneNumber - 1,
          previousMaxHp: previousSceneState.maxHp,
          previousCurrentHp: previousSceneState.currentHp,
          previousItems: previousSceneState.items,
        })
        setSceneState(storedSceneState)
      }
    }
    setErrorMessage('')
  }, [
    backgroundData?.intro_text,
    backgroundData?.intro_title,
    currentSceneNumber,
    selectedJob?.id,
    getSceneState,
    setSceneState,
    stories,
  ])

  useEffect(() => {
    document.title = generatedScene?.scene_title
      ? `シーン${currentSceneNumber}：${generatedScene.scene_title} | TRPG`
      : `シーン${currentSceneNumber} | TRPG`
  }, [currentSceneNumber, generatedScene?.scene_title])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [currentSceneNumber])

  useEffect(() => {
    if (!selectedJob || !backgroundData) {
      return
    }

    const storedSceneState = getSceneState(currentSceneNumber)

    if (
      generatedScene ||
      storedSceneState.scene ||
      isSceneLoading ||
      isGeneratingRef.current === currentSceneNumber ||
      autoGeneratedSceneNumbersRef.current.has(currentSceneNumber)
    ) {
      return
    }

    autoGeneratedSceneNumbersRef.current.add(currentSceneNumber)
    void (async () => {
      if (isGeneratingRef.current === currentSceneNumber) return
      isGeneratingRef.current = currentSceneNumber
      setIsSceneLoading(true)
      setErrorMessage('')

      const storyScenes = sceneStates
        .filter((sceneState) => sceneState.sceneNumber < currentSceneNumber)
        .map((sceneState) => ({
          sceneNumber: sceneState.sceneNumber,
          scene: sceneState.scene,
          status: {
            maxHp: sceneState.maxHp,
            currentHp: sceneState.currentHp,
          },
          items: sceneState.items,
          playerAction: sceneState.playerAction,
          activeItemIds: sceneState.activeItemIds,
          resolution: getSceneResolution(sceneState, abilityScores),
        }))
      const userPrompt = buildSceneUserPrompt({
        currentSceneNumber,
        backgroundData,
        selectedJobName: selectedJob.name,
        abilityRows,
        maxHp,
        currentHp,
        sceneItems,
        storyScenes,
      })

      try {
        const parsed = await postChatCompletion<{ scene_title: string; scene_text: string; items: SelectedItem[] }>({
          messages: [
            { role: 'system', content: gmPrompt },
            { role: 'user', content: userPrompt },
          ],
          tools: [
            {
              type: 'function',
              function: {
                name: 'generate_scene',
                description: 'TRPGのシーン描写を生成します。',
                parameters: {
                  type: 'object',
                  properties: {
                    scene_title: { type: 'string' },
                    scene_text: { type: 'string' },
                    items: {
                      type: 'array',
                      items: {
                        type: 'object',
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
          ],
          tool_choice: { type: 'function', function: { name: 'generate_scene' } },
        })

        clearSceneStatesAfter(currentSceneNumber)

        const truncatedStories = sceneStates
          .filter((sceneState) => sceneState.sceneNumber <= currentSceneNumber)
          .map((sceneState) => sceneState.scene)
          .filter((scene): scene is StoryScene => scene !== null)

        setStories(truncatedStories)
        const nextActiveItemIds = availableActiveItemIds.filter((itemId) =>
          parsed.items.some((item) => item.id === itemId),
        )
        const nextScene = {
          scene_title: parsed.scene_title,
          scene_text: parsed.scene_text,
        }
        const nextStories = sceneStates
          .filter((sceneState) => sceneState.sceneNumber <= currentSceneNumber)
          .map((sceneState) =>
            sceneState.sceneNumber === currentSceneNumber ? nextScene : sceneState.scene,
          )
          .filter((scene): scene is StoryScene => scene !== null)

        setStories(nextStories)
        const storedSceneState = getSceneState(currentSceneNumber)
        setSceneState({
          ...storedSceneState,
          scene: nextScene,
          items: parsed.items,
          activeItemIds: nextActiveItemIds,
        })
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : 'シーン生成中に不明なエラーが発生しました。',
        )
      } finally {
        setIsSceneLoading(false)
        isGeneratingRef.current = null
      }
    })()
  }, [
    backgroundData?.intro_text,
    backgroundData?.intro_title,
    currentSceneNumber,
    abilityScores.charisma,
    abilityScores.constitution,
    abilityScores.dexterity,
    abilityScores.intelligence,
    abilityScores.strength,
    abilityScores.wisdom,
    getSceneState,
    generatedScene,
    isSceneLoading,
    sceneStates,
    selectedJob?.name,
    setStories,
    setSceneState,
  ])

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

  if (!selectedJob || !backgroundData) {
    return <Navigate to="/background" replace />
  }

  const persistSceneState = (updater: (sceneState: StorySceneState) => StorySceneState) => {
    updateSceneState(currentSceneNumber, (sceneState) => {
      const nextSceneState = updater(sceneState)
      console.log('[StoryPage] persistSceneState', {
        sceneNumber: currentSceneNumber,
        before: sceneState,
        after: nextSceneState,
      })
      return nextSceneState
    })
  }

  const clearFutureScenes = () => {
    clearSceneStatesAfter(currentSceneNumber)

    const nextStories = sceneStates
      .filter((sceneState) => sceneState.sceneNumber <= currentSceneNumber)
      .map((sceneState) => sceneState.scene)
      .filter((scene): scene is StoryScene => scene !== null)

    setStories(nextStories)
  }

  const setPlayerAction = (value: string) => {
    persistSceneState((sceneState) => ({
      ...sceneState,
      playerAction: value,
    }))
  }

  const handleToggleActiveItem = (itemId: string) => {
    const nextIds = availableActiveItemIds.includes(itemId)
      ? availableActiveItemIds.filter((currentItemId) => currentItemId !== itemId)
      : [...availableActiveItemIds, itemId]

    persistSceneState((sceneState) => ({
      ...sceneState,
      activeItemIds: nextIds,
    }))
  }

  const handleGenerateScene = async () => {
    if (isGeneratingRef.current === currentSceneNumber) return
    isGeneratingRef.current = currentSceneNumber
    setIsSceneLoading(true)
    setErrorMessage('')

    const storyScenes = sceneStates
      .filter((sceneState) => sceneState.sceneNumber < currentSceneNumber)
      .map((sceneState) => ({
        sceneNumber: sceneState.sceneNumber,
        scene: sceneState.scene,
        status: {
          maxHp: sceneState.maxHp,
          currentHp: sceneState.currentHp,
        },
        items: sceneState.items,
        playerAction: sceneState.playerAction,
        activeItemIds: sceneState.activeItemIds,
        resolution: getSceneResolution(sceneState, abilityScores),
      }))
    const userPrompt = buildSceneUserPrompt({
      currentSceneNumber,
      backgroundData,
      selectedJobName: selectedJob.name,
      abilityRows,
      maxHp,
      currentHp,
      sceneItems,
      storyScenes,
    })

    try {
      const parsed = await postChatCompletion<{ scene_title: string; scene_text: string; items: SelectedItem[] }>({
        messages: [
          { role: 'system', content: gmPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'generate_scene',
              description: 'TRPGのシーン描写を生成します。',
              parameters: {
                type: 'object',
                properties: {
                  scene_title: { type: 'string' },
                  scene_text: { type: 'string' },
                  items: {
                    type: 'array',
                    items: {
                      type: 'object',
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
        ],
        tool_choice: { type: 'function', function: { name: 'generate_scene' } },
      })

      clearFutureScenes()
      const nextActiveItemIds = availableActiveItemIds.filter((itemId) =>
        parsed.items.some((item) => item.id === itemId),
      )
      const nextScene = {
        scene_title: parsed.scene_title,
        scene_text: parsed.scene_text,
      }
      const nextStories = sceneStates
        .filter((sceneState) => sceneState.sceneNumber <= currentSceneNumber)
        .map((sceneState) =>
          sceneState.sceneNumber === currentSceneNumber ? nextScene : sceneState.scene,
        )
        .filter((scene): scene is StoryScene => scene !== null)

      setStories(nextStories)
      persistSceneState((sceneState) => ({
        ...sceneState,
        scene: nextScene,
        items: parsed.items,
        activeItemIds: nextActiveItemIds,
      }))
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'シーン生成中に不明なエラーが発生しました。',
      )
    } finally {
      setIsSceneLoading(false)
      isGeneratingRef.current = null
    }
  }

  const handleConfirmAction = async () => {
    const trimmedAction = playerAction.trim()

    if (!trimmedAction) {
      setErrorMessage('ユーザー行動を入力してください。')
      return
    }

    try {
      setIsJudgeLoading(true)
      setErrorMessage('')

      const storyScenes = sceneStates
        .filter((sceneState) => sceneState.sceneNumber <= currentSceneNumber)
        .map((sceneState) => ({
          sceneNumber: sceneState.sceneNumber,
          scene: sceneState.scene,
          items: sceneState.items,
          playerAction: sceneState.playerAction,
          activeItemIds: sceneState.activeItemIds,
          resolution: getSceneResolution(sceneState, abilityScores),
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
        JSON.stringify(sceneItems, null, 2),
        '',
        '# active_items',
        JSON.stringify(activeItems, null, 2),
        '',
        '# story_history',
        JSON.stringify(storyScenes, null, 2),
        '',
        '# current_scene',
        JSON.stringify(
          {
            sceneNumber: currentSceneNumber,
            scene: generatedScene,
            playerAction: trimmedAction,
            activeItemIds: availableActiveItemIds,
          },
          null,
          2,
        ),
      ].join('\n')

      const parsed = await postChatCompletion<JudgeResult>({
        messages: [
          { role: 'system', content: judgePrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'judge_action',
              description: 'プレイヤーの行動に対して判定が必要か判断します。',
              parameters: {
                type: 'object',
                properties: {
                  needs_roll: { type: 'boolean' },
                  ability: {
                    type: 'string',
                    enum: [
                      'strength',
                      'dexterity',
                      'constitution',
                      'intelligence',
                      'wisdom',
                      'charisma',
                      null,
                    ],
                  },
                  skill: { type: 'string', nullable: true },
                  difficulty: { type: 'integer', nullable: true },
                  message: { type: 'string' },
                  success_result: { type: 'string' },
                  failure_result: { type: ['string', 'null'] },
                  hp_change_on_success: { type: 'integer' },
                  hp_change_on_failure: { type: 'integer' },
                },
                required: [
                  'needs_roll',
                  'ability',
                  'skill',
                  'difficulty',
                  'message',
                  'success_result',
                  'failure_result',
                  'hp_change_on_success',
                  'hp_change_on_failure',
                ],
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'judge_action' } },
      })

      clearFutureScenes()
      setRollingValue(Math.floor(Math.random() * 20) + 1)
      console.log('[StoryPage] handleConfirmAction result', {
        sceneNumber: currentSceneNumber,
        judgeResult: parsed,
        playerAction: trimmedAction,
      })
      persistSceneState((sceneState) => ({
        ...sceneState,
        items: sceneItems,
        judgeResult: parsed,
        diceRoll: null,
        resolvedOutcome: null,
        resolvedResultText: '',
        resolvedHpChange: 0,
        playerAction: trimmedAction,
        activeItemIds: availableActiveItemIds,
      }))
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : '行動確定中に不明なエラーが発生しました。',
      )
    } finally {
      setIsJudgeLoading(false)
    }
  }

  const handleRollDice = () => {
    if (!isRolling) {
      return
    }

    const resolvedHpChange = getHpChangeFromResolvedRoll(judgeResult, abilityScores, rollingValue)
    const resolvedCurrentHp = applyHpChange(currentHp, maxHp, resolvedHpChange)

    console.log('[StoryPage] handleRollDice start', {
      sceneNumber: currentSceneNumber,
      rollingValue,
      judgeResult,
      currentHp,
      maxHp,
    })
    persistSceneState((sceneState) => {
      const previousHpChange = getHpChangeFromResolvedRoll(
        sceneState.judgeResult,
        abilityScores,
        sceneState.diceRoll,
      )
      const baseHp = applyHpChange(sceneState.currentHp, sceneState.maxHp, -previousHpChange)
      const nextHpChange = getHpChangeFromResolvedRoll(
        sceneState.judgeResult,
        abilityScores,
        rollingValue,
      )
      const nextCurrentHp = applyHpChange(baseHp, sceneState.maxHp, nextHpChange)
      const resolvedOutcomeData = getResolvedOutcomeData(
        sceneState.judgeResult,
        abilityScores,
        rollingValue,
      )

      console.log('[StoryPage] handleRollDice resolved', {
        sceneNumber: currentSceneNumber,
        previousDiceRoll: sceneState.diceRoll,
        nextDiceRoll: rollingValue,
        previousHpChange,
        nextHpChange,
        baseHp,
        nextCurrentHp,
      })

      return {
        ...sceneState,
        diceRoll: rollingValue,
        currentHp: nextCurrentHp,
        resolvedOutcome: resolvedOutcomeData.outcome,
        resolvedResultText: resolvedOutcomeData.resultText,
        resolvedHpChange: resolvedOutcomeData.hpChange,
      }
    })

    if (judgeResult && resolvedCurrentHp <= 0) {
      finalizeSceneSnapshot(currentSceneNumber, generatedScene)
      setEndingStartSceneNumber(currentSceneNumber)
      navigate('/ending')
    }
  }

  const handleRerollDice = () => {
    if (!judgeResult?.needs_roll || diceRoll === null || !IS_DEV) {
      return
    }

    const rerolledValue = Math.floor(Math.random() * 20) + 1
    const previousHpChange = getHpChangeFromResolvedRoll(judgeResult, abilityScores, diceRoll)
    const baseHp = applyHpChange(currentHp, maxHp, -previousHpChange)
    const nextHpChange = getHpChangeFromResolvedRoll(judgeResult, abilityScores, rerolledValue)
    const resolvedCurrentHp = applyHpChange(baseHp, maxHp, nextHpChange)

    console.log('[StoryPage] handleRerollDice start', {
      sceneNumber: currentSceneNumber,
      previousDiceRoll: diceRoll,
      rerolledValue,
      judgeResult,
      currentHp,
      maxHp,
    })
    persistSceneState((sceneState) => {
      const previousHpChange = getHpChangeFromResolvedRoll(
        sceneState.judgeResult,
        abilityScores,
        sceneState.diceRoll,
      )
      const baseHp = applyHpChange(sceneState.currentHp, sceneState.maxHp, -previousHpChange)
      const nextHpChange = getHpChangeFromResolvedRoll(
        sceneState.judgeResult,
        abilityScores,
        rerolledValue,
      )
      const nextCurrentHp = applyHpChange(baseHp, sceneState.maxHp, nextHpChange)
      const resolvedOutcomeData = getResolvedOutcomeData(
        sceneState.judgeResult,
        abilityScores,
        rerolledValue,
      )

      console.log('[StoryPage] handleRerollDice resolved', {
        sceneNumber: currentSceneNumber,
        previousDiceRoll: sceneState.diceRoll,
        nextDiceRoll: rerolledValue,
        previousHpChange,
        nextHpChange,
        baseHp,
        nextCurrentHp,
      })

      return {
        ...sceneState,
        diceRoll: rerolledValue,
        currentHp: nextCurrentHp,
        resolvedOutcome: resolvedOutcomeData.outcome,
        resolvedResultText: resolvedOutcomeData.resultText,
        resolvedHpChange: resolvedOutcomeData.hpChange,
      }
    })

    if (judgeResult && resolvedCurrentHp <= 0) {
      finalizeSceneSnapshot(currentSceneNumber, generatedScene)
      setEndingStartSceneNumber(currentSceneNumber)
      navigate('/ending')
    }
  }

  const handleNextScene = () => {
    console.log('[StoryPage] handleNextScene start', {
      currentSceneNumber,
      latestSceneState: getSceneState(currentSceneNumber),
    })
    // 次へ進む前に、現行シーンを最新 state で確定する。
    // page 側の古い値で上書きして、判定結果や出目を壊した事故の再発防止。
    finalizeSceneSnapshot(currentSceneNumber, generatedScene)
    const nextSceneNumber = currentSceneNumber + 1

    if (currentSceneNumber === 5) {
      setEndingStartSceneNumber(currentSceneNumber)
      navigate('/ending')
      return
    }

    initializeNextSceneFromCurrent(currentSceneNumber)
    console.log('[StoryPage] handleNextScene afterPersist', {
      currentSceneNumber,
      nextSceneNumber,
      latestSceneState: getSceneState(currentSceneNumber),
      nextSceneState: getSceneState(nextSceneNumber),
    })

    setSearchParams({ scene: String(nextSceneNumber) })
  }

  const handlePreviousScene = () => {
    console.log('[StoryPage] handlePreviousScene start', {
      currentSceneNumber,
      latestSceneState: getSceneState(currentSceneNumber),
    })
    // 戻る場合も同じく、離れるシーンを最新 state で確定する。
    // 再訪時にスナップショットが壊れないようにするため。
    finalizeSceneSnapshot(currentSceneNumber, generatedScene)

    if (currentSceneNumber === 1) {
      navigate('/background')
      return
    }

    setSearchParams({ scene: String(currentSceneNumber - 1) })
  }

  const handleRestart = () => {
    resetGame()
    navigate('/', { replace: true })
  }

  const modifier = judgeResult?.needs_roll ? getAbilityModifier(abilityScores, judgeResult.ability) : 0
  const displayRoll = diceRoll ?? (isRolling ? rollingValue : null)
  const totalRoll = displayRoll !== null ? displayRoll + modifier : null
  const isPlayerActionEmpty = playerAction.trim().length === 0
  const isConfirmActionDisabled = isJudgeLoading || isPlayerActionEmpty || !generatedScene
  const canAdvanceScene = judgeResult !== null && (!judgeResult.needs_roll || diceRoll !== null)
  const difficulty = judgeResult?.difficulty ?? null
  const difficultyGaugeValue = getDifficultyGaugeValue(difficulty)
  const isSuccess =
    totalRoll !== null && difficulty !== null
      ? totalRoll >= difficulty
      : null

  return (
    <main className="page-shell px-4" data-theme="light">
      <PageHeader
        title={`シーン${currentSceneNumber}${generatedScene?.scene_title ? `：${generatedScene.scene_title}` : ''}`}
        backAction={{
          label: '戻る',
          onClick: handlePreviousScene,
          variant: 'outline',
        }}
        nextAction={{
          label: '次へ',
          onClick: handleNextScene,
          disabled: !canAdvanceScene,
          variant: 'primary',
        }}
        restartAction={{ label: '最初から', onClick: handleRestart, variant: 'error' }}
      />
      <section className="page-panel w-full max-w-[1240px] p-5">

        <div className="mt-4 grid grid-cols-[360px_minmax(0,1fr)] gap-4">
          <aside className="flex flex-col gap-5">
            <section className="card border border-base-300 bg-base-200/70">
              <div className="card-body p-4">
                <h2 className="font-[var(--heading-font)] text-2xl text-neutral">
                  {selectedJob.name}
                </h2>
                <div className="mt-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm uppercase tracking-[0.18em] text-base-content/60">HP</span>
                    <strong className="text-lg text-neutral">
                      {currentHp} / {maxHp}
                    </strong>
                  </div>
                  <progress
                    className="progress progress-error mt-2 w-full"
                    value={currentHp}
                    max={Math.max(maxHp, 1)}
                  />
                  <p className="mt-2 text-sm text-base-content/60">
                    残り {Math.round(hpRatio)}%
                  </p>
                </div>
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
                  {sceneItems.map((item) => (
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
                        {formatTextWithLineBreaks(generatedScene.scene_text)}
                      </p>
                    </div>
                  ) : (
                    <p className="text-base text-base-content">
                      シーンを生成しています。しばらく待つと、このシーンの状況が表示されます。
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
                    onClick={handleConfirmAction}
                    disabled={isConfirmActionDisabled}
                  >
                    {isJudgeLoading ? '判定中...' : '行動を確定'}
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
                      <>
                        <div className="mt-3 flex flex-wrap gap-3 text-base text-base-content">
                          <span className="badge badge-outline h-auto border-base-300 px-3 py-2">
                            能力値: {abilityLabels[judgeResult.ability as keyof typeof abilityLabels] || judgeResult.ability}
                          </span>
                          <span className="badge badge-outline h-auto border-base-300 px-3 py-2">
                            技能: {judgeResult.skill}
                          </span>
                        </div>
                        <div className="mt-4 rounded-2xl border border-base-300 bg-base-200/60 p-4">
                          <div className="flex items-center justify-between gap-4 text-sm text-base-content/70">
                            <span>難易度</span>
                            <strong className="text-base text-neutral">
                              {judgeResult.difficulty}
                            </strong>
                          </div>
                          <progress
                            className="progress progress-secondary mt-3 w-full"
                            value={difficultyGaugeValue ?? DIFFICULTY_MIN}
                            max={DIFFICULTY_MAX}
                          />
                          <div className="mt-2 flex items-center justify-between text-xs tracking-[0.12em] text-base-content/50">
                            <span>{DIFFICULTY_MIN}</span>
                            <span>{DIFFICULTY_MAX}</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="mt-3 text-base text-base-content/60">
                        判定不要
                      </p>
                    )}
                    <div
                      className={[
                        'mt-4 grid gap-3',
                        judgeResult.needs_roll ? 'lg:grid-cols-2' : '',
                      ].join(' ')}
                    >
                      <div className="rounded-2xl border border-success/30 bg-success/10 p-4">
                        <p className="text-sm uppercase tracking-[0.18em] text-base-content/55">成功</p>
                        <p className="mt-2 text-base leading-7 text-base-content">
                          {judgeResult.success_result}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2 text-sm text-base-content/70">
                          <span className="badge badge-outline border-success/30 px-3 py-2">
                            HP {judgeResult.hp_change_on_success >= 0 ? `+${judgeResult.hp_change_on_success}` : judgeResult.hp_change_on_success}
                          </span>
                        </div>
                      </div>
                      {judgeResult.needs_roll ? (
                        <div className="rounded-2xl border border-error/30 bg-error/10 p-4">
                          <p className="text-sm uppercase tracking-[0.18em] text-base-content/55">失敗</p>
                          <p className="mt-2 text-base leading-7 text-base-content">
                            {judgeResult.failure_result ?? '失敗分岐はありません。'}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2 text-sm text-base-content/70">
                            <span className="badge badge-outline border-error/30 px-3 py-2">
                              HP {judgeResult.hp_change_on_failure >= 0 ? `+${judgeResult.hp_change_on_failure}` : judgeResult.hp_change_on_failure}
                            </span>
                          </div>
                        </div>
                      ) : null}
                    </div>
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
                    {canAdvanceScene ? (
                      <div className="mt-4 flex justify-end">
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={handleNextScene}
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
