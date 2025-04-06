export default function WaveformFallback({ width, height = 40 }: { width: number; height?: number }) {
    return (
      <div
        style={{
          width: `${width}px`,
          height: `${height}px`,
          backgroundColor: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "80%",
            height: "2px",
            backgroundColor: "#9ca3af",
            position: "relative",
          }}
        >
          {/* Simple waveform representation */}
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: `${i * 25}%`,
                height: "10px",
                width: "2px",
                backgroundColor: "#9ca3af",
                top: "-4px",
              }}
            />
          ))}
        </div>
      </div>
    )
  }
  
  