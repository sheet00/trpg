import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import {
  createEmptyStorySceneState,
  defaultAbilityScores,
  type AbilityScores,
  type BackgroundData,
  type JudgeResult,
  type SelectedItem,
  type StoryScene,
  type StorySceneState,
} from '../lib/character-storage'

const GAME_STORE_KEY = 'trpg:game-store'

type GameState = {
  selectedClassId: string | null
  abilityScores: AbilityScores
  backgroundData: BackgroundData | null
  backgroundSelection: string[]
  stories: StoryScene[]
  sceneStates: StorySceneState[]
}

type GameActions = {
  resetGame: () => void
  setSelectedClassId: (selectedClassId: string) => void
  setAbilityScores: (abilityScores: AbilityScores) => void
  setBackgroundData: (backgroundData: BackgroundData | null) => void
  setBackgroundSelection: (backgroundSelection: string[]) => void
  setStories: (stories: StoryScene[]) => void
  getSceneState: (sceneNumber: number) => StorySceneState
  setSceneState: (sceneState: StorySceneState) => void
  updateSceneState: (
    sceneNumber: number,
    updater: (sceneState: StorySceneState) => StorySceneState,
  ) => void
  clearSceneStatesAfter: (sceneNumber: number) => void
  initializeSceneZero: (params: {
    maxHp: number
    currentHp: number
    items: SelectedItem[]
  }) => void
  ensureSceneState: (sceneNumber: number, fallback?: Partial<StorySceneState>) => void
  setSceneJudgeResult: (sceneNumber: number, judgeResult: JudgeResult | null) => void
  setSceneDiceRoll: (sceneNumber: number, diceRoll: number | null) => void
  setScenePlayerAction: (sceneNumber: number, playerAction: string) => void
  setSceneActiveItemIds: (sceneNumber: number, activeItemIds: string[]) => void
  finalizeSceneSnapshot: (sceneNumber: number, scene: StoryScene | null) => void
  initializeNextSceneFromCurrent: (sceneNumber: number) => void
}

const defaultGameState: GameState = {
  selectedClassId: null,
  abilityScores: defaultAbilityScores,
  backgroundData: null,
  backgroundSelection: [],
  stories: [],
  sceneStates: [],
}

function upsertSceneState(
  sceneStates: StorySceneState[],
  sceneState: StorySceneState,
) {
  const existingIndex = sceneStates.findIndex(
    (storedSceneState) => storedSceneState.sceneNumber === sceneState.sceneNumber,
  )

  if (existingIndex === -1) {
    return [...sceneStates, sceneState].sort((left, right) => left.sceneNumber - right.sceneNumber)
  }

  const nextSceneStates = [...sceneStates]
  nextSceneStates[existingIndex] = sceneState
  return nextSceneStates
}

function getSceneStateFromList(sceneStates: StorySceneState[], sceneNumber: number) {
  return (
    sceneStates.find((sceneState) => sceneState.sceneNumber === sceneNumber) ??
    createEmptyStorySceneState(sceneNumber)
  )
}

