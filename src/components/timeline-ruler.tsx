export default function TimelineRuler({ scale, duration }: { scale: number; duration: number }) {
  const tickMarks = []
  // Always show half-second intervals for better precision
  const secondsInterval = 0.5

  for (let i = 0; i <= duration; i += secondsInterval) {
    const isMajorTick = Number.isInteger(i) // Only whole numbers are major ticks
    const isHalfSecond = !isMajorTick // Half-second ticks

    tickMarks.push(
      <div key={i} className="absolute top-0 bottom-0" style={{ left: `${i * scale}px` }}>
        <div className={`h-${isMajorTick ? 4 : 2} w-px bg-${isMajorTick ? "gray-400" : "gray-300"}`} />
        {isMajorTick && <div className="text-xs text-gray-500 absolute -ml-2">{i}</div>}
      </div>,
    )
  }

  return (
    <div className="h-8 border-b relative bg-white" style={{ width: `${duration * scale}px` }}>
      {tickMarks}
    </div>
  )
}

