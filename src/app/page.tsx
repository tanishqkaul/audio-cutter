"use client";

import { useRef, useState, useEffect, ChangeEvent } from 'react';
import Head from 'next/head';
import WaveSurfer from 'wavesurfer.js';

import { Button, Container, Slider, Typography } from '@mui/material';

const Home = () => {
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const minimapRef = useRef<HTMLDivElement | null>(null);
  const spectrogramRef = useRef<HTMLDivElement | null>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);


  useEffect(() => {
    if (waveformRef.current) {
      const options = {
        container: waveformRef.current,
        waveColor: '#00ff8e',
        progressColor: '#4a90e2',
        cursorColor: '#4a90e2',
        height: 80,
      };

      wavesurfer.current = WaveSurfer.create(options);

      wavesurfer.current.on('ready', () => {
        if (wavesurfer.current) {
          setEndTime(wavesurfer.current.getDuration());
        }
      });

      wavesurfer.current.on('play', () => {
        setIsPlaying(true);
      });

      wavesurfer.current.on('pause', () => {
        setIsPlaying(false);
      });
    }

    return () => {
      if (wavesurfer.current) {
        wavesurfer.current.destroy();
      }
    };
  }, []);
  
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (wavesurfer.current && event.target?.result) {
          wavesurfer.current.load(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCut = async () => {
    if (!wavesurfer.current) return;

    const originalBuffer = await wavesurfer.current.getDecodedData();
    const start = startTime;
    const end = endTime;

    if (originalBuffer) {
      const offlineContext = new OfflineAudioContext(
        originalBuffer.numberOfChannels,
        (end - start) * originalBuffer.sampleRate,
        originalBuffer.sampleRate
      );

      const source = offlineContext.createBufferSource();
      const newBuffer = offlineContext.createBuffer(
        originalBuffer.numberOfChannels,
        (end - start) * originalBuffer.sampleRate,
        originalBuffer.sampleRate
      );

      for (let i = 0; i < originalBuffer.numberOfChannels; i++) {
        newBuffer.copyToChannel(
          originalBuffer.getChannelData(i).slice(
            start * originalBuffer.sampleRate,
            end * originalBuffer.sampleRate
          ),
          i
        );
      }

      source.buffer = newBuffer;
      source.connect(offlineContext.destination);
      source.start();

      offlineContext.startRendering().then((renderedBuffer) => {
        const wavBlob = audioBufferToWav(renderedBuffer);
        const url = URL.createObjectURL(wavBlob);
        const a = document.createElement('a');
        document.body.appendChild(a);
        a.style.display = 'none';
        a.href = url;
        a.download = 'cut-audio.wav';
        a.click();
        URL.revokeObjectURL(url);
      });
    }
  };

  const audioBufferToWav = (buffer: AudioBuffer): Blob => {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const bufferView = new DataView(new ArrayBuffer(length));
    const channels: Float32Array[] = [];
    let i: number;
    let sample: number;
    let offset = 0;
    let pos = 0;

    // write WAVE header
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"

    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2); // block-align
    setUint16(16); // 16-bit (hardcoded in this demo)

    setUint32(0x61746164); // "data" - chunk
    setUint32(length - pos - 4); // chunk length

    // write interleaved data
    for (i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
      for (i = 0; i < numOfChan; i++) {
        sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
        sample = (sample < 0 ? sample * 0x8000 : sample * 0x7fff) | 0; // scale to 16-bit signed int
        bufferView.setInt16(pos, sample, true); // write 16-bit sample
        pos += 2;
      }
      offset++; // next source sample
    }

    return new Blob([bufferView], { type: 'audio/wav' });

    function setUint16(data: number) {
      bufferView.setUint16(pos, data, true);
      pos += 2;
    }

    function setUint32(data: number) {
      bufferView.setUint32(pos, data, true);
      pos += 4;
    }
  };

  const handlePlayPause = () => {
    if (wavesurfer.current) {
      wavesurfer.current.playPause();
    }
  };

  return (
    <Container className=''>
      <Head>
        <title className=''>Audio Cutter</title>
      </Head>
      <Typography variant="h4" component="h1" gutterBottom className='my-10'>
        Audio Cutter
      </Typography>
      <input type="file" accept="audio/*" onChange={handleFileChange} />
      <div ref={waveformRef} style={{ margin: '20px  0' }}></div>
      <Slider
        value={[startTime, endTime]}
        onChange={(e, newValue) => {
          if (Array.isArray(newValue)) {
            setStartTime(newValue[0]);
            setEndTime(newValue[1]);
          }
        }}
        min={0}
        max={wavesurfer.current ? wavesurfer.current.getDuration() : 100}
        step={0.01}
        valueLabelDisplay="auto"
      />
      <div className='flex flex-row'>
      <Button variant="contained" color="primary" onClick={handlePlayPause} className='mx-2'>
        {isPlaying ? 'Pause' : 'Play'}
      </Button>
      
      <Button variant="contained" color="primary" onClick={handleCut}>
        Cut and Download
      </Button>
      </div>
    </Container>
  );
};
export default Home;