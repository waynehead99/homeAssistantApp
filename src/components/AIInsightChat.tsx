import { useState, useRef, useEffect, useCallback } from 'react'
import { useVoiceInteraction } from '../hooks/useVoiceInteraction'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface AIInsightChatProps {
  isOpen: boolean
  onClose: () => void
  initialInsight: string
  onSendMessage: (messages: Message[], newMessage: string) => Promise<string>
  autoSpeak?: boolean // Auto-speak AI responses
  startWithVoice?: boolean // Start listening immediately when opened
}

export function AIInsightChat({
  isOpen,
  onClose,
  initialInsight,
  onSendMessage,
  autoSpeak = false,
  startWithVoice = false,
}: AIInsightChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [speakResponses, setSpeakResponses] = useState(autoSpeak)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    isListening,
    isSpeaking,
    isSupported: isSTTSupported,
    isTTSSupported,
    isProcessing: isTranscribing,
    transcript,
    error: voiceError,
    toggleListening,
    speak,
    stopSpeaking,
    clearTranscript,
  } = useVoiceInteraction()

  // Initialize with the insight when opened
  useEffect(() => {
    if (isOpen && messages.length === 0 && initialInsight) {
      setMessages([{ role: 'assistant', content: initialInsight }])
    }
  }, [isOpen, initialInsight, messages.length])

  // Reset messages when closed
  useEffect(() => {
    if (!isOpen) {
      setMessages([])
      setInput('')
      stopSpeaking()
    }
  }, [isOpen, stopSpeaking])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when opened, or start voice if requested
  useEffect(() => {
    if (isOpen) {
      if (startWithVoice && isSTTSupported && !isListening) {
        // Small delay to let the modal render first
        setTimeout(() => {
          toggleListening()
        }, 300)
      } else {
        setTimeout(() => inputRef.current?.focus(), 100)
      }
    }
  }, [isOpen, startWithVoice, isSTTSupported])

  // Update input with voice transcript
  useEffect(() => {
    if (transcript) {
      setInput(transcript)
    }
  }, [transcript])

  // Auto-send when voice input stops (if there's content)
  useEffect(() => {
    if (!isListening && transcript && transcript.trim()) {
      // Small delay to allow for final transcript update
      const timer = setTimeout(() => {
        handleSendVoice(transcript.trim())
        clearTranscript()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [isListening, transcript])

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    clearTranscript()
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      const response = await onSendMessage(messages, userMessage)
      setMessages(prev => [...prev, { role: 'assistant', content: response }])

      // Auto-speak response if enabled
      if (speakResponses && isTTSSupported) {
        speak(response)
      }
    } catch (error) {
      const errorMsg = 'Sorry, I encountered an error. Please try again.'
      setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }])
    } finally {
      setLoading(false)
    }
  }

  // Handle voice message (auto-send after recognition)
  const handleSendVoice = useCallback(async (voiceMessage: string) => {
    if (!voiceMessage.trim() || loading) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: voiceMessage }])
    setLoading(true)

    try {
      const response = await onSendMessage(messages, voiceMessage)
      setMessages(prev => [...prev, { role: 'assistant', content: response }])

      // Auto-speak response when using voice input
      if (isTTSSupported) {
        speak(response)
      }
    } catch (error) {
      const errorMsg = 'Sorry, I encountered an error. Please try again.'
      setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }])
    } finally {
      setLoading(false)
    }
  }, [loading, messages, onSendMessage, isTTSSupported, speak])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Speak the last assistant message
  const speakLastMessage = () => {
    const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant')
    if (lastAssistantMessage) {
      if (isSpeaking) {
        stopSpeaking()
      } else {
        speak(lastAssistantMessage.content)
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full sm:max-w-lg h-[85vh] sm:h-[600px] bg-white sm:rounded-2xl shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500/15 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <h2 className="font-semibold text-slate-800">AI Home Assistant</h2>
          </div>
          <div className="flex items-center gap-1">
            {/* TTS toggle */}
            {isTTSSupported && (
              <button
                onClick={() => setSpeakResponses(!speakResponses)}
                className={`p-2 rounded-lg transition-colors ${
                  speakResponses
                    ? 'text-blue-500 bg-blue-50'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                }`}
                title={speakResponses ? 'Auto-speak responses: ON' : 'Auto-speak responses: OFF'}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M11 5L6 9H2v6h4l5 4V5z" />
                </svg>
              </button>
            )}
            {/* Close button */}
            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Voice error banner */}
        {voiceError && (
          <div className="px-4 py-2 bg-red-50 text-red-600 text-sm">
            {voiceError}
          </div>
        )}

        {/* Listening/Processing indicator */}
        {(isListening || isTranscribing) && (
          <div className={`px-4 py-3 border-b ${isTranscribing ? 'bg-amber-50 border-amber-100' : 'bg-blue-50 border-blue-100'}`}>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={`w-3 h-3 rounded-full animate-pulse ${isTranscribing ? 'bg-amber-500' : 'bg-red-500'}`} />
                <div className={`absolute inset-0 w-3 h-3 rounded-full animate-ping ${isTranscribing ? 'bg-amber-500' : 'bg-red-500'}`} />
              </div>
              <span className={`text-sm font-medium ${isTranscribing ? 'text-amber-700' : 'text-blue-700'}`}>
                {isTranscribing ? 'Processing speech...' : 'Recording... tap mic to stop'}
              </span>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] px-4 py-2.5 rounded-2xl ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white rounded-br-md'
                    : 'bg-slate-100 text-slate-800 rounded-bl-md'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                {/* Speaker button for assistant messages */}
                {message.role === 'assistant' && isTTSSupported && (
                  <button
                    onClick={() => {
                      if (isSpeaking) {
                        stopSpeaking()
                      } else {
                        speak(message.content)
                      }
                    }}
                    className="mt-1.5 text-slate-400 hover:text-slate-600 transition-colors"
                    title="Read aloud"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      {isSpeaking ? (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M11 5L6 9H2v6h4l5 4V5z" />
                      )}
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-100 px-4 py-3 rounded-2xl rounded-bl-md">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick suggestions */}
        {messages.length === 1 && !isListening && (
          <div className="px-4 pb-2">
            <div className="flex flex-wrap gap-2">
              {[
                'Which sensors need attention?',
                'What lights are on?',
                'Turn off all lights',
                'House status summary',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setInput(suggestion)
                    setTimeout(() => handleSend(), 0)
                  }}
                  disabled={loading}
                  className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full transition-colors disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-2">
            {/* Microphone button */}
            {isSTTSupported && (
              <button
                onClick={toggleListening}
                disabled={loading}
                className={`p-2.5 rounded-full transition-all ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                } disabled:opacity-50`}
                title={isListening ? 'Stop listening' : 'Voice input'}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  {isListening ? (
                    <path d="M6 6h12v12H6z" /> // Stop icon
                  ) : (
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z" />
                  )}
                </svg>
              </button>
            )}
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? 'Listening...' : 'Ask about your home...'}
              disabled={loading || isListening}
              className="flex-1 px-4 py-2.5 bg-slate-100 rounded-full text-sm text-slate-800 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
            />
            {/* Speaker button for last response */}
            {isTTSSupported && messages.length > 0 && messages[messages.length - 1]?.role === 'assistant' && (
              <button
                onClick={speakLastMessage}
                disabled={loading}
                className={`p-2.5 rounded-full transition-all ${
                  isSpeaking
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                } disabled:opacity-50`}
                title={isSpeaking ? 'Stop speaking' : 'Read last response'}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  {isSpeaking ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z M9 10h6v4H9z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M11 5L6 9H2v6h4l5 4V5z" />
                  )}
                </svg>
              </button>
            )}
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading || isListening}
              className="p-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 text-white rounded-full transition-colors disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
