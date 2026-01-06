import { useHomeAssistantContext } from '../context/HomeAssistantContext'

// Weather condition to icon mapping
function WeatherIcon({ condition, className = 'w-8 h-8' }: { condition?: string; className?: string }) {
  const c = condition?.toLowerCase() || ''

  if (c.includes('sunny') || c.includes('clear')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
    )
  }

  if (c.includes('partly')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <circle cx="8" cy="8" r="3" className="text-yellow-400" fill="currentColor" />
        <path d="M16 16a3 3 0 00.5-5.97 5 5 0 00-9.5-.53A3.5 3.5 0 004 16h12z" />
      </svg>
    )
  }

  if (c.includes('cloud') || c.includes('overcast')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.5 16.5a4 4 0 00.5-7.97A7 7 0 006.5 9a4.5 4.5 0 00-.5 9h13.5z" />
      </svg>
    )
  }

  if (c.includes('rain') || c.includes('shower')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 12a4 4 0 00.5-7.97A7 7 0 006.5 4.5a4.5 4.5 0 00-.5 7.5h13z" />
        <path d="M8 16v3M12 15v4M16 16v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
    )
  }

  if (c.includes('thunder') || c.includes('storm')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 10a4 4 0 00.5-7.97A7 7 0 006.5 2.5a4.5 4.5 0 00-.5 7.5h13z" />
        <path d="M13 12l-2 4h3l-2 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    )
  }

  if (c.includes('snow')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 10a4 4 0 00.5-7.97A7 7 0 006.5 2.5a4.5 4.5 0 00-.5 7.5h13z" />
        <circle cx="8" cy="15" r="1.5" />
        <circle cx="12" cy="18" r="1.5" />
        <circle cx="16" cy="15" r="1.5" />
      </svg>
    )
  }

  if (c.includes('fog') || c.includes('mist')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M4 8h16M4 12h16M4 16h12" />
      </svg>
    )
  }

  if (c.includes('wind')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M9.59 4.59A2 2 0 1111 8H2m10.59 11.41A2 2 0 1014 16H2m15.73-8.27A2.5 2.5 0 1119.5 12H2" />
      </svg>
    )
  }

  // Default cloud icon
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.5 16.5a4 4 0 00.5-7.97A7 7 0 006.5 9a4.5 4.5 0 00-.5 9h13.5z" />
    </svg>
  )
}

function DetailCard({ icon, label, value, unit }: { icon: React.ReactNode; label: string; value: string | number | undefined; unit?: string }) {
  if (value === undefined || value === null) return null

  return (
    <div className="glass-panel p-3">
      <div className="flex items-center gap-2 text-slate-400 mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-white font-medium text-shadow">
        {value}{unit && <span className="text-slate-400 text-sm ml-1">{unit}</span>}
      </p>
    </div>
  )
}

// Wind direction to compass
function getWindDirection(degrees: number | undefined): string {
  if (degrees === undefined) return ''
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
  const index = Math.round(degrees / 22.5) % 16
  return directions[index]
}

