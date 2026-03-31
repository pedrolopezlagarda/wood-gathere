const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');
const lines = code.split('\n');

// The lines we want to replace are from index 2010 to index 2054 inclusive (45 lines)
// We will verify the target block before splicing
if (lines[2010].includes('Middle Column: Workers Control')) {
  const newBlock = `        {/* Middle Column: Workers Control */}
        <div className="flex-1 p-2 border-r-2 border-stone-700 flex flex-col overflow-hidden">
          
          <div className="flex gap-2 flex-1 overflow-hidden">
            {/* Category: Trabajadores (WOOD) */}
            <div className="flex-1 flex flex-col bg-stone-900/50 rounded border border-stone-700 overflow-hidden">
              <div className="bg-stone-800 p-1 text-[10px] font-bold text-amber-500 tracking-widest uppercase text-center border-b border-stone-700">
                Leñadores ({workers.filter(w => w.role === 'WOOD').length})
              </div>
              <div className="flex-1 overflow-y-auto p-1 space-y-1 scrollbar-thin scrollbar-thumb-stone-600">
                {workers.filter(w => w.role === 'WOOD').map(worker => (
                  <div key={worker.id} className="flex items-center justify-between bg-stone-900 p-1 rounded border border-stone-800">
                    <span className="font-bold text-[10px] truncate max-w-[60px] text-amber-200">{worker.name}</span>
                    <div className="flex gap-1 shrink-0">
                      <button title="Talar" onClick={() => setWorkers(prev => prev.map(w => w.id === worker.id ? { ...w, mode: 'GATHER' } : w))} className={\`px-1.5 py-0.5 text-[9px] rounded transition-colors \${worker.mode === 'GATHER' ? 'bg-amber-600 font-bold text-white' : 'bg-stone-700 text-stone-300 hover:bg-stone-600'}\`}>Tal</button>
                      <button title="Plantar" onClick={() => setWorkers(prev => prev.map(w => w.id === worker.id ? { ...w, mode: 'PLANT' } : w))} className={\`px-1.5 py-0.5 text-[9px] rounded transition-colors \${worker.mode === 'PLANT' ? 'bg-emerald-600 font-bold text-white' : 'bg-stone-700 text-stone-300 hover:bg-stone-600'}\`}>Pla</button>
                      <button title="Descansar" onClick={() => setWorkers(prev => prev.map(w => w.id === worker.id ? { ...w, mode: 'IDLE' } : w))} className={\`px-1.5 py-0.5 text-[9px] rounded transition-colors \${worker.mode === 'IDLE' ? 'bg-stone-200 text-stone-900 font-bold' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'}\`}>Zz</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Category: Cazadores (MEAT) */}
            <div className="flex-1 flex flex-col bg-stone-900/50 rounded border border-stone-700 overflow-hidden">
              <div className="bg-stone-800 p-1 text-[10px] font-bold text-red-500 tracking-widest uppercase text-center border-b border-stone-700">
                Cazadores ({workers.filter(w => w.role === 'MEAT').length})
              </div>
              <div className="flex-1 overflow-y-auto p-1 space-y-1 scrollbar-thin scrollbar-thumb-stone-600">
                {workers.filter(w => w.role === 'MEAT').map(worker => (
                  <div key={worker.id} className="flex items-center justify-between bg-stone-900 p-1 rounded border border-stone-800">
                    <span className="font-bold text-[10px] truncate max-w-[60px] text-red-200">{worker.name}</span>
                    <div className="flex gap-1 shrink-0">
                      <button title="Cazar" onClick={() => setWorkers(prev => prev.map(w => w.id === worker.id ? { ...w, mode: 'HUNT' } : w))} className={\`px-1.5 py-0.5 text-[9px] rounded transition-colors \${worker.mode === 'HUNT' ? 'bg-red-700 font-bold text-white' : 'bg-stone-700 text-stone-300 hover:bg-stone-600'}\`}>Caz</button>
                      <button title="Descansar" onClick={() => setWorkers(prev => prev.map(w => w.id === worker.id ? { ...w, mode: 'IDLE' } : w))} className={\`px-1.5 py-0.5 text-[9px] rounded transition-colors \${worker.mode === 'IDLE' ? 'bg-stone-200 text-stone-900 font-bold' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'}\`}>Zz</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Category: Soldados (SOLDIER) */}
            <div className="flex-1 flex flex-col bg-stone-900/50 rounded border border-stone-700 overflow-hidden">
              <div className="bg-stone-800 p-1 flex justify-between items-center text-[10px] font-bold border-b border-stone-700 px-2">
                <span className="text-blue-500 tracking-widest uppercase">Soldados ({workers.filter(w => w.role === 'SOLDIER').length})</span>
                <div className="flex gap-0.5">
                  <button title="Todos Atacar Soldados" onClick={() => setWorkers(prev => prev.map(w => w.role === 'SOLDIER' ? { ...w, mode: 'ATTACK_SOLDIERS' } : w))} className="px-1 py-0.5 text-[8px] bg-blue-900 text-blue-200 hover:bg-blue-800 rounded transition-colors">S</button>
                  <button title="Todos Atacar Trabajadores" onClick={() => setWorkers(prev => prev.map(w => w.role === 'SOLDIER' ? { ...w, mode: 'ATTACK_WORKERS' } : w))} className="px-1 py-0.5 text-[8px] bg-red-900 text-red-200 hover:bg-red-800 rounded transition-colors">T</button>
                  <button title="Todos Atacar Edificios" onClick={() => setWorkers(prev => prev.map(w => w.role === 'SOLDIER' ? { ...w, mode: 'ATTACK_BUILDINGS' } : w))} className="px-1 py-0.5 text-[8px] bg-orange-900 text-orange-200 hover:bg-orange-800 rounded transition-colors">E</button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-1 space-y-1 scrollbar-thin scrollbar-thumb-stone-600">
                {workers.filter(w => w.role === 'SOLDIER').map(worker => (
                  <div key={worker.id} className="flex items-center justify-between bg-stone-900 p-1 rounded border border-stone-800">
                    <span className="font-bold text-[10px] truncate max-w-[40px] text-blue-200">{worker.name}</span>
                    <div className="flex gap-1 shrink-0">
                      <button title="Atacar Soldados" onClick={() => setWorkers(prev => prev.map(w => w.id === worker.id ? { ...w, mode: 'ATTACK_SOLDIERS' } : w))} className={\`px-1 py-0.5 text-[9px] rounded transition-colors \${worker.mode === 'ATTACK_SOLDIERS' ? 'bg-blue-600 font-bold text-white' : 'bg-stone-700 text-stone-300 hover:bg-stone-600'}\`}>S</button>
                      <button title="Atacar Trabajadores" onClick={() => setWorkers(prev => prev.map(w => w.id === worker.id ? { ...w, mode: 'ATTACK_WORKERS' } : w))} className={\`px-1 py-0.5 text-[9px] rounded transition-colors \${worker.mode === 'ATTACK_WORKERS' ? 'bg-red-600 font-bold text-white' : 'bg-stone-700 text-stone-300 hover:bg-stone-600'}\`}>T</button>
                      <button title="Atacar Edificios" onClick={() => setWorkers(prev => prev.map(w => w.id === worker.id ? { ...w, mode: 'ATTACK_BUILDINGS' } : w))} className={\`px-1 py-0.5 text-[9px] rounded transition-colors \${worker.mode === 'ATTACK_BUILDINGS' ? 'bg-orange-600 font-bold text-white' : 'bg-stone-700 text-stone-300 hover:bg-stone-600'}\`}>E</button>
                      <button title="Descansar" onClick={() => setWorkers(prev => prev.map(w => w.id === worker.id ? { ...w, mode: 'IDLE' } : w))} className={\`px-1 py-0.5 text-[9px] rounded transition-colors \${worker.mode === 'IDLE' ? 'bg-stone-200 text-stone-900 font-bold' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'}\`}>Z</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>`;
  
  lines.splice(2010, 45, newBlock);
  fs.writeFileSync('src/App.tsx', lines.join('\\n'));
  console.log("Success! File updated using node script.");
} else {
  console.log("Error: Target anchor not found at expected index 2010.");
}`;
