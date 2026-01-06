import { useState, useMemo } from 'react'
import { useHomeAssistantContext } from '../context/HomeAssistantContext'
import { callService } from '../services/homeAssistant'

const HOUSE_MODES = [
  { id: 'Morning', label: 'Morning', icon: 'sunrise', color: 'orange' },
  { id: 'Day', label: 'Day', icon: 'sun', color: 'yellow' },
  { id: 'Evening', label: 'Evening', icon: 'sunset', color: 'purple' },
  { id: 'Night No Motion', label: 'Night No Motion', icon: 'moon', color: 'indigo' },
  { id: 'Bedtime', label: 'Bedtime', icon: 'bed', color: 'blue' },
  { id: 'Cleaning', label: 'Cleaning', icon: 'sparkles', color: 'emerald' },
  { id: 'Entertain', label: 'Entertain', icon: 'party', color: 'pink' },
] as const

type ModeColor = typeof HOUSE_MODES[number]['color']

const colorClasses: Record<ModeColor, { bg: string; border: string; text: string; activeBg: string }> = {
  orange: { bg: 'bg-orange-500/20', border: 'border-orange-500/30', text: 'text-orange-400', activeBg: 'bg-orange-500' },
  yellow: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', text: 'text-yellow-400', activeBg: 'bg-yellow-500' },
  purple: { bg: 'bg-purple-500/20', border: 'border-purple-500/30', text: 'text-purple-400', activeBg: 'bg-purple-500' },
  indigo: { bg: 'bg-indigo-500/20', border: 'border-indigo-500/30', text: 'text-indigo-400', activeBg: 'bg-indigo-500' },
  blue: { bg: 'bg-blue-500/20', border: 'border-blue-500/30', text: 'text-blue-400', activeBg: 'bg-blue-500' },
  emerald: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', text: 'text-emerald-400', activeBg: 'bg-emerald-500' },
  pink: { bg: 'bg-pink-500/20', border: 'border-pink-500/30', text: 'text-pink-400', activeBg: 'bg-pink-500' },
}

function ModeIcon({ icon, className }: { icon: string; className?: string }) {
  switch (icon) {
    case 'sunrise':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-1.616 6.364l1.591 1.591M12 18.75V21m-6.364-.386l1.591-1.591M3 12h2.25m1.616-6.364L5.255 4.045M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 20h16" />
        </svg>
      )
    case 'sun':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
        </svg>
      )
    case 'sunset':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-1.616 6.364l1.591 1.591M12 18.75V21m-6.364-.386l1.591-1.591M3 12h2.25m1.616-6.364L5.255 4.045" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 20h16" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v5" />
        </svg>
      )
    case 'moon':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
        </svg>
      )
    case 'bed':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      )
    case 'sparkles':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
        </svg>
      )
    case 'party':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
        </svg>
      )
    default:
      return null
  }
}

export function HouseModeView() {
  const { entities, updateEntity } = useHomeAssistantContext()
  const [loading, setLoading] = useState(false)

  // Find the house mode entity
  const houseModeEntity = useMemo(
    () => entities.find(e => e.entity_id === 'input_text.house_mode2'),
    [entities]
  )

  const currentMode = houseModeEntity?.state || 'Unknown'

  // Find the current mode config
  const currentModeConfig = HOUSE_MODES.find(m => m.id === currentMode)

  const handleModeChange = async (newMode: string) => {
    if (!houseModeEntity || newMode === currentMode) return

    setLoading(true)
    try {
      // Optimistic update
      updateEntity({ ...houseModeEntity, state: newMode })

      await callService('input_text', 'set_value', {
        entity_id: 'input_text.house_mode2',
        value: newMode,
      })
    } catch (error) {
      console.error('Failed to set house mode:', error)
      // Revert on error
      updateEntity(houseModeEntity)
    } finally {
      setLoading(false)
    }
  }

  if (!houseModeEntity) {
    return (
      <div className="p-4 pb-24">
        <div className="glass-card p-6 text-center">
          <p className="text-slate-400 text-shadow">House mode entity not found</p>
          <p className="text-sm text-slate-500 mt-2">Looking for: input_text.house_mode2</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 pb-24 space-y-6">
      {/* Current Mode Display */}
      <div className={`glass-card p-6 transition-all ${
        currentModeConfig
          ? `${colorClasses[currentModeConfig.color].bg}`
          : ''
      }`} style={currentModeConfig ? { boxShadow: `0 0 30px ${colorClasses[currentModeConfig.color].text.replace('text-', 'rgba(').replace('-400', ', 0.3)')}` } : {}}>
        <div className="text-sm text-slate-400 mb-2">Current Mode</div>
        <div className="flex items-center gap-4">
          {currentModeConfig && (
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${colorClasses[currentModeConfig.color].activeBg} shadow-lg`}>
              <ModeIcon icon={currentModeConfig.icon} className="w-8 h-8 text-white drop-shadow-lg" />
            </div>
          )}
          <div>
            <h2 className={`text-3xl font-semibold text-shadow ${
              currentModeConfig ? colorClasses[currentModeConfig.color].text : 'text-white'
            }`}>
              {currentMode}
            </h2>
            <p className="text-sm text-slate-500">Tap below to change</p>
          </div>
        </div>
      </div>

      {/* Mode Selection Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-slate-400 px-1">Select Mode</h3>
        <div className="grid grid-cols-2 gap-3">
          {HOUSE_MODES.map((mode) => {
            const isActive = currentMode === mode.id
            const colors = colorClasses[mode.color]

            return (
              <button
                key={mode.id}
                onClick={() => handleModeChange(mode.id)}
                disabled={loading || isActive}
                className={`glass-card flex flex-col items-center gap-3 p-5 transition-all duration-300 ${
                  isActive
                    ? `${colors.activeBg} text-white shadow-lg`
                    : `hover:bg-white/5 ${colors.text}`
                } ${loading ? 'opacity-50 pointer-events-none' : ''} ${
                  isActive ? '' : 'active:scale-95'
                }`}
                style={isActive ? { boxShadow: `0 0 25px ${colors.text.replace('text-', 'rgba(').replace('-400', ', 0.4)')}` } : {}}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                  isActive ? 'bg-white/20 shadow-inner' : `glass-panel ${colors.bg}`
                }`}>
                  <ModeIcon icon={mode.icon} className={`w-6 h-6 ${isActive ? 'drop-shadow-lg' : ''}`} />
                </div>
                <span className={`text-sm font-medium ${isActive ? 'text-shadow' : ''}`}>{mode.label}</span>
                {isActive && (
                  <span className="text-xs opacity-75">Active</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Info */}
      <div className="text-center text-sm text-slate-500 px-4">
        House mode controls automations and lighting scenes throughout your home.
      </div>
    </div>
  )
}
