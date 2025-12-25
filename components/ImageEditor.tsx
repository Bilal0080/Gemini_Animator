
import React, { useState, useRef, useEffect, useCallback } from 'react';

interface EditorParams {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  vignette: number;
  grayscale: boolean;
  sepia: boolean;
  rotation: number; // Z-axis
  rotateX: number;
  rotateY: number;
  perspective: number;
  cameraShake: number;
}

interface ImageEditorProps {
  image: string;
  onSave: (processedImage: string) => void;
  onCancel: () => void;
  aspectRatio: '16:9' | '9:16';
}

export const ImageEditor: React.FC<ImageEditorProps> = ({ image, onSave, onCancel, aspectRatio }) => {
  const [params, setParams] = useState<EditorParams>({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    hue: 0,
    vignette: 0,
    grayscale: false,
    sepia: false,
    rotation: 0,
    rotateX: 0,
    rotateY: 0,
    perspective: 1000,
    cameraShake: 0,
  });

  // History stacks
  const [history, setHistory] = useState<EditorParams[]>([]);
  const [future, setFuture] = useState<EditorParams[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const shakeFrameRef = useRef<number>(0);

  // Helper to update params and manage history
  const updateParams = (newParams: Partial<EditorParams>, commit: boolean = false) => {
    if (commit) {
      setHistory((prev) => [...prev, params]);
      setFuture([]); // Clear redo stack on new action
    }
    setParams((prev) => ({ ...prev, ...newParams }));
  };

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setFuture((prev) => [params, ...prev]);
    setHistory((prev) => prev.slice(0, -1));
    setParams(previous);
  }, [history, params]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setHistory((prev) => [...prev, params]);
    setFuture((prev) => prev.slice(1));
    setParams(next);
  }, [future, params]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // Handle Camera Shake Jitter Animation
  useEffect(() => {
    if (params.cameraShake <= 0) {
      if (canvasRef.current) {
        canvasRef.current.style.marginLeft = '0px';
        canvasRef.current.style.marginTop = '0px';
      }
      return;
    }

    const animateShake = () => {
      if (canvasRef.current) {
        const intensity = params.cameraShake / 20; // Scale intensity
        const offsetX = (Math.random() - 0.5) * intensity;
        const offsetY = (Math.random() - 0.5) * intensity;
        canvasRef.current.style.marginLeft = `${offsetX}px`;
        canvasRef.current.style.marginTop = `${offsetY}px`;
      }
      shakeFrameRef.current = requestAnimationFrame(animateShake);
    };

    shakeFrameRef.current = requestAnimationFrame(animateShake);
    return () => cancelAnimationFrame(shakeFrameRef.current);
  }, [params.cameraShake]);

  useEffect(() => {
    applyChanges();
  }, [params]);

  const applyChanges = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = image;
    img.onload = () => {
      // Basic dimensions for the 2D canvas buffer
      canvas.width = img.width;
      canvas.height = img.height;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      let filters = `brightness(${params.brightness}%) contrast(${params.contrast}%) saturate(${params.saturation}%) hue-rotate(${params.hue}deg)`;
      if (params.grayscale) filters += ' grayscale(100%)';
      if (params.sepia) filters += ' sepia(100%)';
      ctx.filter = filters;

      // We only draw the image with filters here. 
      // 3D rotation and Shake are applied via CSS/Styles to the canvas element for real-time high-quality preview.
      ctx.drawImage(img, 0, 0);

      ctx.filter = 'none';

      if (params.vignette !== 0) {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const outerRadius = Math.sqrt(Math.pow(centerX, 2) + Math.pow(centerY, 2));
        
        const gradient = ctx.createRadialGradient(
          centerX, centerY, 0,
          centerX, centerY, outerRadius
        );

        const color = params.vignette > 0 ? '0, 0, 0' : '255, 255, 255';
        const opacity = Math.abs(params.vignette) / 100;

        gradient.addColorStop(0.4, `rgba(${color}, 0)`);
        gradient.addColorStop(1, `rgba(${color}, ${opacity})`);

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Apply 3D rotation to the canvas element itself for preview
      if (canvas) {
        canvas.style.transform = `rotateX(${params.rotateX}deg) rotateY(${params.rotateY}deg) rotateZ(${params.rotation}deg)`;
        canvas.style.transition = isDragging ? 'none' : 'transform 0.2s ease-out';
      }
      
      // Apply perspective to parent container
      if (containerRef.current) {
        containerRef.current.style.perspective = `${params.perspective}px`;
      }
    };
  };

  const handleRotateZ = () => {
    updateParams({ rotation: (params.rotation + 90) % 360 }, true);
  };

  const resetTransforms = () => {
    updateParams({
      rotateX: 0,
      rotateY: 0,
      rotation: 0,
      perspective: 1000
    }, true);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const finalCanvas = document.createElement('canvas');
    const [wRatio, hRatio] = aspectRatio === '16:9' ? [16, 9] : [9, 16];
    
    const isVertical = (params.rotation / 90) % 2 !== 0;
    const baseW = isVertical ? canvas.height : canvas.width;
    const baseH = isVertical ? canvas.width : canvas.height;

    let finalWidth = baseW;
    let finalHeight = (baseW * hRatio) / wRatio;

    if (finalHeight > baseH) {
      finalHeight = baseH;
      finalWidth = (baseH * wRatio) / hRatio;
    }

    finalCanvas.width = finalWidth;
    finalCanvas.height = finalHeight;
    const fCtx = finalCanvas.getContext('2d');
    
    if (fCtx) {
      fCtx.save();
      fCtx.translate(finalWidth / 2, finalHeight / 2);
      fCtx.rotate((params.rotation * Math.PI) / 180);
      
      // Draw the original image with its processed filters
      fCtx.drawImage(
        canvas,
        -canvas.width / 2,
        -canvas.height / 2
      );
      fCtx.restore();
      
      onSave(finalCanvas.toDataURL('image/png'));
    }
  };

  const [isDragging, setIsDragging] = useState(false);
  const dragStartParams = useRef<EditorParams | null>(null);

  const handleSliderStart = () => {
    setIsDragging(true);
    dragStartParams.current = { ...params };
  };

  const handleSliderEnd = () => {
    setIsDragging(false);
    if (dragStartParams.current) {
      const hasChanged = JSON.stringify(dragStartParams.current) !== JSON.stringify(params);
      if (hasChanged) {
        setHistory((prev) => [...prev, dragStartParams.current!]);
        setFuture([]);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 md:p-8">
      <div className="glass-panel w-full max-w-6xl h-full max-h-[95vh] rounded-3xl overflow-hidden flex flex-col border border-white/10 shadow-2xl">
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-6">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Cinematic Frame Editor
            </h3>
            <div className="flex items-center gap-2 border-l border-white/10 pl-6">
              <button 
                onClick={undo}
                disabled={history.length === 0}
                className="p-2 rounded-lg hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-slate-300"
                title="Undo (Ctrl+Z)"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </button>
              <button 
                onClick={redo}
                disabled={future.length === 0}
                className="p-2 rounded-lg hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-slate-300"
                title="Redo (Ctrl+Y)"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
                </svg>
              </button>
            </div>
          </div>
          <button onClick={onCancel} className="text-slate-500 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-grow flex flex-col lg:flex-row overflow-hidden">
          <div 
            ref={containerRef}
            className="flex-grow bg-black/60 p-12 flex items-center justify-center overflow-hidden"
            style={{ perspective: '1000px' }}
          >
            <canvas 
              ref={canvasRef} 
              className="max-w-full max-h-full object-contain shadow-[0_20px_50px_rgba(0,0,0,0.8)] rounded-sm"
              style={{ transformStyle: 'preserve-3d', position: 'relative' }}
            />
          </div>

          <div className="w-full lg:w-80 bg-slate-900/90 border-l border-white/5 p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
            <section>
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">3D Transformation</h4>
                <button onClick={resetTransforms} className="text-[9px] text-blue-400 font-bold uppercase hover:text-blue-300">Reset View</button>
              </div>
              <div className="space-y-4">
                <button 
                  onClick={handleRotateZ}
                  className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl border border-white/5 flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Rotate 90° (Z-Axis)
                </button>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <span>Tilt X (Pitch)</span>
                    <span className="text-blue-400">{params.rotateX}°</span>
                  </div>
                  <input 
                    type="range" min="-60" max="60" value={params.rotateX} 
                    onMouseDown={handleSliderStart}
                    onMouseUp={handleSliderEnd}
                    onTouchStart={handleSliderStart}
                    onTouchEnd={handleSliderEnd}
                    onChange={(e) => updateParams({ rotateX: parseInt(e.target.value) })}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <span>Tilt Y (Yaw)</span>
                    <span className="text-blue-400">{params.rotateY}°</span>
                  </div>
                  <input 
                    type="range" min="-60" max="60" value={params.rotateY} 
                    onMouseDown={handleSliderStart}
                    onMouseUp={handleSliderEnd}
                    onTouchStart={handleSliderStart}
                    onTouchEnd={handleSliderEnd}
                    onChange={(e) => updateParams({ rotateY: parseInt(e.target.value) })}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <span>3D Depth (Perspective)</span>
                    <span className="text-blue-400">{params.perspective}px</span>
                  </div>
                  <input 
                    type="range" min="500" max="2500" value={params.perspective} 
                    onMouseDown={handleSliderStart}
                    onMouseUp={handleSliderEnd}
                    onTouchStart={handleSliderStart}
                    onTouchEnd={handleSliderEnd}
                    onChange={(e) => updateParams({ perspective: parseInt(e.target.value) })}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
              </div>
            </section>

            <section>
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Color Correction</h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <span>Brightness</span>
                    <span className="text-slate-400">{params.brightness}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="200" value={params.brightness} 
                    onMouseDown={handleSliderStart}
                    onMouseUp={handleSliderEnd}
                    onTouchStart={handleSliderStart}
                    onTouchEnd={handleSliderEnd}
                    onChange={(e) => updateParams({ brightness: parseInt(e.target.value) })}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <span>Contrast</span>
                    <span className="text-slate-400">{params.contrast}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="200" value={params.contrast} 
                    onMouseDown={handleSliderStart}
                    onMouseUp={handleSliderEnd}
                    onTouchStart={handleSliderStart}
                    onTouchEnd={handleSliderEnd}
                    onChange={(e) => updateParams({ contrast: parseInt(e.target.value) })}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <span>Saturation</span>
                    <span className="text-slate-400">{params.saturation}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="200" value={params.saturation} 
                    onMouseDown={handleSliderStart}
                    onMouseUp={handleSliderEnd}
                    onTouchStart={handleSliderStart}
                    onTouchEnd={handleSliderEnd}
                    onChange={(e) => updateParams({ saturation: parseInt(e.target.value) })}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <span>Hue Tint</span>
                    <span className="text-slate-400">{params.hue}°</span>
                  </div>
                  <input 
                    type="range" min="0" max="360" value={params.hue} 
                    onMouseDown={handleSliderStart}
                    onMouseUp={handleSliderEnd}
                    onTouchStart={handleSliderStart}
                    onTouchEnd={handleSliderEnd}
                    onChange={(e) => updateParams({ hue: parseInt(e.target.value) })}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>
              </div>
            </section>

            <section>
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Special Effects</h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <span>Camera Shake</span>
                    <span className="text-red-400 font-mono">{params.cameraShake}</span>
                  </div>
                  <input 
                    type="range" min="0" max="100" value={params.cameraShake} 
                    onMouseDown={handleSliderStart}
                    onMouseUp={handleSliderEnd}
                    onTouchStart={handleSliderStart}
                    onTouchEnd={handleSliderEnd}
                    onChange={(e) => updateParams({ cameraShake: parseInt(e.target.value) })}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-500"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <span>Vignette</span>
                    <span className="text-slate-400">{Math.abs(params.vignette)}%</span>
                  </div>
                  <input 
                    type="range" min="-100" max="100" value={params.vignette} 
                    onMouseDown={handleSliderStart}
                    onMouseUp={handleSliderEnd}
                    onTouchStart={handleSliderStart}
                    onTouchEnd={handleSliderEnd}
                    onChange={(e) => updateParams({ vignette: parseInt(e.target.value) })}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-slate-400"
                  />
                </div>
                
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Grayscale</span>
                    <button
                      onClick={() => updateParams({ grayscale: !params.grayscale }, true)}
                      className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${params.grayscale ? 'bg-blue-600' : 'bg-slate-800'}`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${params.grayscale ? 'translate-x-5.5' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Sepia Tone</span>
                    <button
                      onClick={() => updateParams({ sepia: !params.sepia }, true)}
                      className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${params.sepia ? 'bg-amber-600' : 'bg-slate-800'}`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${params.sepia ? 'translate-x-5.5' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <div className="mt-auto pt-6 border-t border-white/5 flex gap-3">
              <button 
                onClick={onCancel}
                className="flex-grow py-3 px-4 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl border border-white/5 transition-all text-slate-300"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className="flex-grow py-3 px-4 bg-blue-600 hover:bg-blue-500 text-xs font-bold rounded-xl shadow-lg shadow-blue-900/40 transition-all text-white"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
