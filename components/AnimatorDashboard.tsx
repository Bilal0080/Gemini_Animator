
import { GoogleGenAI, Type } from "@google/genai";
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AspectRatio, GenerationState, Resolution } from '../types';
import { ImageEditor } from './ImageEditor';

const LOADING_MESSAGES = [
  "Analyzing your frames...",
  "Synthesizing background textures...",
  "Applying temporal coherence...",
  "Gemini is dreaming up your video...",
  "Optimizing cinematic motion...",
  "Finalizing rendering pass...",
];

const PRESETS = [
  {
    id: 'cinematic',
    name: 'Cinematic Slow Motion',
    icon: '🎬',
    prompt: 'A cinematic slow-motion sweep of the background. Elegant soft lighting, shallow depth of field, and a high-end film stock look. The camera moves slowly and smoothly.',
  },
  {
    id: 'tech',
    name: 'Tech Workspace',
    icon: '💻',
    prompt: 'A futuristic coding workspace background with holographic VS Code, Python, and Google Gemini logos floating. Subtle neon flickers, tech-noir aesthetic, and clean data visualizations.',
  },
  {
    id: 'brand',
    name: 'Brand Orbit',
    icon: '✨',
    prompt: 'Soft studio lighting with YouTube and Google AI Studio logos orbiting gracefully in the background. Smooth circular motion, professional brand showcase feel, clean minimalist style.',
  },
  {
    id: 'dreamy',
    name: 'Dreamy Transition',
    icon: '☁️',
    prompt: 'An ethereal, dreamy animation. Soft glowing particles, pastel color palette, and a slow, smooth transition between background elements with light leaks.',
  },
  {
    id: 'action',
    name: 'Action Pulse',
    icon: '⚡',
    prompt: 'Fast-paced dynamic camera zoom and energetic light streaks in the background. High contrast, vibrant colors, and an intense action movie energy.',
  }
];

const BG_MUSIC_LIBRARY = [
  { id: 'none', name: 'None', icon: '🔇', url: '' },
  { id: 'tech', name: 'Digital Nexus', icon: '🛰️', url: 'https://actions.google.dev/sounds/v1/science_fiction/glitchy_digital_interface.ogg' },
  { id: 'space', name: 'Deep Space', icon: '🌌', url: 'https://actions.google.dev/sounds/v1/science_fiction/ambient_space_ship_hum.ogg' },
  { id: 'city', name: 'Cyber City', icon: '🏙️', url: 'https://actions.google.dev/sounds/v1/ambiences/city_street_ambience.ogg' },
  { id: 'nature', name: 'Windy Peak', icon: '🏔️', url: 'https://actions.google.dev/sounds/v1/weather/wind_gusting_through_trees.ogg' },
];

const SFX_LIBRARY = [
  { id: 'none', name: 'None', icon: '🔇', url: '' },
  { id: 'glitch', name: 'Glitch Step', icon: '📟', url: 'https://actions.google.dev/sounds/v1/science_fiction/digital_glitch_long.ogg' },
  { id: 'whoosh', name: 'Deep Whoosh', icon: '💨', url: 'https://actions.google.dev/sounds/v1/foley/whoosh_impact.ogg' },
  { id: 'pulse', name: 'Energy Pulse', icon: '🔋', url: 'https://actions.google.dev/sounds/v1/science_fiction/force_field_pulse.ogg' },
  { id: 'chime', name: 'Tech Chime', icon: '🔔', url: 'https://actions.google.dev/sounds/v1/science_fiction/digital_chime.ogg' },
];

const ADVANCED_CAM_ANGLES = [
  { id: 'wide', name: 'Wide Angle', icon: '↔️', keyword: 'captured from a sprawling wide-angle perspective' },
  { id: 'closeup', name: 'Close Up', icon: '🔍', keyword: 'framed in an intimate close-up shot with extreme detail' },
  { id: 'birdseye', name: 'Bird\'s Eye', icon: '🦅', keyword: 'from a high-altitude bird\'s eye view looking straight down' },
  { id: 'lowangle', name: 'Low Angle', icon: '📐', keyword: 'filmed from a dramatic low-angle perspective looking upward' },
  { id: 'pov', name: 'POV', icon: '👁️', keyword: 'from a first-person point-of-view perspective' },
];

