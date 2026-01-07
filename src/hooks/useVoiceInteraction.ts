// Hook for voice interaction using OpenAI (Whisper STT + TTS)
import { useState, useCallback, useRef } from 'react'
import {
  isOpenAIConfigured,
  transcribeAudio,
  speak as openAISpeak,
  stopSpeaking as openAIStopSpeaking,
  AudioRecorder,
} from '../services/openaiSpeech'

export interface VoiceInteractionState {
  isListening: boolean
  isSupported: boolean
  isSpeaking: boolean
  transcript: string
  error: string | null
}

export function useVoiceInteraction() {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const recorderRef = useRef<AudioRecorder | null>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)

  // OpenAI is supported if configured, otherwise fall back to browser
  const isSTTSupported = isOpenAIConfigured() || (
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  )

  // TTS is always supported (OpenAI or browser fallback)
  const isTTSSupported = true

  // Initialize browser speech synthesis for fallback
  if (typeof window !== 'undefined' && 'speechSynthesis' in window && !synthRef.current) {
    synthRef.current = window.speechSynthesis
  }

  // Start listening with OpenAI Whisper
  const startListening = useCallback(async () => {
    if (isListening || isProcessing) return

    setTranscript('')
    setError(null)

    // Check if OpenAI is configured
    if (!isOpenAIConfigured()) {
      setError('OpenAI API key not configured. Go to Settings to add your API key.')
      return
    }

    try {
      recorderRef.current = new AudioRecorder()
      await recorderRef.current.start()
      setIsListening(true)
      console.log('Recording started for OpenAI Whisper')
    } catch (err) {
      console.error('Failed to start recording:', err)
      setError(err instanceof Error ? err.message : 'Failed to access microphone')
    }
  }, [isListening, isProcessing])

  // Stop listening and transcribe
  const stopListening = useCallback(async () => {
    if (!recorderRef.current || !isListening) return

    setIsListening(false)
    setIsProcessing(true)

    try {
      const audioBlob = await recorderRef.current.stop()
      console.log('Recording stopped, transcribing with Whisper...')

      // Check minimum audio size (very short clips may fail)
      if (audioBlob.size < 1000) {
        console.log('Audio too short, skipping transcription')
        setTranscript('')
        setIsProcessing(false)
        return
      }

      const text = await transcribeAudio(audioBlob)
      console.log('Transcription result:', text)
      setTranscript(text)
    } catch (err) {
      console.error('Transcription failed:', err)
      setError(err instanceof Error ? err.message : 'Transcription failed')
      setTranscript('')
    } finally {
      setIsProcessing(false)
      recorderRef.current = null
    }
  }, [isListening])

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }, [isListening, startListening, stopListening])

  // Speak text using OpenAI TTS (with browser fallback)
  const speak = useCallback((text: string, onEnd?: () => void) => {
    // Try OpenAI TTS if configured
    if (isOpenAIConfigured()) {
      openAISpeak(
        text,
        () => setIsSpeaking(true),
        () => {
          setIsSpeaking(false)
          onEnd?.()
        },
        (error) => {
          console.error('OpenAI TTS error:', error)
          setIsSpeaking(false)
          // Fall back to browser TTS on error
          speakWithBrowser(text, onEnd)
        }
      )
      return
    }

    // Fall back to browser TTS
    speakWithBrowser(text, onEnd)
  }, [])

  // Browser-based TTS fallback
  const speakWithBrowser = useCallback((text: string, onEnd?: () => void) => {
    if (!synthRef.current) {
      onEnd?.()
      return
    }

    // Cancel any ongoing speech
    synthRef.current.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = 1.0
    utterance.pitch = 1.0
    utterance.volume = 1.0

    // Try to find a natural-sounding voice
    const voices = synthRef.current.getVoices()
    const preferredVoice = voices.find(v =>
      v.name.includes('Samantha') || // macOS
      v.name.includes('Google') || // Chrome
      v.name.includes('Microsoft') || // Edge
      v.lang.startsWith('en')
    )
    if (preferredVoice) {
      utterance.voice = preferredVoice
    }

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => {
      setIsSpeaking(false)
      onEnd?.()
    }
    utterance.onerror = () => {
      setIsSpeaking(false)
      onEnd?.()
    }

    synthRef.current.speak(utterance)
  }, [])

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    // Stop OpenAI audio
    openAIStopSpeaking()

    // Stop browser TTS
    if (synthRef.current) {
      synthRef.current.cancel()
    }
    setIsSpeaking(false)
  }, [])

  // Clear transcript
  const clearTranscript = useCallback(() => {
    setTranscript('')
  }, [])

  // Cancel recording without transcribing
  const cancelListening = useCallback(() => {
    if (recorderRef.current) {
      recorderRef.current.cancel()
      recorderRef.current = null
    }
    setIsListening(false)
    setIsProcessing(false)
    setTranscript('')
  }, [])

  return {
    isListening,
    isSpeaking,
    isSupported: isSTTSupported,
    isTTSSupported,
    isProcessing,
    transcript,
    error,
    startListening,
    stopListening,
    toggleListening,
    cancelListening,
    speak,
    stopSpeaking,
    clearTranscript,
  }
}
