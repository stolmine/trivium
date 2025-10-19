import { lazy, Suspense, useEffect, useRef } from 'react'
import { createBrowserRouter, RouterProvider, useLocation } from 'react-router-dom'
import { AppShell } from './components/shell/AppShell'
import { SkeletonDashboard, SkeletonReadingView, SkeletonReviewCard } from './components/shared/SkeletonLoader'
import { useNavigationHistory } from './lib/stores/navigationHistory'
import { useSettingsStore } from './lib/stores/settings'

const DashboardPage = lazy(() => import('./routes/dashboard').then(module => ({ default: module.DashboardPage })))
const LibraryPage = lazy(() => import('./routes/library').then(module => ({ default: module.LibraryPage })))
const ReadPage = lazy(() => import('./routes/read/[id]').then(module => ({ default: module.ReadPage })))
const ReviewHubPage = lazy(() => import('./routes/review').then(module => ({ default: module.ReviewHubPage })))
const ReviewSessionPage = lazy(() => import('./routes/review/session').then(module => ({ default: module.ReviewSessionPage })))
const CreateCardsPage = lazy(() => import('./routes/create').then(module => ({ default: module.CreateCardsPage })))
const IngestPage = lazy(() => import('./routes/ingest').then(module => ({ default: module.IngestPage })))
const SettingsPage = lazy(() => import('./routes/settings').then(module => ({ default: module.SettingsPage })))
const StatsPage = lazy(() => import('./routes/stats').then(module => ({ default: module.StatsPage })))

function NavigationTracker() {
  const location = useLocation()
  const { pushEntry } = useNavigationHistory()
  const isNavigatingRef = useRef(false)

  useEffect(() => {
    // Don't push to history if this navigation came from history back/forward
    // The state will have a __fromHistory flag when navigating via goBack/goForward
    const state = location.state as { __fromHistory?: boolean } | null

    if (!isNavigatingRef.current && !state?.__fromHistory) {
      pushEntry(location.pathname, location.state)
    }
    isNavigatingRef.current = false
  }, [location.pathname, location.state, pushEntry])

  return null
}

function AppShellWithTracking() {
  return (
    <>
      <NavigationTracker />
      <AppShell />
    </>
  )
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShellWithTracking />,
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
        children: [
          {
            index: true,
            element: (
              <Suspense fallback={<SkeletonDashboard />}>
                <ReviewHubPage />
              </Suspense>
            ),
          },
          {
            path: 'session',
            element: (
              <Suspense fallback={<div className="flex items-center justify-center h-full p-8"><SkeletonReviewCard /></div>}>
                <ReviewSessionPage />
              </Suspense>
            ),
          },
        ],
      },
      {
        path: 'create',
        element: (
          <Suspense fallback={<SkeletonDashboard />}>
            <CreateCardsPage />
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
      {
        path: 'settings',
        element: (
          <Suspense fallback={<SkeletonDashboard />}>
            <SettingsPage />
          </Suspense>
        ),
      },
      {
        path: 'stats',
        element: (
          <Suspense fallback={<SkeletonDashboard />}>
            <StatsPage />
          </Suspense>
        ),
      },
    ],
  },
])

function App() {
  const initTheme = useSettingsStore((state) => state.initTheme)

  useEffect(() => {
    console.log('[App.tsx] useEffect running - initializing theme');
    console.log('[App.tsx] DOM ready state:', document.readyState);
    console.log('[App.tsx] HTML element exists:', !!document.documentElement);

    // Initialize theme on app load
    const cleanup = initTheme()
    console.log('[App.tsx] Theme initialization complete');

    // Cleanup event listeners on unmount
    return cleanup
  }, [initTheme])

  return <RouterProvider router={router} />
}

export default App
