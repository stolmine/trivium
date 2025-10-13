import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LibraryPage } from './routes/library'
import { ReadPage } from './routes/read/[id]'
import { ReviewPage } from './routes/review'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LibraryPage />} />
        <Route path="/read/:id" element={<ReadPage />} />
        <Route path="/review" element={<ReviewPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
