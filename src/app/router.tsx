import { createBrowserRouter } from 'react-router-dom'
import LandingPage from '@/app/LandingPage'

export const router = createBrowserRouter([{ path: '/', element: <LandingPage /> }])
