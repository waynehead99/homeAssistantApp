import { useHomeAssistantContext } from '../context/HomeAssistantContext'

export function PeopleView() {
  const { filteredPeople: people } = useHomeAssistantContext()

  const getStatusColor = (state: string) => {
    if (state === 'home') return 'bg-green-500'
    if (state === 'not_home') return 'bg-slate-500'
    return 'bg-blue-500' // Zone
  }

  const getStatusText = (state: string) => {
    if (state === 'home') return 'Home'
    if (state === 'not_home') return 'Away'
    return state // Zone name
  }

  const formatLastUpdated = (lastUpdated: string) => {
    const date = new Date(lastUpdated)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  if (people.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
        <div className="glass-card p-8 text-center">
          <svg className="w-16 h-16 mb-4 mx-auto opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
          <p className="text-slate-700">No people tracked</p>
          <p className="text-sm text-slate-500 mt-1">Add person entities in Home Assistant</p>
        </div>
      </div>
    )
  }

  // Sort: home first, then by name
  const sortedPeople = [...people].sort((a, b) => {
    if (a.state === 'home' && b.state !== 'home') return -1
    if (a.state !== 'home' && b.state === 'home') return 1
    const nameA = a.attributes.friendly_name || a.entity_id
    const nameB = b.attributes.friendly_name || b.entity_id
    return nameA.localeCompare(nameB)
  })

  const homeCount = people.filter(p => p.state === 'home').length

  return (
    <div className="space-y-4 pb-20">
      {/* Summary */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Currently at home</p>
            <p className="text-2xl font-semibold text-slate-800">
              {homeCount} of {people.length}
            </p>
          </div>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${homeCount > 0 ? 'bg-green-500/20' : 'glass-panel'}`}>
            <svg className={`w-6 h-6 ${homeCount > 0 ? 'text-green-600' : 'text-slate-500'}`} viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
              <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.43z" />
            </svg>
          </div>
        </div>
      </div>

      {/* People List */}
      <div className="space-y-3">
        {sortedPeople.map(person => {
          const name = person.attributes.friendly_name || person.entity_id.split('.')[1].replace(/_/g, ' ')
          const isHome = person.state === 'home'
          const status = getStatusText(person.state)
          const statusColor = getStatusColor(person.state)

          return (
            <div key={person.entity_id} className={`glass-card p-4 transition-all duration-300 ${isHome ? 'bg-gradient-to-br from-green-500/10 to-emerald-500/5' : ''}`}>
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className={`w-14 h-14 rounded-full flex items-center justify-center overflow-hidden ${isHome ? 'ring-2 ring-green-500 ring-offset-2 ring-offset-white' : ''}`}>
                  {person.attributes.entity_picture ? (
                    <img
                      src={person.attributes.entity_picture}
                      alt={name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full glass-panel flex items-center justify-center">
                      <svg className="w-8 h-8 text-slate-500" viewBox="0 0 24 24" fill="currentColor">
                        <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-800 text-lg">{name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`w-2 h-2 rounded-full ${statusColor}`} />
                    <span className={`text-sm ${isHome ? 'text-green-600' : 'text-slate-500'}`}>
                      {status}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="text-sm text-slate-500">
                      {formatLastUpdated(person.last_updated)}
                    </span>
                  </div>
                </div>

                {/* Location icon */}
                {person.attributes.latitude && person.attributes.longitude && (
                  <div className="text-slate-500">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* GPS info if available */}
              {person.attributes.source && (
                <div className="mt-3 pt-3 border-t border-slate-200 flex items-center gap-4 text-sm text-slate-500">
                  <span>Source: {person.attributes.source}</span>
                  {person.attributes.gps_accuracy && (
                    <span>Accuracy: {Math.round(person.attributes.gps_accuracy)}m</span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
