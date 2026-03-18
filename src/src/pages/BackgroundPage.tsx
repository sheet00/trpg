import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import startPrompt from '../assets/01_start.md?raw'
import { characterClasses } from '../data/classes'
import {
  getStoredAbilityScores,
  getStoredClassId,
  setStoredBackgroundData,
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
  const [generatedBackground, setGeneratedBackground] = useState<GeneratedBackground | null>(
    null,
  )
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])
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
      })
      setSelectedItemIds([])
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : '生成中に不明なエラーが発生しました。',
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleItem = (itemId: string) => {
    setSelectedItemIds((current) =>
      current.includes(itemId)
        ? current.filter((currentItemId) => currentItemId !== itemId)
        : current.length >= MAX_SELECTED_ITEMS
          ? current
          : [...current, itemId],
    )
  }

  const handleStartStory = () => {
    if (selectedItemIds.length === 0 || !generatedBackground) {
      return
    }

    const selectedItems = generatedBackground.item_candidates.filter((item) =>
      selectedItemIds.includes(item.id),
    )

    setStoredSelectedItems(selectedItems)
    navigate('/story')
  }

  return (
    <main className="min-h-screen px-6 py-8">
      <section className="mx-auto w-full max-w-[980px] rounded-[28px] border border-[color:var(--border)] bg-[color:var(--panel)]/95 p-7 shadow-[0_24px_48px_rgba(12,8,5,0.22)] backdrop-blur-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-[var(--heading-font)] text-4xl text-[color:var(--heading-text)]">
              背景設定
            </h1>
            <p className="mt-1 text-sm text-[color:var(--body-text)]">{selectedJob.name}</p>
          </div>
          <Link
            to="/ability-scores"
            className="inline-flex items-center rounded-xl border border-[color:var(--border)] px-4 py-3 text-sm text-[color:var(--heading-text)] transition hover:bg-white/55"
          >
            能力値へ戻る
          </Link>
        </div>

        <section className="mt-5 flex flex-col gap-2 rounded-2xl border border-[color:var(--border)] bg-white/35 px-5 py-4 text-sm text-[color:var(--body-text)]">
          <p>クラス: {selectedJob.name}</p>
          <p>能力値: {formatAbilityScores()}</p>
        </section>

        <div className="mt-5">
          <button
            type="button"
            className="inline-flex items-center rounded-xl border border-[color:var(--heading-text)] px-5 py-3 text-sm font-medium text-[color:var(--heading-text)] transition hover:bg-[color:var(--heading-text)] hover:text-[color:var(--panel)] disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleGenerate}
            disabled={isLoading}
          >
            {isLoading ? '生成中...' : '背景を生成'}
          </button>
        </div>

        {errorMessage ? (
          <p className="mt-4 text-sm text-[#9f2f2f]">{errorMessage}</p>
        ) : null}

        <section className="mt-5 rounded-2xl border border-[color:var(--border)] bg-white/35 px-5 py-5">
          {generatedBackground ? (
            <div className="flex flex-col gap-6">
              <section className="rounded-2xl border border-[color:var(--border)] bg-white/45 px-5 py-5">
                <h2 className="font-[var(--heading-font)] text-2xl text-[color:var(--heading-text)]">
                  {generatedBackground.intro_title}
                </h2>
                <p className="mt-3 leading-8 text-[color:var(--body-text)]">
                  {generatedBackground.intro_text}
                </p>
              </section>

              <section className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="font-[var(--heading-font)] text-2xl text-[color:var(--heading-text)]">
                    アイテム候補
                  </h2>
                  <p className="text-sm text-[color:var(--muted-text)]">
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
                          'grid grid-cols-[20px_minmax(0,1fr)] items-start gap-4 rounded-2xl border px-4 py-4 transition',
                          isSelected
                            ? 'border-[color:var(--heading-text)] bg-white/70'
                            : 'border-[color:var(--border)] bg-white/40',
                          isDisabled ? 'opacity-45' : 'cursor-pointer hover:bg-white/60',
                        ].join(' ')}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isDisabled}
                          className="mt-1 h-4 w-4 accent-[color:var(--heading-text)]"
                          onChange={() => handleToggleItem(item.id)}
                        />
                        <div>
                          <div className="flex items-baseline justify-between gap-4">
                            <strong className="text-base text-[color:var(--heading-text)]">
                              {item.name}
                            </strong>
                            <span className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--muted-text)]">
                              {item.category}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-[color:var(--body-text)]">
                            {item.description}
                          </p>
                        </div>
                      </label>
                    )
                  })}
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="inline-flex items-center rounded-xl border border-[color:var(--heading-text)] px-5 py-3 text-sm font-medium text-[color:var(--heading-text)] transition hover:bg-[color:var(--heading-text)] hover:text-[color:var(--panel)] disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={handleStartStory}
                    disabled={selectedItemIds.length === 0}
                  >
                    スタート
                  </button>
                </div>
              </section>
            </div>
          ) : (
            <p className="text-sm text-[color:var(--body-text)]">
              生成ボタンを押すと、開始導入とアイテム候補を作成します。
            </p>
          )}
        </section>
      </section>
    </main>
  )
}