export function WeatherView() {
  const { primaryWeather, sensors } = useHomeAssistantContext()

  // Get feels like temperature from sensor
  const feelsLikeSensor = sensors.find(s => s.entity_id === 'sensor.aurora_feels_like')
  const feelsLike = feelsLikeSensor ? parseFloat(feelsLikeSensor.state) : undefined

  if (!primaryWeather) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <div className="glass-card p-8 text-center">
          <svg className="w-16 h-16 mb-4 mx-auto opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
          </svg>
          <p className="text-shadow">No weather data available</p>
          <p className="text-sm text-slate-500 mt-1">Select a weather source in Settings</p>
        </div>
      </div>
    )
  }

  const { attributes } = primaryWeather

  return (
    <div className="space-y-4 pb-20">
      {/* Current Weather - Hero Card */}
      <div className="glass-card bg-gradient-to-br from-blue-600/30 to-cyan-500/20 p-6 glow-blue">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-blue-300 text-sm mb-1">
              {primaryWeather.attributes.friendly_name || 'Current Weather'}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-6xl font-light text-white text-shadow-lg">
                {Math.round(attributes.temperature || 0)}°
              </span>
            </div>
            {attributes.condition && attributes.condition !== 'unknown' && (
              <p className="text-xl text-white mt-2 capitalize text-shadow">
                {attributes.condition.replace(/-/g, ' ')}
              </p>
            )}
            {feelsLike !== undefined && !isNaN(feelsLike) && (
              <p className="text-sm text-blue-200 mt-1">
                Feels like {Math.round(feelsLike)}°
              </p>
            )}
          </div>
          <div className="text-white/90 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
            <WeatherIcon condition={attributes.condition} className="w-24 h-24" />
          </div>
        </div>
      </div>

      {/* Weather Details Grid */}
      <div className="grid grid-cols-3 gap-2">
        <DetailCard
          icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>}
          label="Humidity"
          value={attributes.humidity}
          unit="%"
        />
        <DetailCard
          icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9.59 4.59A2 2 0 1111 8H2m10.59 11.41A2 2 0 1014 16H2m15.73-8.27A2.5 2.5 0 1119.5 12H2"/></svg>}
          label="Wind"
          value={attributes.wind_speed !== undefined ? `${Math.round(attributes.wind_speed)} ${getWindDirection(attributes.wind_bearing)}` : undefined}
          unit="mph"
        />
        <DetailCard
          icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>}
          label="Pressure"
          value={attributes.pressure !== undefined ? Math.round(attributes.pressure) : undefined}
          unit="hPa"
        />
        {attributes.visibility !== undefined && (
          <DetailCard
            icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>}
            label="Visibility"
            value={Math.round(attributes.visibility)}
            unit="mi"
          />
        )}
        {attributes.dew_point !== undefined && (
          <DetailCard
            icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8z"/></svg>}
            label="Dew Point"
            value={Math.round(attributes.dew_point)}
            unit="°"
          />
        )}
        {attributes.uv_index !== undefined && (
          <DetailCard
            icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/></svg>}
            label="UV Index"
            value={attributes.uv_index}
          />
        )}
        {attributes.ozone !== undefined && (
          <DetailCard
            icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/></svg>}
            label="Ozone"
            value={Math.round(attributes.ozone)}
            unit="DU"
          />
        )}
        {attributes.cloud_coverage !== undefined && (
          <DetailCard
            icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.5 16.5a4 4 0 00.5-7.97A7 7 0 006.5 9a4.5 4.5 0 00-.5 9h13.5z"/></svg>}
            label="Cloud Cover"
            value={attributes.cloud_coverage}
            unit="%"
          />
        )}
      </div>

      {/* Sun Times (if available) */}
      {(attributes.next_dawn || attributes.next_rising || attributes.next_setting || attributes.next_dusk) && (
        <div className="glass-card p-4">
          <h3 className="text-sm font-medium text-slate-400 mb-3">Sun</h3>
          <div className="grid grid-cols-4 gap-2 text-center">
            {attributes.next_dawn && (
              <div className="glass-panel p-2 rounded-lg">
                <p className="text-xs text-slate-500">Dawn</p>
                <p className="text-sm text-white text-shadow">{new Date(attributes.next_dawn).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
              </div>
            )}
            {attributes.next_rising && (
              <div className="glass-panel p-2 rounded-lg">
                <p className="text-xs text-slate-500">Sunrise</p>
                <p className="text-sm text-yellow-400 text-shadow">{new Date(attributes.next_rising).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
              </div>
            )}
            {attributes.next_setting && (
              <div className="glass-panel p-2 rounded-lg">
                <p className="text-xs text-slate-500">Sunset</p>
                <p className="text-sm text-orange-400 text-shadow">{new Date(attributes.next_setting).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
              </div>
            )}
            {attributes.next_dusk && (
              <div className="glass-panel p-2 rounded-lg">
                <p className="text-xs text-slate-500">Dusk</p>
                <p className="text-sm text-white text-shadow">{new Date(attributes.next_dusk).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
