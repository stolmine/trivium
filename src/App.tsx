import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LibraryPage } from './routes/library'
import { ReadPage } from './routes/read/[id]'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LibraryPage />} />
        <Route path="/read/:id" element={<ReadPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
