const SELECTED_CLASS_KEY = 'trpg:selected-class'
const ABILITY_SCORES_KEY = 'trpg:ability-scores'
const SELECTED_ITEMS_KEY = 'trpg:selected-items'
const BACKGROUND_DATA_KEY = 'trpg:background-data'

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

export type BackgroundData = {
  intro_title: string
  intro_text: string
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
      (item): item is SelectedItem =>
        typeof item === 'object' &&
        item !== null &&
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        typeof item.description === 'string' &&
        typeof item.category === 'string',
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
      typeof parsed.intro_title === 'string' &&
      typeof parsed.intro_text === 'string'
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
