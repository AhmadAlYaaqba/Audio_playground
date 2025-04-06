"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Upload } from "lucide-react"
import { Progress } from "@/components/ui/progress"

interface AudioUploaderProps {
  onAudioAdded: (file: File, audioBuffer: AudioBuffer, duration: number) => void
}

export default function AudioUploader({ onAudioAdded }: AudioUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      if (file.type.includes("audio")) {
        processAudioFile(file)
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processAudioFile(e.target.files[0])
    }
  }

  const processAudioFile = async (file: File) => {
    setIsLoading(true)
    setProgress(0)

    try {
      const arrayBuffer = await readFileAsArrayBuffer(file, (progressEvent) => {
        const percentComplete = Math.round((progressEvent.loaded / progressEvent.total) * 100)
        setProgress(percentComplete)
      })

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

      onAudioAdded(file, audioBuffer, audioBuffer.duration)
    } catch (error) {
      console.error("Error processing audio file:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const readFileAsArrayBuffer = (file: File, onProgress?: (event: ProgressEvent) => void): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        if (e.target?.result) {
          resolve(e.target.result as ArrayBuffer)
        } else {
          reject(new Error("Failed to read file"))
        }
      }

      reader.onerror = (e) => {
        reject(e)
      }

      if (onProgress) {
        reader.onprogress = onProgress
      }

      reader.readAsArrayBuffer(file)
    })
  }

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
        isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="audio/*" className="hidden" />

      {isLoading ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Processing audio file...</p>
          <Progress value={progress} className="w-full" />
        </div>
      ) : (
        <>
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">
            Drag and drop an audio file, or{" "}
            <button
              type="button"
              className="text-blue-500 hover:text-blue-700"
              onClick={() => fileInputRef.current?.click()}
            >
              browse
            </button>
          </p>
          <p className="mt-1 text-xs text-gray-500">Supports MP3, WAV, and other audio formats</p>
        </>
      )}
    </div>
  )
}

