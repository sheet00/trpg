import { useEffect, useState, useRef } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import startPrompt from '../assets/01_start.md?raw'
import { PageHeader } from '../components/PageHeader'
import { getAdventureThemeById } from '../data/adventure-themes'
import { characterClasses } from '../data/classes'
import {
  type AdventureThemeId,
  type SelectedItem,
} from '../lib/character-storage'
import { postChatCompletion } from '../lib/api-client'
import { useGameStore } from '../store/game-store'
import { formatTextWithLineBreaks } from '../lib/text-utils'

type GeneratedItem = SelectedItem

type GeneratedBackground = {
  adventureTheme: AdventureThemeId
  intro_title: string
  intro_text: string
  item_candidates: GeneratedItem[]
}

const MAX_SELECTED_ITEMS = 3

function getAbilityModifier(score: number) {
  return Math.floor((score - 10) / 2)
}

export function BackgroundPage() {
  const navigate = useNavigate()
  const selectedClassId = useGameStore((state) => state.selectedClassId)
  const abilityScores = useGameStore((state) => state.abilityScores)
  const adventureTheme = useGameStore((state) => state.adventureTheme)
  const storedBackgroundData = useGameStore((state) => state.backgroundData)
  const selectedItemIds = useGameStore((state) => state.backgroundSelection)
  const resetGame = useGameStore((state) => state.resetGame)
  const setBackgroundData = useGameStore((state) => state.setBackgroundData)
  const setBackgroundSelection = useGameStore((state) => state.setBackgroundSelection)
  const initializeSceneZero = useGameStore((state) => state.initializeSceneZero)
  const selectedJob = characterClasses.find((job) => job.id === selectedClassId)
  const selectedTheme = getAdventureThemeById(adventureTheme)
  const [generatedBackground, setGeneratedBackground] = useState<GeneratedBackground | null>(
    () =>
      storedBackgroundData?.item_candidates
        ? {
            adventureTheme: storedBackgroundData.adventureTheme,
            intro_title: storedBackgroundData.intro_title,
            intro_text: storedBackgroundData.intro_text,
            item_candidates: storedBackgroundData.item_candidates,
          }
        : null,
  )
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [hasAttemptedAutoGenerate, setHasAttemptedAutoGenerate] = useState(() =>
    storedBackgroundData?.item_candidates ? true : false,
  )
  const isGeneratingRef = useRef(false)

  const handleRestart = () => {
    resetGame()
    navigate('/', { replace: true })
  }

  const handleGenerate = async () => {
    if (!selectedJob || !selectedTheme) {
      return
    }

    if (isGeneratingRef.current) return
    isGeneratingRef.current = true
    setIsLoading(true)
    setErrorMessage('')

    const userPrompt = [
      '確定済みキャラクター情報を渡します。',
      `クラス: ${selectedJob.name}`,
      `今回の冒険テーマ: ${selectedTheme.name}`,
      `テーマの特徴: ${selectedTheme.summary}`,
      `テーマの雰囲気: ${selectedTheme.vibe}`,
      `能力値: ${[
        `筋力 ${abilityScores.strength}`,
        `敏捷 ${abilityScores.dexterity}`,
        `耐久 ${abilityScores.constitution}`,
        `知力 ${abilityScores.intelligence}`,
        `判断力 ${abilityScores.wisdom}`,
        `魅力 ${abilityScores.charisma}`,
      ].join(' / ')}`,
      'これはゲーム全体の最初のイントロです。',
      'プレイヤーはいま最初のアイテム選択を行う直前にいます。',
      'ストーリーが始まるのは次のシーンです。',
      'この情報を前提に、立場と状況の提示、およびアイテム候補を生成してください。',
      '背景本文もアイテム候補も、今回の冒険テーマがはっきり感じられる内容にしてください。',
      'テーマに合わない無難な導入や、どのテーマでも成立する薄い内容は避けてください。',
      'ここではストーリーを開始せず、冒険直前の準備段階で止めてください。',
    ].join('\n')

    try {
      const parsed = await postChatCompletion<GeneratedBackground>({
        messages: [
          { role: 'system', content: startPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'generate_background',
              description: 'TRPGの背景設定と初期アイテム候補を生成します。',
              parameters: {
                type: 'object',
                properties: {
                  intro_title: { type: 'string' },
                  intro_text: { type: 'string' },
                  item_candidates: {
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
                required: ['intro_title', 'intro_text', 'item_candidates'],
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'generate_background' } },
      })

      setGeneratedBackground({
        ...parsed,
        adventureTheme: selectedTheme.id,
      })
      setBackgroundData({
        adventureTheme: selectedTheme.id,
        intro_title: parsed.intro_title,
        intro_text: parsed.intro_text,
        item_candidates: parsed.item_candidates,
      })
      setBackgroundSelection([])
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : '生成中に不明なエラーが発生しました。',
      )
    } finally {
      setIsLoading(false)
      isGeneratingRef.current = false
    }
  }

  const handleToggleItem = (itemId: string) => {
    const nextItemIds = selectedItemIds.includes(itemId)
      ? selectedItemIds.filter((currentItemId) => currentItemId !== itemId)
      : selectedItemIds.length >= MAX_SELECTED_ITEMS
        ? selectedItemIds
        : [...selectedItemIds, itemId]

    setBackgroundSelection(nextItemIds)
  }

  const handleStartStory = () => {
    if (!selectedJob || selectedItemIds.length === 0 || !generatedBackground) {
      return
    }

    const initialHp = Math.max(1, selectedJob.baseHp + getAbilityModifier(abilityScores.constitution))
    const selectedItems = generatedBackground.item_candidates.filter((item) =>
      selectedItemIds.includes(item.id),
    )

    initializeSceneZero({
      maxHp: initialHp,
      currentHp: initialHp,
      items: selectedItems,
    })
    navigate('/story')
  }

  useEffect(() => {
    document.title = '背景設定 | TRPG'
  }, [])

  useEffect(() => {
    if (generatedBackground || storedBackgroundData || isLoading || hasAttemptedAutoGenerate || isGeneratingRef.current) {
      return
    }

    setHasAttemptedAutoGenerate(true)
    void (async () => {
      if (!selectedJob || !selectedTheme || isGeneratingRef.current) return
      isGeneratingRef.current = true
      setIsLoading(true)
      setErrorMessage('')

      const userPrompt = [
        '確定済みキャラクター情報を渡します。',
        `クラス: ${selectedJob.name}`,
        `今回の冒険テーマ: ${selectedTheme.name}`,
        `テーマの特徴: ${selectedTheme.summary}`,
        `テーマの雰囲気: ${selectedTheme.vibe}`,
        `能力値: ${[
          `筋力 ${abilityScores.strength}`,
          `敏捷 ${abilityScores.dexterity}`,
          `耐久 ${abilityScores.constitution}`,
          `知力 ${abilityScores.intelligence}`,
          `判断力 ${abilityScores.wisdom}`,
          `魅力 ${abilityScores.charisma}`,
        ].join(' / ')}`,
        'これはゲーム全体の最初のイントロです。',
        'プレイヤーはいま最初のアイテム選択を行う直前にいます。',
        'ストーリーが始まるのは次のシーンです。',
        'この情報を前提に、立場と状況の提示、およびアイテム候補を生成してください。',
        '背景本文もアイテム候補も、今回の冒険テーマがはっきり感じられる内容にしてください。',
        'テーマに合わない無難な導入や、どのテーマでも成立する薄い内容は避けてください。',
        'ここではストーリーを開始せず、冒険直前の準備段階で止めてください。',
      ].join('\n')

      try {
        const parsed = await postChatCompletion<GeneratedBackground>({
          messages: [
            { role: 'system', content: startPrompt },
            { role: 'user', content: userPrompt },
          ],
          tools: [
            {
              type: 'function',
              function: {
                name: 'generate_background',
                description: 'TRPGの背景設定と初期アイテム候補を生成します。',
                parameters: {
                  type: 'object',
                  properties: {
                    intro_title: { type: 'string' },
                    intro_text: { type: 'string' },
                    item_candidates: {
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
                  required: ['intro_title', 'intro_text', 'item_candidates'],
                },
              },
            },
          ],
          tool_choice: { type: 'function', function: { name: 'generate_background' } },
        })

        setGeneratedBackground({
          ...parsed,
          adventureTheme: selectedTheme.id,
        })
        setBackgroundData({
          adventureTheme: selectedTheme.id,
          intro_title: parsed.intro_title,
          intro_text: parsed.intro_text,
          item_candidates: parsed.item_candidates,
        })
        setBackgroundSelection([])
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : '生成中に不明なエラーが発生しました。',
        )
      } finally {
        setIsLoading(false)
        isGeneratingRef.current = false
      }
    })()
  }, [
    abilityScores.charisma,
    abilityScores.constitution,
    abilityScores.dexterity,
    abilityScores.intelligence,
    abilityScores.strength,
    abilityScores.wisdom,
    generatedBackground,
    hasAttemptedAutoGenerate,
    isLoading,
    selectedJob?.id,
    selectedTheme?.id,
    storedBackgroundData?.intro_text,
    storedBackgroundData?.intro_title,
  ])

  if (!selectedJob) {
    return <Navigate to="/class-select" replace />
  }

  if (!selectedTheme) {
    return <Navigate to="/adventure-theme" replace />
  }

  return (
    <main className="page-shell" data-theme="light">
      <PageHeader
        title="背景設定"
        backAction={{ label: '戻る', href: '/adventure-theme', variant: 'outline' }}
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
          <p>冒険テーマ: {selectedTheme.name}</p>
          <p>クラス: {selectedJob.name}</p>
          <p>
            能力値: {[
              `筋力 ${abilityScores.strength}`,
              `敏捷 ${abilityScores.dexterity}`,
              `耐久 ${abilityScores.constitution}`,
              `知力 ${abilityScores.intelligence}`,
              `判断力 ${abilityScores.wisdom}`,
              `魅力 ${abilityScores.charisma}`,
            ].join(' / ')}
          </p>
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
                <p className="text-sm uppercase tracking-[0.18em] text-base-content/55">
                  {selectedTheme.name}
                </p>
                <h2 className="font-[var(--heading-font)] text-2xl text-neutral">
                  {generatedBackground.intro_title}
                </h2>
                <p className="mt-3 whitespace-pre-wrap leading-8 text-base-content">
                  {formatTextWithLineBreaks(generatedBackground.intro_text)}
                </p>
                </div>              </section>

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
