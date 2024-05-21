"use client";
import { useEffect, useRef, useState } from 'react'
import WaveSurfer from 'wavesurfer.js'
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js'

const random = (min: number, max: number) => Math.random() * (max - min) + min
const randomColor = () => `rgba(${random(0, 255)}, ${random(0, 255)}, ${random(0, 255)}, 0.5)`

const HomePage = () => {
  const waveformRef = useRef<HTMLDivElement | null>(null)
  const wavesurferRef = useRef<WaveSurfer | null>(null)
  const [loop, setLoop] = useState(true)

  useEffect(() => {
    if (waveformRef.current) {
      const ws = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: 'rgb(200, 0, 200)',
        progressColor: 'rgb(100, 0, 100)',
      })

      wavesurferRef.current = ws

      const wsRegions = ws.registerPlugin(RegionsPlugin.create())

      wsRegions.enableDragSelection({
        color: 'rgba(255, 0, 0, 0.1)',
      })

      wsRegions.on('region-updated', (region) => {
        console.log('Updated region', region)
      })

      let activeRegion: any = null
      wsRegions.on('region-in', (region) => {
        console.log('region-in', region)
        activeRegion = region
      })
      wsRegions.on('region-out', (region) => {
        console.log('region-out', region)
        if (activeRegion === region) {
          if (loop) {
            region.play()
          } else {
            activeRegion = null
          }
        }
      })
      wsRegions.on('region-clicked', (region, e) => {
        e.stopPropagation() // prevent triggering a click on the waveform
        activeRegion = region
        region.play()
        // region.setOptions({ color: randomColor() })
      })

      ws.on('interaction', () => {
        activeRegion = null
      })

      ws.once('decode', () => {
        const slider = document.querySelector('input[type="range"]') as HTMLInputElement
        if (slider) {
          slider.oninput = (e) => {
            const target = e.target as HTMLInputElement
            const minPxPerSec = Number(target.value)
            ws.zoom(minPxPerSec)
          }
        }
      })
    }
  }, [loop])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && wavesurferRef.current) {
      const ws = wavesurferRef.current
      const reader = new FileReader()
      reader.onload = (event) => {
        const arrayBuffer = event.target?.result
        if (arrayBuffer) {
          ws.loadBlob(new Blob([arrayBuffer]))
        }
      }
      reader.readAsArrayBuffer(file)
    }
  }

  return (
    <div>
      <div>
        <label htmlFor="audio-upload">Upload an audio file: </label>
        <input
          type="file"
          id="audio-upload"
          accept="audio/*"
          onChange={handleFileChange}
        />
      </div>

      <div ref={waveformRef} id="waveform"></div>

      <p>
        <label>
          <input
            type="checkbox"
            checked={loop}
            onChange={(e) => setLoop(e.target.checked)}
          />
          Loop regions
        </label>

        <label style={{ marginLeft: '2em' }}>
          Zoom: <input type="range" min="10" max="1000" defaultValue="10" />
        </label>
      </p>

      <p>
        📖 <a href="https://wavesurfer.xyz/docs/classes/plugins_regions.RegionsPlugin">Regions plugin docs</a>
      </p>
    </div>
  )
}

export default HomePage
