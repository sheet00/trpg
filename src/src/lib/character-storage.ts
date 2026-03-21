const SELECTED_CLASS_KEY = 'trpg:selected-class'
const ABILITY_SCORES_KEY = 'trpg:ability-scores'
const SELECTED_ITEMS_KEY = 'trpg:selected-items'
const BACKGROUND_DATA_KEY = 'trpg:background-data'
const BACKGROUND_SELECTION_KEY = 'trpg:background-selection'
const STORY_SCENE_KEY = 'trpg:story-scene'
const ACTIVE_ITEM_IDS_KEY = 'trpg:active-item-ids'
const STORIES_KEY = 'trpg:stories'
const PLAYER_ACTION_KEY = 'trpg:player-action'
const JUDGE_RESULT_KEY = 'trpg:judge-result'
const DICE_ROLL_KEY = 'trpg:dice-roll'
const STORY_SCENES_KEY = 'trpg:story-scenes'
const STORAGE_KEYS = [
  SELECTED_CLASS_KEY,
  ABILITY_SCORES_KEY,
  SELECTED_ITEMS_KEY,
  BACKGROUND_DATA_KEY,
  BACKGROUND_SELECTION_KEY,
  STORY_SCENE_KEY,
  ACTIVE_ITEM_IDS_KEY,
  STORIES_KEY,
  PLAYER_ACTION_KEY,
  JUDGE_RESULT_KEY,
  DICE_ROLL_KEY,
  STORY_SCENES_KEY,
] as const

export type AbilityScores = {
  strength: number
  dexterity: number
  constitution: number
  intelligence: number
  wisdom: number
  charisma: number
}

export type SelectedItem = {
  id: string
  name: string
  description: string
  category: string
}

export type AdventureThemeId =
  | 'comical'
  | 'serious'
  | 'dark'
  | 'mysterious'
  | 'heroic'
  | 'grim'
  | 'epic'
  | 'melancholic'
  | 'whimsical'
  | 'suspenseful'
  | 'gothic'
  | 'folktale'
  | 'political'
  | 'survival'
  | 'romantic'
  | 'tragic'
  | 'weird'
  | 'adventurous'
  | 'revenge'
  | 'sacred'

export type BackgroundData = {
  adventureTheme: AdventureThemeId
  intro_title: string
  intro_text: string
  item_candidates?: SelectedItem[]
}

export type StoryScene = {
  scene_title: string
  scene_text: string
}

function isSelectedItem(value: unknown): value is SelectedItem {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'name' in value &&
    typeof value.name === 'string' &&
    'description' in value &&
    typeof value.description === 'string' &&
    'category' in value &&
    typeof value.category === 'string'
  )
}

function normalizeStoryScene(value: unknown): StoryScene | null {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('scene_title' in value) ||
    typeof value.scene_title !== 'string' ||
    !('scene_text' in value) ||
    typeof value.scene_text !== 'string'
  ) {
    return null
  }

  return {
    scene_title: value.scene_title,
    scene_text: value.scene_text,
  }
}

export type JudgeResult = {
  needs_roll: boolean
  ability: string | null
  skill: string | null
  difficulty: number | null
  message: string
  success_result: string
  partial_success_result: string | null
  failure_result: string | null
  hp_change_on_success: number
  hp_change_on_partial_success: number
  hp_change_on_failure: number
}

export type StorySceneState = {
  sceneNumber: number
  scene: StoryScene | null
  maxHp: number
  currentHp: number
  items: SelectedItem[]
  activeItemIds: string[]
  playerAction: string
  judgeResult: JudgeResult | null
  diceRoll: number | null
  resolvedOutcome: '成功' | '代償つき成功' | '失敗' | '判定不要' | null
  resolvedResultText: string
  resolvedHpChange: number
}

export const defaultAbilityScores: AbilityScores = {
  strength: 8,
  dexterity: 8,
  constitution: 8,
  intelligence: 8,
  wisdom: 8,
  charisma: 8,
}

export function getStoredClassId() {
  return window.localStorage.getItem(SELECTED_CLASS_KEY)
}

export function setStoredClassId(classId: string) {
  window.localStorage.setItem(SELECTED_CLASS_KEY, classId)
}

export function getStoredAbilityScores() {
  const rawValue = window.localStorage.getItem(ABILITY_SCORES_KEY)

  if (!rawValue) {
    return defaultAbilityScores
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<AbilityScores>

    return {
      strength: parsed.strength ?? 8,
      dexterity: parsed.dexterity ?? 8,
      constitution: parsed.constitution ?? 8,
      intelligence: parsed.intelligence ?? 8,
      wisdom: parsed.wisdom ?? 8,
      charisma: parsed.charisma ?? 8,
    }
  } catch {
    return defaultAbilityScores
  }
}

export function setStoredAbilityScores(scores: AbilityScores) {
  window.localStorage.setItem(ABILITY_SCORES_KEY, JSON.stringify(scores))
}