export const useGameStore = create<GameState & GameActions>()(
  persist(
    (set, get) => ({
      ...defaultGameState,
      resetGame: () => {
        set(defaultGameState)
      },
      setSelectedClassId: (selectedClassId) => {
        set({ selectedClassId })
      },
      setAbilityScores: (abilityScores) => {
        set({ abilityScores })
      },
      setBackgroundData: (backgroundData) => {
        set({ backgroundData })
      },
      setBackgroundSelection: (backgroundSelection) => {
        set({ backgroundSelection })
      },
      setStories: (stories) => {
        set({ stories })
      },
      getSceneState: (sceneNumber) => {
        return getSceneStateFromList(get().sceneStates, sceneNumber)
      },
      setSceneState: (sceneState) => {
        set((state) => ({
          sceneStates: upsertSceneState(state.sceneStates, sceneState),
        }))
      },
      updateSceneState: (sceneNumber, updater) => {
        set((state) => {
          const currentSceneState = getSceneStateFromList(state.sceneStates, sceneNumber)
          return {
            sceneStates: upsertSceneState(state.sceneStates, updater(currentSceneState)),
          }
        })
      },
      clearSceneStatesAfter: (sceneNumber) => {
        set((state) => ({
          sceneStates: state.sceneStates.filter(
            (sceneState) => sceneState.sceneNumber <= sceneNumber,
          ),
        }))
      },
      initializeSceneZero: ({ maxHp, currentHp, items }) => {
        set((state) => ({
          sceneStates: upsertSceneState(state.sceneStates, {
            ...createEmptyStorySceneState(0),
            sceneNumber: 0,
            maxHp,
            currentHp,
            items,
          }),
        }))
      },
      ensureSceneState: (sceneNumber, fallback) => {
        set((state) => {
          const currentSceneState = state.sceneStates.find(
            (sceneState) => sceneState.sceneNumber === sceneNumber,
          )

          if (currentSceneState) {
            return state
          }

          return {
            sceneStates: upsertSceneState(state.sceneStates, {
              ...createEmptyStorySceneState(sceneNumber),
              ...fallback,
              sceneNumber,
            }),
          }
        })
      },
      setSceneJudgeResult: (sceneNumber, judgeResult) => {
        get().updateSceneState(sceneNumber, (sceneState) => ({
          ...sceneState,
          judgeResult,
        }))
      },
      setSceneDiceRoll: (sceneNumber, diceRoll) => {
        get().updateSceneState(sceneNumber, (sceneState) => ({
          ...sceneState,
          diceRoll,
        }))
      },
      setScenePlayerAction: (sceneNumber, playerAction) => {
        get().updateSceneState(sceneNumber, (sceneState) => ({
          ...sceneState,
          playerAction,
        }))
      },
      setSceneActiveItemIds: (sceneNumber, activeItemIds) => {
        get().updateSceneState(sceneNumber, (sceneState) => ({
          ...sceneState,
          activeItemIds,
        }))
      },
      finalizeSceneSnapshot: (sceneNumber, scene) => {
        set((state) => {
          const currentSceneState = getSceneStateFromList(state.sceneStates, sceneNumber)
          return {
            sceneStates: upsertSceneState(state.sceneStates, {
              // 過去シーンは不変スナップショットとして扱う。
              // 画面遷移時に、確定済みの判定結果や出目を消さないため。
              ...currentSceneState,
              sceneNumber,
              scene,
              activeItemIds: currentSceneState.activeItemIds.filter((itemId) =>
                currentSceneState.items.some((item) => item.id === itemId),
              ),
            }),
          }
        })
      },
      initializeNextSceneFromCurrent: (sceneNumber) => {
        set((state) => {
          const currentSceneState = getSceneStateFromList(state.sceneStates, sceneNumber)
          const nextSceneNumber = sceneNumber + 1
          const nextSceneState = getSceneStateFromList(state.sceneStates, nextSceneNumber)
          // まだ存在しない次シーンだけを初期化する。
          // 再訪済みシーンの HP・行動・判定結果・出目を上書きしないため。
          const isEmptyNextScene =
            nextSceneState.scene === null &&
            nextSceneState.items.length === 0 &&
            nextSceneState.activeItemIds.length === 0 &&
            nextSceneState.playerAction === '' &&
            nextSceneState.judgeResult === null &&
            nextSceneState.diceRoll === null &&
            nextSceneState.maxHp === 0 &&
            nextSceneState.currentHp === 0

          if (!isEmptyNextScene) {
            return state
          }

          return {
            sceneStates: upsertSceneState(state.sceneStates, {
              ...createEmptyStorySceneState(nextSceneNumber),
              sceneNumber: nextSceneNumber,
              maxHp: currentSceneState.maxHp,
              currentHp: currentSceneState.currentHp,
              items: currentSceneState.items,
            }),
          }
        })
      },
    }),
    {
      name: GAME_STORE_KEY,
      version: 1,
      storage: createJSONStorage(() => window.localStorage),
      partialize: (state) => ({
        selectedClassId: state.selectedClassId,
        abilityScores: state.abilityScores,
        backgroundData: state.backgroundData,
        backgroundSelection: state.backgroundSelection,
        stories: state.stories,
        sceneStates: state.sceneStates,
      }),
    },
  ),
)
