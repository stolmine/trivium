import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppShell } from './components/shell/AppShell'
import { SkeletonDashboard, SkeletonReadingView, SkeletonReviewCard } from './components/shared/SkeletonLoader'

const DashboardPage = lazy(() => import('./routes/dashboard').then(module => ({ default: module.DashboardPage })))
const LibraryPage = lazy(() => import('./routes/library').then(module => ({ default: module.LibraryPage })))
const ReadPage = lazy(() => import('./routes/read/[id]').then(module => ({ default: module.ReadPage })))
const ReviewPage = lazy(() => import('./routes/review').then(module => ({ default: module.ReviewPage })))
const IngestPage = lazy(() => import('./routes/ingest').then(module => ({ default: module.IngestPage })))

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<SkeletonDashboard />}>
            <DashboardPage />
          </Suspense>
        ),
      },
      {
        path: 'library',
        element: (
          <Suspense fallback={<SkeletonDashboard />}>
            <LibraryPage />
          </Suspense>
        ),
      },
      {
        path: 'read/:id',
        element: (
          <Suspense fallback={<SkeletonReadingView />}>
            <ReadPage />
          </Suspense>
        ),
      },
      {
        path: 'review',
        element: (
          <Suspense fallback={<div className="flex items-center justify-center h-full p-8"><SkeletonReviewCard /></div>}>
            <ReviewPage />
          </Suspense>
        ),
      },
      {
        path: 'ingest',
        element: (
          <Suspense fallback={<SkeletonDashboard />}>
            <IngestPage />
          </Suspense>
        ),
      },
    ],
  },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
