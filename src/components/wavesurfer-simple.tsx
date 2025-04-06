import dynamic from "next/dynamic"
import WaveformFallback from "./waveform-fallback"

// Dynamically import the WaveSurfer component with SSR disabled to solve deployment issues
const WavesurferClient = dynamic(() => import("./wavesurfer-client"), {
  ssr: false,
  loading: ({ width, height }) => <WaveformFallback width={width as number} height={height as number} />,
})

interface WavesurferSimpleProps {
  audioBuffer: AudioBuffer
  width: number
  height?: number
  waveColor?: string
}

export default function WavesurferSimple(props: WavesurferSimpleProps) {
  return <WavesurferClient {...props} />
}

