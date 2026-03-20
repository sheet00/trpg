import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import startPrompt from '../assets/01_start.md?raw'
import { PageHeader } from '../components/PageHeader'
import { characterClasses } from '../data/classes'
import {
  clearAllStoredGameData,
  createEmptyStorySceneState,
  getStoredAbilityScores,
  getStoredBackgroundData,
  getStoredBackgroundSelection,
  getStoredClassId,
  setStoredBackgroundData,
  setStoredBackgroundSelection,
  setStoredStorySceneState,
  type SelectedItem,
  setStoredSelectedItems,
} from '../lib/character-storage'

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY
const MODEL_NAME = import.meta.env.VITE_MODEL_ID

type GeneratedItem = SelectedItem

type GeneratedBackground = {
  intro_title: string
  intro_text: string
  item_candidates: GeneratedItem[]
}

const MAX_SELECTED_ITEMS = 3

function getAbilityModifier(score: number) {
  return Math.floor((score - 10) / 2)
}

function formatAbilityScores() {
  const scores = getStoredAbilityScores()

  return [
    `筋力 ${scores.strength}`,
    `敏捷 ${scores.dexterity}`,
    `耐久 ${scores.constitution}`,
    `知力 ${scores.intelligence}`,
    `判断力 ${scores.wisdom}`,
    `魅力 ${scores.charisma}`,
  ].join(' / ')
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

export function BackgroundPage() {
  const navigate = useNavigate()
  const selectedClassId = getStoredClassId()
  const selectedJob = characterClasses.find((job) => job.id === selectedClassId)
  const storedBackgroundData = getStoredBackgroundData()
  const [generatedBackground, setGeneratedBackground] = useState<GeneratedBackground | null>(
    () =>
      storedBackgroundData?.item_candidates
        ? {
            intro_title: storedBackgroundData.intro_title,
            intro_text: storedBackgroundData.intro_text,
            item_candidates: storedBackgroundData.item_candidates,
          }
        : null,
  )
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>(() =>
    getStoredBackgroundSelection(),
  )
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  if (!selectedJob) {
    return <Navigate to="/class-select" replace />
  }

  const handleGenerate = async () => {
    if (!OPENROUTER_API_KEY || !MODEL_NAME) {
      setErrorMessage('.env の API 設定が不足しています。')
      return
    }

    setIsLoading(true)
    setErrorMessage('')

    const userPrompt = [
      '確定済みキャラクター情報を渡します。',
      `クラス: ${selectedJob.name}`,
      `能力値: ${formatAbilityScores()}`,
      'これはゲーム全体の最初のイントロです。',
      'プレイヤーはいま最初のアイテム選択を行う直前にいます。',
      'ストーリーが始まるのは次のシーンです。',
      'この情報を前提に、立場と状況の提示、およびアイテム候補を生成してください。',
      'ここではストーリーを開始せず、冒険直前の準備段階で止めてください。',
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
            { role: 'system', content: startPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'background_start_response',
              strict: true,
              schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  intro_title: { type: 'string' },
                  intro_text: { type: 'string' },
                  item_candidates: {
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
                required: ['intro_title', 'intro_text', 'item_candidates'],
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

      const parsed = JSON.parse(content) as GeneratedBackground
      setGeneratedBackground(parsed)
      setStoredBackgroundData({
        intro_title: parsed.intro_title,
        intro_text: parsed.intro_text,
        item_candidates: parsed.item_candidates,
      })
      setSelectedItemIds([])
      setStoredBackgroundSelection([])
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : '生成中に不明なエラーが発生しました。',
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleItem = (itemId: string) => {
    setSelectedItemIds((current) => {
      const nextItemIds = current.includes(itemId)
        ? current.filter((currentItemId) => currentItemId !== itemId)
        : current.length >= MAX_SELECTED_ITEMS
          ? current
          : [...current, itemId]

      setStoredBackgroundSelection(nextItemIds)
      return nextItemIds
    })
  }

  const handleStartStory = () => {
    if (selectedItemIds.length === 0 || !generatedBackground) {
      return
    }

    const abilityScores = getStoredAbilityScores()
    const initialHp = Math.max(1, selectedJob.baseHp + getAbilityModifier(abilityScores.constitution))
    const selectedItems = generatedBackground.item_candidates.filter((item) =>
      selectedItemIds.includes(item.id),
    )

    setStoredSelectedItems(selectedItems)
    setStoredStorySceneState({
      ...createEmptyStorySceneState(0),
      sceneNumber: 0,
      maxHp: initialHp,
      currentHp: initialHp,
      items: selectedItems,
    })
    navigate('/story')
  }

  const handleRestart = () => {
    clearAllStoredGameData()
    navigate('/class-select', { replace: true })
  }

  useEffect(() => {
    document.title = '背景設定 | TRPG'
  }, [])

  useEffect(() => {
    if (generatedBackground || storedBackgroundData || isLoading) {
      return
    }

    void handleGenerate()
  }, [generatedBackground, isLoading, storedBackgroundData])

  return (
    <main className="page-shell" data-theme="light">
      <PageHeader
        title="背景設定"
        backAction={{ label: '戻る', href: '/ability-scores', variant: 'outline' }}
        nextAction={{
          label: '次へ',
          onClick: handleStartStory,
          disabled: selectedItemIds.length === 0,
          variant: 'primary',
        }}
        restartAction={{ label: '最初から', onClick: handleRestart, variant: 'error' }}
      />
      <section className="page-panel w-full max-w-[980px] p-7">
        <div className="page-stack">
        <section className="card border border-base-300 bg-base-200/70">
          <div className="card-body gap-2 p-5 text-base text-base-content">
          <p>クラス: {selectedJob.name}</p>
          <p>能力値: {formatAbilityScores()}</p>
          </div>
        </section>

        <div>
          <button
            type="button"
            className="btn btn-primary disabled:opacity-50"
            onClick={handleGenerate}
            disabled={isLoading}
          >
            {isLoading ? '生成中...' : '背景を再生成'}
          </button>
        </div>

        {errorMessage ? (
          <p className="alert alert-error text-base">
            {errorMessage}
          </p>
        ) : null}

        <section className="card border border-base-300 bg-base-200/70">
          <div className="card-body p-5">
          {generatedBackground ? (
            <div className="flex flex-col gap-6">
              <section className="card border border-base-300 bg-base-100/90">
                <div className="card-body p-5">
                <h2 className="font-[var(--heading-font)] text-2xl text-neutral">
                  {generatedBackground.intro_title}
                </h2>
                <p className="mt-3 leading-8 text-base-content">
                  {generatedBackground.intro_text}
                </p>
                </div>
              </section>

              <section className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="font-[var(--heading-font)] text-2xl text-neutral">
                    アイテム候補
                  </h2>
                  <p className="text-base text-base-content/60">
                    {selectedItemIds.length} / {MAX_SELECTED_ITEMS} 個選択中
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  {generatedBackground.item_candidates.map((item) => {
                    const isSelected = selectedItemIds.includes(item.id)
                    const isDisabled =
                      !isSelected && selectedItemIds.length >= MAX_SELECTED_ITEMS

                    return (
                      <label
                        key={item.id}
                        className={[
                          'card grid grid-cols-[20px_minmax(0,1fr)] items-start gap-4 border p-4 transition',
                          isSelected
                            ? 'border-primary bg-base-100'
                            : 'border-base-300 bg-base-100/75',
                          isDisabled ? 'opacity-45' : 'cursor-pointer hover:border-secondary hover:bg-base-100',
                        ].join(' ')}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isDisabled}
                          className="checkbox checkbox-primary checkbox-sm mt-1"
                          onChange={() => handleToggleItem(item.id)}
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
                    )
                  })}
                </div>
                <div />
              </section>
            </div>
          ) : (
            <p className="text-base text-base-content">
              背景を生成しています。しばらく待つと、開始導入とアイテム候補が表示されます。
            </p>
          )}
          </div>
        </section>
        </div>
      </section>
    </main>
  )
}
