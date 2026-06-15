'use client'

import { useEffect, useRef, useState } from 'react'

type YTPlayer = {
  setPlaybackRate: (rate: number) => void
  destroy: () => void
}

declare global {
  interface Window {
    YT: { Player: new (el: HTMLElement, opts: object) => YTPlayer }
    onYouTubeIframeAPIReady: () => void
  }
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const

type Props = {
  videoId: string
}

export function StudyVideoPlayer({ videoId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YTPlayer | null>(null)
  const [speed, setSpeed] = useState(1)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    function initPlayer() {
      if (!containerRef.current) return
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: { rel: 0, modestbranding: 1, enablejsapi: 1 },
        events: {
          onReady: () => setReady(true),
        },
      })
    }

    if (window.YT?.Player) {
      initPlayer()
      return
    }

    window.onYouTubeIframeAPIReady = initPlayer

    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(script)
    }

    return () => {
      playerRef.current?.destroy()
    }
  }, [videoId])

  function handleSpeedChange(s: number) {
    setSpeed(s)
    playerRef.current?.setPlaybackRate(s)
  }

  return (
    <div className="relative bg-black w-full aspect-video">
      <div ref={containerRef} className="w-full h-full" />

      {ready && (
        <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/70 rounded-md px-1 py-0.5">
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => handleSpeedChange(s)}
              className={`text-xs px-1.5 py-0.5 rounded transition-colors ${
                speed === s
                  ? 'bg-white text-black font-semibold'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              {s}×
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
