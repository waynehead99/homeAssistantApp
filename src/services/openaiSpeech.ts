// OpenAI Speech Services (Whisper STT + TTS)
// Provides high-quality speech recognition and natural voice synthesis

const OPENAI_API_URL = 'https://api.openai.com/v1'

// Available TTS voices
export const OPENAI_VOICES = {
  alloy: { id: 'alloy', name: 'Alloy', description: 'Neutral, balanced' },
  echo: { id: 'echo', name: 'Echo', description: 'Warm, conversational male' },
  fable: { id: 'fable', name: 'Fable', description: 'Expressive, British accent' },
  onyx: { id: 'onyx', name: 'Onyx', description: 'Deep, authoritative male' },
  nova: { id: 'nova', name: 'Nova', description: 'Friendly, upbeat female' },
  shimmer: { id: 'shimmer', name: 'Shimmer', description: 'Clear, pleasant female' },
} as const

export type VoiceId = keyof typeof OPENAI_VOICES

// Get API key from environment or localStorage
export function getOpenAIApiKey(): string | null {
  // First check environment variable
  const envKey = import.meta.env.VITE_OPENAI_API_KEY as string
  if (envKey) return envKey

  // Then check localStorage
  return localStorage.getItem('openai_api_key')
}

// Save API key to localStorage
export function setOpenAIApiKey(key: string): void {
  localStorage.setItem('openai_api_key', key)
}

// Remove API key from localStorage
export function removeOpenAIApiKey(): void {
  localStorage.removeItem('openai_api_key')
}

// Check if OpenAI is configured
export function isOpenAIConfigured(): boolean {
  return !!getOpenAIApiKey()
}

// Get selected voice from localStorage
export function getSelectedVoice(): VoiceId {
  const stored = localStorage.getItem('openai_voice') as VoiceId
  return stored && stored in OPENAI_VOICES ? stored : 'nova'
}

// Set selected voice
export function setSelectedVoice(voice: VoiceId): void {
  localStorage.setItem('openai_voice', voice)
}

// ============ Speech-to-Text (Whisper) ============

// Transcribe audio using OpenAI Whisper
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const apiKey = getOpenAIApiKey()
  if (!apiKey) {
    throw new Error('OpenAI API key not configured')
  }

  const formData = new FormData()
  formData.append('file', audioBlob, 'audio.webm')
  formData.append('model', 'whisper-1')
  formData.append('language', 'en')

  try {
    const response = await fetch(`${OPENAI_API_URL}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenAI Whisper API error:', response.status, errorText)

      if (response.status === 401) {
        throw new Error('Invalid OpenAI API key')
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.')
      }
      throw new Error(`Transcription failed: ${response.status}`)
    }

    const data = await response.json()
    return data.text || ''
  } catch (error) {
    console.error('Whisper transcription error:', error)
    throw error
  }
}

// ============ Text-to-Speech ============

// Generate speech using OpenAI TTS
export async function textToSpeech(
  text: string,
  voiceId?: VoiceId
): Promise<ArrayBuffer> {
  const apiKey = getOpenAIApiKey()
  if (!apiKey) {
    throw new Error('OpenAI API key not configured')
  }

  const voice = voiceId || getSelectedVoice()

  try {
    const response = await fetch(`${OPENAI_API_URL}/audio/speech`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'tts-1',
        voice: voice,
        input: text,
        response_format: 'mp3',
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenAI TTS API error:', response.status, errorText)

      if (response.status === 401) {
        throw new Error('Invalid OpenAI API key')
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.')
      }
      throw new Error(`TTS failed: ${response.status}`)
    }

    return await response.arrayBuffer()
  } catch (error) {
    console.error('OpenAI TTS error:', error)
    throw error
  }
}

// Play audio from ArrayBuffer
export function playAudio(
  audioBuffer: ArrayBuffer,
  onEnd?: () => void,
  onError?: (error: Error) => void
): { stop: () => void } {
  const blob = new Blob([audioBuffer], { type: 'audio/mpeg' })
  const url = URL.createObjectURL(blob)
  const audio = new Audio(url)

  audio.onended = () => {
    URL.revokeObjectURL(url)
    onEnd?.()
  }

  audio.onerror = () => {
    URL.revokeObjectURL(url)
    onError?.(new Error('Audio playback failed'))
  }

  audio.play().catch((err) => {
    URL.revokeObjectURL(url)
    onError?.(err)
  })

  return {
    stop: () => {
      audio.pause()
      audio.currentTime = 0
      URL.revokeObjectURL(url)
      onEnd?.()
    },
  }
}

// ============ Combined speak function ============

let currentAudio: { stop: () => void } | null = null

export async function speak(
  text: string,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (error: Error) => void
): Promise<void> {
  // Stop any currently playing audio
  if (currentAudio) {
    currentAudio.stop()
    currentAudio = null
  }

  try {
    onStart?.()
    const audioBuffer = await textToSpeech(text)

    currentAudio = playAudio(
      audioBuffer,
      () => {
        currentAudio = null
        onEnd?.()
      },
      (error) => {
        currentAudio = null
        onError?.(error)
      }
    )
  } catch (error) {
    onError?.(error instanceof Error ? error : new Error('TTS failed'))
  }
}

export function stopSpeaking(): void {
  if (currentAudio) {
    currentAudio.stop()
    currentAudio = null
  }
}

export function isSpeakingNow(): boolean {
  return currentAudio !== null
}

// ============ Audio Recording for STT ============

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []
  private stream: MediaStream | null = null

  async start(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        }
      })

      // Try to use webm with opus codec, fallback to other formats
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/wav'

      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType })
      this.audioChunks = []

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data)
        }
      }

      this.mediaRecorder.start(100) // Collect data every 100ms
    } catch (error) {
      console.error('Failed to start audio recording:', error)
      throw new Error('Microphone access denied or not available')
    }
  }

  async stop(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No recording in progress'))
        return
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, {
          type: this.mediaRecorder?.mimeType || 'audio/webm'
        })

        // Stop all tracks
        if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop())
          this.stream = null
        }

        this.mediaRecorder = null
        this.audioChunks = []
        resolve(audioBlob)
      }

      this.mediaRecorder.onerror = () => {
        reject(new Error('Recording failed'))
      }

      this.mediaRecorder.stop()
    })
  }

  cancel(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop()
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop())
      this.stream = null
    }
    this.mediaRecorder = null
    this.audioChunks = []
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording'
  }
}
