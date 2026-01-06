import { useHomeAssistantContext } from '../context/HomeAssistantContext'
import { getBaseUrl } from '../services/homeAssistant'

export function SetupScreen() {
  const { configured, connectionStatus, error, connect } = useHomeAssistantContext()

  const isError = connectionStatus === 'error'

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800 rounded-xl p-6 shadow-xl">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-blue-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Home Assistant Dashboard
          </h1>
          <p className="text-slate-400">
            {isError ? 'Connection failed' : 'Setup required'}
          </p>
        </div>

        {isError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
            <p className="text-red-400 text-sm">
              <strong>Error:</strong> {error}
            </p>
            {getBaseUrl() && (
              <p className="text-red-400/70 text-xs mt-2">
                Trying to connect to: {getBaseUrl()}
              </p>
            )}
          </div>
        )}

        {!configured ? (
          <div className="space-y-4">
            <div className="bg-slate-700/50 rounded-lg p-4">
              <h2 className="text-white font-medium mb-3">Quick Setup</h2>
              <ol className="text-sm text-slate-300 space-y-3">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold">
                    1
                  </span>
                  <span>
                    Copy <code className="bg-slate-600 px-1 rounded">.env.example</code> to{' '}
                    <code className="bg-slate-600 px-1 rounded">.env</code>
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold">
                    2
                  </span>
                  <span>
                    Add your Home Assistant URL
                    <br />
                    <code className="text-xs bg-slate-600 px-1 rounded">
                      VITE_HA_URL=https://your-ha.url
                    </code>
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold">
                    3
                  </span>
                  <div>
                    <span>Generate a Long-Lived Access Token:</span>
                    <ul className="mt-1 text-xs text-slate-400 ml-4 list-disc">
                      <li>Open Home Assistant</li>
                      <li>Click your profile (bottom left)</li>
                      <li>Scroll to "Long-Lived Access Tokens"</li>
                      <li>Create and copy the token</li>
                    </ul>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold">
                    4
                  </span>
                  <span>
                    Add the token to your <code className="bg-slate-600 px-1 rounded">.env</code>
                    <br />
                    <code className="text-xs bg-slate-600 px-1 rounded">
                      VITE_HA_TOKEN=your_token_here
                    </code>
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold">
                    5
                  </span>
                  <span>Restart the dev server</span>
                </li>
              </ol>
            </div>

            <div className="text-center text-sm text-slate-500">
              After updating your <code className="bg-slate-700 px-1 rounded">.env</code> file,
              restart the dev server and refresh this page.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-slate-300 text-sm text-center">
              Your configuration looks correct, but we couldn't connect.
              Please check:
            </p>
            <ul className="text-sm text-slate-400 space-y-2 ml-4 list-disc">
              <li>Your Home Assistant is running and accessible</li>
              <li>The URL is correct (including http:// or https://)</li>
              <li>Your access token is valid and not expired</li>
              <li>CORS is not blocking the request</li>
            </ul>
            <button
              onClick={() => connect()}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
