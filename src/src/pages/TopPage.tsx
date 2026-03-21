import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/game-store'

export function TopPage() {
  const navigate = useNavigate()
  const resetGame = useGameStore((state) => state.resetGame)

  const handleStart = () => {
    resetGame()
    navigate('/class-select')
  }

  useEffect(() => {
    document.title = 'TRPG'
  }, [])

  return (
    <main className="top-page-shell hero min-h-screen" data-theme="light">
      <section className="hero-content w-full max-w-[1440px] items-stretch px-6 py-10 lg:px-10 lg:py-14">
        <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,1.3fr)_420px]">
          <div className="card border border-base-300 bg-base-100/90 shadow-2xl">
            <div className="card-body justify-center gap-6 p-8 lg:p-12">
              <p className="top-page-kicker">D&amp;D Inspired Solo Adventure</p>
              <div className="space-y-5">
                <h1>ダンジョンズ＆ドラゴンズ風</h1>
                <p className="top-page-copy">
                  クラスを選び、能力値を決め、背景と初期装備を整えたあと、AIゲームマスターが導く物語へ踏み込みます。探索、会話、戦闘、判定、選択の積み重ねによってシーンが変化し、あなたの判断が冒険の結末を形作ります。
                </p>
              </div>
              <div className="card-actions pt-2">
                <button
                  type="button"
                  className="btn btn-primary btn-wide top-page-start"
                  onClick={handleStart}
                >
                  スタート
                </button>
              </div>
            </div>
          </div>

          <div className="card border border-base-300 bg-base-100/80 shadow-xl">
            <div className="card-body gap-5 p-6 lg:p-8">
              <p className="top-page-summary-label">Game Flow</p>
              <ul className="top-page-summary-list">
                <li>クラス選択と能力値設定で冒険者を作成する</li>
                <li>背景と初期装備を定め、冒険前の状態を整える</li>
                <li>AIゲームマスターがシーンごとに状況を提示する</li>
                <li>行動宣言と判定結果によって物語が分岐する</li>
                <li>選択の積み重ねが戦いと結末を決める</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
