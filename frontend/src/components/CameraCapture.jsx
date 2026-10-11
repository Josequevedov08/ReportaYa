import { useState, useRef, useEffect } from "react";

interface CameraCaptureProps {
  onPhotoCapture: (dataUrl: string) => void;
  onCancel: () => void;
}

export default function CameraCapture({ onPhotoCapture, onCancel }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode] = useState<"environment" | "user">("environment");

  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setHasPermission(true);
        }
      } catch (err: any) {
        setError(err.name === "NotAllowedError" ? "Permiso de camara denegado" : "No se pudo acceder a la camara");
      }
    }

    startCamera();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode]);

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    onPhotoCapture(dataUrl);
  };

  return (
    <div className="camera-capture">
      <video ref={videoRef} autoPlay playsInline muted className="camera-video" />
      <canvas ref={canvasRef} className="hidden" />

      {error && (
        <div className="camera-error">
          <p>{error}</p>
          <button onClick={onCancel} className="btn btn--secondary">
            Cancelar
          </button>
        </div>
      )}

      {hasPermission && !error && (
        <div className="camera-controls">
          <button onClick={capturePhoto} className="btn btn--primary camera-btn-capture">
            Capturar
          </button>
          <button onClick={onCancel} className="btn btn--secondary camera-btn-cancel">
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
