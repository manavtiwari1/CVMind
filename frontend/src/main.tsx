import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { syncSessionFromCookie } from './lib/session'
import { hostRedirectTarget, isPlacementsHost, isTeamHost } from './lib/hosts'
import { wakeServer } from './lib/serverWake'

// Pick up a sign-in from the other cvmind.in host, then make sure this address is on the right one
syncSessionFromCookie()
const redirectTo = hostRedirectTarget()
// Start a sleeping API server now, so the visitor's first upload doesn't wait for it
if (!redirectTo) wakeServer()

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
  // The main site loads on its own, so team.cvmind.in and placements.cvmind.in never download it
  Promise.all([import('./App.tsx'), import('@react-oauth/google'), import('./lib/templatePick')]).then(([{ default: App }, { GoogleOAuthProvider }, { pickTemplate }]) => {
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
  })
}
