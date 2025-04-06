export interface Track {
  id: string
  name?: string // Add name field
  pills: string[] // Array of pill IDs
}

export interface AudioPill {
  id: string
  name: string
  file: File
  duration: number
  startTime: number
  trackId: string
  audioBuffer: AudioBuffer
  waveformData?: number[] // Add waveform data
}

