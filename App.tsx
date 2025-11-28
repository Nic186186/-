import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { Loader2, Mic, Camera, Move, Sparkles } from 'lucide-react';
import GalaxyScene from './components/GalaxyScene';
import MotionController from './components/MotionController';
import { audioEngine } from './services/audioService';
import { generateCosmicInsight } from './services/geminiService';
import { AppState, CosmicReading } from './types';

// Augment JSX namespace for R3F intrinsic elements
declare global {
  namespace JSX {
    interface IntrinsicElements {
      color: any;
      ambientLight: any;
    }
  }
}

function App() {
  const [appState, setAppState] = useState<AppState>(AppState.INTRO);
  const [velocity, setVelocity] = useState(0);
  const [smoothedVelocity, setSmoothedVelocity] = useState(0);
  const [cosmicReading, setCosmicReading] = useState<CosmicReading | null>(null);

  // Session Stats tracking
  const sessionStats = useRef({
    totalVelocity: 0,
    peakVelocity: 0,
    samples: 0,
    startTime: 0
  });

  // Smooth the velocity for visuals and audio to prevent jitter
  useEffect(() => {
    let animationFrame: number;
    const loop = () => {
      setSmoothedVelocity(prev => {
        const diff = velocity - prev;
        return prev + diff * 0.1; // Lerp factor
      });
      animationFrame = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(animationFrame);
  }, [velocity]);

  // Update Audio Engine based on smoothed velocity
  useEffect(() => {
    if (appState === AppState.ACTIVE) {
      audioEngine.updateWind(smoothedVelocity);
      
      // Update stats
      if (smoothedVelocity > 0.05) {
        sessionStats.current.totalVelocity += smoothedVelocity;
        sessionStats.current.samples++;
        if (smoothedVelocity > sessionStats.current.peakVelocity) {
          sessionStats.current.peakVelocity = smoothedVelocity;
        }
      }
    }
  }, [smoothedVelocity, appState]);

  const handleStart = async () => {
    try {
      // Request permissions
      await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      setAppState(AppState.ACTIVE);
      audioEngine.init();
      audioEngine.resume();
      sessionStats.current.startTime = Date.now();
      sessionStats.current.totalVelocity = 0;
      sessionStats.current.samples = 0;
      sessionStats.current.peakVelocity = 0;
    } catch (e) {
      alert("Camera permission is required to control the galaxy.");
    }
  };

  const handleEndSession = async () => {
    setAppState(AppState.ANALYZING);
    audioEngine.stop();

    const duration = (Date.now() - sessionStats.current.startTime) / 1000;
    const avgSpeed = sessionStats.current.samples > 0 
      ? sessionStats.current.totalVelocity / sessionStats.current.samples 
      : 0;
    
    // Call Gemini
    const reading = await generateCosmicInsight(
      avgSpeed, 
      sessionStats.current.peakVelocity, 
      duration
    );
    
    setCosmicReading(reading);
    setAppState(AppState.INSIGHT);
  };

  const handleVelocityChange = useCallback((v: number) => {
    setVelocity(v);
  }, []);

  return (
    <div className="w-full h-screen relative bg-black overflow-hidden select-none">
      
      {/* Background 3D Scene */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 5, 5], fov: 60 }} gl={{ antialias: false }}>
          <color attach="background" args={['#020205']} />
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          <GalaxyScene velocity={smoothedVelocity} />
          <OrbitControls 
            enableZoom={false} 
            enablePan={false} 
            autoRotate={appState === AppState.INTRO || appState === AppState.INSIGHT} 
            autoRotateSpeed={0.5} 
          />
          <ambientLight intensity={0.5} />
        </Canvas>
      </div>

      {/* Logic Layer: Motion Controller */}
      {appState === AppState.ACTIVE && (
        <MotionController 
          onVelocityChange={handleVelocityChange} 
          isActive={true} 
        />
      )}

      {/* UI Layer */}
      <div className="absolute inset-0 z-10 flex flex-col pointer-events-none">
        
        {/* Header */}
        <div className="p-8 flex justify-between items-center opacity-80">
          <h1 className="text-2xl font-orbitron tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500">
            COSMIC FLOW
          </h1>
          {appState === AppState.ACTIVE && (
            <div className="flex items-center gap-2 text-white/50 text-sm font-mono">
              <span className={`w-2 h-2 rounded-full ${smoothedVelocity > 0.1 ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`}></span>
              SENSOR ACTIVE
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex items-center justify-center pointer-events-auto">
          
          {/* INTRO STATE */}
          {appState === AppState.INTRO && (
            <div className="max-w-md w-full backdrop-blur-xl bg-black/40 border border-white/10 p-8 rounded-2xl shadow-2xl text-center transform transition-all hover:scale-105 duration-500">
              <div className="mb-6 flex justify-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-600 to-blue-600 flex items-center justify-center shadow-[0_0_30px_rgba(100,50,255,0.4)]">
                  <Move className="w-8 h-8 text-white" />
                </div>
              </div>
              <h2 className="text-3xl font-light mb-4">Control the Cosmos</h2>
              <p className="text-gray-300 mb-8 font-light leading-relaxed">
                Experience a reactive galaxy simulation controlled by your hand movements. 
                Generate wind through motion and discover your cosmic energy signature.
              </p>
              <button 
                onClick={handleStart}
                className="group relative px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/20 text-white font-orbitron tracking-wider text-sm transition-all overflow-hidden rounded-sm"
              >
                <span className="relative z-10 flex items-center gap-2">
                  INITIALIZE SYSTEM <Camera size={16} />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600/50 to-blue-600/50 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500"></div>
              </button>
            </div>
          )}

          {/* ACTIVE STATE HUD */}
          {appState === AppState.ACTIVE && (
            <div className="absolute bottom-12 w-full flex flex-col items-center gap-4">
               <div className="text-white/30 font-mono text-xs tracking-[0.3em] uppercase">
                Wave Hand to Generate Momentum
               </div>
               
               {/* Visualizer Bar */}
               <div className="w-64 h-1 bg-white/10 rounded-full overflow-hidden">
                 <div 
                   className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-100"
                   style={{ width: `${Math.min(smoothedVelocity * 100, 100)}%` }}
                 ></div>
               </div>

               <button 
                onClick={handleEndSession}
                className="mt-4 px-6 py-2 text-xs font-bold text-white/50 hover:text-white border border-white/10 hover:border-white/50 rounded-full transition-colors backdrop-blur-md"
               >
                 END SESSION & ANALYZE
               </button>
            </div>
          )}

          {/* ANALYZING STATE */}
          {appState === AppState.ANALYZING && (
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
              <p className="font-orbitron text-xl animate-pulse">Consulting the Stars...</p>
            </div>
          )}

          {/* INSIGHT STATE */}
          {appState === AppState.INSIGHT && cosmicReading && (
             <div className="max-w-lg w-full backdrop-blur-2xl bg-black/60 border border-purple-500/30 p-10 rounded-xl shadow-[0_0_50px_rgba(147,51,234,0.15)] text-center relative overflow-hidden">
               {/* Decorative elements */}
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent"></div>
               
               <Sparkles className="w-8 h-8 text-yellow-300 mx-auto mb-4" />
               
               <h3 className="text-purple-300 text-sm font-mono uppercase tracking-widest mb-2">Cosmic Resonance Detected</h3>
               <h2 className="text-4xl font-orbitron text-white mb-6 leading-tight">{cosmicReading.title}</h2>
               
               <div className="w-12 h-0.5 bg-white/20 mx-auto mb-6"></div>
               
               <p className="text-lg text-gray-200 font-light italic leading-relaxed mb-8">
                 "{cosmicReading.insight}"
               </p>
               
               <button 
                onClick={() => setAppState(AppState.INTRO)}
                className="text-white/40 hover:text-white text-sm transition-colors border-b border-transparent hover:border-white"
               >
                 RESTART SEQUENCE
               </button>
             </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default App;