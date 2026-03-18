import { Navigate, Route, Routes } from 'react-router-dom'
import { AbilityScoresPage } from './pages/AbilityScoresPage'
import { BackgroundPage } from './pages/BackgroundPage'
import { ClassSelectPage } from './pages/ClassSelectPage'
import { StoryPage } from './pages/StoryPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/class-select" replace />} />
      <Route path="/class-select" element={<ClassSelectPage />} />
      <Route path="/ability-scores" element={<AbilityScoresPage />} />
      <Route path="/background" element={<BackgroundPage />} />
      <Route path="/story" element={<StoryPage />} />
    </Routes>
  )
}

export default App
