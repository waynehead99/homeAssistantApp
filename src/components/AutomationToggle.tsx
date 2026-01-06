import { useState } from 'react'
import type { AutomationEntity, ScriptEntity } from '../types/homeAssistant'
import { callService } from '../services/homeAssistant'

interface AutomationToggleProps {
  entity: AutomationEntity | ScriptEntity
  onUpdate: (entity: AutomationEntity | ScriptEntity) => void
  displayName?: string
  compact?: boolean
}

export function AutomationToggle({ entity, onUpdate, displayName }: AutomationToggleProps) {
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const isScript = entity.entity_id.startsWith('script.')
  const name = displayName || entity.attributes.friendly_name || entity.entity_id.split('.')[1].replace(/_/g, ' ')
  const lastTriggered = entity.attributes.last_triggered

  const handleTrigger = async () => {
    setShowConfirm(false)
    setLoading(true)
    try {
      if (isScript) {
        // Scripts use script.turn_on to trigger
        await callService('script', 'turn_on', {
          entity_id: entity.entity_id,
        })
      } else {
        // Automations use automation.trigger
        await callService('automation', 'trigger', {
          entity_id: entity.entity_id,
        })
      }
      // Update last_triggered timestamp
      onUpdate({
        ...entity,
        attributes: { ...entity.attributes, last_triggered: new Date().toISOString() }
      })
    } catch (error) {
      console.error(`Failed to trigger ${isScript ? 'script' : 'automation'}:`, error)
    } finally {
      setLoading(false)
    }
  }

  // Format last triggered time
  const formatLastTriggered = (isoString?: string) => {
    if (!isoString) return 'Never run'
    try {
      const date = new Date(isoString)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMins / 60)
      const diffDays = Math.floor(diffHours / 24)

      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins}m ago`
      if (diffHours < 24) return `${diffHours}h ago`
      if (diffDays < 7) return `${diffDays}d ago`
      return date.toLocaleDateString()
    } catch {
      return 'Unknown'
    }
  }

  // Different colors for scripts vs automations
  const bgColor = isScript ? 'bg-blue-500/20' : 'bg-emerald-500/20'
  const textColor = isScript ? 'text-blue-400' : 'text-emerald-400'
  const buttonBg = isScript ? 'bg-blue-500' : 'bg-emerald-500'
  const buttonHover = isScript ? 'hover:bg-blue-400' : 'hover:bg-emerald-400'

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={loading}
        className={`flex items-center gap-3 p-3 rounded-xl transition-all w-full text-left bg-slate-800 hover:bg-slate-700 active:scale-[0.98] ${
          loading ? 'opacity-70 pointer-events-none' : ''
        }`}
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${bgColor}`}>
          {loading ? (
            <svg className={`w-5 h-5 ${textColor} animate-spin`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ) : isScript ? (
            <svg className={`w-5 h-5 ${textColor}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          ) : (
            <svg className={`w-5 h-5 ${textColor}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{name}</p>
          <p className="text-xs text-slate-500">Last: {formatLastTriggered(lastTriggered)}</p>
        </div>
        <svg className="w-4 h-4 text-slate-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-xl border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bgColor}`}>
                {isScript ? (
                  <svg className={`w-6 h-6 ${textColor}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                ) : (
                  <svg className={`w-6 h-6 ${textColor}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                  </svg>
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Run {isScript ? 'Script' : 'Automation'}</h3>
                <p className="text-sm text-slate-400">{name}</p>
              </div>
            </div>

            <p className="text-slate-300 mb-6">
              Are you sure you want to run this {isScript ? 'script' : 'automation'}?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-700 text-slate-300 font-medium hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleTrigger}
                className={`flex-1 py-3 px-4 rounded-xl ${buttonBg} text-white font-medium ${buttonHover} transition-colors`}
              >
                Run
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
