import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

interface MotionControllerProps {
  onVelocityChange: (velocity: number) => void;
  isActive: boolean;
}

const MotionController: React.FC<MotionControllerProps> = ({ onVelocityChange, isActive }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const requestRef = useRef<number | null>(null);
  const lastHandPos = useRef<{ x: number, y: number, time: number } | null>(null);
  
  // Initialize MediaPipe
  useEffect(() => {
    const init = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        
        handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        setLoading(false);
      } catch (err) {
        console.error("Failed to load hand landmarker", err);
        setLoading(false); // Fail gracefully, maybe show error in real app
      }
    };

    init();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (handLandmarkerRef.current) handLandmarkerRef.current.close();
    };
  }, []);

  // Setup Camera
  useEffect(() => {
    if (!isActive || loading) return;

    const startCamera = async () => {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480, frameRate: 30 }
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.addEventListener("loadeddata", predictWebcam);
          }
        } catch (err) {
          console.error("Error accessing webcam:", err);
        }
      }
    };

    startCamera();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, loading]);

  const predictWebcam = () => {
    if (!handLandmarkerRef.current || !videoRef.current) return;
    
    // Safety check for video ready state
    if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
        requestRef.current = requestAnimationFrame(predictWebcam);
        return;
    }

    const startTimeMs = performance.now();
    const result = handLandmarkerRef.current.detectForVideo(videoRef.current, startTimeMs);

    if (result.landmarks && result.landmarks.length > 0) {
      // Get centroid of the first hand (approximate with wrist or average)
      const hand = result.landmarks[0];
      const wrist = hand[0]; // Wrist landmark

      const currentTime = performance.now();

      if (lastHandPos.current) {
        // Calculate distance moved
        const dx = wrist.x - lastHandPos.current.x;
        const dy = wrist.y - lastHandPos.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const dt = (currentTime - lastHandPos.current.time) / 1000; // seconds

        // Calculate velocity (units per second)
        // Normalize roughly: fast movement across screen ~ 1.0
        let velocity = distance / dt; 
        
        // Clamp and smooth
        velocity = Math.min(velocity * 2, 1.5); // Sensitivity multiplier
        
        onVelocityChange(velocity);
      }

      lastHandPos.current = { x: wrist.x, y: wrist.y, time: currentTime };
    } else {
      // Decay velocity if no hand detected
      onVelocityChange(0);
      lastHandPos.current = null;
    }

    if (isActive) {
      requestRef.current = requestAnimationFrame(predictWebcam);
    }
  };

  return (
    <div className="absolute top-4 right-4 z-50 opacity-50 hover:opacity-100 transition-opacity">
      {/* Hidden processing video */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-32 h-24 object-cover rounded-lg border border-white/20 transform scale-x-[-1]"
      />
      {loading && <div className="text-xs text-white text-center mt-1">Init AI...</div>}
    </div>
  );
};

export default MotionController;