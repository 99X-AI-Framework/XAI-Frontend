import { createBrowserRouter } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import LandingPage from '@/app/LandingPage'

// eslint-disable-next-line react-refresh/only-export-components

export const router = createBrowserRouter([{ path: '/', element: <LandingPage /> }])
