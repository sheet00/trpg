import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import endingPrompt from '../assets/05_ending.md?raw'
import { PageHeader } from '../components/PageHeader'
import { characterClasses } from '../data/classes'
import {
  clearAllStoredGameData,
  getStoredAbilityScores,
  getStoredBackgroundData,
  getStoredClassId,
  getStoredStorySceneState,
  getStoredStorySceneStates,
  setStoredStories,
  setStoredStorySceneState,
  type SelectedItem,
  type StoryScene,
} from '../lib/character-storage'

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY
const MODEL_NAME = import.meta.env.VITE_MODEL_ID

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

function getSceneResolution(sceneState: ReturnType<typeof getStoredStorySceneState>) {
  if (!sceneState.judgeResult) {
    return null
  }

  if (!sceneState.judgeResult.needs_roll) {
    return {
      result: '判定不要',
      summary: sceneState.judgeResult.message,
    }
  }

  if (sceneState.diceRoll === null || sceneState.judgeResult.difficulty === null) {
    return {
      result: null,
      summary: sceneState.judgeResult.message,
    }
  }

  const scores = getStoredAbilityScores()
  const ability = sceneState.judgeResult.ability
  const score =
    ability === 'strength'
      ? scores.strength
      : ability === 'dexterity'
        ? scores.dexterity
        : ability === 'constitution'
          ? scores.constitution
          : ability === 'intelligence'
            ? scores.intelligence
            : ability === 'wisdom'
              ? scores.wisdom
              : ability === 'charisma'
                ? scores.charisma
                : 10
  const modifier = Math.floor((score - 10) / 2)
  const total = sceneState.diceRoll + modifier

  return {
    result: total >= sceneState.judgeResult.difficulty ? '成功' : '失敗',
    summary: sceneState.judgeResult.message,
  }
}

