import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Layers, 
  Grid, 
  Download, 
  FileJson, 
  MousePointer2, 
  Eraser, 
  Trees, 
  Home, 
  Mountain, 
  Waves,
  Wind,
  Plus,
  Minus,
  RotateCcw,
  Settings,
  Eye,
  EyeOff,
  Upload,
  Trash2,
  Palette,
  Map as MapIcon,
  Undo,
  Save,
  Library,
  ChevronUp,
  ChevronDown,
  Book,
  Square,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Copy,
  Sun,
  Moon,
  Lightbulb
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LayerType, Layer, MapData, EditorConfig, TileData, AppView, TileLibrary, LightSource } from './types';

// --- Pixel Editor Component ---

interface PixelEditorProps {
  onExport: (url: string) => void;
  onExportWithFrames: (url: string, frameCount: number) => void;
}

function PixelEditor({ onExport, onExportWithFrames }: PixelEditorProps) {
  const [gridSize, setGridSize] = useState(32);
  const [zoom, setZoom] = useState(12);
  const [color, setColor] = useState('#ffffff');
  const [palette, setPalette] = useState<string[]>(['#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff']);
  const [pixels, setPixels] = useState<Record<string, string>>({});
  const [frames, setFrames] = useState<Record<string, string>[]>([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [onionSkin, setOnionSkin] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fps, setFps] = useState(8);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'brush' | 'eraser' | 'fill'>('brush');
  const [mirrorX, setMirrorX] = useState(false);
  const [mirrorY, setMirrorY] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const getPixelKey = (x: number, y: number) => `${x},${y}`;

  const floodFill = (startX: number, startY: number, targetColor: string | undefined, replacementColor: string) => {
    if (targetColor === replacementColor) return;
    
    const stack: [number, number][] = [[startX, startY]];
    const newPixels = { ...pixels };

    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const key = getPixelKey(x, y);
      
      if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) continue;
      if (newPixels[key] !== targetColor) continue;

      newPixels[key] = replacementColor;
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    setPixels(newPixels);
  };

  const drawPixel = (x: number, y: number, forceEraser = false) => {
    const isEraser = tool === 'eraser' || forceEraser;

    if (tool === 'fill' && !forceEraser) {
      floodFill(x, y, pixels[getPixelKey(x, y)], color);
      return;
    }

    const setPixelInObj = (obj: Record<string, string>, px: number, py: number) => {
      const key = getPixelKey(px, py);
      if (isEraser) delete obj[key];
      else obj[key] = color;
    };

    setPixels(prev => {
      const next = { ...prev };
      
      // Original
      setPixelInObj(next, x, y);
      
      // Mirror X (Horizontal symmetry across vertical axis)
      if (mirrorX) {
        setPixelInObj(next, gridSize - 1 - x, y);
      }
      
      // Mirror Y (Vertical symmetry across horizontal axis)
      if (mirrorY) {
        setPixelInObj(next, x, gridSize - 1 - y);
        if (mirrorX) {
          setPixelInObj(next, gridSize - 1 - x, gridSize - 1 - y);
        }
      }
      
      return next;
    });
  };

  const handleCanvasAction = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing && e.type !== 'click') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const x = Math.floor((clientX - rect.left) / zoom);
    const y = Math.floor((clientY - rect.top) / zoom);

    if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
      const isRightClick = (e as any).button === 2 || (e as any).ctrlKey;
      drawPixel(x, y, isRightClick);
    }
  };

  const addColorToPalette = () => {
    if (!palette.includes(color)) {
      setPalette(prev => [...prev, color]);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw Onion Skin (Previous Frame)
    if (onionSkin && currentFrameIndex > 0 && frames[currentFrameIndex - 1]) {
      ctx.globalAlpha = 0.3;
      Object.entries(frames[currentFrameIndex - 1]).forEach(([key, pColor]) => {
        const [x, y] = key.split(',').map(Number);
        ctx.fillStyle = pColor;
        ctx.fillRect(x, y, 1, 1);
      });
      ctx.globalAlpha = 1.0;
    }

    // Draw pixels
    Object.entries(pixels).forEach(([key, pColor]) => {
      const [x, y] = key.split(',').map(Number);
      ctx.fillStyle = pColor;
      ctx.fillRect(x, y, 1, 1);
    });
  }, [pixels, gridSize, onionSkin, currentFrameIndex, frames]);

  // Animation Playback
  useEffect(() => {
    if (!isPlaying || frames.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentFrameIndex(prev => (prev + 1) % frames.length);
      setPixels(frames[(currentFrameIndex + 1) % frames.length] || {});
    }, 1000 / fps);

    return () => clearInterval(interval);
  }, [isPlaying, frames, fps, currentFrameIndex]);

  const addFrame = () => {
    const newFrames = [...frames];
    newFrames[currentFrameIndex] = { ...pixels };
    setFrames([...newFrames, {}]);
    setCurrentFrameIndex(newFrames.length);
    setPixels({});
  };

  const selectFrame = (index: number) => {
    // Save current pixels to current frame before switching
    const newFrames = [...frames];
    newFrames[currentFrameIndex] = { ...pixels };
    setFrames(newFrames);
    
    setCurrentFrameIndex(index);
    setPixels(newFrames[index] || {});
  };

  const deleteFrame = (index: number) => {
    if (frames.length <= 1) {
      setFrames([]);
      setPixels({});
      setCurrentFrameIndex(0);
      return;
    }
    const newFrames = frames.filter((_, i) => i !== index);
    setFrames(newFrames);
    const nextIndex = Math.min(currentFrameIndex, newFrames.length - 1);
    setCurrentFrameIndex(nextIndex);
    setPixels(newFrames[nextIndex] || {});
  };

  const duplicateFrame = (index: number) => {
    const newFrames = [...frames];
    newFrames.splice(index + 1, 0, { ...frames[index] });
    setFrames(newFrames);
    setCurrentFrameIndex(index + 1);
    setPixels(newFrames[index + 1]);
  };

  const exportToPalette = () => {
    const canvas = document.createElement('canvas');
    // If multiple frames, export as a horizontal strip (spritesheet)
    const frameCount = Math.max(1, frames.length);
    canvas.width = gridSize * frameCount;
    canvas.height = gridSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const allFrames = frames.length > 0 ? frames : [pixels];
    
    allFrames.forEach((frame, fIdx) => {
      Object.entries(frame).forEach(([key, pColor]: [string, string]) => {
        const [x, y] = key.split(',').map(Number);
        ctx.fillStyle = pColor;
        ctx.fillRect(x + (fIdx * gridSize), y, 1, 1);
      });
    });

    if (frames.length > 1) {
      onExportWithFrames(canvas.toDataURL(), frames.length);
    } else {
      onExport(canvas.toDataURL());
    }
  };

  const downloadPNG = () => {
    const canvas = document.createElement('canvas');
    canvas.width = gridSize;
    canvas.height = gridSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    Object.entries(pixels).forEach(([key, pColor]: [string, string]) => {
      const [x, y] = key.split(',').map(Number);
      ctx.fillStyle = pColor;
      ctx.fillRect(x, y, 1, 1);
    });

    const a = document.createElement('a');
    a.download = `sprite_${gridSize}x${gridSize}.png`;
    a.href = canvas.toDataURL();
    a.click();
  };

  const importPNG = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const newPixels: Record<string, string> = {};
        
        // Auto-adjust grid size if needed
        if ([16, 32, 48, 64].includes(img.width)) {
          setGridSize(img.width);
        }

        for (let i = 0; i < imageData.data.length; i += 4) {
          const r = imageData.data[i];
          const g = imageData.data[i + 1];
          const b = imageData.data[i + 2];
          const a = imageData.data[i + 3];
          if (a > 0) {
            const x = (i / 4) % img.width;
            const y = Math.floor((i / 4) / img.width);
            const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
            newPixels[`${x},${y}`] = hex;
          }
        }
        setPixels(newPixels);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left Sidebar: Tools */}
      <div className="w-64 bg-sidebar-bg border-r border-border p-4 flex flex-col gap-6 overflow-y-auto">
        <section>
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Herramientas</h3>
          <div className="grid grid-cols-3 gap-1">
            <button onClick={() => setTool('brush')} className={`p-2 rounded flex items-center justify-center transition-colors ${tool === 'brush' ? 'bg-accent text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`} title="Pincel"><MousePointer2 size={16} /></button>
            <button onClick={() => setTool('eraser')} className={`p-2 rounded flex items-center justify-center transition-colors ${tool === 'eraser' ? 'bg-accent text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`} title="Borrador"><Eraser size={16} /></button>
            <button onClick={() => setTool('fill')} className={`p-2 rounded flex items-center justify-center transition-colors ${tool === 'fill' ? 'bg-accent text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`} title="Relleno"><Waves size={16} /></button>
          </div>
        </section>

        <section>
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Simetría</h3>
          <div className="grid grid-cols-2 gap-1">
            <button 
              onClick={() => setMirrorX(!mirrorX)} 
              className={`p-2 rounded flex items-center justify-center gap-2 transition-colors ${mirrorX ? 'bg-accent text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
              title="Simetría Horizontal (Eje Y)"
            >
              <FlipHorizontal size={14} /> <span className="text-[8px] font-bold uppercase">Eje Y</span>
            </button>
            <button 
              onClick={() => setMirrorY(!mirrorY)} 
              className={`p-2 rounded flex items-center justify-center gap-2 transition-colors ${mirrorY ? 'bg-accent text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
              title="Simetría Vertical (Eje X)"
            >
              <FlipVertical size={14} /> <span className="text-[8px] font-bold uppercase">Eje X</span>
            </button>
          </div>
        </section>

        <section>
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Configuración</h3>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] text-gray-400">Tamaño del Lienzo</label>
              <select 
                value={gridSize} 
                onChange={(e) => { setGridSize(Number(e.target.value)); setPixels({}); }}
                className="w-full bg-gray-900 border border-border rounded p-2 text-xs"
              >
                <option value={16}>16x16</option>
                <option value={32}>32x32</option>
                <option value={48}>48x48</option>
                <option value={64}>64x64</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-gray-400">Zoom ({zoom}x)</label>
              <input 
                type="range" min="4" max="32" value={zoom} 
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-accent"
              />
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Color</h3>
            <button onClick={addColorToPalette} className="text-accent hover:text-accent-hover transition-colors" title="Guardar color"><Plus size={14} /></button>
          </div>
          <input 
            type="color" value={color} 
            onChange={(e) => setColor(e.target.value)}
            className="w-full h-10 bg-transparent border-none cursor-pointer mb-2"
          />
          <div className="grid grid-cols-4 gap-1">
            {palette.map((c, i) => (
              <div key={`${c}-${i}`} className="relative group">
                <button 
                  onClick={() => setColor(c)}
                  className={`w-full aspect-square rounded-sm border ${color === c ? 'border-accent scale-110 z-10' : 'border-white/10'}`}
                  style={{ backgroundColor: c }}
                />
                <button 
                  onClick={(e) => { e.stopPropagation(); setPalette(prev => prev.filter((_, idx) => idx !== i)); }}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                >
                  <Trash2 size={8} />
                </button>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-auto pt-4 space-y-2">
          <button onClick={() => setPixels({})} className="w-full p-2 bg-gray-800 hover:bg-red-900/30 text-xs rounded transition-colors flex items-center justify-center gap-2">
            <Trash2 size={14} /> Limpiar
          </button>
          <label className="w-full p-2 bg-gray-800 hover:bg-gray-700 text-xs rounded transition-colors flex items-center justify-center gap-2 cursor-pointer">
            <Upload size={14} /> Importar PNG
            <input type="file" accept="image/png" className="hidden" onChange={importPNG} />
          </label>
          <button onClick={downloadPNG} className="w-full p-2 bg-gray-800 hover:bg-gray-700 text-xs rounded transition-colors flex items-center justify-center gap-2">
            <Download size={14} /> Descargar PNG
          </button>
          <button onClick={exportToPalette} className="w-full p-2 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded transition-colors flex items-center justify-center gap-2">
            <Save size={14} /> Añadir a Paleta
          </button>
        </div>
      </div>

      <div className="flex-1 bg-viewport-bg flex items-center justify-center overflow-auto p-10">
        <div 
          className="relative shadow-2xl bg-black/20"
          style={{ 
            width: gridSize * zoom, 
            height: gridSize * zoom,
            backgroundImage: `linear-gradient(45deg, #1a1a1a 25%, transparent 25%), linear-gradient(-45deg, #1a1a1a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1a1a1a 75%), linear-gradient(-45deg, transparent 75%, #1a1a1a 75%)`,
            backgroundSize: `${zoom * 2}px ${zoom * 2}px`,
            backgroundPosition: `0 0, 0 ${zoom}px, ${zoom}px -${zoom}px, -${zoom}px 0px`
          }}
          onMouseDown={() => setIsDrawing(true)}
          onMouseUp={() => setIsDrawing(false)}
          onMouseLeave={() => setIsDrawing(false)}
          onMouseMove={handleCanvasAction}
          onClick={handleCanvasAction}
          onContextMenu={(e) => e.preventDefault()}
        >
          <canvas 
            ref={canvasRef} 
            width={gridSize} 
            height={gridSize} 
            className="w-full h-full image-render-pixel"
            style={{ imageRendering: 'pixelated' }}
          />
          
          {/* Grid Overlay */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{ 
              backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)`,
              backgroundSize: `${zoom}px ${zoom}px`
            }}
          />

          {/* Mirror Guides */}
          {mirrorX && (
            <div 
              className="absolute inset-y-0 border-l border-accent/50 z-10 pointer-events-none"
              style={{ left: (gridSize / 2) * zoom }}
            />
          )}
          {mirrorY && (
            <div 
              className="absolute inset-x-0 border-t border-accent/50 z-10 pointer-events-none"
              style={{ top: (gridSize / 2) * zoom }}
            />
          )}

          {/* 32x32 Boundary Guide */}
          {gridSize > 32 && (
            <div 
              className="absolute pointer-events-none border border-accent/50 border-dashed"
              style={{
                left: ((gridSize - 32) / 2) * zoom,
                top: ((gridSize - 32) / 2) * zoom,
                width: 32 * zoom,
                height: 32 * zoom
              }}
            >
              <span className="absolute -top-5 left-0 text-[8px] text-accent font-bold uppercase">Área 32x32 (Centro)</span>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar: Animation Frames */}
      <div className="w-64 bg-sidebar-bg border-l border-border p-4 flex flex-col gap-4 overflow-y-auto">
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Animación</h3>
            <div className="flex gap-1">
              <button 
                onClick={() => setOnionSkin(!onionSkin)}
                className={`p-1 rounded transition-colors ${onionSkin ? 'text-accent bg-accent/10' : 'text-gray-500 hover:bg-gray-800'}`}
                title="Onion Skin (Papel Cebolla)"
              >
                <Copy size={14} />
              </button>
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className={`p-1 rounded transition-colors ${isPlaying ? 'text-red-500 bg-red-500/10' : 'text-green-500 hover:bg-green-500/10'}`}
                title={isPlaying ? "Detener" : "Reproducir"}
              >
                {isPlaying ? <Square size={14} fill="currentColor" /> : <RotateCw size={14} />}
              </button>
            </div>
          </div>
          
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-gray-400">Velocidad ({fps} FPS)</label>
            </div>
            <input 
              type="range" min="1" max="24" value={fps} 
              onChange={(e) => setFps(Number(e.target.value))}
              className="w-full accent-accent"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-gray-400 uppercase font-bold">Fotogramas</span>
              <button 
                onClick={addFrame}
                className="p-1 bg-accent/20 text-accent rounded hover:bg-accent/30 transition-colors"
                title="Añadir Fotograma"
              >
                <Plus size={12} />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
              {(frames.length > 0 ? frames : [pixels]).map((frame, idx) => (
                <div 
                  key={idx}
                  onClick={() => selectFrame(idx)}
                  className={`relative aspect-square rounded border-2 cursor-pointer transition-all group/frame ${currentFrameIndex === idx ? 'border-accent bg-accent/5' : 'border-white/5 bg-black/20 hover:border-white/20'}`}
                >
                  <div className="absolute top-1 left-1 text-[8px] font-bold text-gray-500">{idx + 1}</div>
                  
                  {/* Mini Preview */}
                  <div className="w-full h-full p-1 opacity-80">
                    <div className="w-full h-full relative">
                      {Object.entries(frame).slice(0, 100).map(([key, pColor]) => {
                        const [x, y] = key.split(',').map(Number);
                        return (
                          <div 
                            key={key}
                            className="absolute"
                            style={{
                              left: `${(x / gridSize) * 100}%`,
                              top: `${(y / gridSize) * 100}%`,
                              width: `${100 / gridSize}%`,
                              height: `${100 / gridSize}%`,
                              backgroundColor: pColor
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Frame Actions */}
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-1 opacity-0 group-hover/frame:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => { e.stopPropagation(); duplicateFrame(idx); }}
                      className="p-1 text-blue-400 hover:bg-blue-400/20 rounded"
                      title="Duplicar"
                    >
                      <Copy size={10} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteFrame(idx); }}
                      className="p-1 text-red-400 hover:bg-red-400/20 rounded"
                      title="Eliminar"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

// --- Constants & Helpers ---

const TILE_TYPES: Record<string, { color: string; label: string; category: string; hasShadow?: boolean; defaultImage?: string; priority?: number; sway?: boolean }> = {
  hierba: { color: '#3d6e3d', label: 'Hierba', category: 'Suelo', priority: 0, sway: true },
  tierra: { color: '#5e4433', label: 'Tierra', category: 'Suelo', priority: 0 },
  agua: { color: '#335e8e', label: 'Agua', category: 'Suelo', priority: 0 },
  arbol: { color: '#2d4d2d', label: 'Árbol', category: 'Objetos', priority: 1, hasShadow: true },
};

type TileRole = 'none' | 'center' | 't' | 'b' | 'l' | 'r' | 'tl' | 'tr' | 'bl' | 'br' | 'itl' | 'itr' | 'ibl' | 'ibr';

const TILE_ROLES: Record<TileRole, { label: string, icon: string }> = {
  none: { label: 'Ninguno', icon: '?' },
  center: { label: 'Centro', icon: '■' },
  t: { label: 'Borde Sup', icon: '▔' },
  b: { label: 'Borde Inf', icon: ' ' },
  l: { label: 'Borde Izq', icon: '▏' },
  r: { label: 'Borde Der', icon: '▕' },
  tl: { label: 'Esq Sup Izq', icon: '▛' },
  tr: { label: 'Esq Sup Der', icon: '▜' },
  bl: { label: 'Esq Inf Izq', icon: '▙' },
  br: { label: 'Esq Inf Der', icon: '▟' },
  itl: { label: 'Esq Int Sup Izq', icon: '╝' },
  itr: { label: 'Esq Int Sup Der', icon: '╚' },
  ibl: { label: 'Esq Int Inf Izq', icon: '╗' },
  ibr: { label: 'Esq Int Inf Der', icon: '╔' },
};

// --- Autotiling Logic (LOCKED: DO NOT MODIFY WITHOUT EXPLICIT REQUEST) ---
const getRoleFromMask = (mask: number, variant?: 'rounded' | 'square' | 'inner' | 'outer'): TileRole => {
  const u = mask & 1;
  const l = mask & 2;
  const r = mask & 4;
  const d = mask & 8;
  const tl = mask & 16;
  const tr = mask & 32;
  const bl = mask & 64;
  const br = mask & 128;
  
  if (variant === 'square') return 'center';

  // 1. Explicit Overrides (User Choice via Cycle)
  if (variant === 'inner') {
    if (d && r) return 'itl';
    if (d && l) return 'itr';
    if (u && r) return 'ibl';
    if (u && l) return 'ibr';
    return 'center'; // Fallback if not a corner
  }
  if (variant === 'outer') {
    if (d && r) return 'tl';
    if (d && l) return 'tr';
    if (u && r) return 'bl';
    if (u && l) return 'br';
    return 'center'; // Fallback
  }

  const count = (u ? 1 : 0) + (l ? 1 : 0) + (r ? 1 : 0) + (d ? 1 : 0);

  // 2. Centers (Masses, Junctions, and Straight Lines)
  if (count >= 3) return 'center';
  if ((u && d) || (l && r)) return 'center';

  // 3. Corners (Exactly 2 adjacent neighbors)
  // Normal drawing ALWAYS uses outer corners (convex).
  // Inner corners are only for the explicit 'inner' variant.
  if (d && r && !u && !l) return 'tl';
  if (d && l && !u && !r) return 'tr';
  if (u && r && !d && !l) return 'bl';
  if (u && l && !d && !r) return 'br';

  // 4. Borders / Ends (Exactly 1 neighbor)
  if (d && !u && !l && !r) return 't';
  if (u && !d && !l && !r) return 'b';
  if (r && !u && !d && !l) return 'l';
  if (l && !u && !d && !r) return 'r';

  return 'center';
};

// --- Main Component ---

export default function App() {
  const [view, setView] = useState<AppView>('map');
  const [map, setMap] = useState<MapData | null>(null);

  const calculateMask = (grid: (TileData | null)[][], x: number, y: number, type: string, tileGroups: Record<string, { name: string; tiles: string[]; priority: number }>): number => {
    let mask = 0;
    const rows = grid.length;
    const cols = grid[0].length;

    // Find if this tile belongs to a group OR is a group itself
    const groupId = tileGroups[type] ? type : Object.entries(tileGroups).find(([_, g]) => g.tiles.includes(type))?.[0];
    
    const isCompatible = (otherType: string | undefined) => {
      if (!otherType) return false;
      if (otherType === type) return true;
      
      const otherMetadata = tileMetadata[otherType] || TILE_TYPES[otherType];
      const myMetadata = tileMetadata[type] || TILE_TYPES[type];
      const otherPriority = otherMetadata?.priority ?? 0;
      const myPriority = myMetadata?.priority ?? 0;

      if (groupId) {
        const otherGroupId = tileGroups[otherType] ? otherType : Object.entries(tileGroups).find(([_, g]) => (g as any).tiles.includes(otherType))?.[0];
        if (groupId === otherGroupId) return true;
      }
      
      // CRITICAL: Also consider higher priority tiles as "compatible" for clipping purposes.
      // This prevents lower priority tiles from bleeding into higher priority ones.
      return otherPriority > myPriority;
    };

    // 4 Main Neighbors (Bits 0-3)
    if (y > 0 && isCompatible(grid[y - 1][x]?.type)) mask |= 1;  // Up
    if (x > 0 && isCompatible(grid[y][x - 1]?.type)) mask |= 2;  // Left
    if (x < cols - 1 && isCompatible(grid[y][x + 1]?.type)) mask |= 4; // Right
    if (y < rows - 1 && isCompatible(grid[y + 1][x]?.type)) mask |= 8; // Down

    // 4 Diagonal Neighbors (Bits 4-7) - Only relevant if adjacent sides are grass
    if ((mask & 1) && (mask & 2) && y > 0 && x > 0 && isCompatible(grid[y - 1][x - 1]?.type)) mask |= 16; // Top-Left
    if ((mask & 1) && (mask & 4) && y > 0 && x < cols - 1 && isCompatible(grid[y - 1][x + 1]?.type)) mask |= 32; // Top-Right
    if ((mask & 8) && (mask & 2) && y < rows - 1 && x > 0 && isCompatible(grid[y + 1][x - 1]?.type)) mask |= 64; // Bottom-Left
    if ((mask & 8) && (mask & 4) && y < rows - 1 && x < cols - 1 && isCompatible(grid[y + 1][x + 1]?.type)) mask |= 128; // Bottom-Right

    return mask;
  };
  const [config, setConfig] = useState<EditorConfig>({
    activeLayerId: 'layer_ground',
    selectedTile: '',
    showGrid: true,
    cornerStyle: 'rounded',
    tileSize: 32,
  });
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [animationFrame, setAnimationFrame] = useState(0);
  const [tool, setTool] = useState<'brush' | 'eraser' | 'fill' | 'light'>('brush');
  const [customTiles, setCustomTiles] = useState<Record<string, string>>({});
  const [tileMetadata, setTileMetadata] = useState<Record<string, { priority: number; role?: TileRole; frameCount?: number; hasShadow?: boolean; sway?: boolean; shadowOffsetX?: number; shadowOffsetY?: number; isWall?: boolean }>>({});
  const [tileGroups, setTileGroups] = useState<Record<string, { name: string; tiles: string[]; priority: number }>>({});
  const [selectedLight, setSelectedLight] = useState<string | null>(null);
  const [lightConfig, setLightConfig] = useState({
    radius: 150,
    intensity: 0.8,
    color: '#ffcc00',
    pulse: false
  });
  const [libraries, setLibraries] = useState<TileLibrary[]>(() => {
    const saved = localStorage.getItem('worldgen_libraries');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) { console.error("Error loading libraries", e); }
    }
    return [];
  });
  const [isSavingLib, setIsSavingLib] = useState(false);
  const [newLibName, setNewLibName] = useState('');
  const imageCache = useRef<Record<string, HTMLImageElement>>({});
  const [undoStack, setUndoStack] = useState<string[]>([]);

  // Persistence: Load
  useEffect(() => {
    const savedTiles = localStorage.getItem('worldgen_custom_tiles');
    if (savedTiles) {
      try {
        const parsed = JSON.parse(savedTiles);
        if (parsed && typeof parsed === 'object') setCustomTiles(parsed);
      } catch (e) { console.error("Error loading tiles", e); }
    }

    const savedMetadata = localStorage.getItem('worldgen_tile_metadata');
    if (savedMetadata) {
      try {
        const parsed = JSON.parse(savedMetadata);
        if (parsed && typeof parsed === 'object') setTileMetadata(parsed);
      } catch (e) { console.error("Error loading metadata", e); }
    }

    const savedGroups = localStorage.getItem('worldgen_tile_groups');
    if (savedGroups) {
      try {
        const parsed = JSON.parse(savedGroups);
        if (parsed && typeof parsed === 'object') {
          // Migration: Add priority if missing
          const migrated = Object.fromEntries(
            Object.entries(parsed).map(([id, g]: [string, any]) => [id, { ...g, priority: g.priority ?? 1 }])
          );
          setTileGroups(migrated);
        }
      } catch (e) { console.error("Error loading groups", e); }
    }

    const savedMap = localStorage.getItem('worldgen_current_map');
    if (savedMap) {
      try {
        const parsed = JSON.parse(savedMap);
        if (parsed) {
          // Migration: if layers is an object, convert to array
          if (parsed.layers && !Array.isArray(parsed.layers)) {
            const oldLayers = parsed.layers;
            parsed.layers = [
              { id: 'layer_shadows', name: 'Sombras', type: 'shadows', visible: true, locked: false, data: oldLayers.shadows },
              { id: 'layer_ground', name: 'Suelo', type: 'ground', visible: true, locked: false, data: oldLayers.ground },
              { id: 'layer_objects', name: 'Objetos', type: 'objects', visible: true, locked: false, data: oldLayers.objects },
              { id: 'layer_lighting', name: 'Iluminación', type: 'lighting', visible: true, locked: true, data: Array.from({ length: oldLayers.ground.length }, () => Array(oldLayers.ground[0].length).fill(null)) },
            ];
          }
          setMap(parsed);
          setIsModalOpen(false);
          if (parsed.layers?.[0]) {
            setConfig(prev => ({ ...prev, activeLayerId: parsed.layers[0].id }));
          }
        }
      } catch (e) { console.error("Error loading map", e); }
    }
  }, []);

  // Persistence: Save
  useEffect(() => {
    localStorage.setItem('worldgen_custom_tiles', JSON.stringify(customTiles));
  }, [customTiles]);

  useEffect(() => {
    localStorage.setItem('worldgen_tile_metadata', JSON.stringify(tileMetadata));
  }, [tileMetadata]);

  useEffect(() => {
    localStorage.setItem('worldgen_tile_groups', JSON.stringify(tileGroups));
  }, [tileGroups]);

  useEffect(() => {
    if (map) {
      localStorage.setItem('worldgen_current_map', JSON.stringify(map));
    }
  }, [map]);

  useEffect(() => {
    localStorage.setItem('worldgen_libraries', JSON.stringify(libraries));
  }, [libraries]);

  const saveToLibrary = () => {
    if (!newLibName.trim()) return;
    const newLib: TileLibrary = {
      id: `lib_${Date.now()}`,
      name: newLibName.trim(),
      groups: { ...tileGroups },
      tiles: { ...customTiles },
      metadata: { ...tileMetadata }
    };
    setLibraries(prev => [...prev, newLib]);
    setNewLibName('');
    setIsSavingLib(false);
  };

  const loadLibrary = (lib: TileLibrary) => {
    setCustomTiles(prev => ({ ...prev, ...lib.tiles }));
    setTileMetadata(prev => ({ ...prev, ...lib.metadata }));
    setTileGroups(prev => ({ ...prev, ...lib.groups }));
  };

  const deleteLibrary = (id: string) => {
    setLibraries(prev => prev.filter(l => l.id !== id));
  };

  const getLayerSummary = (layer: Layer) => {
    const types = new Set<string>();
    layer.data.forEach(row => row.forEach(tile => {
      if (tile) types.add(tile.type);
    }));
    return Array.from(types);
  };

  const linkLayerToGroup = (layerId: string, groupId: string) => {
    if (!map) return;
    setMap({
      ...map,
      layers: map.layers.map(l => l.id === layerId ? { ...l, groupId, name: tileGroups[groupId]?.name || l.name } : l)
    });
  };

  const addLayer = (type: LayerType, groupId?: string) => {
    if (!map) return;
    const id = `layer_${Date.now()}`;
    const cols = Math.ceil(map.width / map.tileSize);
    const rows = Math.ceil(map.height / map.tileSize);
    
    let layerName = `Nueva Capa ${map.layers.length + 1}`;
    if (groupId && tileGroups[groupId]) {
      layerName = tileGroups[groupId].name;
    }

    const newLayer: Layer = {
      id,
      name: layerName,
      type,
      visible: true,
      locked: false,
      data: Array.from({ length: rows }, () => Array(cols).fill(null)),
      groupId,
    };
    setMap(prev => prev ? { ...prev, layers: [...prev.layers, newLayer] } : null);
    setConfig(prev => ({ ...prev, activeLayerId: id }));
  };

  const removeLayer = (id: string) => {
    if (!map || map.layers.length <= 1) return;
    setMap(prev => prev ? { ...prev, layers: prev.layers.filter(l => l.id !== id) } : null);
    if (config.activeLayerId === id) {
      const remaining = map.layers.filter(l => l.id !== id);
      setConfig(prev => ({ ...prev, activeLayerId: remaining[remaining.length - 1].id }));
    }
  };

  const moveLayer = (id: string, direction: 'up' | 'down') => {
    if (!map) return;
    const index = map.layers.findIndex(l => l.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === map.layers.length - 1) return;
    if (direction === 'down' && index === 0) return;

    const newLayers = [...map.layers];
    const targetIndex = direction === 'up' ? index + 1 : index - 1;
    [newLayers[index], newLayers[targetIndex]] = [newLayers[targetIndex], newLayers[index]];
    setMap({ ...map, layers: newLayers });
  };

  const toggleLayerVisibility = (id: string) => {
    if (!map) return;
    setMap({
      ...map,
      layers: map.layers.map(l => l.id === id ? { ...l, visible: !l.visible } : l)
    });
  };

  const toggleLayerLock = (id: string) => {
    if (!map) return;
    setMap({
      ...map,
      layers: map.layers.map(l => l.id === id ? { ...l, locked: !l.locked } : l)
    });
  };

  const toggleLayerType = (id: string) => {
    if (!map) return;
    setMap({
      ...map,
      layers: map.layers.map(l => {
        if (l.id === id && l.type !== 'shadows') {
          return { ...l, type: l.type === 'ground' ? 'objects' : 'ground' };
        }
        return l;
      })
    });
  };

  const renameLayer = (id: string, name: string) => {
    if (!map) return;
    setMap({
      ...map,
      layers: map.layers.map(l => l.id === id ? { ...l, name } : l)
    });
  };

  const canvasRefs = {
    ground: useRef<HTMLCanvasElement>(null),
    objects: useRef<HTMLCanvasElement>(null),
    shadows: useRef<HTMLCanvasElement>(null),
    lighting: useRef<HTMLCanvasElement>(null),
    ui: useRef<HTMLCanvasElement>(null),
  };

  // Initialize Map
  const initMap = (width: number, height: number, tileSize: number) => {
    const cols = Math.ceil(width / tileSize);
    const rows = Math.ceil(height / tileSize);
    const createEmptyData = () => Array.from({ length: rows }, () => Array(cols).fill(null));

    const initialLayers: Layer[] = [
      { id: 'layer_shadows', name: 'Sombras (Auto)', type: 'shadows', visible: true, locked: true, data: createEmptyData() },
      { id: 'layer_ground', name: 'Suelo Base', type: 'ground', visible: true, locked: false, data: createEmptyData() },
      { id: 'layer_objects', name: 'Objetos', type: 'objects', visible: true, locked: false, data: createEmptyData() },
      { id: 'layer_lighting', name: 'Iluminación', type: 'lighting', visible: true, locked: true, data: createEmptyData() },
    ];

    setMap({
      width,
      height,
      tileSize,
      layers: initialLayers,
      lights: [],
      ambientLight: { color: '#000033', intensity: 0.2 }
    });
    setConfig(prev => ({ ...prev, activeLayerId: 'layer_ground', tileSize }));
    setIsModalOpen(false);
  };

  const clearMap = () => {
    if (!map) return;
    setMap({
      ...map,
      layers: map.layers.map(layer => ({
        ...layer,
        data: Array.from({ length: layer.data.length }, () => Array(layer.data[0].length).fill(null))
      }))
    });
  };

  // Drawing Logic (LOCKED: DO NOT MODIFY PAINTING/TOGGLE HIERARCHY)
  const handlePaint = useCallback((clientX: number, clientY: number, isClick: boolean = false) => {
    if (!map) return;

    const canvas = canvasRefs.ui.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = Math.floor(((clientX - rect.left) * scaleX) / map.tileSize);
    const y = Math.floor(((clientY - rect.top) * scaleY) / map.tileSize);
    const worldX = (clientX - rect.left) * scaleX;
    const worldY = (clientY - rect.top) * scaleY;

    if (x < 0 || y < 0 || x >= Math.ceil(map.width / map.tileSize) || y >= Math.ceil(map.height / map.tileSize)) return;

    const newMap = { ...map };

    if (tool === 'light') {
      if (isClick) {
        // Check if clicking on an existing light to select it
        const clickedLight = newMap.lights?.find(l => {
          const dist = Math.sqrt(Math.pow(l.x - worldX, 2) + Math.pow(l.y - worldY, 2));
          return dist < 20;
        });

        if (clickedLight) {
          setSelectedLight(clickedLight.id);
          setLightConfig({
            radius: clickedLight.radius,
            intensity: clickedLight.intensity,
            color: clickedLight.color,
            pulse: clickedLight.pulse || false
          });
        } else {
          // Add new light
          const newLight = {
            id: `light_${Date.now()}`,
            x: worldX,
            y: worldY,
            ...lightConfig
          };
          newMap.lights = [...(newMap.lights || []), newLight];
          setSelectedLight(newLight.id);
        }
      } else if (selectedLight) {
        // Move selected light
        newMap.lights = newMap.lights?.map(l => 
          l.id === selectedLight ? { ...l, x: worldX, y: worldY } : l
        );
      }
      setMap(newMap);
      return;
    }
    const activeLayerIndex = newMap.layers.findIndex(l => l.id === config.activeLayerId);
    if (activeLayerIndex === -1) return;
    
    const activeLayer = newMap.layers[activeLayerIndex];
    if (activeLayer.locked || !activeLayer.visible) return;

    if (tool === 'fill') {
      const targetTile = activeLayer.data[y][x];
      const targetType = targetTile?.type || null;
      const targetImg = targetTile?.imageUrl || null;
      const selectedId = config.selectedTile;
      const isGroup = !!tileGroups[selectedId];

      if (!isGroup && targetType === selectedId && targetImg === customTiles[selectedId]) return;

      const stack: [number, number][] = [[x, y]];
      const visited = new Set<string>();

      while (stack.length > 0) {
        const [currX, currY] = stack.pop()!;
        const key = `${currX},${currY}`;
        if (visited.has(key)) continue;
        visited.add(key);

        if (currX < 0 || currX >= activeLayer.data[0].length || currY < 0 || currY >= activeLayer.data.length) continue;
        
        const currentTile = activeLayer.data[currY][currX];
        if ((currentTile?.type || null) !== targetType || (currentTile?.imageUrl || null) !== targetImg) continue;

        let finalType = selectedId;
        let finalImg = customTiles[selectedId];
        if (isGroup) {
          finalType = selectedId;
          finalImg = '';
        }

        activeLayer.data[currY][currX] = { type: finalType, mask: 0, imageUrl: finalImg, variant: config.cornerStyle };
        
        if (activeLayer.type === 'objects') {
          const shadowLayer = newMap.layers.find(l => l.type === 'shadows' && l.visible);
          if (shadowLayer) {
            const tileInfo = TILE_TYPES[finalType] || { hasShadow: false };
            if (tileInfo.hasShadow) {
              shadowLayer.data[currY][currX] = { type: 'shadow', mask: 0 };
            } else {
              shadowLayer.data[currY][currX] = null;
            }
          }
        }

        stack.push([currX + 1, currY], [currX - 1, currY], [currX, currY + 1], [currX, currY - 1]);
      }

      // Recalculate masks for the active layer
      for (let ry = 0; ry < activeLayer.data.length; ry++) {
        for (let rx = 0; rx < activeLayer.data[0].length; rx++) {
          const t = activeLayer.data[ry][rx];
          if (t) t.mask = calculateMask(activeLayer.data, rx, ry, t.type, tileGroups);
        }
      }
    } else if (tool === 'eraser') {
      activeLayer.data[y][x] = null;
      if (activeLayer.type === 'objects') {
        const shadowLayer = newMap.layers.find(l => l.type === 'shadows' && l.visible);
        if (shadowLayer) shadowLayer.data[y][x] = null;
      }
    } else {
      const tileType = config.selectedTile;
      const tileInfo = TILE_TYPES[tileType] || { hasShadow: false };
      
      let finalTileType = tileType;
      let imageUrl = customTiles[tileType];
      
      if (tileGroups[tileType]) {
        finalTileType = tileType;
        imageUrl = '';
      }

      const existing = activeLayer.data[y][x];
      let variant = existing?.variant || config.cornerStyle;

      if (isClick && existing && existing.type === finalTileType) {
        if (!existing.variant || existing.variant === 'rounded') {
          variant = 'square';
        } else if (existing.variant === 'square') {
          variant = 'outer';
        } else if (existing.variant === 'outer') {
          variant = 'inner';
        } else {
          variant = 'rounded';
        }
      } else if (!isClick) {
        variant = config.cornerStyle;
      }

      const updateNeighbors = (tx: number, ty: number) => {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = tx + dx;
            const ny = ty + dy;
            if (ny >= 0 && ny < activeLayer.data.length && nx >= 0 && nx < activeLayer.data[0].length) {
              const t = activeLayer.data[ny][nx];
              if (t) t.mask = calculateMask(activeLayer.data, nx, ny, t.type, tileGroups);
            }
          }
        }
      };
      
      activeLayer.data[y][x] = { type: finalTileType, mask: 0, imageUrl, variant };
      updateNeighbors(x, y);

      // Handle shadows ONLY if it's an object layer
      if (activeLayer.type === 'objects') {
        const shadowLayer = newMap.layers.find(l => l.type === 'shadows' && l.visible);
        if (shadowLayer) {
          if (tileInfo.hasShadow) {
            shadowLayer.data[y][x] = { type: 'shadow', mask: 0 };
          } else {
            shadowLayer.data[y][x] = null;
          }
        }
      }
    }

    setMap({ ...newMap });
  }, [map, config, tool, customTiles, tileGroups, lightConfig, selectedLight]);

  // Image Loading Helper
  const getCachedImage = (url: string): HTMLImageElement | null => {
    if (imageCache.current[url]) return imageCache.current[url];
    const img = new Image();
    img.src = url;
    img.onload = () => {
      imageCache.current[url] = img;
      // Trigger a re-render once image is loaded
      setMap(m => m ? { ...m } : null);
    };
    return null;
  };

  // Global Animation Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame(prev => (prev + 1) % 1000); // Larger loop to prevent snapping
    }, 125); // 8 FPS default
    return () => clearInterval(interval);
  }, []);

  // Render Loop
  useEffect(() => {
    if (!map) return;

    const drawTile = (ctx: CanvasRenderingContext2D, x: number, y: number, tile: TileData, layer: LayerType, drawingPass: 'base' | 'full' = 'full') => {
      const size = map.tileSize;
      const px = x * size;
      const py = y * size;

      if (layer === 'ground' || layer === 'objects') {
        const info = TILE_TYPES[tile.type] || { color: tile.type.includes('custom') ? '#4caf50' : '#333' };
        let imgUrl = tile.imageUrl;
        let frameCount = tile.frameCount || 1;

        // Smart Autotiling for Groups
        const groupId = tileGroups[tile.type] ? tile.type : Object.entries(tileGroups).find(([_, g]) => (g as any).tiles.includes(tile.type))?.[0];
        if (groupId) {
          const group = tileGroups[groupId];
          const role = getRoleFromMask(tile.mask, tile.variant);
          
          const findByRole = (r: TileRole) => group.tiles.filter(tId => (tileMetadata[tId] as any)?.role === r);
          
          let matchingTiles = findByRole(role);
          
          // --- SMART FALLBACK SYSTEM ---
          if (matchingTiles.length === 0) {
            const cornerMap: Record<string, TileRole> = {
              'itl': 'tl', 'tl': 'itl',
              'itr': 'tr', 'tr': 'itr',
              'ibl': 'bl', 'bl': 'ibl',
              'ibr': 'br', 'br': 'ibr'
            };
            
            if (cornerMap[role]) {
              matchingTiles = findByRole(cornerMap[role]);
            }
            
            if (matchingTiles.length === 0 && role !== 'center') {
              matchingTiles = findByRole('center');
            }
            
            if (matchingTiles.length === 0) {
              matchingTiles = group.tiles;
            }
          }
          
          if (matchingTiles.length > 0) {
            const index = (x * 7 + y * 13) % matchingTiles.length;
            const tId = matchingTiles[index];
            imgUrl = customTiles[tId];
            frameCount = tileMetadata[tId]?.frameCount || 1;
          }
        } else if (tileMetadata[tile.type]) {
          frameCount = tileMetadata[tile.type].frameCount || 1;
        }
        
        if (imgUrl) {
          const img = getCachedImage(imgUrl);
          if (img) {
            const frameW = img.width / frameCount;
            const imgH = img.height;
            const currentFrame = animationFrame % frameCount;
            const sourceX = currentFrame * frameW;
            
            if (frameW > size && layer === 'ground') {
              const padX = (frameW - size) / 2;
              const padY = (imgH - size) / 2;

              if (drawingPass === 'base') {
                ctx.drawImage(img, sourceX + padX, padY, size, size, px, py, size, size);
              } else {
                const mask = tile.mask;
                if (!(mask & 1)) {
                  ctx.drawImage(img, sourceX, 0, frameW, padY, px - padX, py - padY, frameW, padY);
                }
                if (!(mask & 8)) {
                  ctx.drawImage(img, sourceX, imgH - padY, frameW, padY, px - padX, py + size, frameW, padY);
                }
                if (!(mask & 2)) {
                  ctx.drawImage(img, sourceX, padY, padX, size, px - padX, py, padX, size);
                }
                if (!(mask & 4)) {
                  ctx.drawImage(img, sourceX + frameW - padX, padY, padX, size, px + size, py, padX, size);
                }
              }
            } else if (drawingPass === 'base' || layer !== 'ground') {
              const offsetX = (frameW - size) / 2;
              const offsetY = (imgH - size) / 2;
              
              const metadata = tileMetadata[tile.type];
              const isSwaying = metadata?.sway || TILE_TYPES[tile.type]?.sway;

              ctx.save();
              if (isSwaying) {
                // WIND SWAY LOGIC
                // We skew the top of the sprite while keeping the base fixed.
                const swayIntensity = 0.08;
                const swaySpeed = 0.08;
                const skew = Math.sin(animationFrame * swaySpeed + (x * 0.5) + (y * 0.3)) * swayIntensity;
                
                const baseY = py - offsetY + imgH;
                ctx.transform(1, 0, skew, 1, -skew * baseY, 0);
              }
              ctx.drawImage(img, sourceX, 0, frameW, imgH, px - offsetX, py - offsetY, frameW, imgH);
              ctx.restore();
            }
          } else if (layer !== 'ground') {
            ctx.save();
            ctx.fillStyle = info.color;
            const metadata = tileMetadata[tile.type] || TILE_TYPES[tile.type];
            if (metadata?.sway) {
              const swayIntensity = 0.2;
              const speed = 0.1;
              const time = animationFrame * speed + (x * 0.5) + (y * 0.3);
              const skew = Math.sin(time) * swayIntensity;
              ctx.translate(px + size / 2, py + size - 2);
              ctx.transform(1, 0, skew, 1, 0, 0);
              const colors = ['#2d4d2d', info.color, '#5a8a5a'];
              const offsets = [-8, -4, 0, 4, 8];
              const heights = [0.7, 0.9, 0.8, 1.0, 0.6];
              offsets.forEach((off, i) => {
                const h = heights[i] * size * 0.75;
                const curveOff = Math.cos(time + i) * 5;
                ctx.beginPath();
                ctx.moveTo(off, 0);
                ctx.bezierCurveTo(off + curveOff, -h * 0.3, off + curveOff * 2, -h * 0.6, off + curveOff, -h);
                ctx.strokeStyle = colors[i % colors.length];
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                ctx.stroke();
              });
            } else {
              ctx.beginPath(); ctx.arc(px + size / 2, py + size / 2, size * 0.4, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
          }
        } else if (layer !== 'ground') {
          ctx.save();
          ctx.fillStyle = info.color;
          const metadata = tileMetadata[tile.type] || TILE_TYPES[tile.type];
          if (metadata?.sway) {
            const swayIntensity = 0.2;
            const speed = 0.1;
            const time = animationFrame * speed + (x * 0.5) + (y * 0.3);
            const skew = Math.sin(time) * swayIntensity;
            ctx.translate(px + size / 2, py + size - 2);
            ctx.transform(1, 0, skew, 1, 0, 0);
            const colors = ['#2d4d2d', info.color, '#5a8a5a'];
            const offsets = [-8, -4, 0, 4, 8];
            const heights = [0.7, 0.9, 0.8, 1.0, 0.6];
            offsets.forEach((off, i) => {
              const h = heights[i] * size * 0.75;
              const curveOff = Math.cos(time + i) * 5;
              ctx.beginPath();
              ctx.moveTo(off, 0);
              ctx.bezierCurveTo(off + curveOff, -h * 0.3, off + curveOff * 2, -h * 0.6, off + curveOff, -h);
              ctx.strokeStyle = colors[i % colors.length];
              ctx.lineWidth = 2;
              ctx.lineCap = 'round';
              ctx.stroke();
            });
          } else {
            ctx.beginPath(); ctx.arc(px + size / 2, py + size / 2, size * 0.4, 0, Math.PI * 2); ctx.fill();
          }
          ctx.restore();
        }

      } else if (layer === 'shadows') {
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath(); ctx.arc(px + size / 2 + 4, py + size / 2 + 4, size * 0.4, 0, Math.PI * 2); ctx.fill();
      }
    };

    const renderLighting = () => {
      const canvas = canvasRefs.lighting.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const ambient = map.ambientLight || { color: '#000033', intensity: 0.2 };
      
      // 1. Fill with ambient darkness
      ctx.fillStyle = ambient.color;
      ctx.globalAlpha = 1 - ambient.intensity;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1.0;

      // 2. Cut out light sources
      ctx.globalCompositeOperation = 'destination-out';
      
      map.lights?.forEach(light => {
        const pulseScale = light.pulse ? 1 + Math.sin(animationFrame * 0.2) * 0.05 : 1;
        const radius = light.radius * pulseScale;
        
        const gradient = ctx.createRadialGradient(
          light.x, light.y, 0,
          light.x, light.y, radius
        );
        
        gradient.addColorStop(0, `rgba(255, 255, 255, ${light.intensity})`);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(light.x, light.y, radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // 3. Add light color (glow)
      ctx.globalCompositeOperation = 'lighter';
      map.lights?.forEach(light => {
        const pulseScale = light.pulse ? 1 + Math.sin(animationFrame * 0.2) * 0.05 : 1;
        const radius = light.radius * pulseScale;

        const gradient = ctx.createRadialGradient(
          light.x, light.y, 0,
          light.x, light.y, radius
        );
        
        // Convert hex to rgba for the glow
        const r = parseInt(light.color.slice(1, 3), 16);
        const g = parseInt(light.color.slice(3, 5), 16);
        const b = parseInt(light.color.slice(5, 7), 16);
        
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${light.intensity * 0.4})`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(light.x, light.y, radius, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalCompositeOperation = 'source-over';
    };

    // =========================================================================
    // DYNAMIC SHADOW SYSTEM (LOCKED CORE LOGIC)
    // =========================================================================
    // =========================================================
    // [LOCKED CORE: PHASE 1 PARITY] - DYNAMIC SHADOW SYSTEM (LOCKED CORE LOGIC)
    // DO NOT MODIFY CORE PROJECTION MATH.
    // =========================================================
    const drawDynamicShadow = (ctx: CanvasRenderingContext2D, x: number, y: number, tile: TileData, light: LightSource) => {
      const size = map.tileSize;
      
      let imgUrl = tile.imageUrl;
      let frameCount = tile.frameCount || 1;

      let resolvedTileId = tile.type;
      const groupId = tileGroups[tile.type] ? tile.type : Object.entries(tileGroups).find(([_, g]) => (g as any).tiles.includes(tile.type))?.[0];
      if (groupId) {
        const group = tileGroups[groupId];
        const role = getRoleFromMask(tile.mask, tile.variant);
        const matchingTiles = group.tiles.filter(tId => (tileMetadata[tId] as any)?.role === role);
        if (matchingTiles.length > 0) {
          const index = (x * 7 + y * 13) % matchingTiles.length;
          const tId = matchingTiles[index];
          resolvedTileId = tId;
          imgUrl = customTiles[tId];
          frameCount = tileMetadata[tId]?.frameCount || 1;
        } else if (group.tiles.length > 0) {
          resolvedTileId = group.tiles[0];
          imgUrl = customTiles[resolvedTileId];
          frameCount = tileMetadata[resolvedTileId]?.frameCount || 1;
        }
      } else {
        imgUrl = imgUrl || customTiles[tile.type];
        frameCount = tile.frameCount || tileMetadata[tile.type]?.frameCount || 1;
      }

      if (!imgUrl) return;
      const img = getCachedImage(imgUrl);
      if (!img) return;

      const frameW = img.width / frameCount;
      const imgH = img.height;
      const currentFrame = animationFrame % frameCount;
      const sourceX = currentFrame * frameW;

      const offsetX = (frameW - size) / 2;
      const offsetY = (imgH - size) / 2;

      const metaOffX = tileMetadata[resolvedTileId]?.shadowOffsetX || 0;
      const metaOffY = tileMetadata[resolvedTileId]?.shadowOffsetY || 0;

      // Anchor point: the base center of the sprite
      const anchorX = x * size + size / 2 + metaOffX;
      const anchorY = y * size - offsetY + imgH + metaOffY;

      const dx = anchorX - light.x;
      const dy = anchorY - light.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > light.radius * 2.0) return;

      const angle = Math.atan2(dy, dx);
      
      ctx.save();
      
      const falloff = Math.max(0, 1 - dist / (light.radius * 2.0));
      const opacity = falloff * light.intensity * 0.55; 
      
      ctx.globalAlpha = opacity;
      
      // Much more diffused/blurred for a softer look
      const blurAmount = Math.max(4, dist / 15);
      ctx.filter = `brightness(0) blur(${blurAmount}px)`;

      // PIIVOT AT THE BASE
      ctx.translate(anchorX, anchorY);
      ctx.rotate(angle);
      
      // Shadow Projection
      const stretch = 1 + dist / 350;
      ctx.scale(stretch, 0.6); 
      
      // APPLY SWAY TO SHADOW TOO
      const metadata = tileMetadata[tile.type];
      const isSwaying = metadata?.sway || TILE_TYPES[tile.type]?.sway;
      if (isSwaying) {
        const swayIntensity = 0.12;
        const swaySpeed = 0.08;
        const skew = Math.sin(animationFrame * swaySpeed + (x * 0.5) + (y * 0.3)) * swayIntensity;
        ctx.transform(1, skew * 2, 0, 1, 0, 0); // Skew the shadow projection
      }
      
      // Rotate 90deg so Sprite Base (bottom) maps to origin and Top maps to positive X (away)
      ctx.rotate(Math.PI / 2);
      
      // Draw centered horizontally and correctly aligned vertically at the base
      ctx.drawImage(img, sourceX, 0, frameW, imgH, -frameW / 2, -imgH, frameW, imgH);
      
      ctx.restore();
    };

    const renderLayer = (layer: Layer) => {
      const canvas = canvasRefs[layer.type as keyof typeof canvasRefs]?.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const size = map.tileSize;
      
      if (layer.type === 'ground') {
        // Pass 1: Draw ALL tile centers
        layer.data.forEach((row, y) => {
          row.forEach((tile, x) => {
            if (tile) {
              drawTile(ctx, x, y, tile, layer.type, 'base');
            }
          });
        });

        // Pass 2: Draw ALL overflows sorted by priority
        const tilesToDraw: {x: number, y: number, tile: TileData, priority: number}[] = [];
        layer.data.forEach((row, y) => {
          row.forEach((tile, x) => {
            if (tile) {
              const groupId = Object.entries(tileGroups).find(([_, g]) => (g as any).tiles.includes(tile.type))?.[0];
              const groupPriority = groupId ? (tileGroups[groupId] as any).priority : null;
              const priority = groupPriority ?? tileMetadata[tile.type]?.priority ?? TILE_TYPES[tile.type]?.priority ?? 1;
              tilesToDraw.push({ x, y, tile, priority });
            }
          });
        });

        tilesToDraw.sort((a, b) => a.priority - b.priority);
        tilesToDraw.forEach(t => {
          drawTile(ctx, t.x, t.y, t.tile, layer.type, 'full');
        });
      } else if (layer.type === 'shadows') {
        // Dynamic Shadows based on all visible layers (except utility layers)
        const castLayers = map.layers.filter(l => l.type !== 'shadows' && l.type !== 'lighting' && l.visible);
        
        // DEBUG: Draw a small indicator if the layer is rendering (optional, but good for testing)
        // ctx.fillStyle = 'rgba(255, 0, 0, 0.2)'; ctx.fillRect(0, 0, 10, 10);

        castLayers.forEach(castLayer => {
          castLayer.data.forEach((row, y) => {
            row.forEach((tile, x) => {
              if (tile) {
                const metadata = tileMetadata[tile.type];
                const groupId = tileGroups[tile.type] ? tile.type : Object.entries(tileGroups).find(([_, g]) => (g as any).tiles.includes(tile.type))?.[0];
                
                let hasShadow = metadata?.hasShadow || TILE_TYPES[tile.type]?.hasShadow;
                
                // If it's a group and group shadow isn't explicitly set, check if any tile in group has it
                if (!hasShadow && groupId) {
                  hasShadow = tileGroups[groupId].tiles.some(tId => tileMetadata[tId]?.hasShadow);
                }
                
                if (hasShadow) {
                  const size = map.tileSize;
                  
                  // =========================================================
                  // AMBIENT OCCLUSION / CONTACT SHADOW (LOCKED)
                  // Ensures the object feels "grounded" on the terrain regardless of lights
                  // =========================================================
                  
                  // Resolve the actual image height to find the TRUE base anchor
                  let currentImgUrl = tile.imageUrl;
                  let resolvedTileId = tile.type;
                  const gid = tileGroups[tile.type] ? tile.type : Object.entries(tileGroups).find(([_, g]) => (g as any).tiles.includes(tile.type))?.[0];
                  if (gid) {
                    const group = tileGroups[gid];
                    const role = getRoleFromMask(tile.mask, tile.variant);
                    const matchingTiles = group.tiles.filter(tId => (tileMetadata[tId] as any)?.role === role);
                    if (matchingTiles.length > 0) {
                      const index = (x * 7 + y * 13) % matchingTiles.length;
                      resolvedTileId = matchingTiles[index];
                      currentImgUrl = customTiles[resolvedTileId];
                    } else if (group.tiles.length > 0) {
                      resolvedTileId = group.tiles[0];
                      currentImgUrl = customTiles[resolvedTileId];
                    }
                  } else {
                    currentImgUrl = currentImgUrl || customTiles[tile.type];
                  }

                  let currentImgH = size;
                  if (currentImgUrl) {
                    const img = getCachedImage(currentImgUrl);
                    if (img) currentImgH = img.height;
                  }

                  const metaOffX = tileMetadata[resolvedTileId]?.shadowOffsetX || 0;
                  const metaOffY = tileMetadata[resolvedTileId]?.shadowOffsetY || 0;
                  const offsetY = (currentImgH - size) / 2;
                  const centerX = x * size + size / 2 + metaOffX;
                  const centerY = y * size - offsetY + currentImgH + metaOffY; 

                  // =========================================================
                  // [LOCKED CORE: PHASE 1 PARITY] - CONTACT SHADOW (AO)
                  // Standardized size (3:1 ratio) for consistent "grounding" 
                  // =========================================================
                  // DRAW CONTACT SHADOW (AO)
                  ctx.save();
                  ctx.globalAlpha = 0.65;
                  ctx.filter = 'blur(2px)';
                  ctx.fillStyle = '#000000';
                  ctx.beginPath();
                  // Standardized size for consistent "grounding" across all object types
                  ctx.ellipse(centerX, centerY - 2, size * 0.45, size * 0.15, 0, 0, Math.PI * 2);
                  ctx.fill();
                  ctx.restore();

                  // =========================================================
                  // DYNAMIC PROJECTED SHADOWS
                  // =========================================================
                  const lights = map.lights || [];
                  if (lights.length > 0) {
                    lights.forEach(light => {
                      drawDynamicShadow(ctx, x, y, tile, light);
                    });
                  }
                }
              }
            });
          });
        });
      } else {
        // Objects: Standard single pass
        layer.data.forEach((row, y) => {
          row.forEach((tile, x) => {
            if (tile) drawTile(ctx, x, y, tile, layer.type);
          });
        });
      }
    };

    // Clear all canvases at the start of the render cycle
    Object.values(canvasRefs).forEach(ref => {
      const ctx = ref.current?.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, ref.current!.width, ref.current!.height);
    });

    // Render all layers
    map.layers.forEach(layer => {
      if (layer.visible) renderLayer(layer);
    });

    // Render Lighting
    const lightingLayer = map.layers.find(l => l.type === 'lighting');
    if (lightingLayer?.visible) {
      renderLighting();
    }

    // UI Layer (Grid)
    const uiCanvas = canvasRefs.ui.current;
    if (uiCanvas) {
      const ctx = uiCanvas.getContext('2d');
      if (ctx) {
        if (config.showGrid) {
          ctx.strokeStyle = 'rgba(255,255,255,0.15)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let x = 0; x <= map.width; x += map.tileSize) {
            ctx.moveTo(x, 0); ctx.lineTo(x, map.height);
          }
          for (let y = 0; y <= map.height; y += map.tileSize) {
            ctx.moveTo(0, y); ctx.lineTo(map.width, y);
          }
          ctx.stroke();
        }
      }
    }
  }, [map, config.showGrid, customTiles, animationFrame, tileMetadata, tileGroups]);

  // Catch-all migration for lighting and shadows
  useEffect(() => {
    if (map && (!map.layers.find(l => l.type === 'lighting') || !map.layers.find(l => l.type === 'shadows') || !map.lights || !map.ambientLight)) {
      const cols = Math.ceil(map.width / map.tileSize);
      const rows = Math.ceil(map.height / map.tileSize);
      const emptyData = Array.from({ length: rows }, () => Array(cols).fill(null));
      
      setMap(prev => {
        if (!prev) return null;
        
        let newLayers = [...prev.layers];
        
        // Ensure shadows layer exists at the bottom (index 0)
        if (!newLayers.find(l => l.type === 'shadows')) {
          newLayers.unshift({ id: 'layer_shadows', name: 'Sombras (Auto)', type: 'shadows', visible: true, locked: true, data: emptyData });
        }
        
        // Ensure lighting layer exists at the top
        if (!newLayers.find(l => l.type === 'lighting')) {
          newLayers.push({ id: 'layer_lighting', name: 'Iluminación', type: 'lighting', visible: true, locked: true, data: emptyData });
        }

        return {
          ...prev,
          layers: newLayers,
          lights: prev.lights || [],
          ambientLight: prev.ambientLight || { color: '#000033', intensity: 0.2 }
        };
      });
    }
  }, [map]);

  const transformSprite = (id: string, action: 'rotate' | 'flipH' | 'flipV') => {
    const imgUrl = customTiles[id];
    if (!imgUrl) return;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (action === 'rotate') {
        canvas.width = img.height;
        canvas.height = img.width;
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
      } else if (action === 'flipH') {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(img, 0, 0);
      } else if (action === 'flipV') {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.translate(0, canvas.height);
        ctx.scale(1, -1);
        ctx.drawImage(img, 0, 0);
      }

      const newUrl = canvas.toDataURL();
      setCustomTiles(prev => ({ ...prev, [id]: newUrl }));
      // Clear cache for this URL
      if (imageCache.current[imgUrl]) delete imageCache.current[imgUrl];
    };
    img.src = imgUrl;
  };

  const duplicateSprite = (id: string) => {
    const url = customTiles[id];
    if (!url) return;
    const newId = `custom_${Date.now()}_copy`;
    setCustomTiles(prev => ({ ...prev, [newId]: url }));
    if (tileMetadata[id]) {
      setTileMetadata(prev => ({ ...prev, [newId]: { ...tileMetadata[id] } }));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      const id = `custom_${Date.now()}`;
      setCustomTiles(prev => ({ ...prev, [id]: url }));
      setConfig(prev => ({ ...prev, selectedTile: id }));
    };
    reader.readAsDataURL(file);
  };

  const handleJsonImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        
        // Handle both old format (just map) and new format (full project)
        const mapData = json.map || (json.layers ? json : null);
        
        if (mapData && mapData.layers && mapData.width && mapData.height) {
          setMap(mapData);
          
          // Restore project state if available
          if (json.customTiles) setCustomTiles(json.customTiles);
          if (json.tileMetadata) setTileMetadata(json.tileMetadata);
          if (json.tileGroups) setTileGroups(json.tileGroups);
          
          // Migration for lighting
          if (mapData && !mapData.lights) mapData.lights = [];
          if (mapData && !mapData.ambientLight) mapData.ambientLight = { color: '#000033', intensity: 0.2 };
          
          setIsModalOpen(false);
        } else {
          alert("El archivo JSON no parece ser un mapa o proyecto válido.");
        }
      } catch (err) {
        console.error("Error al cargar el JSON", err);
        alert("Error al procesar el archivo JSON.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex h-screen bg-editor-bg text-gray-200 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-80 bg-sidebar-bg border-r border-border flex flex-col z-10">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <div className="w-8 h-8 bg-accent rounded flex items-center justify-center">
            <Mountain className="text-white w-5 h-5" />
          </div>
          <h1 className="font-bold text-sm tracking-tight text-white uppercase">World Gen v1.2</h1>
        </div>

        {/* View Switcher */}
        <div className="p-2 flex gap-1 bg-black/20 m-4 rounded-lg">
          <button 
            onClick={() => setView('map')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${view === 'map' ? 'bg-accent text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <MapIcon size={14} /> Mapa
          </button>
          <button 
            onClick={() => setView('pixel')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${view === 'pixel' ? 'bg-accent text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Palette size={14} /> Sprite
          </button>
        </div>

        {view === 'map' ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Herramientas</h3>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      if (undoStack.length > 0) {
                        const previous = undoStack[undoStack.length - 1];
                        setUndoStack(prev => prev.slice(0, -1));
                        setMap(JSON.parse(previous));
                      }
                    }}
                    disabled={undoStack.length === 0}
                    className="text-[8px] text-gray-400 hover:text-white disabled:opacity-30 font-bold uppercase tracking-tighter flex items-center gap-1 transition-colors"
                  >
                    <Undo size={10} /> Deshacer
                  </button>
                  <button 
                    onClick={() => setIsModalOpen(true)}
                    className="text-[8px] text-blue-500 hover:text-blue-400 font-bold uppercase tracking-tighter flex items-center gap-1 transition-colors"
                  >
                    <Plus size={10} /> Nuevo Mapa
                  </button>
                  <button 
                    onClick={clearMap}
                    className="text-[8px] text-red-500 hover:text-red-400 font-bold uppercase tracking-tighter flex items-center gap-1 transition-colors"
                  >
                    <Trash2 size={10} /> Limpiar Todo
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1">
                <button onClick={() => setTool('brush')} className={`flex items-center justify-center gap-2 p-2 rounded text-xs transition-colors ${tool === 'brush' ? 'bg-accent text-white' : 'bg-gray-800 hover:bg-gray-700'}`} title="Pincel"><MousePointer2 size={14} /></button>
                <button onClick={() => setTool('eraser')} className={`flex items-center justify-center gap-2 p-2 rounded text-xs transition-colors ${tool === 'eraser' ? 'bg-accent text-white' : 'bg-gray-800 hover:bg-gray-700'}`} title="Borrador"><Eraser size={14} /></button>
                <button onClick={() => setTool('fill')} className={`flex items-center justify-center gap-2 p-2 rounded text-xs transition-colors ${tool === 'fill' ? 'bg-accent text-white' : 'bg-gray-800 hover:bg-gray-700'}`} title="Relleno"><Waves size={14} /></button>
                <button onClick={() => setTool('light')} className={`flex items-center justify-center gap-2 p-2 rounded text-xs transition-colors ${tool === 'light' ? 'bg-accent text-white' : 'bg-gray-800 hover:bg-gray-700'}`} title="Iluminación"><Lightbulb size={14} /></button>
              </div>
            </section>

            {tool === 'light' && map && (
              <section className="bg-black/20 p-3 rounded-lg border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-bold text-accent uppercase tracking-widest">Configuración de Luz</h3>
                  {selectedLight && (
                    <button 
                      onClick={() => {
                        setMap({
                          ...map,
                          lights: map.lights?.filter(l => l.id !== selectedLight)
                        });
                        setSelectedLight(null);
                      }}
                      className="text-red-500 hover:text-red-400"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <label className="text-[10px] text-gray-400 uppercase">Radio</label>
                      <span className="text-[10px] text-accent font-mono">{lightConfig.radius}px</span>
                    </div>
                    <input 
                      type="range" min="50" max="500" value={lightConfig.radius} 
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setLightConfig(prev => ({ ...prev, radius: val }));
                        if (selectedLight) {
                          setMap({
                            ...map,
                            lights: map.lights?.map(l => l.id === selectedLight ? { ...l, radius: val } : l)
                          });
                        }
                      }}
                      className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-accent"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <label className="text-[10px] text-gray-400 uppercase">Intensidad</label>
                      <span className="text-[10px] text-accent font-mono">{Math.round(lightConfig.intensity * 100)}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="1" step="0.1" value={lightConfig.intensity} 
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setLightConfig(prev => ({ ...prev, intensity: val }));
                        if (selectedLight) {
                          setMap({
                            ...map,
                            lights: map.lights?.map(l => l.id === selectedLight ? { ...l, intensity: val } : l)
                          });
                        }
                      }}
                      className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-accent"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-gray-400 uppercase">Color</label>
                    <input 
                      type="color" value={lightConfig.color} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setLightConfig(prev => ({ ...prev, color: val }));
                        if (selectedLight) {
                          setMap({
                            ...map,
                            lights: map.lights?.map(l => l.id === selectedLight ? { ...l, color: val } : l)
                          });
                        }
                      }}
                      className="w-6 h-6 bg-transparent border-none cursor-pointer"
                    />
                  </div>

                  <button 
                    onClick={() => {
                      const val = !lightConfig.pulse;
                      setLightConfig(prev => ({ ...prev, pulse: val }));
                      if (selectedLight) {
                        setMap({
                          ...map,
                          lights: map.lights?.map(l => l.id === selectedLight ? { ...l, pulse: val } : l)
                        });
                      }
                    }}
                    className={`w-full p-2 rounded text-[10px] font-bold transition-colors ${lightConfig.pulse ? 'bg-accent text-white' : 'bg-gray-800 text-gray-400'}`}
                  >
                    EFECTO PULSACIÓN {lightConfig.pulse ? 'ON' : 'OFF'}
                  </button>
                </div>

                <div className="pt-2 border-t border-white/5 space-y-3">
                  <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Luz Ambiental</h3>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <label className="text-[10px] text-gray-400 uppercase">Intensidad</label>
                      <span className="text-[10px] text-accent font-mono">{Math.round((map.ambientLight?.intensity || 0) * 100)}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="1" step="0.05" value={map.ambientLight?.intensity} 
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setMap({
                          ...map,
                          ambientLight: { ...(map.ambientLight || { color: '#000033' }), intensity: val }
                        });
                      }}
                      className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-accent"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-gray-400 uppercase">Tinte</label>
                    <input 
                      type="color" value={map.ambientLight?.color} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setMap({
                          ...map,
                          ambientLight: { ...(map.ambientLight || { intensity: 0.2 }), color: val }
                        });
                      }}
                      className="w-6 h-6 bg-transparent border-none cursor-pointer"
                    />
                  </div>
                </div>
              </section>
            )}

            <section>
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Zoom</h3>
              <div className="flex items-center gap-2 bg-gray-900 p-2 rounded-lg">
                <button 
                  onClick={() => setZoom(prev => Math.max(0.25, prev - 0.25))}
                  className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors"
                >
                  <Minus size={14} />
                </button>
                <div className="flex-1 text-center text-[10px] font-mono text-accent font-bold">
                  {Math.round(zoom * 100)}%
                </div>
                <button 
                  onClick={() => setZoom(prev => Math.min(4, prev + 0.25))}
                  className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors"
                >
                  <Plus size={14} />
                </button>
                <button 
                  onClick={() => setZoom(1)}
                  className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors border-l border-gray-800 ml-1"
                  title="Reset Zoom"
                >
                  <RotateCcw size={12} />
                </button>
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Capas (Photoshop Style)</h3>
                <div className="flex gap-1">
                  <button 
                    onClick={() => addLayer('ground')}
                    className="p-1 hover:bg-accent/20 rounded-md text-accent transition-all active:scale-90" 
                    title="Añadir Capa de Suelo"
                  >
                    <Plus size={14} />
                  </button>
                  <button 
                    onClick={() => addLayer('objects')}
                    className="p-1 hover:bg-accent/20 rounded-md text-orange-400 transition-all active:scale-90" 
                    title="Añadir Capa de Objetos"
                  >
                    <Trees size={14} />
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                {map?.layers.slice().reverse().map((layer, idx) => {
                  const realIdx = map.layers.length - 1 - idx;
                  return (
                    <div 
                      key={layer.id} 
                      className={`group flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer ${config.activeLayerId === layer.id ? 'bg-accent/10 border-accent' : 'bg-gray-900/50 border-transparent hover:border-white/10'}`}
                      onClick={() => setConfig({ ...config, activeLayerId: layer.id })}
                    >
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleLayerVisibility(layer.id); }}
                        className={`p-1 rounded hover:bg-white/10 ${layer.visible ? 'text-gray-300' : 'text-gray-600'}`}
                      >
                        {layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <input 
                          type="text"
                          value={layer.name}
                          onChange={(e) => renameLayer(layer.id, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-transparent border-none text-[10px] font-medium text-gray-200 focus:outline-none focus:ring-0 w-full truncate p-0"
                        />
                        <div className="text-[8px] text-gray-500 uppercase flex flex-wrap gap-x-2 gap-y-0.5">
                          {layer.type === 'shadows' ? (
                            <span>Sombras</span>
                          ) : (
                            <button 
                              onClick={(e) => { e.stopPropagation(); toggleLayerType(layer.id); }}
                              className={`hover:text-accent transition-colors flex items-center gap-1 ${layer.type === 'objects' ? 'text-orange-400' : 'text-blue-400'}`}
                              title="Cambiar tipo de capa (Suelo / Objeto)"
                            >
                              {layer.type === 'ground' ? <Waves size={8} /> : <Trees size={8} />}
                              {layer.type === 'ground' ? 'Suelo' : 'Objeto'}
                            </button>
                          )}
                          {layer.locked && <span className="text-red-400">Bloqueada</span>}
                        </div>
                        {/* Content Tiles Preview */}
                        <div className="flex gap-0.5 mt-1">
                          {getLayerSummary(layer).slice(0, 5).map((tId, i) => (
                            <div 
                              key={i} 
                              className="w-2 h-2 rounded-sm border border-white/10" 
                              style={{ backgroundColor: TILE_TYPES[tId]?.color || '#333' }}
                            />
                          ))}
                          {getLayerSummary(layer).length > 5 && (
                            <span className="text-[6px] text-gray-600">+{getLayerSummary(layer).length - 5}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, 'up'); }}
                          className="p-1 hover:bg-white/10 rounded text-gray-400 disabled:opacity-20"
                          disabled={realIdx === map.layers.length - 1}
                          title="Mover Arriba"
                        >
                          <ChevronUp size={12} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, 'down'); }}
                          className="p-1 hover:bg-white/10 rounded text-gray-400 disabled:opacity-20"
                          disabled={realIdx === 0}
                          title="Mover Abajo"
                        >
                          <ChevronDown size={12} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeLayer(layer.id); }}
                          className="p-1 hover:bg-red-500/10 rounded text-red-500"
                          title="Eliminar Capa"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Paleta</h3>
                <label className="p-1 hover:bg-accent/20 rounded-md cursor-pointer hover:text-accent transition-all active:scale-90">
                  <Upload size={16} />
                  <input type="file" accept="image/png" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(TILE_TYPES).map(([id, info]) => (
                  <button key={id} onClick={() => setConfig({ ...config, selectedTile: id })} className={`aspect-square rounded border-2 transition-all flex items-center justify-center ${config.selectedTile === id ? 'border-accent scale-105 shadow-lg shadow-accent/20' : 'border-transparent hover:border-gray-600'}`} style={{ backgroundColor: info.color }}>
                    {id === 'grass' && <Trees size={16} className="text-white/30" />}
                    {id === 'water' && <Waves size={16} className="text-white/30" />}
                    {id === 'house' && <Home size={16} className="text-white/30" />}
                  </button>
                ))}
                
                {/* Custom Tiles */}
                {Object.entries(customTiles).map(([id, url]) => (
                  <div key={id} className="relative group">
                    <button onClick={() => setConfig({ ...config, selectedTile: id })} className={`w-full aspect-square rounded border-2 transition-all overflow-hidden ${config.selectedTile === id ? 'border-accent scale-105 shadow-lg shadow-accent/20' : 'border-transparent hover:border-gray-600'}`}>
                      <img src={url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </button>
                  </div>
                ))}
              </div>

              {/* INSPECTOR PANEL */}
              {config.selectedTile && customTiles[config.selectedTile] && (
                <div className="mt-4 p-3 bg-black/20 rounded border border-white/5 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <h4 className="text-[10px] font-bold text-accent uppercase tracking-widest flex items-center gap-1">
                      <Settings size={12} />
                      Inspector
                    </h4>
                    <span className="text-[8px] text-gray-500 font-mono">{config.selectedTile}</span>
                  </div>

                  {/* Físicas y Renderizado */}
                  <div className="grid grid-cols-4 gap-1">
                    <button 
                      onClick={() => setTileMetadata(prev => ({ ...prev, [config.selectedTile]: { ...prev[config.selectedTile], isWall: !prev[config.selectedTile]?.isWall } }))}
                      className={`flex flex-col items-center justify-center py-2 rounded text-[8px] font-bold uppercase transition-colors ${tileMetadata[config.selectedTile]?.isWall ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-gray-800 text-gray-500 hover:bg-gray-700'}`}
                      title="Muro (Bloquea Objetos)"
                    >
                      <Square size={12} className="mb-1" />
                      Muro
                    </button>
                    <button 
                      onClick={() => setTileMetadata(prev => ({ ...prev, [config.selectedTile]: { ...prev[config.selectedTile], hasShadow: !prev[config.selectedTile]?.hasShadow } }))}
                      className={`flex flex-col items-center justify-center py-2 rounded text-[8px] font-bold uppercase transition-colors ${tileMetadata[config.selectedTile]?.hasShadow ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-gray-800 text-gray-500 hover:bg-gray-700'}`}
                      title="Sombra de Contacto y Dinámica"
                    >
                      <Moon size={12} className="mb-1" />
                      Sombra
                    </button>
                    <button 
                      onClick={() => setTileMetadata(prev => ({ ...prev, [config.selectedTile]: { ...prev[config.selectedTile], sway: !prev[config.selectedTile]?.sway } }))}
                      className={`flex flex-col items-center justify-center py-2 rounded text-[8px] font-bold uppercase transition-colors ${tileMetadata[config.selectedTile]?.sway ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' : 'bg-gray-800 text-gray-500 hover:bg-gray-700'}`}
                      title="Efecto de Viento"
                    >
                      <Wind size={12} className="mb-1" />
                      Viento
                    </button>
                    <button 
                      onClick={() => {
                        const currentPrio = tileMetadata[config.selectedTile]?.priority ?? 1;
                        setTileMetadata(prev => ({ ...prev, [config.selectedTile]: { ...prev[config.selectedTile], priority: currentPrio === 0 ? 1 : 0 } }));
                      }}
                      className={`flex flex-col items-center justify-center py-2 rounded text-[8px] font-bold uppercase transition-colors ${(tileMetadata[config.selectedTile]?.priority ?? 1) === 0 ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'}`}
                      title="Prioridad de Pintado (Fondo vs Puntero)"
                    >
                      {(tileMetadata[config.selectedTile]?.priority ?? 1) === 0 ? <Waves size={12} className="mb-1" /> : <Trees size={12} className="mb-1" />}
                      {(tileMetadata[config.selectedTile]?.priority ?? 1) === 0 ? 'Fondo' : 'Cima'}
                    </button>
                  </div>

                  {/* Lógica de Juego (Entity Type) */}
                  <div className="space-y-1 pt-1 border-t border-white/5">
                    <label className="text-[9px] text-gray-400 font-bold uppercase">Entidad de Juego (Lógica)</label>
                    <select 
                      value={tileMetadata[config.selectedTile]?.entityType || 'NONE'}
                      onChange={(e) => {
                        const entityType = e.target.value as any;
                        setTileMetadata(prev => ({ ...prev, [config.selectedTile]: { ...prev[config.selectedTile], entityType } }));
                      }}
                      className="w-full bg-gray-800 text-white text-xs rounded p-1.5 border border-gray-700 focus:outline-none focus:border-accent"
                    >
                      <option value="NONE">🌳 Prop Recreativo (Puro Arte)</option>
                      <option value="TOWN_HALL">🏚️ Pueblo Inicial (House Spawn)</option>
                      <option value="WOOD_TREE">🪓 Árbol Recolectable (Madera)</option>
                      <option value="ENEMY_BASE">😈 Base Enemiga (Spawner)</option>
                      <option value="BUILDING_BUTCHER">🍖 Edificio: Carnicería (Fase 3)</option>
                      <option value="BUILDING_MARKET">⚖️ Edificio: Mercado (Fase 4)</option>
                      <option value="BUILDING_FORTRESS">🏰 Edificio: Fortaleza (Fase 5)</option>
                      <option value="BUILDING_TOWER">🗼 Edificio: Torre de Vigilancia (Fase 5)</option>
                    </select>
                  </div>

                  {/* Auto-Tilings Role */}
                  <div className="space-y-1">
                    <label className="text-[9px] text-gray-400 font-bold uppercase">Autotiling Role</label>
                    <select 
                      value={(tileMetadata[config.selectedTile] as any)?.role || 'none'}
                      onChange={(e) => {
                        const role = e.target.value as TileRole;
                        setTileMetadata(prev => ({ ...prev, [config.selectedTile]: { ...prev[config.selectedTile], role } }));
                      }}
                      className="w-full bg-gray-800 text-gray-300 text-xs rounded p-1.5 border border-gray-700 focus:outline-none focus:border-accent"
                    >
                      {Object.entries(TILE_ROLES).map(([role, info]) => (
                        <option key={role} value={role}>{info.icon} {info.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Posicionamiento */}
                  <div className="flex gap-2 items-center">
                    <span className="text-[9px] text-gray-400 font-bold uppercase w-12">Offset</span>
                    <div className="flex-1 flex gap-1">
                      <div className="flex items-center bg-gray-800 rounded px-1 flex-1">
                        <span className="text-gray-500 text-[10px]">X:</span>
                        <input 
                          type="number"
                          className="bg-transparent text-xs text-white w-full p-1 text-center focus:outline-none"
                          value={tileMetadata[config.selectedTile]?.shadowOffsetX || 0}
                          onChange={(e) => setTileMetadata(prev => ({ ...prev, [config.selectedTile]: { ...prev[config.selectedTile], shadowOffsetX: parseInt(e.target.value) || 0 } }))}
                        />
                      </div>
                      <div className="flex items-center bg-gray-800 rounded px-1 flex-1">
                        <span className="text-gray-500 text-[10px]">Y:</span>
                        <input 
                          type="number"
                          className="bg-transparent text-xs text-white w-full p-1 text-center focus:outline-none"
                          value={tileMetadata[config.selectedTile]?.shadowOffsetY || 0}
                          onChange={(e) => setTileMetadata(prev => ({ ...prev, [config.selectedTile]: { ...prev[config.selectedTile], shadowOffsetY: parseInt(e.target.value) || 0 } }))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Herramientas de Edición */}
                  <div className="flex justify-between items-center pt-2 border-t border-white/5">
                    <div className="flex gap-1">
                      <button onClick={() => transformSprite(config.selectedTile, 'rotate')} className="bg-gray-800 text-gray-300 rounded p-1.5 hover:bg-gray-700 hover:text-white" title="Rotar 90°"><RotateCw size={12} /></button>
                      <button onClick={() => transformSprite(config.selectedTile, 'flipH')} className="bg-gray-800 text-gray-300 rounded p-1.5 hover:bg-gray-700 hover:text-white" title="Espejo Horizontal"><FlipHorizontal size={12} /></button>
                      <button onClick={() => transformSprite(config.selectedTile, 'flipV')} className="bg-gray-800 text-gray-300 rounded p-1.5 hover:bg-gray-700 hover:text-white" title="Espejo Vertical"><FlipVertical size={12} /></button>
                      <button onClick={() => duplicateSprite(config.selectedTile)} className="bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded p-1.5 hover:bg-blue-500/30" title="Duplicar Sprite"><Copy size={12} /></button>
                    </div>
                    <button 
                      onClick={() => { 
                        const next = { ...customTiles }; 
                        delete next[config.selectedTile]; 
                        setCustomTiles(next);
                        
                        // Clean up tile from any exact group listings to prevent crash
                        setTileGroups(prev => {
                          const nextGroups = { ...prev };
                          Object.keys(nextGroups).forEach(gid => {
                            nextGroups[gid].tiles = nextGroups[gid].tiles.filter(t => t !== config.selectedTile);
                          });
                          return nextGroups;
                        });

                        if (Object.keys(next).length > 0) {
                          setConfig(prev => ({...prev, selectedTile: Object.keys(next)[0]}));
                        } else {
                          setConfig(prev => ({...prev, selectedTile: 'grass'}));
                        }
                      }} 
                      className="bg-red-500/10 text-red-500 rounded p-1.5 hover:bg-red-500 hover:text-white flex gap-1 items-center font-bold text-[9px] uppercase"
                    >
                      <Trash2 size={12} /> Eliminar
                    </button>
                  </div>
                </div>
              )}
            </section>

            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Grupos Aleatorios</h3>
                <button 
                  onClick={() => {
                    const id = `group_${Date.now()}`;
                    const count = Object.keys(tileGroups).length + 1;
                    setTileGroups(prev => ({ 
                      ...prev, 
                      [id]: { name: `Grupo ${count}`, tiles: [], priority: 1 } 
                    }));
                  }}
                  className="p-1 hover:bg-accent/20 rounded-md text-accent transition-all active:scale-90" 
                  title="Crear Nuevo Grupo"
                >
                  <Plus size={16} />
                </button>
              </div>
              <div className="space-y-2">
                {Object.entries(tileGroups).map(([id, group]: [string, any]) => (
                  <div key={id} className={`p-2 rounded-lg border transition-all ${config.selectedTile === id ? 'bg-accent/10 border-accent' : 'bg-gray-900/50 border-border hover:border-gray-600'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <button 
                        onClick={() => setConfig({ ...config, selectedTile: id })}
                        className={`p-1.5 rounded ${config.selectedTile === id ? 'bg-accent text-white' : 'bg-gray-800 text-gray-400'}`}
                      >
                        <Layers size={14} />
                      </button>
                      <input 
                        type="text" 
                        value={group.name}
                        onChange={(e) => {
                          const newName = e.target.value;
                          setTileGroups(prev => ({
                            ...prev,
                            [id]: { ...group, name: newName }
                          }));
                        }}
                        className="bg-transparent border-none text-[10px] font-bold text-white focus:outline-none focus:ring-1 focus:ring-accent/50 rounded px-1 flex-1"
                      />
                      {/* Priority Toggle for Group */}
                      <button 
                        onClick={() => {
                          setTileGroups(prev => ({
                            ...prev,
                            [id]: { ...group, priority: group.priority === 0 ? 1 : 0 }
                          }));
                        }}
                        className={`p-1 rounded transition-colors ${group.priority === 0 ? 'text-blue-400 hover:bg-blue-400/10' : 'text-orange-400 hover:bg-orange-400/10'}`}
                        title={group.priority === 0 ? "Capa: Fondo (Tierra/Agua)" : "Capa: Superficie (Hierba/Flores)"}
                      >
                        {group.priority === 0 ? <Waves size={12} /> : <Trees size={12} />}
                      </button>
                      <button 
                        onClick={() => {
                          const tileId = config.selectedTile;
                          if (tileId && !group.tiles.includes(tileId)) {
                            setTileGroups(prev => ({
                              ...prev,
                              [id]: { ...group, tiles: [...group.tiles, tileId] }
                            }));
                          }
                        }}
                        className="text-green-500 hover:bg-green-500/10 p-1 rounded transition-colors"
                        title="Añadir tile seleccionado a este grupo"
                      >
                        <Plus size={14} />
                      </button>
                      <button 
                        onClick={() => {
                          setTileMetadata(prev => ({ 
                            ...prev, 
                            [id]: { ...prev[id], hasShadow: !prev[id]?.hasShadow } 
                          }));
                        }}
                        className={`p-1 rounded transition-colors ${tileMetadata[id]?.hasShadow ? 'bg-indigo-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-300'}`}
                        title="Alternar Sombras para el Grupo"
                      >
                        <Moon size={12} />
                      </button>
                      <button 
                        onClick={() => {
                          setTileMetadata(prev => ({ 
                            ...prev, 
                            [id]: { ...prev[id], sway: !prev[id]?.sway } 
                          }));
                        }}
                        className={`p-1 rounded transition-colors ${tileMetadata[id]?.sway ? 'bg-teal-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-300'}`}
                        title="Alternar Movimiento del Viento para el Grupo"
                      >
                        <Wind size={12} />
                      </button>
                      <button 
                        onClick={() => {
                          const next = { ...tileGroups };
                          delete next[id];
                          setTileGroups(next);
                        }}
                        className="text-red-500 hover:bg-red-500/10 p-1 rounded transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    
                    {/* Preview of tiles in group */}
                    <div className="flex flex-wrap gap-1">
                      {group.tiles.map((tId: string, idx: number) => (
                        <div key={`${tId}-${idx}`} className="relative group/tile w-6 h-6 rounded border border-white/10 overflow-hidden" style={{ backgroundColor: TILE_TYPES[tId]?.color || '#333' }}>
                          {customTiles[tId] && <img src={customTiles[tId]} className="w-full h-full object-cover" referrerPolicy="no-referrer" />}
                          {!customTiles[tId] && TILE_TYPES[tId] && (
                            <div className="w-full h-full flex items-center justify-center">
                              {tId === 'grass' && <Trees size={10} className="text-white/20" />}
                              {tId === 'water' && <Waves size={10} className="text-white/20" />}
                              {tId === 'house' && <Home size={10} className="text-white/20" />}
                            </div>
                          )}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setTileGroups(prev => ({
                                ...prev,
                                [id]: { ...group, tiles: group.tiles.filter((_: any, i: number) => i !== idx) }
                              }));
                            }}
                            className="absolute inset-0 bg-red-500/80 flex items-center justify-center opacity-0 group-hover/tile:opacity-100 transition-opacity"
                          >
                            <Trash2 size={8} />
                          </button>
                        </div>
                      ))}
                      {group.tiles.length === 0 && (
                        <span className="text-[8px] text-gray-600 italic">Vacío. Añade tiles arriba.</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Librerías</h3>
                <button 
                  onClick={() => setIsSavingLib(!isSavingLib)}
                  className={`p-1 rounded transition-colors ${isSavingLib ? 'bg-red-500/20 text-red-500' : 'bg-accent/20 text-accent hover:bg-accent/30'}`}
                  title={isSavingLib ? "Cancelar" : "Guardar configuración actual como librería"}
                >
                  {isSavingLib ? <Plus size={12} className="rotate-45" /> : <Save size={12} />}
                </button>
              </div>

              <AnimatePresence>
                {isSavingLib && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mb-3"
                  >
                    <div className="flex gap-1 p-2 bg-gray-900 rounded border border-accent/20">
                      <input 
                        type="text"
                        value={newLibName}
                        onChange={(e) => setNewLibName(e.target.value)}
                        placeholder="Nombre (ej: Cesped)"
                        className="flex-1 bg-transparent text-[10px] text-white outline-none"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && saveToLibrary()}
                      />
                      <button 
                        onClick={saveToLibrary}
                        className="p-1 bg-accent text-white rounded hover:bg-accent/80 transition-colors"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                {libraries.length === 0 && (
                  <p className="text-[10px] text-gray-600 italic">No hay librerías guardadas.</p>
                )}
                {libraries.map(lib => (
                  <div key={lib.id} className="group flex items-center justify-between p-2 bg-gray-900/50 border border-white/5 rounded hover:border-accent/50 transition-colors">
                    <button 
                      onClick={() => loadLibrary(lib)}
                      className="flex-1 text-left text-[10px] font-medium text-gray-300 hover:text-white truncate"
                      title={`Cargar librería: ${lib.name}`}
                    >
                      <Library size={10} className="inline mr-2 text-accent" />
                      {lib.name}
                    </button>
                    <button 
                      onClick={() => deleteLibrary(lib.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-500/10 rounded transition-all"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Configuración</h3>
              <button onClick={() => setConfig({ ...config, showGrid: !config.showGrid })} className={`w-full flex items-center gap-2 p-2 rounded text-xs transition-colors ${config.showGrid ? 'bg-gray-800 text-white' : 'bg-gray-900 text-gray-500'}`}><Grid size={14} /> {config.showGrid ? 'Ocultar Rejilla' : 'Mostrar Rejilla'}</button>
              
              <div className="space-y-2 pt-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Estilo de Esquinas</label>
                <div className="flex gap-1">
                  <button 
                    onClick={() => setConfig({ ...config, cornerStyle: 'rounded' })}
                    className={`flex-1 p-2 rounded text-[10px] font-bold transition-colors ${config.cornerStyle === 'rounded' ? 'bg-accent text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                  >
                    REDONDEADAS
                  </button>
                  <button 
                    onClick={() => setConfig({ ...config, cornerStyle: 'square' })}
                    className={`flex-1 p-2 rounded text-[10px] font-bold transition-colors ${config.cornerStyle === 'square' ? 'bg-accent text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                  >
                    CUADRADAS
                  </button>
                </div>
              </div>
            </section>
          </div>
        ) : (
          <div className="flex-1 p-4">
            <p className="text-[10px] text-gray-500 leading-relaxed">
              Usa el editor de píxeles para crear tus propios terrenos y elementos. Al terminar, dale a "Añadir a Paleta" para usarlos en el mapa.
            </p>
          </div>
        )}

        <div className="p-4 border-t border-border space-y-2">
          {view === 'map' && (
            <>
              <div className="flex gap-2">
                <button 
                  onClick={() => { 
                    if (!map) return; 
                    const projectData = {
                      map,
                      customTiles,
                      tileMetadata,
                      tileGroups
                    };
                    const blob = new Blob([JSON.stringify(projectData)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); 
                    a.href = url; 
                    a.download = "world_project.json"; 
                    document.body.appendChild(a);
                    a.click(); 
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }} 
                  className="flex-1 flex items-center justify-center gap-2 p-2 bg-gray-800 hover:bg-gray-700 rounded text-xs font-medium transition-colors" 
                  title="Guardar Proyecto Completo"
                >
                  <FileJson size={14} /> Guardar
                </button>
                <label className="flex-1 flex items-center justify-center gap-2 p-2 bg-gray-800 hover:bg-gray-700 rounded text-xs font-medium transition-colors cursor-pointer" title="Cargar Proyecto Completo">
                  <Upload size={14} /> Cargar
                  <input type="file" accept=".json" onChange={handleJsonImport} className="hidden" />
                </label>
              </div>
              <button onClick={() => { if (!map) return; (['ground', 'shadows', 'objects'] as LayerType[]).forEach(l => { const c = canvasRefs[l].current; if (c) { const a = document.createElement('a'); a.download = `map_${l}.png`; a.href = c.toDataURL(); a.click(); } }); }} className="w-full flex items-center justify-center gap-2 p-2 bg-accent hover:bg-accent-hover text-white rounded text-xs font-medium transition-colors"><Download size={14} /> Exportar PNGs</button>
            </>
          )}
        </div>
      </aside>

      {/* Main Viewport */}
      <main className="flex-1 relative bg-viewport-bg overflow-hidden">
        {view === 'map' ? (
          <div className="w-full h-full flex items-center justify-center overflow-auto p-8">
            {!map ? (
              <div className="text-center"><Mountain size={48} className="mx-auto text-gray-700 mb-4" /><p className="text-gray-500 text-sm">Configura un nuevo mundo para empezar</p></div>
            ) : (
              <div 
                className="relative shadow-2xl shadow-black/50 bg-black transition-transform duration-200"
                style={{ 
                  width: map.width, 
                  height: map.height,
                  transform: `scale(${zoom})`,
                  transformOrigin: 'center center'
                }}
                onMouseDown={() => {
                  setIsDrawing(true);
                  if (map) {
                    setUndoStack(prev => [...prev.slice(-19), JSON.stringify(map)]);
                  }
                }}
                onMouseUp={() => setIsDrawing(false)}
                onMouseLeave={() => setIsDrawing(false)}
                onMouseMove={(e) => isDrawing && tool !== 'fill' && handlePaint(e.clientX, e.clientY, false)}
                onClick={(e) => handlePaint(e.clientX, e.clientY, true)}
              >
                <canvas ref={canvasRefs.ground} width={map.width} height={map.height} className="absolute inset-0 pointer-events-none" />
                <canvas ref={canvasRefs.shadows} width={map.width} height={map.height} className="absolute inset-0 pointer-events-none" />
                <canvas ref={canvasRefs.objects} width={map.width} height={map.height} className="absolute inset-0 pointer-events-none" />
                <canvas ref={canvasRefs.lighting} width={map.width} height={map.height} className="absolute inset-0 pointer-events-none" />
                <canvas ref={canvasRefs.ui} width={map.width} height={map.height} className="absolute inset-0 cursor-crosshair" />
                
                {/* Visual indicators for lights when tool is active */}
                {tool === 'light' && map.lights?.map(light => (
                  <div 
                    key={light.id}
                    className={`absolute w-6 h-6 -ml-3 -mt-3 rounded-full border-2 flex items-center justify-center transition-all cursor-move ${selectedLight === light.id ? 'border-accent bg-accent/20 scale-125' : 'border-white/50 bg-white/10 hover:border-white'}`}
                    style={{ left: light.x, top: light.y }}
                  >
                    <Lightbulb size={12} className={selectedLight === light.id ? 'text-accent' : 'text-white'} />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <PixelEditor 
            onExport={(url) => {
              const id = `pixel_${Date.now()}`;
              setCustomTiles(prev => ({ ...prev, [id]: url }));
              setView('map');
              setConfig(prev => ({ ...prev, selectedTile: id }));
            }} 
            onExportWithFrames={(url, frameCount) => {
              const id = `pixel_anim_${Date.now()}`;
              setCustomTiles(prev => ({ ...prev, [id]: url }));
              setTileMetadata(prev => ({ ...prev, [id]: { priority: 0, frameCount } }));
              setView('map');
              setConfig(prev => ({ ...prev, selectedTile: id }));
            }}
          />
        )}
      </main>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-sidebar-bg border border-border rounded-xl p-8 w-full max-w-md shadow-2xl">
              <div className="flex items-center gap-3 mb-6"><div className="p-2 bg-accent rounded-lg"><Plus className="text-white" /></div><div><h2 className="text-xl font-bold text-white">Nuevo Mundo</h2><p className="text-gray-500 text-xs">Define las dimensiones de tu mapa</p></div></div>
              <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); initMap(Number(fd.get('width')), Number(fd.get('height')), Number(fd.get('tileSize'))); }} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Ancho (px)</label><input name="width" type="number" defaultValue={1024} className="w-full bg-gray-900 border border-border rounded p-2 text-sm focus:outline-none focus:border-accent" /></div>
                  <div className="space-y-1"><label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Alto (px)</label><input name="height" type="number" defaultValue={1024} className="w-full bg-gray-900 border border-border rounded p-2 text-sm focus:outline-none focus:border-accent" /></div>
                </div>
                <div className="space-y-1"><label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tamaño de Tile (px)</label><select name="tileSize" defaultValue={32} className="w-full bg-gray-900 border border-border rounded p-2 text-sm focus:outline-none focus:border-accent"><option value={16}>16px</option><option value={32}>32px</option><option value={64}>64px</option></select></div>
                <button type="submit" className="w-full bg-accent hover:bg-accent-hover text-white font-bold py-3 rounded-lg transition-colors mt-4 flex items-center justify-center gap-2">Crear Editor <Settings size={18} /></button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
