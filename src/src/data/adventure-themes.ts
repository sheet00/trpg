import type { AdventureThemeId } from '../lib/character-storage'

export type AdventureThemeDefinition = {
  id: AdventureThemeId
  name: string
  summary: string
  vibe: string
}

export const adventureThemes: AdventureThemeDefinition[] = [
  {
    id: 'comical',
    name: 'コミカル',
    summary: '妙な行き違い、癖の強い人物、笑える混乱が起こりやすい。',
    vibe: '軽快で皮肉が効き、ときどき肩の力が抜ける冒険。',
  },
  {
    id: 'serious',
    name: 'シリアス',
    summary: '損失や責任が重く、状況の選択に緊張感がある。',
    vibe: '静かな圧力の中で決断を迫られる冒険。',
  },
  {
    id: 'dark',
    name: 'ダーク',
    summary: '不吉な兆し、禍々しい場所、代償を伴う出来事が色濃い。',
    vibe: '不穏さと消耗がじわじわ迫る冒険。',
  },
  {
    id: 'mysterious',
    name: 'ミステリアス',
    summary: '謎めいた痕跡や隠された事情が前面に出る。',
    vibe: '探索と推理で輪郭が見えてくる冒険。',
  },
  {
    id: 'heroic',
    name: 'ヒロイック',
    summary: '勇気や名誉が試され、正面から立ち向かう場面が映える。',
    vibe: '危機へ踏み込むほど英雄らしさが立ち上がる冒険。',
  },
  {
    id: 'grim',
    name: 'グリム',
    summary: '救いの少ない現実や重い選択が続き、油断が許されない。',
    vibe: '勝利にも苦味が残る過酷な冒険。',
  },
  {
    id: 'epic',
    name: 'エピック',
    summary: '大きな運命や伝承に巻き込まれ、出来事の規模が大きい。',
    vibe: '世界の行く末に触れる壮大な冒険。',
  },
  {
    id: 'melancholic',
    name: 'メランコリック',
    summary: '失われたものや届かない願いの余韻が漂う。',
    vibe: '静かな寂しさを抱えて進む冒険。',
  },
  {
    id: 'whimsical',
    name: 'ウィムジカル',
    summary: '不思議で気まぐれな出来事が続き、世界が少しねじれて見える。',
    vibe: '夢うつつのような軽やかさがある冒険。',
  },
  {
    id: 'suspenseful',
    name: 'サスペンス',
    summary: '切迫した追跡、時間制限、正体不明の脅威が緊張を生む。',
    vibe: '一歩遅れるだけで悪化する張り詰めた冒険。',
  },
  {
    id: 'gothic',
    name: 'ゴシック',
    summary: '古城、血筋、禁忌、退廃的な美しさが濃く漂う。',
    vibe: '優雅さと不吉さが同居する冒険。',
  },
  {
    id: 'folktale',
    name: '御伽話風',
    summary: '古い言い伝え、森の掟、象徴的な出来事が前面に出る。',
    vibe: '素朴さの裏に教訓や魔を秘めた冒険。',
  },
  {
    id: 'political',
    name: '政略劇',
    summary: '勢力争い、駆け引き、表向きの礼節の裏の敵意が軸になる。',
    vibe: '剣より言葉が深く刺さる冒険。',
  },
  {
    id: 'survival',
    name: 'サバイバル',
    summary: '物資不足、環境の脅威、消耗管理が前面に出る。',
    vibe: '生き延びること自体が試練になる冒険。',
  },
  {
    id: 'romantic',
    name: 'ロマンティック',
    summary: '想い、誓い、縁の揺らぎが行動の動機に絡む。',
    vibe: '感情の選択が展開を左右する冒険。',
  },
  {
    id: 'tragic',
    name: 'トラジック',
    summary: '避けがたい破綻や犠牲の気配が早くから差し込む。',
    vibe: '報われなさの中で意味を探す冒険。',
  },
  {
    id: 'weird',
    name: '奇怪',
    summary: '理解しきれない現象や異質な存在が常識を崩してくる。',
    vibe: '理屈だけでは整理できない冒険。',
  },
  {
    id: 'adventurous',
    name: '冒険活劇',
    summary: '罠、追跡、発見、豪快な突破がテンポよく続く。',
    vibe: '勢いよく前へ進み続ける王道の冒険。',
  },
  {
    id: 'revenge',
    name: '復讐譚',
    summary: '過去の因縁や報復の動機が物語を強く牽引する。',
    vibe: '怒りと執念が火種になる冒険。',
  },
  {
    id: 'sacred',
    name: '聖性',
    summary: '神託、信仰、清浄と冒涜の対立が強く表れる。',
    vibe: '祈りと禁忌の境目を踏み越える冒険。',
  },
]

export function getAdventureThemeById(themeId: AdventureThemeId | null) {
  return adventureThemes.find((theme) => theme.id === themeId) ?? null
}

export function getRandomAdventureThemeId() {
  const randomIndex = Math.floor(Math.random() * adventureThemes.length)
  return adventureThemes[randomIndex].id
}
