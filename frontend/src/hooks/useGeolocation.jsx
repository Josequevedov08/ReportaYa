// src/hooks/useGeolocation.jsx - Hook para geolocalización
import { useState, useEffect } from 'react'

export function useGeolocation() {
  const [position, setPosition] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const getCurrentPosition = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalización no disponible'))
        return
      }

      setLoading(true)
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPosition(pos)
          setLoading(false)
          resolve(pos)
        },
        (err) => {
          setError(err.message)
          setLoading(false)
          reject(err)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        }
      )
    })
  }

  const watchPosition = (callback) => {
    if (!navigator.geolocation) return null
    
    return navigator.geolocation.watchPosition(
      (pos) => callback(pos),
      (err) => setError(err.message),
      { enableHighAccuracy: true }
    )
  }

  const clearWatch = (watchId) => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId)
    }
  }

  return {
    position,
    error,
    loading,
    getCurrentPosition,
    watchPosition,
    clearWatch
  }
}