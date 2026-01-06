// Enhanced 3D Gradient Icon System

interface IconProps {
  className?: string
  filled?: boolean
}

// Shared gradient definitions component
function GradientDefs() {
  return (
    <defs>
      {/* Yellow/Amber gradient for lights */}
      <linearGradient id="grad-yellow" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#f59e0b" />
      </linearGradient>

      {/* Green gradient for switches/power */}
      <linearGradient id="grad-green" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4ade80" />
        <stop offset="100%" stopColor="#22c55e" />
      </linearGradient>

      {/* Blue gradient */}
      <linearGradient id="grad-blue" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#60a5fa" />
        <stop offset="100%" stopColor="#3b82f6" />
      </linearGradient>

      {/* Cyan gradient */}
      <linearGradient id="grad-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#22d3ee" />
        <stop offset="100%" stopColor="#06b6d4" />
      </linearGradient>

      {/* Orange/Red gradient for heat */}
      <linearGradient id="grad-orange" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fb923c" />
        <stop offset="100%" stopColor="#f97316" />
      </linearGradient>

      {/* Purple gradient */}
      <linearGradient id="grad-purple" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#c084fc" />
        <stop offset="100%" stopColor="#a855f7" />
      </linearGradient>

      {/* Red gradient for alerts */}
      <linearGradient id="grad-red" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f87171" />
        <stop offset="100%" stopColor="#ef4444" />
      </linearGradient>

      {/* White/Silver gradient for inactive */}
      <linearGradient id="grad-silver" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#94a3b8" />
        <stop offset="100%" stopColor="#64748b" />
      </linearGradient>

      {/* Drop shadow filter */}
      <filter id="icon-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.3" />
      </filter>

      {/* Glow filter */}
      <filter id="icon-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  )
}

export function LightBulbIcon({ className = 'w-5 h-5', filled = false }: IconProps) {
  if (filled) {
    return (
      <svg className={className} viewBox="0 0 24 24">
        <GradientDefs />
        {/* Glow effect */}
        <circle cx="12" cy="10" r="8" fill="url(#grad-yellow)" opacity="0.2" />
        {/* Bulb body */}
        <path
          d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7z"
          fill="url(#grad-yellow)"
          filter="url(#icon-shadow)"
        />
        {/* Bulb base */}
        <rect x="9" y="19" width="6" height="2" rx="1" fill="url(#grad-silver)" />
        {/* Highlight */}
        <path d="M9 6c0-1.5 1.5-3 3-3" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" fill="none" />
      </svg>
    )
  }
  return (
    <svg className={className} viewBox="0 0 24 24">
      <GradientDefs />
      <path
        d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7z"
        fill="none"
        stroke="url(#grad-silver)"
        strokeWidth="1.5"
      />
      <rect x="9" y="19" width="6" height="2" rx="1" fill="none" stroke="url(#grad-silver)" strokeWidth="1.5" />
    </svg>
  )
}

export function PowerIcon({ className = 'w-5 h-5', filled = false }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <GradientDefs />
      <circle
        cx="12"
        cy="12"
        r="8"
        fill="none"
        stroke={filled ? "url(#grad-green)" : "url(#grad-silver)"}
        strokeWidth="2"
        strokeDasharray="32 12"
        strokeDashoffset="8"
      />
      <line
        x1="12"
        y1="4"
        x2="12"
        y2="12"
        stroke={filled ? "url(#grad-green)" : "url(#grad-silver)"}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {filled && <circle cx="12" cy="12" r="9" fill="url(#grad-green)" opacity="0.15" />}
    </svg>
  )
}

export function BoltIcon({ className = 'w-5 h-5', filled = false }: IconProps) {
  if (filled) {
    return (
      <svg className={className} viewBox="0 0 24 24">
        <GradientDefs />
        <path
          d="M13 2L4 14h7l-2 8 11-12h-7l2-8z"
          fill="url(#grad-yellow)"
          filter="url(#icon-shadow)"
        />
        <path d="M13 2L4 14h7l-2 8 11-12h-7l2-8z" fill="white" opacity="0.3" clipPath="polygon(0 0, 100% 0, 100% 40%, 0 40%)" />
      </svg>
    )
  }
  return (
    <svg className={className} viewBox="0 0 24 24">
      <GradientDefs />
      <path
        d="M13 2L4 14h7l-2 8 11-12h-7l2-8z"
        fill="none"
        stroke="url(#grad-silver)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ThermometerIcon({ className = 'w-5 h-5', hot = false }: IconProps & { hot?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <GradientDefs />
      {/* Thermometer body */}
      <path
        d="M12 2a2 2 0 00-2 2v10.17a4 4 0 102.83 6.83 4 4 0 001.17-4.83V4a2 2 0 00-2-2z"
        fill="none"
        stroke={hot ? "url(#grad-orange)" : "url(#grad-blue)"}
        strokeWidth="1.5"
      />
      {/* Mercury/level */}
      <path
        d="M12 18a2 2 0 100-4 2 2 0 000 4zM12 14V8"
        fill={hot ? "url(#grad-orange)" : "url(#grad-blue)"}
        stroke={hot ? "url(#grad-orange)" : "url(#grad-blue)"}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Tick marks */}
      <path d="M14 6h2M14 9h1M14 12h2" stroke="url(#grad-silver)" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
    </svg>
  )
}

