import { useState, useEffect, useMemo } from 'react'
import { useHomeAssistantContext } from '../context/HomeAssistantContext'
import { calendarService } from '../services/homeAssistant'
import type { CalendarEvent } from '../types/homeAssistant'

export function CalendarView() {
  const { calendars, settings } = useHomeAssistantContext()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [daysToShow, setDaysToShow] = useState(7)

  // Filter calendars based on settings pattern (memoized for stable reference)
  const filteredCalendars = useMemo(() => calendars.filter(c => {
    if (!settings.calendarPattern) return true
    try {
      const regex = new RegExp(settings.calendarPattern, 'i')
      return regex.test(c.entity_id) || regex.test(c.attributes.friendly_name || '')
    } catch {
      const pattern = settings.calendarPattern.toLowerCase()
      return c.entity_id.toLowerCase().includes(pattern) ||
        (c.attributes.friendly_name || '').toLowerCase().includes(pattern)
    }
  }), [calendars, settings.calendarPattern])

  // Stable string key of filtered calendar IDs for useEffect dependency
  const calendarIdsKey = useMemo(
    () => filteredCalendars.map(c => c.entity_id).join(','),
    [filteredCalendars]
  )

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true)
      if (filteredCalendars.length > 0) {
        const calendarIds = filteredCalendars.map(c => c.entity_id)
        const fetchedEvents = await calendarService.getAllEvents(calendarIds, daysToShow)
        setEvents(fetchedEvents)
      } else {
        setEvents([])
      }
      setLoading(false)
    }
    fetchEvents()
  }, [calendarIdsKey, daysToShow])

  // Group events by date
  const eventsByDate = events.reduce((acc, event) => {
    const dateStr = event.start.dateTime || event.start.date || ''
    const date = new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(event)
    return acc
  }, {} as Record<string, CalendarEvent[]>)

  const formatTime = (event: CalendarEvent) => {
    if (event.start.date && !event.start.dateTime) {
      return 'All day'
    }
    if (event.start.dateTime) {
      return new Date(event.start.dateTime).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })
    }
    return ''
  }

  const formatEndTime = (event: CalendarEvent) => {
    if (event.end.dateTime) {
      return new Date(event.end.dateTime).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })
    }
    return ''
  }

  const isToday = (dateStr: string) => {
    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
    return dateStr === today
  }

  const isTomorrow = (dateStr: string) => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
    return dateStr === tomorrow
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (filteredCalendars.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
        <div className="glass-card p-8 text-center">
          <svg className="w-16 h-16 mb-4 mx-auto opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          <p className="text-slate-700">No matching calendars found</p>
          <p className="text-xs text-slate-500 mt-1">Update the calendar filter in Settings</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-20">
      {/* Header with day selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-slate-800">Upcoming Events</h2>
        <select
          value={daysToShow}
          onChange={(e) => setDaysToShow(Number(e.target.value))}
          className="glass-panel text-slate-800 text-sm rounded-lg px-3 py-1.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          <option value={1}>Today</option>
          <option value={3}>3 days</option>
          <option value={7}>7 days</option>
          <option value={14}>2 weeks</option>
          <option value={30}>30 days</option>
        </select>
      </div>

      {events.length === 0 ? (
        <div className="glass-card p-6 text-center">
          <svg className="w-12 h-12 mx-auto mb-3 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
          </svg>
          <p className="text-slate-500">No events scheduled</p>
        </div>
      ) : (
        Object.entries(eventsByDate).map(([date, dateEvents]) => (
          <div key={date} className="space-y-2">
            {/* Date header */}
            <div className="flex items-center gap-2">
              <h3 className={`text-sm font-medium ${isToday(date) ? 'text-blue-600' : isTomorrow(date) ? 'text-purple-600' : 'text-slate-600'}`}>
                {isToday(date) ? 'Today' : isTomorrow(date) ? 'Tomorrow' : date}
              </h3>
              {(isToday(date) || isTomorrow(date)) && (
                <span className="text-xs text-slate-500">
                  {date.split(',')[0]}
                </span>
              )}
            </div>

            {/* Events for this date */}
            <div className="space-y-2">
              {dateEvents.map((event, idx) => (
                <div
                  key={`${event.summary}-${idx}`}
                  className="glass-card p-4"
                >
                  <div className="flex items-start gap-3">
                    {/* Time indicator */}
                    <div className="flex-shrink-0 w-16 text-right">
                      <p className="text-sm font-medium text-blue-600">
                        {formatTime(event)}
                      </p>
                      {event.start.dateTime && event.end.dateTime && (
                        <p className="text-xs text-slate-500">
                          {formatEndTime(event)}
                        </p>
                      )}
                    </div>

                    {/* Divider */}
                    <div className="w-px h-12 bg-slate-200 flex-shrink-0"></div>

                    {/* Event details */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-slate-800 truncate">
                        {event.summary}
                      </h4>
                      {event.location && (
                        <p className="text-sm text-slate-500 truncate flex items-center gap-1 mt-1">
                          <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                          </svg>
                          {event.location}
                        </p>
                      )}
                      {event.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {event.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