export function getStoredSelectedItems() {
  const rawValue = window.localStorage.getItem(SELECTED_ITEMS_KEY)

  if (!rawValue) {
    return [] as SelectedItem[]
  }

  try {
    const parsed = JSON.parse(rawValue)
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter(
      (item): item is SelectedItem => isSelectedItem(item),
    )
  } catch {
    return []
  }
}

export function setStoredSelectedItems(items: SelectedItem[]) {
  window.localStorage.setItem(SELECTED_ITEMS_KEY, JSON.stringify(items))
}

export function getStoredBackgroundData() {
  const rawValue = window.localStorage.getItem(BACKGROUND_DATA_KEY)

  if (!rawValue) {
    return null as BackgroundData | null
  }

  try {
    const parsed = JSON.parse(rawValue)

    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.adventureTheme === 'string' &&
      typeof parsed.intro_title === 'string' &&
      typeof parsed.intro_text === 'string' &&
        (!('item_candidates' in parsed) ||
        (Array.isArray(parsed.item_candidates) &&
          parsed.item_candidates.every((item: unknown) => isSelectedItem(item))))
    ) {
      return parsed as BackgroundData
    }

    return null
  } catch {
    return null
  }
}

export function setStoredBackgroundData(backgroundData: BackgroundData) {
  window.localStorage.setItem(BACKGROUND_DATA_KEY, JSON.stringify(backgroundData))
}

export function getStoredBackgroundSelection() {
  const rawValue = window.localStorage.getItem(BACKGROUND_SELECTION_KEY)

  if (!rawValue) {
    return [] as string[]
  }

  try {
    const parsed = JSON.parse(rawValue)
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : []
  } catch {
    return []
  }
}

export function setStoredBackgroundSelection(itemIds: string[]) {
  window.localStorage.setItem(BACKGROUND_SELECTION_KEY, JSON.stringify(itemIds))
}

export function getStoredStoryScene() {
  const rawValue = window.localStorage.getItem(STORY_SCENE_KEY)

  if (!rawValue) {
    return null as StoryScene | null
  }

  try {
    const parsed = JSON.parse(rawValue)
    return normalizeStoryScene(parsed)
  } catch {
    return null
  }
}

export function setStoredStoryScene(storyScene: StoryScene) {
  window.localStorage.setItem(STORY_SCENE_KEY, JSON.stringify(storyScene))
}

export function getStoredStories() {
  const rawValue = window.localStorage.getItem(STORIES_KEY)

  if (!rawValue) {
    return [] as StoryScene[]
  }

  try {
    const parsed = JSON.parse(rawValue)

    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .map((item) => normalizeStoryScene(item))
      .filter((item): item is StoryScene => item !== null)
  } catch {
    return []
  }
}

export function setStoredStories(stories: StoryScene[]) {
  window.localStorage.setItem(STORIES_KEY, JSON.stringify(stories))
}

export function getStoredActiveItemIds() {
  const rawValue = window.localStorage.getItem(ACTIVE_ITEM_IDS_KEY)

  if (!rawValue) {
    return [] as string[]
  }

  try {
    const parsed = JSON.parse(rawValue)
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : []
  } catch {
    return []
  }
}

export function setStoredActiveItemIds(itemIds: string[]) {
  window.localStorage.setItem(ACTIVE_ITEM_IDS_KEY, JSON.stringify(itemIds))
}

export function getStoredPlayerAction() {
  return window.localStorage.getItem(PLAYER_ACTION_KEY) ?? ''
}

export function setStoredPlayerAction(playerAction: string) {
  window.localStorage.setItem(PLAYER_ACTION_KEY, playerAction)
}

export function getStoredJudgeResult() {
  const rawValue = window.localStorage.getItem(JUDGE_RESULT_KEY)

  if (!rawValue) {
    return null as JudgeResult | null
  }

  try {
    const parsed = JSON.parse(rawValue)

    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.needs_roll === 'boolean' &&
      typeof parsed.message === 'string' &&
      (typeof parsed.ability === 'string' || parsed.ability === null) &&
      (typeof parsed.skill === 'string' || parsed.skill === null) &&
      (typeof parsed.difficulty === 'number' || parsed.difficulty === null) &&
      typeof parsed.success_result === 'string' &&
      (typeof parsed.partial_success_result === 'string' || parsed.partial_success_result === null) &&
      (typeof parsed.failure_result === 'string' || parsed.failure_result === null) &&
      typeof parsed.hp_change_on_success === 'number' &&
      typeof parsed.hp_change_on_partial_success === 'number' &&
      typeof parsed.hp_change_on_failure === 'number'
    ) {
      return parsed as JudgeResult
    }

    return null
  } catch {
    return null
  }
}

export function setStoredJudgeResult(judgeResult: JudgeResult | null) {
  if (judgeResult === null) {
    window.localStorage.removeItem(JUDGE_RESULT_KEY)
    return
  }

  window.localStorage.setItem(JUDGE_RESULT_KEY, JSON.stringify(judgeResult))
}