export function DropletIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <GradientDefs />
      <path
        d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"
        fill="url(#grad-cyan)"
        opacity="0.2"
      />
      <path
        d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"
        fill="none"
        stroke="url(#grad-cyan)"
        strokeWidth="1.5"
      />
      {/* Highlight */}
      <path d="M9 10c0-1 1-2 2-2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" fill="none" />
    </svg>
  )
}

export function BatteryIcon({ className = 'w-5 h-5', level = 100 }: IconProps & { level?: number }) {
  const fillWidth = Math.max(0, Math.min(100, level)) / 100 * 14
  const gradientId = level > 50 ? 'grad-green' : level > 20 ? 'grad-yellow' : 'grad-red'

  return (
    <svg className={className} viewBox="0 0 24 24">
      <GradientDefs />
      {/* Battery outline */}
      <rect
        x="2"
        y="7"
        width="18"
        height="10"
        rx="2"
        fill="none"
        stroke="url(#grad-silver)"
        strokeWidth="1.5"
      />
      {/* Battery level fill */}
      <rect
        x="4"
        y="9"
        width={fillWidth}
        height="6"
        rx="1"
        fill={`url(#${gradientId})`}
      />
      {/* Battery cap */}
      <path d="M20 10v4a1 1 0 001 1h1v-6h-1a1 1 0 00-1 1z" fill="url(#grad-silver)" />
    </svg>
  )
}

export function MotionIcon({ className = 'w-5 h-5', active = false }: IconProps & { active?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <GradientDefs />
      {active && (
        <>
          <circle cx="12" cy="12" r="10" fill="url(#grad-blue)" opacity="0.1" />
          <path d="M4 9c2-2.5 5-4 8-4s6 1.5 8 4" stroke="url(#grad-blue)" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" fill="none" />
          <path d="M6 6c1.5-1.5 3.5-2.5 6-2.5s4.5 1 6 2.5" stroke="url(#grad-blue)" strokeWidth="1.5" strokeLinecap="round" opacity="0.2" fill="none" />
        </>
      )}
      {/* Person */}
      <circle cx="12" cy="5" r="2" fill={active ? "url(#grad-blue)" : "url(#grad-silver)"} />
      <path
        d="M12 8v4M9 12l1.5 5M12 12l3 5M9 12l-2 1M15 12l2 1"
        stroke={active ? "url(#grad-blue)" : "url(#grad-silver)"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

export function DoorIcon({ className = 'w-5 h-5', open = false }: IconProps & { open?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <GradientDefs />
      {/* Door frame */}
      <rect
        x="4"
        y="2"
        width="16"
        height="20"
        rx="1"
        fill="none"
        stroke={open ? "url(#grad-orange)" : "url(#grad-silver)"}
        strokeWidth="1.5"
      />
      {open ? (
        <>
          {/* Open door panel (perspective) */}
          <path
            d="M8 3l-3 1v16l3 1V3z"
            fill="url(#grad-orange)"
            opacity="0.3"
          />
          <path d="M8 3v18" stroke={open ? "url(#grad-orange)" : "url(#grad-silver)"} strokeWidth="1.5" />
        </>
      ) : (
        <>
          {/* Door panel */}
          <rect x="6" y="4" width="12" height="16" fill="url(#grad-silver)" opacity="0.1" />
          {/* Door handle */}
          <circle cx="16" cy="12" r="1.5" fill="url(#grad-silver)" />
        </>
      )}
    </svg>
  )
}

export function WindowIcon({ className = 'w-5 h-5', open = false }: IconProps & { open?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <GradientDefs />
      {/* Window frame */}
      <rect
        x="3"
        y="4"
        width="18"
        height="16"
        rx="1"
        fill={open ? "url(#grad-cyan)" : "none"}
        fillOpacity={open ? 0.1 : 0}
        stroke={open ? "url(#grad-cyan)" : "url(#grad-silver)"}
        strokeWidth="1.5"
      />
      {/* Cross bars */}
      <line x1="12" y1="4" x2="12" y2="20" stroke={open ? "url(#grad-cyan)" : "url(#grad-silver)"} strokeWidth="1.5" />
      <line x1="3" y1="12" x2="21" y2="12" stroke={open ? "url(#grad-cyan)" : "url(#grad-silver)"} strokeWidth="1.5" />
      {open && (
        <path d="M4 5h7v6H4z" fill="url(#grad-cyan)" fillOpacity="0.3" />
      )}
    </svg>
  )
}

export function HomeIcon({ className = 'w-5 h-5', filled = false }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <GradientDefs />
      {filled && <path d="M3 12l9-9 9 9v9a1 1 0 01-1 1h-5v-6h-4v6H5a1 1 0 01-1-1v-9z" fill="url(#grad-blue)" opacity="0.2" />}
      {/* House roof */}
      <path
        d="M3 12l9-9 9 9"
        fill="none"
        stroke={filled ? "url(#grad-blue)" : "url(#grad-silver)"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* House body */}
      <path
        d="M5 10v11a1 1 0 001 1h12a1 1 0 001-1V10"
        fill="none"
        stroke={filled ? "url(#grad-blue)" : "url(#grad-silver)"}
        strokeWidth="1.5"
      />
      {/* Door */}
      <rect
        x="10"
        y="15"
        width="4"
        height="7"
        fill="none"
        stroke={filled ? "url(#grad-blue)" : "url(#grad-silver)"}
        strokeWidth="1.5"
      />
    </svg>
  )
}

export function SunIcon({ className = 'w-5 h-5', filled = false }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <GradientDefs />
      {filled && <circle cx="12" cy="12" r="10" fill="url(#grad-yellow)" opacity="0.15" />}
      {/* Sun center */}
      <circle
        cx="12"
        cy="12"
        r="4"
        fill={filled ? "url(#grad-yellow)" : "none"}
        stroke={filled ? "url(#grad-yellow)" : "url(#grad-silver)"}
        strokeWidth="1.5"
      />
      {/* Sun rays */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
        const rad = (angle * Math.PI) / 180
        const x1 = 12 + Math.cos(rad) * 6
        const y1 = 12 + Math.sin(rad) * 6
        const x2 = 12 + Math.cos(rad) * 9
        const y2 = 12 + Math.sin(rad) * 9
        return (
          <line
            key={angle}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={filled ? "url(#grad-yellow)" : "url(#grad-silver)"}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        )
      })}
    </svg>
  )
}