export function EndingPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const selectedClassId = getStoredClassId()
  const selectedJob = characterClasses.find((job) => job.id === selectedClassId)
  const backgroundData = getStoredBackgroundData()
  const abilityRows = getAbilityRows()
  const sceneFromSearchParams = Number(searchParams.get('scene') ?? '6')
  const endingSceneNumber =
    Number.isInteger(sceneFromSearchParams) && sceneFromSearchParams > 0 ? sceneFromSearchParams : 6
  const previousSceneNumber = endingSceneNumber - 1
  const previousSceneState = getStoredStorySceneState(previousSceneNumber)
  const [generatedEnding, setGeneratedEnding] = useState<StoryScene | null>(() => {
    const storedScene = getStoredStorySceneState(endingSceneNumber).scene
    return storedScene?.is_ending ? storedScene : null
  })
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const shouldRedirectToBackground = !selectedJob || !backgroundData
  const shouldRedirectToStory =
    !shouldRedirectToBackground &&
    (!previousSceneState.scene || previousSceneState.scene.next_is_ending !== true)

  useEffect(() => {
    document.title = generatedEnding?.scene_title
      ? `エンディング：${generatedEnding.scene_title} | TRPG`
      : 'エンディング | TRPG'
  }, [generatedEnding?.scene_title])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [endingSceneNumber])

  useEffect(() => {
    if (shouldRedirectToBackground || shouldRedirectToStory) {
      return
    }

    const storedEndingState = getStoredStorySceneState(endingSceneNumber)

    if (generatedEnding || storedEndingState.scene || isLoading) {
      return
    }

    void handleGenerateEnding()
  }, [endingSceneNumber, generatedEnding, isLoading, shouldRedirectToBackground, shouldRedirectToStory])

  const handleGenerateEnding = async () => {
    if (!selectedJob || !backgroundData || !previousSceneState.scene) {
      setErrorMessage('エンディング生成に必要な情報が不足しています。')
      return
    }

    if (!OPENROUTER_API_KEY || !MODEL_NAME) {
      setErrorMessage('.env の API 設定が不足しています。')
      return
    }

    setIsLoading(true)
    setErrorMessage('')

    const storyScenes = getStoredStorySceneStates()
      .filter((sceneState) => sceneState.sceneNumber <= previousSceneNumber)
      .map((sceneState) => ({
        sceneNumber: sceneState.sceneNumber,
        scene: sceneState.scene,
        items: sceneState.items,
        playerAction: sceneState.playerAction,
        activeItemIds: sceneState.activeItemIds,
        resolution: getSceneResolution(sceneState),
      }))

    const userPrompt = [
      '# current_scene_number',
      JSON.stringify(endingSceneNumber, null, 2),
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
          class: selectedJob.name,
          abilityScores: Object.fromEntries(abilityRows),
        },
        null,
        2,
      ),
      '',
      '# items',
      JSON.stringify(previousSceneState.items, null, 2),
      '',
      '# story_history',
      JSON.stringify(storyScenes, null, 2),
      '',
      '# previous_scene',
      JSON.stringify(
        {
          sceneNumber: previousSceneState.sceneNumber,
          scene: previousSceneState.scene,
          items: previousSceneState.items,
          playerAction: previousSceneState.playerAction,
          activeItemIds: previousSceneState.activeItemIds,
          resolution: getSceneResolution(previousSceneState),
        },
        null,
        2,
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
            { role: 'system', content: endingPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'ending_scene_response',
              strict: true,
              schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  scene_title: { type: 'string' },
                  scene_text: { type: 'string' },
                  is_ending: { type: 'boolean' },
                  next_is_ending: { type: 'boolean' },
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
                required: ['scene_title', 'scene_text', 'is_ending', 'next_is_ending', 'items'],
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

      const parsed = JSON.parse(content) as StoryScene & { items: SelectedItem[] }
      const nextEnding = {
        scene_title: parsed.scene_title,
        scene_text: parsed.scene_text,
        is_ending: true,
        next_is_ending: false,
      }

      setGeneratedEnding(nextEnding)
      const nextEndingState = {
        ...getStoredStorySceneState(endingSceneNumber),
        sceneNumber: endingSceneNumber,
        scene: nextEnding,
        items: parsed.items,
      }
      setStoredStorySceneState(nextEndingState)
      const nextStories = getStoredStorySceneStates()
        .filter((sceneState) => sceneState.sceneNumber <= endingSceneNumber)
        .map((sceneState) =>
          sceneState.sceneNumber === endingSceneNumber ? nextEndingState.scene : sceneState.scene,
        )
        .filter((scene): scene is StoryScene => scene !== null)
      setStoredStories(nextStories)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'エンディング生成中に不明なエラーが発生しました。',
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackToClimax = () => {
    navigate(`/story?scene=${previousSceneNumber}`)
  }

  const handleRestart = () => {
    clearAllStoredGameData()
    navigate('/class-select', { replace: true })
  }

  if (shouldRedirectToBackground) {
    return <Navigate to="/background" replace />
  }

  if (shouldRedirectToStory) {
    return <Navigate to={`/story?scene=${Math.max(previousSceneNumber, 1)}`} replace />
  }

  return (
    <main className="page-shell px-4" data-theme="light">
      <PageHeader
        title={generatedEnding?.scene_title ? `エンディング：${generatedEnding.scene_title}` : 'エンディング'}
        backAction={{ label: '戻る', onClick: handleBackToClimax, variant: 'outline' }}
        restartAction={{ label: '最初から', onClick: handleRestart, variant: 'error' }}
      />
      <section className="page-panel w-full max-w-[980px] p-5">
        <div className="mx-auto max-w-[760px]">
          {errorMessage ? <p className="alert alert-error text-base">{errorMessage}</p> : null}
          <section className="card border border-base-300 bg-base-200/70">
            <div className="card-body p-6">
              <p className="text-sm uppercase tracking-[0.28em] text-base-content/55">Ending</p>
              {generatedEnding ? (
                <>
                  <h1 className="mt-3 font-[var(--heading-font)] text-4xl text-neutral">
                    {generatedEnding.scene_title}
                  </h1>
                  <p className="mt-6 whitespace-pre-wrap text-lg leading-9 text-base-content">
                    {generatedEnding.scene_text}
                  </p>
                </>
              ) : (
                <p className="mt-4 text-base leading-8 text-base-content">
                  エンディングを生成しています。しばらく待つと、旅の結末が表示されます。
                </p>
              )}
            </div>
          </section>
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              className="btn btn-primary disabled:opacity-50"
              onClick={handleGenerateEnding}
              disabled={isLoading}
            >
              {isLoading ? '生成中...' : 'エンディング再生成'}
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}