const ADVANCED_MOTION = [
  { id: 'pan', name: 'Smooth Pan', desc: 'Horizontal tracking' },
  { id: 'tilt', name: 'Vertical Tilt', desc: 'Up/Down sweep' },
  { id: 'zoomin', name: 'Zoom In', desc: 'Slow magnification' },
  { id: 'zoomout', name: 'Zoom Out', desc: 'Revealing pull-back' },
  { id: 'orbit', name: '360 Orbit', desc: 'Circular rotation' },
  { id: 'dolly', name: 'Dolly Push', desc: 'Forward movement' },
];

const ADVANCED_ATMOSPHERE = [
  { id: 'volumetric', name: 'Volumetric', desc: 'God rays and dust' },
  { id: 'neon', name: 'Neon Glow', desc: 'Cyberpunk vibrancy' },
  { id: 'fog', name: 'Ethereal Fog', desc: 'Mist and mystery' },
  { id: 'rain', name: 'Heavy Rain', desc: 'Dramatic downpour' },
  { id: 'golden', name: 'Golden Hour', desc: 'Sunset warmth' },
  { id: 'monochrome', name: 'Film Noir', desc: 'High contrast B&W' },
];

interface AnimatorDashboardProps {
  onResetKey: () => void;
}

export const AnimatorDashboard: React.FC<AnimatorDashboardProps> = ({ onResetKey }) => {
  const [startImage, setStartImage] = useState<string | null>(null);
  const [endImage, setEndImage] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [prompt, setPrompt] = useState(PRESETS[1].prompt);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [resolution, setResolution] = useState<Resolution>('720p');
  const [activePreset, setActivePreset] = useState<string>(PRESETS[1].id);
  const [motionBlur, setMotionBlur] = useState<boolean>(false);
  const [stabilization, setStabilization] = useState<boolean>(true);
  const [speed, setSpeed] = useState<number>(1.0);
  
  // Audio State
  const [selectedBgMusicId, setSelectedBgMusicId] = useState<string>('none');
  const [selectedSfxId, setSelectedSfxId] = useState<string>('none');
  const [bgMusicVolume, setBgMusicVolume] = useState<number>(0.5);
  const [sfxVolume, setSfxVolume] = useState<number>(0.5);
  
  // Advanced State
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [camAngle, setCamAngle] = useState('wide');
  const [motionType, setMotionType] = useState('pan');
  const [atmosphere, setAtmosphere] = useState<string[]>([]);

  // AI Suggestion State
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [directorVision, setDirectorVision] = useState<string | null>(null);

  const [genState, setGenState] = useState<GenerationState>({
    isGenerating: false,
    status: '',
    progress: 0
  });

  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);
  const bgMusicRef = useRef<HTMLAudioElement>(null);
  const sfxRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Sync audio with video playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const syncAudio = (audio: HTMLAudioElement | null) => {
      if (!audio || audio.src === window.location.href) return;
      video.addEventListener('play', () => audio.play().catch(() => {}));
      video.addEventListener('pause', () => audio.pause());
      video.addEventListener('timeupdate', () => {
        if (video.ended) {
          audio.currentTime = 0;
          audio.pause();
        }
      });
    };

    syncAudio(bgMusicRef.current);
    syncAudio(sfxRef.current);

    return () => {};
  }, [genState.videoUrl, selectedBgMusicId, selectedSfxId]);

  useEffect(() => {
    if (bgMusicRef.current) bgMusicRef.current.volume = bgMusicVolume;
  }, [bgMusicVolume]);

  useEffect(() => {
    if (sfxRef.current) sfxRef.current.volume = sfxVolume;
  }, [sfxVolume]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setImg: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImg(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setPrompt(preset.prompt);
    setActivePreset(preset.id);
    setDirectorVision(null);
  };

  const toggleAtmosphere = (id: string) => {
    setAtmosphere(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const enginePrompt = useMemo(() => {
    let final = prompt;
    let speedInstruction = "";
    if (speed <= 0.6) speedInstruction = " The animation should be very slow, deliberate, and serene.";
    else if (speed >= 1.4) speedInstruction = " The animation should be fast-paced, high-energy, and dynamic.";

    if (isAdvancedMode) {
      const angleKeyword = ADVANCED_CAM_ANGLES.find(a => a.id === camAngle)?.keyword;
      const motion = ADVANCED_MOTION.find(m => m.id === motionType)?.name;
      const atmosphereStr = atmosphere.length > 0 
        ? ` with ${atmosphere.map(a => ADVANCED_ATMOSPHERE.find(at => at.id === a)?.name).join(', ')} atmospheric effects`
        : "";
      
      final += `. Scene ${angleKeyword}. The animation uses a ${motion} movement style${atmosphereStr}.`;
    }

    final += ` ${speedInstruction}`;

    if (motionBlur) final += " Apply realistic cinematic motion blur.";
    if (stabilization) final += " Ensure perfectly stabilized, jitter-free camera movement.";
    
    return final.trim();
  }, [prompt, isAdvancedMode, camAngle, motionType, atmosphere, speed, motionBlur, stabilization]);

  const suggestParameters = async () => {
    if (!startImage) return;
    setIsSuggesting(true);
    setDirectorVision(null);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const parts: any[] = [
        {
          inlineData: {
            mimeType: 'image/png',
            data: startImage.split(',')[1],
          },
        }
      ];

      if (endImage) {
        parts.push({
          inlineData: {
            mimeType: 'image/png',
            data: endImage.split(',')[1],
          },
        });
      }

      parts.push({ 
        text: `You are an elite Cinematographer. Analyze the provided ${endImage ? 'two frames (start and end)' : 'frame'} and suggest optimal cinematic parameters for a video generation model. 
        If two frames are provided, suggest how the first should morph or transition into the second.
        
        Return a JSON object:
        {
          "cameraAngle": "wide" | "closeup" | "birdseye" | "lowangle" | "pov",
          "motionType": "pan" | "tilt" | "zoomin" | "zoomout" | "orbit" | "dolly",
          "atmosphere": string[], // from: volumetric, neon, fog, rain, golden, monochrome
          "prompt": string, // detailed creative prompt
          "directorVision": string, // a 1-2 sentence explanation of the creative choice
          "suggestedAudio": string, // one of: tech, space, city, nature
          "suggestedSfx": string, // one of: glitch, whoosh, pulse, chime
          "speed": number // between 0.5 and 2.0
        }` 
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              cameraAngle: { type: Type.STRING },
              motionType: { type: Type.STRING },
              atmosphere: { type: Type.ARRAY, items: { type: Type.STRING } },
              prompt: { type: Type.STRING },
              directorVision: { type: Type.STRING },
              suggestedAudio: { type: Type.STRING },
              suggestedSfx: { type: Type.STRING },
              speed: { type: Type.NUMBER }
            },
            required: ["cameraAngle", "motionType", "atmosphere", "prompt", "directorVision"]
          }
        }
      });

      const res = JSON.parse(response.text || '{}');
      
      setIsAdvancedMode(true);
      if (res.cameraAngle) setCamAngle(res.cameraAngle);
      if (res.motionType) setMotionType(res.motionType);
      if (res.atmosphere) setAtmosphere(res.atmosphere);
      if (res.prompt) setPrompt(res.prompt);
      if (res.directorVision) setDirectorVision(res.directorVision);
      if (res.suggestedAudio) setSelectedBgMusicId(res.suggestedAudio);
      if (res.suggestedSfx) setSelectedSfxId(res.suggestedSfx);
      if (res.speed) setSpeed(res.speed);

      setActivePreset('custom');

    } catch (err) {
      console.error("AI Analysis failed", err);
    } finally {
      setIsSuggesting(false);
    }
  };

  const generateVideo = async () => {
    if (!startImage) {
      alert("Please upload at least one starting image.");
      return;
    }

    setGenState({
      isGenerating: true,
      status: LOADING_MESSAGES[0],
      progress: 0
    });

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const config: any = {
        numberOfVideos: 1,
        resolution,
        aspectRatio
      };

      if (endImage) {
        config.lastFrame = {
          imageBytes: endImage.split(',')[1],
          mimeType: 'image/png'
        };
      }

      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: enginePrompt,
        image: {
          imageBytes: startImage.split(',')[1],
          mimeType: 'image/png'
        },
        config
      });

      let messageIndex = 0;
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        messageIndex = (messageIndex + 1) % LOADING_MESSAGES.length;
        setGenState(prev => ({
          ...prev,
          status: LOADING_MESSAGES[messageIndex],
          progress: Math.min(prev.progress + 15, 95)
        }));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        const blob = await videoResponse.blob();
        const videoUrl = URL.createObjectURL(blob);
        setGenState({
          isGenerating: false,
          status: 'Generation complete!',
          progress: 100,
          videoUrl
        });
      }
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("Requested entity was not found.")) onResetKey();
      setGenState({
        isGenerating: false,
        status: 'Error',
        progress: 0,
        error: err.message || "An unexpected error occurred."
      });
    }
  };

  const activeBgMusic = BG_MUSIC_LIBRARY.find(a => a.id === selectedBgMusicId);
  const activeSfx = SFX_LIBRARY.find(a => a.id === selectedSfxId);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {editingIndex !== null && (
        <ImageEditor 
          image={editingIndex === 0 ? startImage! : endImage!}
          aspectRatio={aspectRatio}
          onCancel={() => setEditingIndex(null)}
          onSave={(newImg) => {
            if (editingIndex === 0) setStartImage(newImg);
            else setEndImage(newImg);
            setEditingIndex(null);
          }}
        />
      )}

      <audio ref={bgMusicRef} src={activeBgMusic?.url} loop className="hidden" />
      <audio ref={sfxRef} src={activeSfx?.url} loop className="hidden" />

      <header className="mb-12 text-center">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4 bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
          Gemini Animator Pro
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          Intelligent cinematic synthesis. Let AI analyze your vision and render high-fidelity video sequences.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel p-6 rounded-2xl border-white/5">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-blue-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Input Frames
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Starting Frame</label>
                  {startImage && <button onClick={() => setEditingIndex(0)} className="text-[10px] text-blue-400 font-bold uppercase">Edit</button>}
                </div>
                <div 
                  onClick={() => !startImage && fileInputRef1.current?.click()}
                  className={`relative h-40 rounded-xl border-2 border-dashed border-slate-700 hover:border-blue-500/50 cursor-pointer overflow-hidden flex items-center justify-center transition-all bg-slate-800/50 shadow-inner ${startImage ? 'border-none' : ''}`}
                >
                  {startImage ? (
                    <>
                      <img src={startImage} className="w-full h-full object-cover" alt="Start" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <button onClick={(e) => { e.stopPropagation(); setEditingIndex(0); }} className="p-2 bg-blue-600 rounded-full text-white shadow-xl"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                        <button onClick={(e) => { e.stopPropagation(); setStartImage(null); }} className="p-2 bg-red-600 rounded-full text-white shadow-xl"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                      </div>
                    </>
                  ) : <div className="text-center p-4"><div className="text-3xl mb-2">📸</div><p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Select Image One</p></div>}
                  <input ref={fileInputRef1} type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, setStartImage)} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Target Image (Optional)</label>
                  {endImage && <button onClick={() => setEditingIndex(1)} className="text-[10px] text-blue-400 font-bold uppercase">Edit</button>}
                </div>
                <div 
                  onClick={() => !endImage && fileInputRef2.current?.click()}
                  className={`relative h-40 rounded-xl border-2 border-dashed border-slate-700 hover:border-blue-500/50 cursor-pointer overflow-hidden flex items-center justify-center transition-all bg-slate-800/50 shadow-inner ${endImage ? 'border-none' : ''}`}
                >
                  {endImage ? (
                    <>
                      <img src={endImage} className="w-full h-full object-cover" alt="End" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <button onClick={(e) => { e.stopPropagation(); setEditingIndex(1); }} className="p-2 bg-blue-600 rounded-full text-white shadow-xl"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                        <button onClick={(e) => { e.stopPropagation(); setEndImage(null); }} className="p-2 bg-red-600 rounded-full text-white shadow-xl"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                      </div>
                    </>
                  ) : <div className="text-center p-4"><div className="text-3xl mb-2">🎞️</div><p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Keyframe Two</p></div>}
                  <input ref={fileInputRef2} type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, setEndImage)} />
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border-white/5 space-y-6 shadow-xl">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-indigo-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              Audio Mixing
            </h3>
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ambient Music</span>
                  <span className="text-[10px] text-slate-400 font-mono">{Math.round(bgMusicVolume * 100)}%</span>
                </div>
                <input type="range" min="0" max="1" step="0.01" value={bgMusicVolume} onChange={(e) => setBgMusicVolume(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                <div className="grid grid-cols-3 gap-1.5">
                  {BG_MUSIC_LIBRARY.map((audio) => (
                    <button key={audio.id} onClick={() => setSelectedBgMusicId(audio.id)} className={`p-2 rounded-lg border text-center transition-all ${selectedBgMusicId === audio.id ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' : 'bg-slate-900 border-white/5 text-slate-500 hover:text-slate-300'}`}>
                      <div className="text-sm">{audio.icon}</div>
                      <div className="text-[8px] font-bold truncate">{audio.name}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sound Effects</span>
                  <span className="text-[10px] text-slate-400 font-mono">{Math.round(sfxVolume * 100)}%</span>
                </div>
                <input type="range" min="0" max="1" step="0.01" value={sfxVolume} onChange={(e) => setSfxVolume(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                <div className="grid grid-cols-3 gap-1.5">
                  {SFX_LIBRARY.map((audio) => (
                    <button key={audio.id} onClick={() => setSelectedSfxId(audio.id)} className={`p-2 rounded-lg border text-center transition-all ${selectedSfxId === audio.id ? 'bg-blue-600/20 border-blue-500 text-blue-300' : 'bg-slate-900 border-white/5 text-slate-500 hover:text-slate-300'}`}>
                      <div className="text-sm">{audio.icon}</div>
                      <div className="text-[8px] font-bold truncate">{audio.name}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* New Output Configuration Section */}
          <div className="glass-panel p-6 rounded-2xl border-white/5 space-y-6 shadow-xl">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-emerald-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              Output Configuration
            </h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Aspect Ratio</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setAspectRatio('16:9')}
                    className={`py-2 rounded-lg text-[10px] font-bold border transition-all ${aspectRatio === '16:9' ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-900/40' : 'bg-slate-900 border-white/5 text-slate-500 hover:text-slate-300'}`}
                  >
                    Landscape (16:9)
                  </button>
                  <button 
                    onClick={() => setAspectRatio('9:16')}
                    className={`py-2 rounded-lg text-[10px] font-bold border transition-all ${aspectRatio === '9:16' ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-900/40' : 'bg-slate-900 border-white/5 text-slate-500 hover:text-slate-300'}`}
                  >
                    Portrait (9:16)
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Resolution</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setResolution('720p')}
                    className={`py-2 rounded-lg text-[10px] font-bold border transition-all ${resolution === '720p' ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-900/40' : 'bg-slate-900 border-white/5 text-slate-500 hover:text-slate-300'}`}
                  >
                    HD (720p)
                  </button>
                  <button 
                    onClick={() => setResolution('1080p')}
                    className={`py-2 rounded-lg text-[10px] font-bold border transition-all ${resolution === '1080p' ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-900/40' : 'bg-slate-900 border-white/5 text-slate-500 hover:text-slate-300'}`}
                  >
                    FHD (1080p)
                  </button>
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-300 font-medium">Video Stabilization</span>
                    <span className="text-[8px] text-slate-500 uppercase font-bold">Remove Camera Jitter</span>
                  </div>
                  <button 
                    onClick={() => setStabilization(!stabilization)} 
                    className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${stabilization ? 'bg-emerald-600' : 'bg-slate-700'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${stabilization ? 'translate-x-5.5' : 'translate-x-1'}`} />
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-300 font-medium">Motion Blur</span>
                    <span className="text-[8px] text-slate-500 uppercase font-bold">Cinematic Shutter</span>
                  </div>
                  <button 
                    onClick={() => setMotionBlur(!motionBlur)} 
                    className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${motionBlur ? 'bg-indigo-600' : 'bg-slate-700'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${motionBlur ? 'translate-x-5.5' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6 rounded-2xl border-white/5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Director's Suite
              </h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={suggestParameters}
                  disabled={!startImage || isSuggesting}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-bold uppercase transition-all border shadow-lg ${!startImage ? 'bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed' : isSuggesting ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 animate-pulse' : 'bg-indigo-600 hover:bg-indigo-500 border-indigo-400 text-white active:scale-95'}`}
                >
                  {isSuggesting ? <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                  AI Analysis Suggestion
                </button>
                <button onClick={() => setIsAdvancedMode(!isAdvancedMode)} className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-bold uppercase transition-all border ${isAdvancedMode ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                  Advanced Mode
                </button>
              </div>
            </div>

            {directorVision && (
              <div className="mb-6 bg-indigo-500/10 border border-indigo-500/30 p-4 rounded-xl animate-in fade-in slide-in-from-top-2 duration-500">
                <div className="flex gap-3">
                  <div className="text-xl">💡</div>
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-indigo-300 mb-1">Director's Insight</h4>
                    <p className="text-xs text-indigo-100/80 leading-relaxed italic">"{directorVision}"</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-6">
              {!isAdvancedMode ? (
                <div className="flex flex-wrap gap-2 mb-2">
                  {PRESETS.map((p) => (
                    <button key={p.id} onClick={() => applyPreset(p)} className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 border ${activePreset === p.id ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                      <span>{p.icon}</span>{p.name}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-5 bg-slate-950/80 rounded-xl border border-white/5 shadow-2xl">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Camera Angle</label>
                    <div className="grid grid-cols-2 gap-2">
                      {ADVANCED_CAM_ANGLES.map(angle => (
                        <button key={angle.id} onClick={() => setCamAngle(angle.id)} className={`flex items-center gap-2 p-2.5 rounded-lg text-xs font-bold border transition-all ${camAngle === angle.id ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-900/40' : 'bg-slate-900 border-white/5 text-slate-500 hover:text-slate-300'}`}>
                          <span>{angle.icon}</span> {angle.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Camera Motion</label>
                    <div className="space-y-1.5 h-32 overflow-y-auto pr-2 custom-scrollbar">
                      {ADVANCED_MOTION.map(motion => (
                        <button key={motion.id} onClick={() => setMotionType(motion.id)} className={`w-full text-left p-2.5 rounded-lg border transition-all ${motionType === motion.id ? 'bg-blue-600 border-blue-400 shadow-lg shadow-blue-900/40' : 'bg-slate-900 border-white/5'}`}>
                          <p className={`text-xs font-bold ${motionType === motion.id ? 'text-white' : 'text-slate-300'}`}>{motion.name}</p>
                          <p className="text-[9px] text-slate-500 leading-tight">{motion.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Atmosphere</label>
                    <div className="flex flex-wrap gap-2">
                      {ADVANCED_ATMOSPHERE.map(effect => (
                        <button key={effect.id} onClick={() => toggleAtmosphere(effect.id)} className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${atmosphere.includes(effect.id) ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-white/5 text-slate-500 hover:text-slate-300'}`}>
                          {effect.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="relative group">
                  <textarea
                    value={prompt}
                    onChange={(e) => { setPrompt(e.target.value); setActivePreset('custom'); setDirectorVision(null); }}
                    placeholder="Describe the cinematic action..."
                    className="w-full h-28 bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none text-sm shadow-inner scrollbar-hide"
                  />
                </div>
                <div className="bg-slate-900/40 rounded-xl p-3 border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Synthesis Engine Prompt</span>
                    <span className="text-[10px] text-slate-500 font-mono">VEO-3.1-FP</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium leading-relaxed italic bg-slate-950/50 p-2 rounded-lg border border-white/5">"{enginePrompt}"</p>
                </div>
              </div>
              
              <button
                onClick={generateVideo}
                disabled={genState.isGenerating || !startImage}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3 shadow-2xl ${genState.isGenerating ? 'bg-slate-800 text-slate-500' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white active:scale-[0.98]'}`}
              >
                {genState.isGenerating ? <>
                  <svg className="animate-spin h-6 w-6 text-blue-400" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  {genState.status}
                </> : <>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Render Scene
                </>}
              </button>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl min-h-[440px] flex flex-col border-white/5 shadow-2xl">
            <h3 className="text-lg font-semibold mb-6 flex items-center justify-between">
              Final Output
              {genState.videoUrl && <a href={genState.videoUrl} download="gemini-scene.mp4" className="text-[10px] px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-500 transition-colors flex items-center gap-1.5 font-bold uppercase shadow-lg shadow-blue-900/40">Download MP4</a>}
            </h3>
            <div className="flex-grow flex items-center justify-center bg-slate-950 rounded-xl overflow-hidden relative border border-white/5 shadow-inner">
              {genState.isGenerating ? (
                <div className="text-center p-8 w-full max-w-sm">
                  <div className="mb-6 relative h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div className="absolute h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]" style={{ width: `${genState.progress}%` }}></div>
                  </div>
                  <p className="text-indigo-400 font-bold mb-1 uppercase tracking-widest text-xs">{genState.status}</p>
                </div>
              ) : genState.videoUrl ? (
                <video ref={videoRef} src={genState.videoUrl} controls autoPlay loop className={`w-full h-full object-contain ${aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-video'}`} />
              ) : genState.error ? (
                <div className="text-center p-8 bg-red-900/10 border border-red-500/20 rounded-xl w-full max-w-md"><div className="text-4xl mb-4 text-red-500">✕</div><h4 className="text-red-400 font-bold mb-2">Rendering Failed</h4><p className="text-red-300/60 text-xs mb-6 leading-relaxed">{genState.error}</p></div>
              ) : (
                <div className="text-center p-12"><div className="w-24 h-24 mx-auto mb-6 rounded-full bg-slate-900 flex items-center justify-center border border-white/5 shadow-inner"><svg className="w-12 h-12 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" /></svg></div><p className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-1">Director's Monitor</p></div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <footer className="mt-20 pt-8 border-t border-slate-900 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-600 text-[10px] font-bold uppercase tracking-widest">
        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div><p>© 2025 Gemini Animator Pro • Veo 3.1 Synthesis Engine</p></div>
        <div className="flex gap-6"><a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="hover:text-slate-300 transition-colors">Billing Docs</a><span className="hover:text-slate-300 cursor-pointer transition-colors">Help Center</span></div>
      </footer>
    </div>
  );
};