export function FanIcon({ className = 'w-5 h-5', spinning = false }: IconProps & { spinning?: boolean }) {
  return (
    <svg className={`${className} ${spinning ? 'animate-spin' : ''}`} style={spinning ? { animationDuration: '2s' } : {}} viewBox="0 0 24 24">
      <GradientDefs />
      {/* Center hub */}
      <circle cx="12" cy="12" r="2" fill={spinning ? "url(#grad-blue)" : "url(#grad-silver)"} />
      {/* Fan blades */}
      <path
        d="M12 10c-2-4-1-7 2-8 2 3 1 6-2 8zm2 2c4-2 7-1 8 2-3 2-6 1-8-2zm-2 2c2 4 1 7-2 8-2-3-1-6 2-8zm-2-2c-4 2-7 1-8-2 3-2 6-1 8 2z"
        fill={spinning ? "url(#grad-blue)" : "url(#grad-silver)"}
        opacity={spinning ? 1 : 0.7}
      />
    </svg>
  )
}

export function LockIcon({ className = 'w-5 h-5', locked = true }: IconProps & { locked?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <GradientDefs />
      {/* Lock body */}
      <rect
        x="5"
        y="11"
        width="14"
        height="10"
        rx="2"
        fill={locked ? "url(#grad-green)" : "url(#grad-red)"}
        opacity="0.2"
      />
      <rect
        x="5"
        y="11"
        width="14"
        height="10"
        rx="2"
        fill="none"
        stroke={locked ? "url(#grad-green)" : "url(#grad-red)"}
        strokeWidth="1.5"
      />
      {/* Shackle */}
      <path
        d={locked ? "M8 11V7a4 4 0 018 0v4" : "M8 11V7a4 4 0 018 0"}
        fill="none"
        stroke={locked ? "url(#grad-green)" : "url(#grad-red)"}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Keyhole */}
      <circle cx="12" cy="16" r="1.5" fill={locked ? "url(#grad-green)" : "url(#grad-red)"} />
    </svg>
  )
}

export function EyeIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <GradientDefs />
      <path
        d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"
        fill="none"
        stroke="url(#grad-silver)"
        strokeWidth="1.5"
      />
      <circle cx="12" cy="12" r="3" fill="none" stroke="url(#grad-silver)" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="1" fill="url(#grad-silver)" />
    </svg>
  )
}

