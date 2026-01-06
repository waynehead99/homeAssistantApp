import { useState } from 'react'
import { sceneService, triggerWebhook } from '../services/homeAssistant'

interface SceneButtonProps {
  type: 'scene' | 'webhook'
  id: string
  name: string
  icon?: string
}

export function SceneButton({ type, id, name, icon }: SceneButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [lastTriggered, setLastTriggered] = useState<Date | null>(null)

  const handleClick = async () => {
    setIsLoading(true)
    try {
      if (type === 'scene') {
        await sceneService.turnOn(id)
      } else {
        await triggerWebhook(id)
      }
      setLastTriggered(new Date())
    } catch (error) {
      console.error(`Failed to trigger ${type}:`, error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`bg-slate-800 hover:bg-slate-700 rounded-xl p-4 transition-all text-left w-full ${
        isLoading ? 'opacity-75 cursor-wait' : ''
      } ${lastTriggered ? 'ring-2 ring-green-500/50' : ''}`}
    >
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
          {icon ? (
            <span className="text-xl">{icon}</span>
          ) : (
            <svg
              className="w-5 h-5 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {type === 'scene' ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              )}
            </svg>
          )}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-white truncate">{name}</h3>
          <p className="text-xs text-slate-400">
            {type === 'scene' ? 'Scene' : 'Webhook'}
            {lastTriggered && (
              <span className="ml-2 text-green-400">
                Triggered {lastTriggered.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>

        {/* Loading indicator */}
        {isLoading && (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
        )}
      </div>
    </button>
  )
}
