// src/components/ReportForm.jsx - Formulario de reporte con cámara
import { useState, useRef, useEffect } from 'react'
import { API_BASE } from '../config'

const CATEGORIES = [
  { value: 'vialidad_alcantarillado', label: 'Vialidad y Alcantarillado' },
  { value: 'aseo_urbano', label: 'Aseo Urbano' },
  { value: 'alumbrado_publico', label: 'Alumbrado Publico' }
]

export function ReportForm({ visible, onClose, onSubmit, capturedImage, onRetake, category }) {
  const [selectedCat, setSelectedCat] = useState(category || 'vialidad_alcantarillado')
  const [description, setDescription] = useState('')
  const [formData, setFormData] = useState({
    category: category || 'vialidad_alcantarillado',
    description: '',
    latitude: null,
    longitude: null
  })
  
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [stream, setStream] = useState(null)
  const [previewMode, setPreviewMode] = useState(false)

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      })
      setStream(mediaStream)
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (error) {
      console.error('Error accediendo a cámara:', error)
      alert('No se pudo acceder a la cámara. Por favor permite el acceso.')
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
  }

  const capturePhoto = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    
    if (video && canvas) {
      const ctx = canvas.getContext('2d')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      
      const imageData = canvas.toDataURL('image/jpeg', 0.8)
      const blob = dataURLtoBlob(imageData)
      const file = new File([blob], 'reporte.jpg', { type: 'image/jpeg' })
      
      setCapturedImage(imageData)
      setPreviewMode(true)
      stopCamera()
    }
  }

  const dataURLtoBlob = (dataURL) => {
    const arr = dataURL.split(',')
    const mime = arr[0].match(/:(.*?);/)[1]
    const bstr = atob(arr[1])
    let l = bstr.length
    const u8arr = new Uint8Array(l)
    while (l--) {
      u8arr[l] = bstr.charCodeAt(l)
    }
    return new Blob([u8arr], { type: mime })
  }

  useEffect(() => {
    if (visible && !capturedImage) {
      startCamera()
    }
    return () => stopCamera()
  }, [visible])

  useEffect(() => {
    if (visible && !previewMode) {
      startCamera()
    }
  }, [visible])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!capturedImage) {
      alert('Debes tomar una foto del problema')
      return
    }

    if (!navigator.geolocation) {
      alert('Necesitas habilitar la ubicación')
      return
    }

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000
        })
      })

      const report = {
        category: selectedCat,
        description: description,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        photo_content: capturedImage
      }

      const response = await fetch(`${API_BASE}/api/v1/incidents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(report)
      })

      const result = await response.json()

      if (result.incident_id) {
        alert('Reporte creado exitosamente')
        onClose()
        window.location.reload()
      } else {
        alert(`Error: ${result.error || 'Error al crear reporte'}`)
      }
    } catch (error) {
      console.error(error)
      alert('Error al enviar reporte')
    }
  }

  const handleRetake = () => {
    setPreviewMode(false)
    setFormData({ ...formData, photo: null })
    startCamera()
  }

  if (!visible) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h3>Nuevo Reporte</h3>
        
        {!previewMode ? (
          // Vista de cámara
          <div className="camera-view">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline
              className="video-stream"
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <div className="camera-overlay">
              <p>Captura obligatoria: muestra el problema reportado</p>
            </div>
            <button className="btn btn-accent" onClick={capturePhoto}>
              Capturar
            </button>
            <button className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
          </div>
        ) : (
          // Vista previa y formulario
          <div className="preview-view">
            <div className="preview-image">
              <img src={capturedImage} alt="Vista previa" />
            </div>
            
            <div className="form-group">
              <label>Categoria</label>
              <select 
                value={selectedCat}
                onChange={(e) => setSelectedCat(e.target.value)}
                className="input"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>Descripcion (opcional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalla el problema..."
                className="input"
                rows="3"
              />
            </div>
            
            <div className="preview-actions">
              <button className="btn btn-secondary" onClick={handleRetake}>
                Retomar foto
              </button>
              <button className="btn btn-primary" onClick={handleSubmit}>
                Enviar reporte
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}