export function EyeSlashIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <GradientDefs />
      <path
        d="M2 12s3-7 10-7c1.5 0 2.9.3 4.1.8M22 12s-3 7-10 7c-1.5 0-2.9-.3-4.1-.8"
        fill="none"
        stroke="url(#grad-silver)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="3" fill="none" stroke="url(#grad-silver)" strokeWidth="1.5" opacity="0.5" />
      <line x1="4" y1="4" x2="20" y2="20" stroke="url(#grad-silver)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function ChevronDownIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <GradientDefs />
      <path
        d="M6 9l6 6 6-6"
        fill="none"
        stroke="url(#grad-silver)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function RefreshIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <GradientDefs />
      <path
        d="M4 4v5h5M20 20v-5h-5"
        fill="none"
        stroke="url(#grad-blue)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20.5 9A9 9 0 005.6 5.6M3.5 15a9 9 0 0014.9 3.4"
        fill="none"
        stroke="url(#grad-blue)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function CogIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <GradientDefs />
      <circle cx="12" cy="12" r="3" fill="none" stroke="url(#grad-silver)" strokeWidth="1.5" />
      <path
        d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
        stroke="url(#grad-silver)"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}

export function GaugeIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <GradientDefs />
      {/* Gauge arc */}
      <path
        d="M4 18a8 8 0 1116 0"
        fill="none"
        stroke="url(#grad-silver)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Colored segment */}
      <path
        d="M6 16a6 6 0 0112 0"
        fill="none"
        stroke="url(#grad-blue)"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.3"
      />
      {/* Needle */}
      <path
        d="M12 18l2-6"
        stroke="url(#grad-blue)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Center dot */}
      <circle cx="12" cy="18" r="2" fill="url(#grad-blue)" />
    </svg>
  )
}

export function CameraIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <GradientDefs />
      <rect
        x="2"
        y="6"
        width="16"
        height="12"
        rx="2"
        fill="none"
        stroke="url(#grad-silver)"
        strokeWidth="1.5"
      />
      <path
        d="M18 9l4-2v10l-4-2"
        fill="none"
        stroke="url(#grad-silver)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="12" r="3" fill="none" stroke="url(#grad-silver)" strokeWidth="1.5" />
    </svg>
  )
}

export function CalendarIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <GradientDefs />
      <rect
        x="3"
        y="4"
        width="18"
        height="18"
        rx="2"
        fill="none"
        stroke="url(#grad-silver)"
        strokeWidth="1.5"
      />
      <line x1="3" y1="10" x2="21" y2="10" stroke="url(#grad-silver)" strokeWidth="1.5" />
      <line x1="8" y1="2" x2="8" y2="6" stroke="url(#grad-silver)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="2" x2="16" y2="6" stroke="url(#grad-silver)" strokeWidth="1.5" strokeLinecap="round" />
      {/* Date dots */}
      <circle cx="8" cy="15" r="1" fill="url(#grad-blue)" />
      <circle cx="12" cy="15" r="1" fill="url(#grad-silver)" />
      <circle cx="16" cy="15" r="1" fill="url(#grad-silver)" />
    </svg>
  )
}

export function CarIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <GradientDefs />
      <path
        d="M5 17h14v-5l-2-4H7l-2 4v5z"
        fill="url(#grad-silver)"
        opacity="0.2"
      />
      <path
        d="M5 17h14v-5l-2-4H7l-2 4v5zM5 17v2h3v-2M16 17v2h3v-2"
        fill="none"
        stroke="url(#grad-silver)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Windows */}
      <path d="M7 13h4v-3H8l-1 3zM13 13h4l-1-3h-3v3z" fill="url(#grad-cyan)" opacity="0.3" />
      {/* Wheels */}
      <circle cx="7" cy="17" r="1" fill="url(#grad-silver)" />
      <circle cx="17" cy="17" r="1" fill="url(#grad-silver)" />
    </svg>
  )
}

export function ShieldIcon({ className = 'w-5 h-5', active = false }: IconProps & { active?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <GradientDefs />
      <path
        d="M12 2l8 4v6c0 5.5-3.8 10-8 11-4.2-1-8-5.5-8-11V6l8-4z"
        fill={active ? "url(#grad-green)" : "none"}
        fillOpacity={active ? 0.2 : 0}
        stroke={active ? "url(#grad-green)" : "url(#grad-silver)"}
        strokeWidth="1.5"
      />
      {active && (
        <path
          d="M9 12l2 2 4-4"
          fill="none"
          stroke="url(#grad-green)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  )
}
