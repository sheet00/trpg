import { useState } from 'react'
import './App.css'

const classes = [
  {
    id: 'barbarian',
    name: 'バーバリアン',
    style: '近接',
    feature: '高耐久 / 突撃',
    difficulty: '低',
    summary: '怒りの力でダメージを受け止めながら、豪快に殴り込む荒々しい戦士。',
    traits: ['高耐久', '瞬間火力', 'シンプルで豪快'],
  },
  {
    id: 'bard',
    name: 'バード',
    style: '支援 / 会話',
    feature: '強化 / 交渉',
    difficulty: '中',
    summary: '音楽と言葉と魔法で味方を支え、会話も探索もそつなくこなす万能型。',
    traits: ['支援特化', '会話に強い', '器用で柔軟'],
  },
  {
    id: 'cleric',
    name: 'クレリック',
    style: '支援 / 呪文',
    feature: '回復 / 防御',
    difficulty: '中',
    summary: '神聖魔法で仲間を癒やし、守り、退魔する信仰の戦士。',
    traits: ['回復呪文', '防御支援', 'アンデッド対策'],
  },
  {
    id: 'druid',
    name: 'ドルイド',
    style: '呪文 / 変身',
    feature: '自然操作 / 継戦',
    difficulty: '高',
    summary: '自然の力を借り、呪文と野生変身で状況を選ばず立ち回る秘術家。',
    traits: ['変身能力', '地形対応', '継戦能力が高い'],
  },
  {
    id: 'fighter',
    name: 'ファイター',
    style: '近接',
    feature: '安定 / 装備自由',
    difficulty: '低',
    summary: '武器、防具、戦術の基本を高水準で扱える、もっとも安定した戦士。',
    traits: ['安定感', '装備自由度', '初心者向け'],
  },
  {
    id: 'monk',
    name: 'モンク',
    style: '近接 / 機動',
    feature: '連撃 / 高速移動',
    difficulty: '中',
    summary: '素早い連撃と気の力で戦場を駆け回る、軽快な近接アタッカー。',
    traits: ['高機動', '連続攻撃', '立ち回り重視'],
  },
  {
    id: 'paladin',
    name: 'パラディン',
    style: '近接 / 支援',
    feature: '防御 / 神聖打撃',
    difficulty: '中',
    summary: '誓いの力で敵を裁き、回復と防御支援もこなす神聖なる騎士。',
    traits: ['高防御', '一撃が重い', '支援も可能'],
  },
  {
    id: 'ranger',
    name: 'レンジャー',
    style: '遠隔 / 探索',
    feature: '追跡 / 野外行動',
    difficulty: '中',
    summary: '追跡、自然探索、弓戦闘を得意とし、危険な土地を切り拓く狩人。',
    traits: ['索敵能力', '遠距離戦', '野外に強い'],
  },
  {
    id: 'rogue',
    name: 'ローグ',
    style: '潜入 / 奇襲',
    feature: '罠解除 / 隠密',
    difficulty: '中',
    summary: '隠密行動、罠解除、急所攻撃に優れた、危機回避のスペシャリスト。',
    traits: ['隠密行動', '解除技能', '高火力の奇襲'],
  },
  {
    id: 'sorcerer',
    name: 'ソーサラー',
    style: '呪文 / 爆発力',
    feature: '高火力 / 魔力変化',
    difficulty: '中',
    summary: '血筋に宿る魔力を操り、強力な呪文を直感的に放つ生来の術者。',
    traits: ['高火力呪文', '呪文改変', '直感的な魔法運用'],
  },
  {
    id: 'warlock',
    name: 'ウォーロック',
    style: '呪文 / 契約',
    feature: '継続火力 / 特殊能力',
    difficulty: '中',
    summary: '異界の存在との契約で得た力を使い、独特な呪文運用で戦う術者。',
    traits: ['継続火力', '個性的', '短休憩と相性が良い'],
  },
  {
    id: 'wizard',
    name: 'ウィザード',
    style: '呪文 / 制圧',
    feature: '多彩な呪文 / 準備重視',
    difficulty: '高',
    summary: '膨大な呪文知識を備え、準備次第で戦闘も探索も支配する学究の魔法使い。',
    traits: ['呪文数が豊富', '柔軟性が高い', '準備が重要'],
  },
]

function App() {
  const [selectedClass, setSelectedClass] = useState(classes[0].id)
  const selectedJob = classes.find((job) => job.id === selectedClass) ?? classes[0]

  return (
    <main className="class-select-shell">
      <section className="class-select-panel">
        <p className="eyebrow">Solo TRPG / Character Setup</p>
        <h1>冒険のはじまりに、職業を選ぶ</h1>
        <p className="lead">
          あなたの職業を決めてください。
        </p>

        <div className="class-grid">
          {classes.map((job) => {
            const isSelected = job.id === selectedClass

            return (
              <button
                key={job.id}
                type="button"
                className={`class-card${isSelected ? ' selected' : ''}`}
                onClick={() => setSelectedClass(job.id)}
              >
                <strong>{job.name}</strong>
                <span className="class-summary">{job.summary}</span>
                <div className="class-meta">
                  <span>戦い方: {job.style}</span>
                  <span>特徴: {job.feature}</span>
                  <span>難しさ: {job.difficulty}</span>
                </div>
                <ul className="trait-list">
                  {job.traits.map((trait) => (
                    <li key={trait}>{trait}</li>
                  ))}
                </ul>
              </button>
            )
          })}
        </div>

        <section className="selection-footer">
          <div className="selected-detail">
            <p className="eyebrow">現在の選択</p>
            <p className="selected-name">{selectedJob.name}</p>
            <dl className="selected-stats">
              <div>
                <dt>戦い方:</dt>
                <dd>{selectedJob.style}</dd>
              </div>
              <div>
                <dt>特徴:</dt>
                <dd>{selectedJob.feature}</dd>
              </div>
              <div>
                <dt>難しさ:</dt>
                <dd>{selectedJob.difficulty}</dd>
              </div>
            </dl>
            <p className="selected-summary">{selectedJob.summary}</p>
          </div>
          <button type="button" className="start-button">
            この職業で冒険を始める
          </button>
        </section>
      </section>
    </main>
  )
}

export default App
