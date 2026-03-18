import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import gmPrompt from '../assets/02_gm.md?raw'
import { characterClasses } from '../data/classes'
import {
  getStoredBackgroundData,
  getStoredAbilityScores,
  getStoredClassId,
  getStoredSelectedItems,
} from '../lib/character-storage'

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY
const MODEL_NAME = import.meta.env.VITE_MODEL_ID

type GeneratedScene = {
  scene_title: string
  scene_text: string
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

export function StoryPage() {
  const selectedClassId = getStoredClassId()
  const selectedJob = characterClasses.find((job) => job.id === selectedClassId)
  const selectedItems = getStoredSelectedItems()
  const backgroundData = getStoredBackgroundData()
  const abilityRows = getAbilityRows()
  const [generatedScene, setGeneratedScene] = useState<GeneratedScene | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  if (!selectedJob || selectedItems.length === 0 || !backgroundData) {
    return <Navigate to="/background" replace />
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

      const parsed = JSON.parse(content) as GeneratedScene
      setGeneratedScene(parsed)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'シーン生成中に不明なエラーが発生しました。',
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen px-4 py-6">
      <section className="mx-auto w-full max-w-[1240px] rounded-[28px] border border-[color:var(--border)] bg-[color:var(--panel)]/95 p-5 shadow-[0_24px_48px_rgba(12,8,5,0.22)] backdrop-blur-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-[var(--heading-font)] text-4xl text-[color:var(--heading-text)]">
              物語開始
            </h1>
          </div>
          <Link
            to="/background"
            className="inline-flex items-center rounded-xl border border-[color:var(--border)] px-4 py-3 text-sm text-[color:var(--heading-text)] transition hover:bg-white/55"
          >
            背景設定へ戻る
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-[360px_minmax(0,1fr)] gap-4">
          <aside className="flex flex-col gap-5">
            <section className="rounded-2xl border border-[color:var(--border)] bg-white/40 px-4 py-4">
              <h2 className="font-[var(--heading-font)] text-2xl text-[color:var(--heading-text)]">
                キャラクター
              </h2>
              <p className="mt-3 text-base text-[color:var(--body-text)]">{selectedJob.name}</p>
              <div className="mt-4 flex flex-col gap-2 text-sm text-[color:var(--body-text)]">
                {abilityRows.map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-4">
                    <span className="text-[color:var(--muted-text)]">{label}</span>
                    <strong className="text-[color:var(--heading-text)]">{value}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-[color:var(--border)] bg-white/40 px-4 py-4">
              <h2 className="font-[var(--heading-font)] text-2xl text-[color:var(--heading-text)]">
                選択したアイテム
              </h2>
              <div className="mt-4 flex flex-col gap-3">
                {selectedItems.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-[color:var(--border)] bg-white/45 px-3 py-3"
                  >
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
                  </article>
                ))}
              </div>
            </section>
          </aside>

          <section className="rounded-2xl border border-[color:var(--border)] bg-white/40 px-5 py-5">
            <h2 className="font-[var(--heading-font)] text-3xl text-[color:var(--heading-text)]">
              本編開始
            </h2>
            <div className="mt-4">
              <button
                type="button"
                className="inline-flex items-center rounded-xl border border-[color:var(--heading-text)] px-5 py-3 text-sm font-medium text-[color:var(--heading-text)] transition hover:bg-[color:var(--heading-text)] hover:text-[color:var(--panel)] disabled:cursor-not-allowed disabled:opacity-50"
                onClick={handleGenerateScene}
                disabled={isLoading}
              >
                {isLoading ? '生成中...' : 'シーン生成'}
              </button>
            </div>
            {errorMessage ? (
              <p className="mt-4 text-sm text-[#9f2f2f]">{errorMessage}</p>
            ) : null}
            <div className="mt-4 rounded-2xl border border-[color:var(--border)] bg-white/45 px-4 py-4">
              {generatedScene ? (
                <div>
                  <h3 className="font-[var(--heading-font)] text-2xl text-[color:var(--heading-text)]">
                    {generatedScene.scene_title}
                  </h3>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[color:var(--body-text)]">
                    {generatedScene.scene_text}
                  </p>
                </div>
              ) : (
                <p className="text-sm leading-7 text-[color:var(--body-text)]">
                  シーン生成を押すと、背景、キャラクター、能力値、選択アイテムをもとに
                  最初の本編シーンを生成します。
                </p>
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}
