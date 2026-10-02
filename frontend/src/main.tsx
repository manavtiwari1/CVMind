import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import App from './App.tsx'
import { syncSessionFromCookie } from './lib/session'
import { hostRedirectTarget } from './lib/hosts'
import { pickTemplate } from './lib/templatePick'

// Pick up a sign-in from the other cvmind.in host, then make sure this address is on the right one
syncSessionFromCookie()
const redirectTo = hostRedirectTarget(localStorage.getItem('cvmind_logged_in') === 'true')

if (redirectTo) {
  window.location.replace(redirectTo)
} else {
  // A template picked on www arrives as ?template= (see setCurrentPage in App)
  const params = new URLSearchParams(window.location.search)
  const template = params.get('template')
  if (template) {
    pickTemplate(template)
    params.delete('template')
    const qs = params.toString()
    window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash)
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <GoogleOAuthProvider clientId="1036904236561-m92usq7j7pso47r9k02n9dtdmm563162.apps.googleusercontent.com">
        <App />
      </GoogleOAuthProvider>
    </StrictMode>,
  )
}
