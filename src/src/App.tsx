import { Navigate, Route, Routes } from 'react-router-dom'
import { AbilityScoresPage } from './pages/AbilityScoresPage'
import { BackgroundPage } from './pages/BackgroundPage'
import { ClassSelectPage } from './pages/ClassSelectPage'
import { EndingPage } from './pages/EndingPage'
import { StoryPage } from './pages/StoryPage'
import { TopPage } from './pages/TopPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<TopPage />} />
      <Route path="/class-select" element={<ClassSelectPage />} />
      <Route path="/ability-scores" element={<AbilityScoresPage />} />
      <Route path="/background" element={<BackgroundPage />} />
      <Route path="/story" element={<StoryPage />} />
      <Route path="/ending" element={<EndingPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
