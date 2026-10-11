// src/hooks/useCamera.jsx - Hook para gestión de cámara
import { useState, useRef, useEffect } from 'react'

export function useCamera() {
  const [videoRef, setVideoRef] = useState(null)
  const [stream, setStream] = useState(null)
  const [hasCameraAccess, setHasCameraAccess] = useState(false)
  const [error, setError] = useState(null)

  const startCamera = async () => {
    try {
      setError(null)
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      setStream(mediaStream)
      setHasCameraAccess(true)
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
      
      return true
    } catch (err) {
      setError(err.message)
      setHasCameraAccess(false)
      return false
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
      setHasCameraAccess(false)
    }
  }

  const capturePhoto = (videoElement, canvasElement) => {
    if (!videoElement || !canvasElement) return null
    
    const ctx = canvasElement.getContext('2d')
    canvasElement.width = videoElement.videoWidth
    canvasElement.height = videoElement.videoHeight
    ctx.drawImage(videoElement, 0, 0)
    
    return canvasElement.toDataURL('image/jpeg', 0.8)
  }

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  return {
    startCamera,
    stopCamera,
    capturePhoto,
    hasCameraAccess,
    error,
    videoRef,
    setVideoRef
  }
}