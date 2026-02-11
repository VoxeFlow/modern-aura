import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// import './index.css' // REMOVED: Index.css is for the System App, not Landing Page
import LandingPage from './pages/LandingPage.jsx'

// Simple redirector: saves lead to storage and goes to /app
const handleGetStarted = () => {
    window.location.href = '/app/';
};

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <LandingPage onGetStarted={handleGetStarted} />
    </StrictMode>,
)
