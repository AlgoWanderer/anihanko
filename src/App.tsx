import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { Layout } from './components/Layout'
import { AnimeDetailPage } from './pages/AnimeDetailPage'
import { CharacterPage } from './pages/CharacterPage'
import { GenresPage } from './pages/GenresPage'
import { GuessPage } from './pages/GuessPage'
import { HomePage } from './pages/HomePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PersonPage } from './pages/PersonPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { SchedulePage } from './pages/SchedulePage'
import { StampBookPage } from './pages/StampBookPage'
import { TonightPage } from './pages/TonightPage'
import { YearPage } from './pages/YearPage'
import { SearchPage } from './pages/SearchPage'
import { SeasonPage } from './pages/SeasonPage'
import { StudioPage } from './pages/StudioPage'
import { TermsPage } from './pages/TermsPage'
import { TopPage } from './pages/TopPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 10, // treat data as fresh for 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// Every URL in the app and which page it shows.
const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/search', element: <SearchPage /> },
      { path: '/anime/:id', element: <AnimeDetailPage /> },
      { path: '/top', element: <TopPage /> },
      { path: '/season', element: <SeasonPage /> },
      { path: '/season/:year/:season', element: <SeasonPage /> },
      { path: '/schedule', element: <SchedulePage /> },
      { path: '/genres', element: <GenresPage /> },
      { path: '/studio/:id', element: <StudioPage /> },
      { path: '/person/:id', element: <PersonPage /> },
      { path: '/character/:id', element: <CharacterPage /> },
      { path: '/stamps', element: <StampBookPage /> },
      { path: '/tonight', element: <TonightPage /> },
      { path: '/guess', element: <GuessPage /> },
      { path: '/year', element: <YearPage /> },
      { path: '/year/:year', element: <YearPage /> },
      { path: '/privacy', element: <PrivacyPage /> },
      { path: '/terms', element: <TermsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