export function getStoredDiceRoll() {
  const rawValue = window.localStorage.getItem(DICE_ROLL_KEY)

  if (!rawValue) {
    return null as number | null
  }

  const parsed = Number(rawValue)
  return Number.isInteger(parsed) ? parsed : null
}

export function setStoredDiceRoll(diceRoll: number | null) {
  if (diceRoll === null) {
    window.localStorage.removeItem(DICE_ROLL_KEY)
    return
  }

  window.localStorage.setItem(DICE_ROLL_KEY, String(diceRoll))
}

function isStoryScene(value: unknown): value is StoryScene {
  return normalizeStoryScene(value) !== null
}

function isJudgeResult(value: unknown): value is JudgeResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'needs_roll' in value &&
    typeof value.needs_roll === 'boolean' &&
    'message' in value &&
    typeof value.message === 'string' &&
    'ability' in value &&
    (typeof value.ability === 'string' || value.ability === null) &&
    'skill' in value &&
    (typeof value.skill === 'string' || value.skill === null) &&
    'difficulty' in value &&
    (typeof value.difficulty === 'number' || value.difficulty === null) &&
    'success_result' in value &&
    typeof value.success_result === 'string' &&
    'partial_success_result' in value &&
    (typeof value.partial_success_result === 'string' || value.partial_success_result === null) &&
    'failure_result' in value &&
    (typeof value.failure_result === 'string' || value.failure_result === null) &&
    'hp_change_on_success' in value &&
    typeof value.hp_change_on_success === 'number' &&
    'hp_change_on_partial_success' in value &&
    typeof value.hp_change_on_partial_success === 'number' &&
    'hp_change_on_failure' in value &&
    typeof value.hp_change_on_failure === 'number'
  )
}

export function createEmptyStorySceneState(sceneNumber: number): StorySceneState {
  return {
    sceneNumber,
    scene: null,
    maxHp: 0,
    currentHp: 0,
    items: [],
    activeItemIds: [],
    playerAction: '',
    judgeResult: null,
    diceRoll: null,
    resolvedOutcome: null,
    resolvedResultText: '',
    resolvedHpChange: 0,
  }
}

export function getStoredStorySceneStates() {
  const rawValue = window.localStorage.getItem(STORY_SCENES_KEY)

  if (!rawValue) {
    return [] as StorySceneState[]
  }

  try {
    const parsed = JSON.parse(rawValue)

    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .filter(
        (item): item is StorySceneState =>
          typeof item === 'object' &&
          item !== null &&
          typeof item.sceneNumber === 'number' &&
          (item.scene === null || isStoryScene(item.scene)) &&
          typeof item.maxHp === 'number' &&
          typeof item.currentHp === 'number' &&
          Array.isArray(item.items) &&
          item.items.every((storyItem: unknown) => isSelectedItem(storyItem)) &&
          Array.isArray(item.activeItemIds) &&
          item.activeItemIds.every((activeItemId: unknown) => typeof activeItemId === 'string') &&
          typeof item.playerAction === 'string' &&
          (item.judgeResult === null || isJudgeResult(item.judgeResult)) &&
          (typeof item.diceRoll === 'number' || item.diceRoll === null),
      )
      .sort((left, right) => left.sceneNumber - right.sceneNumber)
  } catch {
    return []
  }
}

export function setStoredStorySceneStates(sceneStates: StorySceneState[]) {
  window.localStorage.setItem(STORY_SCENES_KEY, JSON.stringify(sceneStates))
}

export function getStoredStorySceneState(sceneNumber: number) {
  return (
    getStoredStorySceneStates().find((sceneState) => sceneState.sceneNumber === sceneNumber) ??
    createEmptyStorySceneState(sceneNumber)
  )
}

export function setStoredStorySceneState(sceneState: StorySceneState) {
  const sceneStates = getStoredStorySceneStates()
  const existingIndex = sceneStates.findIndex(
    (storedSceneState) => storedSceneState.sceneNumber === sceneState.sceneNumber,
  )

  if (existingIndex === -1) {
    setStoredStorySceneStates(
      [...sceneStates, sceneState].sort((left, right) => left.sceneNumber - right.sceneNumber),
    )
    return
  }

  const nextSceneStates = [...sceneStates]
  nextSceneStates[existingIndex] = sceneState
  setStoredStorySceneStates(nextSceneStates)
}

export function clearStoredStorySceneStatesAfter(sceneNumber: number) {
  const sceneStates = getStoredStorySceneStates().filter(
    (sceneState) => sceneState.sceneNumber <= sceneNumber,
  )
  setStoredStorySceneStates(sceneStates)
}

export function clearAllStoredGameData() {
  for (const storageKey of STORAGE_KEYS) {
    window.localStorage.removeItem(storageKey)
  }
}
