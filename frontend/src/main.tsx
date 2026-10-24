import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import App from './App.tsx'
import { syncSessionFromCookie } from './lib/session'
import { hostRedirectTarget, isPlacementsHost, isTeamHost } from './lib/hosts'
import { pickTemplate } from './lib/templatePick'

// Pick up a sign-in from the other cvmind.in host, then make sure this address is on the right one
syncSessionFromCookie()
const redirectTo = hostRedirectTarget(localStorage.getItem('cvmind_logged_in') === 'true')

if (isTeamHost()) {
  // CVMind Team (team.cvmind.in) is its own app with its own sign-in, loaded on demand
  import('./team').then(({ default: TeamApp }) => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <TeamApp />
      </StrictMode>,
    )
  })
} else if (isPlacementsHost()) {
  // CVMind Placements (placements.cvmind.in), the college portal: its own app and sign-in
  import('./placements').then(({ default: PlacementsApp }) => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <PlacementsApp />
      </StrictMode>,
    )
  })
} else if (redirectTo) {
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
