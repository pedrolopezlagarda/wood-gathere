import React, { useEffect, useRef, useState } from 'react';

// Game constants
const WORLD_WIDTH = 2400;
const WORLD_HEIGHT = 1800;
const SPEED = 2.5;

// Phase 1 circular arena config
const PHASE1_CENTER_X = WORLD_WIDTH / 2;
const PHASE1_CENTER_Y = WORLD_HEIGHT / 2;
const PHASE1_PLAY_RADIUS = 320; // radio del área de juego jugable
const PHASE1_BORDER_RADIUS = 370; // radio donde empiezan los árboles circulares

interface Point {
  x: number;
  y: number;
}

interface Tree extends Point {
  id: number;
  wood: number;
  state: 'PLANTED' | 'GROWN';
  growTime?: number;
  owner: 'PLAYER' | 'AI' | 'BORDER';
}

type GameMode = 'GATHER' | 'PLANT' | 'IDLE' | 'HUNT' | 'ATTACK_WORKERS' | 'ATTACK_BUILDINGS' | 'ATTACK_SOLDIERS';
type ViewState = 'MAP' | 'PLAYING';

const NAMES = ['Juan', 'Antonio', 'Carlos', 'David', 'Elena', 'Paco', 'Lucia', 'Maria', 'Pepe', 'Luis', 'Marcos', 'Sofia', 'Hugo', 'Lola', 'Rafa'];
type WorkerConfig = { id: number, name: string, mode: GameMode, role: 'WOOD' | 'MEAT' | 'SOLDIER' };

interface Card {
  id: string;
  name: string;
  cost: number;
  effect: string;
  icon: string;
}

const ALL_CARDS: Card[] = [
  { id: 'axe',       name: 'Hacha Afilada',      cost: 3, effect: 'Los leñadores talan 2× más rápido',            icon: '🪓' },
  { id: 'trap',      name: 'Trampa de Caza',      cost: 2, effect: 'Los cazadores cazan 50% más rápido',           icon: '🪤' },
  { id: 'big_house', name: 'Casa Grande',          cost: 4, effect: 'Las casas admiten 3 trabajadores',             icon: '🏠' },
  { id: 'reserves',  name: 'Reservas',             cost: 3, effect: 'Los leñadores traen +1 madera extra',          icon: '🪵' },
  { id: 'butcher',   name: 'Carnicero Experto',    cost: 4, effect: 'Los cazadores traen el doble de carne',        icon: '🥩' },
  { id: 'brute',     name: 'Fuerza Bruta',         cost: 5, effect: 'Los soldados hacen 2× daño',                   icon: '⚔️' },
  { id: 'armor',     name: 'Armadura',              cost: 4, effect: 'Los soldados tienen 2× vida máxima',            icon: '🛡️' },
  { id: 'trade_net', name: 'Red de Comercio',      cost: 3, effect: 'Mejor tasa de cambio por oro (+50%)',          icon: '🤝' },
  { id: 'old_tree',  name: 'Árbol Milenario',      cost: 2, effect: 'Los árboles dan +1 madera extra al talar',    icon: '🌳' },
  { id: 'forester',  name: 'Guardabosques',        cost: 3, effect: 'Los árboles plantados crecen 2× más rápido',  icon: '🌱' },
  { id: 'mercenary', name: 'Mercenario',            cost: 5, effect: 'Los soldados cuestan 50% menos carne',        icon: '💂' },
  { id: 'strategist',name: 'Estratega',             cost: 6, effect: 'Todos los edificios tienen +50% vida máxima', icon: '🎯' },
];

const PHASE_TUTORIAL: Record<number, { title: string; steps: string[]; goal: string }> = {
  1: {
    title: '⚒️ La Tala',
    steps: [
      'Juan es tu primer leñador. Tala árboles y lleva la madera a casa automáticamente.',
      'En el panel inferior puedes cambiarle entre modo «Talar» y «Plantar».',
      'Planta árboles para no quedarte sin madera.',
    ],
    goal: '🎯 Acumula 50 de madera para superar la fase',
  },
  2: {
    title: '🏠 La Aldea',
    steps: [
      'Ahora puedes Construir edificios desde el panel inferior derecho.',
      'Construye una segunda Casa (50M) para reclutar más trabajadores.',
      'Cada casa genera hasta 2 trabajadores automáticamente con el tiempo.',
    ],
    goal: '🎯 Tener 2 casas y al menos 4 trabajadores activos',
  },
  3: {
    title: '🥩 La Caza',
    steps: [
      'Los Jabalíes (J) merodean por el mapa: son tu fuente de carne.',
      'Construye una Carnicería (100M) para reclutar un Cazador.',
      'El cazador (violeta) perseguirá jabalíes y traerá carne a la carnicería.',
    ],
    goal: '🎯 Construye una Carnicería y consigue tu primera carne',
  },
  4: {
    title: '🏪 El Comercio',
    steps: [
      'Construye un Comercio (150M + 50C) para abrir la tienda del mercader.',
      'Intercambia madera o carne por Oro 💰 pulsando los botones de conversión.',
      'Haz clic en «🏪 Tienda» (panel derecho) para ver las Cartas de Mejora.',
      'Cada carta comprada otorga un beneficio permanente para esta partida.',
    ],
    goal: '🎯 Compra 3 Cartas de Mejora en el Comercio',
  },
};

export default function App() {
  console.log("App rendered");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef({ x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2, zoom: 1 });
  const targetCameraRef = useRef({ x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2, zoom: 1 });
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const [gameState, setGameState] = useState<ViewState>('MAP');
  const [currentPhase, setCurrentPhase] = useState(1);
  const [maxUnlockedPhase, setMaxUnlockedPhase] = useState(4);
  const [wood, setWood] = useState(0);
  const [aiWood, setAiWood] = useState(0);
  const [meat, setMeat] = useState(0);
  const [aiMeat, setAiMeat] = useState(0);
  const [workers, setWorkers] = useState<WorkerConfig[]>([{ id: 0, name: 'Juan', mode: 'GATHER', role: 'WOOD' }]);
  const [restThreshold, setRestThreshold] = useState(10);
  const [playerHouseCount, setPlayerHouseCount] = useState(1);
  const [butcherShopCount, setButcherShopCount] = useState(0);
  const [fortCount, setFortCount] = useState(0);
  const [soldierCount, setSoldierCount] = useState(0);
  const [marketCount, setMarketCount] = useState(0);
  const [aiHouseCount, setAiHouseCount] = useState(1);
  const [aiButcherShopCount, setAiButcherShopCount] = useState(0);
  const [aiFortCount, setAiFortCount] = useState(0);
  const [aiSoldierCount, setAiSoldierCount] = useState(0);
  const [gameOver, setGameOver] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [gold, setGold] = useState(0);
  const [marketOpen, setMarketOpen] = useState(false);
  const [deck, setDeck] = useState<Card[]>([]);
  const [activeCards, setActiveCards] = useState<Card[]>([]);

  const workersRef = useRef<WorkerConfig[]>(workers);
  const restThresholdRef = useRef(restThreshold);
  const gameOverRef = useRef<string | null>(null);
  const currentWoodRef = useRef(0);
  const currentAiWoodRef = useRef(0);
  const currentMeatRef = useRef(0);
  const currentAiMeatRef = useRef(0);
  const buildHouseRef = useRef(0);
  const buildButcherShopRef = useRef(0);
  const buildFortRef = useRef(0);
  const buildSoldierRef = useRef(0);
  const houseImageRef = useRef<HTMLImageElement | null>(null);
  const plantedTreeImageRef = useRef<HTMLImageElement | null>(null);
  const grownTreeImageRef = useRef<HTMLImageElement | null>(null);
  const fortImageRef = useRef<HTMLImageElement | null>(null);
  const borderTreeImageRef = useRef<HTMLImageElement | null>(null);
  const currentPhaseRef = useRef(currentPhase);
  const currentGoldRef = useRef(0);
  const buildMarketRef = useRef(0);
  const activeCardsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    activeCardsRef.current = new Set(activeCards.map(c => c.id));
  }, [activeCards]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const preventDefaultWheel = (e) => { e.preventDefault(); };
      canvas.addEventListener('wheel', preventDefaultWheel, { passive: false });
      return () => canvas.removeEventListener('wheel', preventDefaultWheel);
    }
  }, []);

  useEffect(() => {
    currentPhaseRef.current = currentPhase;
  }, [currentPhase]);

  useEffect(() => {
    const imgHouse = new Image();
    imgHouse.src = `${import.meta.env.BASE_URL}casa.png`;
    imgHouse.onload = () => {
      houseImageRef.current = imgHouse;
    };

    const imgPlantedTree = new Image();
    imgPlantedTree.src = `${import.meta.env.BASE_URL}arbol_plantado.png`;
    imgPlantedTree.onload = () => {
      plantedTreeImageRef.current = imgPlantedTree;
    };

    const imgGrownTree = new Image();
    imgGrownTree.src = `${import.meta.env.BASE_URL}arbol.png`;
    imgGrownTree.onload = () => {
      grownTreeImageRef.current = imgGrownTree;
    };

    const imgFort = new Image();
    imgFort.src = `${import.meta.env.BASE_URL}fuerte.png`;
    imgFort.onload = () => {
      fortImageRef.current = imgFort;
    };

    const imgBorderTree = new Image();
    imgBorderTree.src = `${import.meta.env.BASE_URL}arbol_lindes.png`;
    imgBorderTree.onload = () => {
      borderTreeImageRef.current = imgBorderTree;
    };
  }, []);

  useEffect(() => {
    workersRef.current = workers;
  }, [workers]);

  useEffect(() => {
    restThresholdRef.current = restThreshold;
  }, [restThreshold]);

  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    setWood(0); setAiWood(0); setMeat(0); setAiMeat(0);
    setWorkers([{ id: 0, name: 'Juan', mode: 'GATHER', role: 'WOOD' }]);
    setPlayerHouseCount(1); setButcherShopCount(0); setFortCount(0); setSoldierCount(0); setMarketCount(0);
    setAiHouseCount(currentPhase <= 4 ? 0 : 1); setAiButcherShopCount(0); setAiFortCount(0); setAiSoldierCount(0);
    setGameOver(null);
    setShowTutorial(true);
    setGold(0);
    setMarketOpen(false);
    setActiveCards([]);
    activeCardsRef.current = new Set();
    currentGoldRef.current = 0;
    buildMarketRef.current = 0;
    if (currentPhase === 4) {
      const shuffled = [...ALL_CARDS].sort(() => Math.random() - 0.5);
      setDeck(shuffled);
    } else {
      setDeck([]);
    }
    gameOverRef.current = null;
    currentWoodRef.current = 0;
    currentAiWoodRef.current = 0;
    currentMeatRef.current = 0;
    currentAiMeatRef.current = 0;
    let animationId: any;

    console.log("Game initialized for phase", currentPhase);
    // Focus camera on the player's initial spawn base
    const spawnX = currentPhase === 1 ? PHASE1_CENTER_X : 150;
    const spawnY = currentPhase === 1 ? PHASE1_CENTER_Y : 300;
    cameraRef.current = { x: spawnX, y: spawnY, zoom: 1.2 };
    targetCameraRef.current = { x: spawnX, y: spawnY, zoom: 1.2 };
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Game state
    let nextBuildingId = 1;
    const houseX = currentPhase === 1 ? PHASE1_CENTER_X : 150;
    const houseY = currentPhase === 1 ? PHASE1_CENTER_Y : 300;
    const playerHouses: (Point & { id: number, hp: number, spawnTimer: number })[] = [{ id: 0, x: houseX, y: houseY, hp: 100, spawnTimer: 3600 }];
    const butcherShops: (Point & { id: number, hp: number })[] = [];
    const playerMarkets: (Point & { id: number, hp: number })[] = [];
    const hunters: any[] = [];
    const playerForts: (Point & { id: number, hp: number })[] = [];
    const playerSoldiers: any[] = [];
    const wildBoars: any[] = [];
    let nextCharId = 1;

    const playerCharacters = [
      {
        id: 0,
        houseId: 0,
        x: houseX,
        y: houseY,
        state: 'IDLE',
        target: null as { x: number, y: number, tree?: Tree } | null,
        onReach: 'IDLE',
        timer: 0,
        carrying: null as 'WOOD' | 'SEED' | null,
        energy: 100,
        isExhausted: false,
        isResting: false,
        hp: 10,
        currentMode: 'GATHER' as GameMode,
      }
    ];

    const aiHouses: (Point & { id: number, hp: number, spawnTimer: number })[] = currentPhase <= 4 ? [] : [{ id: 1000, x: 650, y: 300, hp: 100, spawnTimer: 3600 }];
    const aiButcherShops: (Point & { id: number, hp: number })[] = [];
    const aiHunters: any[] = [];
    const aiForts: (Point & { id: number, hp: number })[] = [];
    const aiSoldiers: any[] = [];
    const aiCharacters = currentPhase <= 4 ? [] : [
      {
        id: 1000,
        houseId: 1000,
        x: 650,
        y: 300,
        state: 'IDLE',
        target: null as { x: number, y: number, tree?: Tree } | null,
        onReach: 'IDLE',
        timer: 0,
        carrying: null as 'WOOD' | 'SEED' | null,
        energy: 100,
        isExhausted: false,
        isResting: false,
        hp: 10,
        currentMode: 'GATHER' as GameMode,
      }
    ];

    const MIN_TREE_DISTANCE = 48;
    const MIN_HOUSE_DISTANCE = 64;

    const getValidTreePosition = (existingTrees: Tree[], owner: 'PLAYER' | 'AI'): Point | null => {
      let x = 0, y = 0;
      let valid = false;
      let attempts = 0;
      const allBuildings = [...playerHouses, ...aiHouses, ...butcherShops, ...aiButcherShops, ...playerForts, ...aiForts, ...playerMarkets];
      while (!valid && attempts < 200) {
        attempts++;
        if (currentPhase === 1) {
          const angle = Math.random() * Math.PI * 2;
          const r = 60 + Math.random() * (PHASE1_PLAY_RADIUS - 80);
          x = PHASE1_CENTER_X + Math.cos(angle) * r;
          y = PHASE1_CENTER_Y + Math.sin(angle) * r;
        } else {
          const searchRadius = 250 + Math.floor(attempts / 20) * 80;
          if (owner === 'PLAYER') {
            x = 150 + (Math.random() - 0.5) * searchRadius * 1.5;
            y = 300 + (Math.random() - 0.5) * searchRadius * 2;
          } else {
            x = 650 + (Math.random() - 0.5) * searchRadius * 1.5;
            y = 300 + (Math.random() - 0.5) * searchRadius * 2;
          }
          x = Math.max(80, Math.min(WORLD_WIDTH - 80, x));
          y = Math.max(80, Math.min(WORLD_HEIGHT - 80, y));
        }
        
        valid = true;
        for (const tree of existingTrees) {
          if (Math.abs(tree.x - x) < MIN_TREE_DISTANCE && Math.abs(tree.y - y) < MIN_TREE_DISTANCE) {
            valid = false;
            break;
          }
        }
        if (valid) {
          for (const building of allBuildings) {
            if (Math.abs(building.x - x) < MIN_HOUSE_DISTANCE && Math.abs(building.y - y) < MIN_HOUSE_DISTANCE) {
              valid = false;
              break;
            }
          }
        }
      }
      return valid ? { x, y } : null;
    };

    const getValidBuildingPosition = (owner: 'PLAYER' | 'AI'): Point | null => {
      let attempts = 0;
      const allBuildings = [...playerHouses, ...aiHouses, ...butcherShops, ...aiButcherShops, ...playerForts, ...aiForts, ...playerMarkets];
      
      const baseX = owner === 'PLAYER' ? 150 : 650;
      const baseY = 300;

      while (attempts < 2000) {
        attempts++;
        let x = 0, y = 0;
        
        if (currentPhase === 1) {
          const angle = Math.random() * Math.PI * 2;
          const r = 60 + Math.random() * (PHASE1_PLAY_RADIUS - 120);
          x = PHASE1_CENTER_X + Math.cos(angle) * r;
          y = PHASE1_CENTER_Y + Math.sin(angle) * r;
        } else {
          // Progressive search: start near base, then expand very aggressively
          const radius = 150 + (Math.floor(attempts / 100) * 300);
          const angle = Math.random() * Math.PI * 2;
          const r = Math.random() * radius;
          x = baseX + Math.cos(angle) * r;
          y = baseY + Math.sin(angle) * r;
        }
        
        // Ensure within world bounds
        x = Math.max(80, Math.min(WORLD_WIDTH - 80, x));
        y = Math.max(80, Math.min(WORLD_HEIGHT - 80, y));

        let nearBuilding = false;
        for (const b of allBuildings) {
          if (Math.hypot(b.x - x, b.y - y) < 64) { 
            nearBuilding = true;
            break;
          }
        }
        if (!nearBuilding || attempts > 1900) return { x, y };
      }
      console.warn("getValidBuildingPosition: Failed to find spot after 2000 attempts", { owner, buildingCount: allBuildings.length });
      // Force fallback
      return { x: baseX, y: baseY };
    };
    
    // Generate initial trees for both players
    let nextTreeId = 0;
    const trees: Tree[] = [];
    for (let i = 0; i < 8; i++) {
      const pos = getValidTreePosition(trees, 'PLAYER');
      if (pos) {
        trees.push({
          id: nextTreeId++,
          x: pos.x,
          y: pos.y,
          wood: 3,
          state: 'GROWN',
          owner: 'PLAYER'
        });
      }
    }
    if (currentPhase > 4) {
      for (let i = 0; i < 8; i++) {
        const pos = getValidTreePosition(trees, 'AI');
        if (pos) {
          trees.push({
            id: nextTreeId++,
            x: pos.x,
            y: pos.y,
            wood: 3,
            state: 'GROWN',
            owner: 'AI'
          });
        }
      }
    }
    if (currentPhase === 1) {
      // Phase 1: circular border forest
      // 1) Dense ring of trees exactly at/around the play radius
      const RING_COUNT = 80;
      for (let i = 0; i < RING_COUNT; i++) {
        const angle = (i / RING_COUNT) * Math.PI * 2;
        // Several concentric rings
        for (let ring = 0; ring < 4; ring++) {
          const r = PHASE1_BORDER_RADIUS + ring * 38 + (Math.random() - 0.5) * 20;
          const rx = PHASE1_CENTER_X + Math.cos(angle + ring * 0.05) * r;
          const ry = PHASE1_CENTER_Y + Math.sin(angle + ring * 0.05) * r;
          trees.push({ id: nextTreeId++, x: rx, y: ry, wood: 0, state: 'GROWN', owner: 'BORDER' });
        }
      }
      // 2) Fill the entire map exterior with dense trees
      const EXTERIOR_DENSITY = 3000;
      for (let i = 0; i < EXTERIOR_DENSITY; i++) {
        const rx = Math.random() * WORLD_WIDTH;
        const ry = Math.random() * WORLD_HEIGHT;
        const distFromCenter = Math.hypot(rx - PHASE1_CENTER_X, ry - PHASE1_CENTER_Y);
        // Only place trees outside the circular play zone
        if (distFromCenter < PHASE1_BORDER_RADIUS - 10) continue;
        trees.push({ id: nextTreeId++, x: rx, y: ry, wood: 0, state: 'GROWN', owner: 'BORDER' });
      }
      // 3) Also extend beyond world bounds like in other phases
      const BORDER_MARGIN = 800;
      const OUTER_DENSITY = 2000;
      for (let i = 0; i < OUTER_DENSITY; i++) {
        let rx = -BORDER_MARGIN + Math.random() * (WORLD_WIDTH + BORDER_MARGIN * 2);
        let ry = -BORDER_MARGIN + Math.random() * (WORLD_HEIGHT + BORDER_MARGIN * 2);
        if (rx > 0 && rx < WORLD_WIDTH && ry > 0 && ry < WORLD_HEIGHT) continue;
        trees.push({ id: nextTreeId++, x: rx, y: ry, wood: 0, state: 'GROWN', owner: 'BORDER' });
      }
    } else {
      // Generate massive irregular border forest (other phases)
      const BORDER_MARGIN = 1500;
      const FOREST_DENSITY = 8000;
      for (let i = 0; i < FOREST_DENSITY; i++) {
          let rx = -BORDER_MARGIN + Math.random() * (WORLD_WIDTH + BORDER_MARGIN * 2);
          let ry = -BORDER_MARGIN + Math.random() * (WORLD_HEIGHT + BORDER_MARGIN * 2);
          
          // Push trees outside the playable area if they fall inside
          if (rx > -16 && rx < WORLD_WIDTH + 16 && ry > -16 && ry < WORLD_HEIGHT + 16) {
              continue; 
          }

          trees.push({ id: nextTreeId++, x: rx, y: ry, wood: 0, state: 'GROWN', owner: 'BORDER' });
      }
    }

    const getClosestTree = (point: Point, availableTrees: Tree[], owner: 'PLAYER' | 'AI', currentCharacterId: number) => {
      let closest = null;
      let minDist = Infinity;
      for (const tree of availableTrees) {
        if (tree.state === 'GROWN' && tree.wood > 0 && tree.owner === owner) {
          // Check if another player is already targeting this tree
          let isTargeted = false;
          if (owner === 'PLAYER') {
             isTargeted = playerCharacters.some(p => p && p.id !== currentCharacterId && p.target?.tree?.id === tree.id && p.state !== 'IDLE');
          } else {
             isTargeted = aiCharacters.some(p => p && p.id !== currentCharacterId && p.target?.tree?.id === tree.id && p.state !== 'IDLE');
          }
          if (!isTargeted) {
            const dist = Math.hypot(tree.x - point.x, tree.y - point.y);
            if (dist < minDist) {
              minDist = dist;
              closest = tree;
            }
          }
        }
      }
      return closest;
    };

    let aiSoldierTimer = 0;
    let aiHouseTimer = 0;
    let aiButcherTimer = 0;
    let aiFortTimer = 0;




    const loop = () => {
      if (gameOverRef.current) return;
      
      // Smooth Camera Interpolation (LERP)
      cameraRef.current.x += (targetCameraRef.current.x - cameraRef.current.x) * 0.15;
      cameraRef.current.y += (targetCameraRef.current.y - cameraRef.current.y) * 0.15;
      cameraRef.current.zoom += (targetCameraRef.current.zoom - cameraRef.current.zoom) * 0.15;
      
      update();
      draw(ctx);
      if (ctx.restore) ctx.restore(); // Restore camera transform applied in draw()
      animationId = requestAnimationFrame(loop);
    };

    const update = () => {
      // Check pending houses
      // Building Queue Processing
      if (buildHouseRef.current > 0) {
        const cost = Math.floor(25 * Math.pow(2, playerHouses.length - 1));
        if (currentWoodRef.current >= cost) {
          const pos = getValidBuildingPosition('PLAYER');
          if (pos) {
            console.log("House built successfully at", pos);
            buildHouseRef.current--;
            currentWoodRef.current -= cost;
            setWood(Math.floor(currentWoodRef.current));
            const houseId = nextBuildingId++;
            const houseHp = activeCardsRef.current.has('strategist') ? 150 : 100;
            playerHouses.push({ id: houseId, x: pos.x, y: pos.y, hp: houseHp, spawnTimer: 3600 });
            setPlayerHouseCount(playerHouses.length);
            const newId = nextCharId++;
            playerCharacters.push({
              id: newId,
              houseId: houseId,
              x: pos.x,
              y: pos.y,
              state: 'IDLE',
              target: null,
              onReach: 'IDLE',
              timer: 0,
              carrying: null,
              energy: 100,
              isExhausted: false,
              isResting: false,
              hp: 10,
              currentMode: 'GATHER' as GameMode,
            });
            setWorkers(prev => [...prev, { id: newId, name: NAMES[prev.length % NAMES.length], mode: 'GATHER', role: 'WOOD' }]);
          } else {
            console.warn("House build pending: looking for space...");
          }
        } else {
          console.warn("House build canceled: insufficient wood", { current: currentWoodRef.current, needed: cost });
          buildHouseRef.current = 0; 
        }
      }

      if (buildButcherShopRef.current > 0) {
        const cost = Math.floor(100 * Math.pow(2, butcherShops.length));
        if (currentWoodRef.current >= cost) {
          const pos = getValidBuildingPosition('PLAYER');
          if (pos) {
            console.log("Butcher Shop built at", pos);
            buildButcherShopRef.current--;
            currentWoodRef.current -= cost;
            setWood(Math.floor(currentWoodRef.current));
            const shopId = nextBuildingId++;
            const shopHp = activeCardsRef.current.has('strategist') ? 150 : 100;
            butcherShops.push({ id: shopId, x: pos.x, y: pos.y, hp: shopHp });
            setButcherShopCount(butcherShops.length);
            const newId = nextCharId++;
            hunters.push({
              id: newId,
              shopId: shopId,
              x: pos.x,
              y: pos.y,
              state: 'IDLE',
              target: null,
              onReach: 'IDLE',
              timer: 0,
              energy: 100,
              isExhausted: false,
              isResting: false,
              targetBoar: null,
              hp: 10,
              currentMode: 'HUNT' as GameMode,
            });
            setWorkers(prev => [...prev, { id: newId, name: NAMES[prev.length % NAMES.length], mode: 'HUNT', role: 'MEAT' }]);
          } else {
            console.warn("Butcher Shop build pending: looking for space...");
          }
        } else {
          console.warn("Butcher Shop build canceled: insufficient wood", { current: currentWoodRef.current, needed: cost });
          buildButcherShopRef.current = 0;
        }
      }

      // House Spawning Logic
      playerHouses.forEach(h => {
        if (!h) return;
        const members = playerCharacters.filter(c => c && c.houseId === h.id).length;
        const houseCapacity = activeCardsRef.current.has('big_house') ? 3 : 2;
        if (members < houseCapacity) {
          h.spawnTimer--;
          if (h.spawnTimer <= 0) {
            h.spawnTimer = 3600; // 1 minute
            const newId = nextCharId++;
            playerCharacters.push({
              id: newId,
              houseId: h.id,
              x: h.x,
              y: h.y,
              state: 'IDLE',
              target: null,
              onReach: 'IDLE',
              timer: 0,
              carrying: null,
              energy: 100,
              isExhausted: false,
              isResting: false,
              hp: 10,
              currentMode: 'GATHER' as GameMode,
            });
            setWorkers(prev => [...prev, { id: newId, name: NAMES[prev.length % NAMES.length], mode: 'GATHER', role: 'WOOD' }]);
          }
        } else {
          h.spawnTimer = 3600; // Reset timer if full
        }
      });

      aiHouses.forEach(h => {
        if (!h) return;
        const members = aiCharacters.filter(c => c && c.houseId === h.id).length;
        if (members < 2) {
          h.spawnTimer--;
          if (h.spawnTimer <= 0) {
            h.spawnTimer = 3600; // 1 minute
            const newId = nextCharId++;
            aiCharacters.push({
              id: newId,
              houseId: h.id,
              x: h.x,
              y: h.y,
              state: 'IDLE',
              target: null,
              onReach: 'IDLE',
              timer: 0,
              carrying: null,
              energy: 100,
              isExhausted: false,
              isResting: false,
              currentMode: 'GATHER' as GameMode,
              hp: 10,
            });
          }
        } else {
          h.spawnTimer = 3600; // Reset timer if full
        }
      });

      // Check pending forts
      if (buildFortRef.current > 0) {
        const cost = Math.floor(50 * Math.pow(2, playerForts.length));
        if (currentWoodRef.current >= cost && currentMeatRef.current >= cost) {
          const pos = getValidBuildingPosition('PLAYER');
          if (pos) {
            console.log("Fort built at", pos);
            buildFortRef.current--;
            currentWoodRef.current -= cost;
            currentMeatRef.current -= cost;
            setWood(Math.floor(currentWoodRef.current));
            setMeat(Math.floor(currentMeatRef.current));
            const fortHp = activeCardsRef.current.has('strategist') ? 150 : 100;
            playerForts.push({ id: nextBuildingId++, x: pos.x, y: pos.y, hp: fortHp });
            setFortCount(playerForts.length);
          } else {
            console.warn("Fort build pending: looking for space...");
          }
        } else {
          console.warn("Fort build canceled: insufficient resources", { wood: currentWoodRef.current, meat: currentMeatRef.current, needed: cost });
          buildFortRef.current = 0;
        }
      }

      if (buildMarketRef.current > 0) {
        if (currentWoodRef.current >= 150 && currentMeatRef.current >= 50) {
          const pos = getValidBuildingPosition('PLAYER');
          if (pos) {
            console.log("Market built at", pos);
            buildMarketRef.current--;
            currentWoodRef.current -= 150;
            currentMeatRef.current -= 50;
            setWood(Math.floor(currentWoodRef.current));
            setMeat(Math.floor(currentMeatRef.current));
            const marketHp = activeCardsRef.current.has('strategist') ? 300 : 200;
            playerMarkets.push({ id: nextBuildingId++, x: pos.x, y: pos.y, hp: marketHp });
            setMarketCount(playerMarkets.length);
          } else {
            console.warn("Market build pending: looking for space...");
          }
        } else {
          console.warn("Market build canceled: insufficient resources", { wood: currentWoodRef.current, meat: currentMeatRef.current });
          buildMarketRef.current = 0;
        }
      }

      // Check pending soldiers
      while (buildSoldierRef.current > 0) {
        const soldierCost = activeCardsRef.current.has('mercenary') ? 25 : 50;
        if (currentMeatRef.current >= soldierCost && playerForts.length > 0) {
          buildSoldierRef.current--;
          currentMeatRef.current -= soldierCost;
          setMeat(Math.floor(currentMeatRef.current));
          const newId = nextCharId++;
          const soldierHp = activeCardsRef.current.has('armor') ? 40 : 20;
          playerSoldiers.push({
            id: newId,
            x: playerForts[0].x,
            y: playerForts[0].y,
            hp: soldierHp,
            maxHp: soldierHp,
            state: 'IDLE',
            target: null,
            onReach: 'IDLE',
            timer: 0,
            energy: 100,
            isExhausted: false,
            isResting: false,
            currentMode: 'SOLDIER' as GameMode,
          });
          setSoldierCount(playerSoldiers.length);
          setWorkers(prev => [...prev, { id: newId, name: NAMES[prev.length % NAMES.length], mode: 'IDLE', role: 'SOLDIER', currentMode: 'SOLDIER' }]);
        } else {
          buildSoldierRef.current = 0;
        }
      }

      // Update player soldiers
      for (const s of playerSoldiers) {
        if (!s) continue;

        // Resting logic
        if (s.isResting) {
          const fort = playerForts[0];
          if (fort) {
            const distToFort = Math.hypot(s.x - fort.x, s.y - fort.y);
            if (distToFort > 5) {
              // Move to fort
              const dx = fort.x - s.x;
              const dy = fort.y - s.y;
              s.x += (dx / distToFort) * SPEED;
              s.y += (dy / distToFort) * SPEED;
              s.state = 'MOVING';
              s.target = { x: fort.x, y: fort.y };
            } else {
              // At fort, recover energy faster
              s.state = 'IDLE';
              s.target = null;
              s.energy += 0.2;
              if (s.energy >= 100) {
                s.energy = 100;
                s.isResting = false;
              }
            }
          }
          continue; // Cannot act while resting
        }

        if (s.energy <= 0) {
          s.isResting = true;
          s.energy = 0;
          continue;
        }

        const workerConfig = workersRef.current.find(w => w && w.id === s.id);
        const mode = workerConfig ? workerConfig.mode : 'IDLE';

        const ATTACK_RANGE = 60;

        // Find nearest enemy soldier
        let nearestSoldier = null;
        let minSoldierDist = Infinity;
        aiSoldiers.forEach(enemy => {
          if (enemy && enemy.hp > 0 && !enemy.isResting) {
            const dist = Math.hypot(enemy.x - s.x, enemy.y - s.y);
            if (dist < minSoldierDist) {
              minSoldierDist = dist;
              nearestSoldier = enemy;
            }
          }
        });

        if (mode === 'IDLE') {
          // Self defense
          if (nearestSoldier && minSoldierDist < 100) {
            s.target = { x: nearestSoldier.x, y: nearestSoldier.y };
            if (minSoldierDist < ATTACK_RANGE) {
              s.state = 'ATTACKING';
        nearestSoldier.hp -= activeCardsRef.current.has('brute') ? 2/60 : 1/60; // brute force double dmg
              s.energy -= 0.05;
            } else {
              s.state = 'MOVING';
              s.energy -= 0.01;
            }
          } else {
            s.state = 'IDLE';
            s.target = null;
          }
        } else if (mode === 'ATTACK_SOLDIERS') {
          if (nearestSoldier) {
            s.target = { x: nearestSoldier.x, y: nearestSoldier.y };
            if (minSoldierDist < ATTACK_RANGE) {
              s.state = 'ATTACKING';
              nearestSoldier.hp -= activeCardsRef.current.has('brute') ? 2/60 : 1/60;
              s.energy -= 0.05;
            } else {
              s.state = 'MOVING';
              s.energy -= 0.01;
            }
          } else {
            s.state = 'IDLE';
          }
        } else if (mode === 'ATTACK_WORKERS') {
          let nearestTarget = null;
          let minDist = Infinity;
          [...aiCharacters, ...aiHunters].forEach(target => {
            if (target && target.hp > 0 && !target.isResting) {
              const dist = Math.hypot(target.x - s.x, target.y - s.y);
              if (dist < minDist) {
                minDist = dist;
                nearestTarget = target;
              }
            }
          });

          if (nearestTarget) {
            s.target = { x: nearestTarget.x, y: nearestTarget.y };
            const dist = Math.hypot(nearestTarget.x - s.x, nearestTarget.y - s.y);
            if (dist < ATTACK_RANGE) {
              s.state = 'ATTACKING';
              nearestTarget.hp -= 1/60;
              s.energy -= 0.05;
            } else {
              s.state = 'MOVING';
              s.energy -= 0.01;
            }
          } else {
            s.state = 'IDLE';
          }
        } else if (mode === 'ATTACK_BUILDINGS') {
          let nearestTarget = null;
          let minDist = Infinity;
          [...aiHouses, ...aiButcherShops, ...aiForts].forEach(target => {
            if (target && target.hp > 0) {
              const dist = Math.hypot(target.x - s.x, target.y - s.y);
              if (dist < minDist) {
                minDist = dist;
                nearestTarget = target;
              }
            }
          });

          if (nearestTarget) {
            s.target = { x: nearestTarget.x, y: nearestTarget.y };
            if (minDist < ATTACK_RANGE) {
              s.state = 'ATTACKING';
              nearestTarget.hp -= 1/60;
              s.energy -= 0.05;
            } else {
              s.state = 'MOVING';
              s.energy -= 0.01;
            }
          } else {
            s.state = 'IDLE';
          }
        }

        if (s.state === 'MOVING' && s.target) {
          const dx = s.target.x - s.x;
          const dy = s.target.y - s.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 1) {
            const moveX = (dx / dist) * SPEED;
            const moveY = (dy / dist) * SPEED;
            if (!isNaN(moveX) && !isNaN(moveY)) {
              s.x += moveX;
              s.y += moveY;
            }
          }
        }
      }

      // Update AI soldiers
      for (const s of aiSoldiers) {
        if (!s) continue;

        // Resting logic
        if (s.isResting) {
          const fort = aiForts[0];
          if (fort) {
            const distToFort = Math.hypot(s.x - fort.x, s.y - fort.y);
            if (distToFort > 5) {
              // Move to fort
              const dx = fort.x - s.x;
              const dy = fort.y - s.y;
              s.x += (dx / distToFort) * SPEED;
              s.y += (dy / distToFort) * SPEED;
              s.state = 'MOVING';
              s.target = { x: fort.x, y: fort.y };
            } else {
              // At fort, recover energy faster
              s.state = 'IDLE';
              s.target = null;
              s.energy += 0.2;
              if (s.energy >= 100) {
                s.energy = 100;
                s.isResting = false;
              }
            }
          }
          continue; // Cannot act while resting
        }

        if (s.energy <= 0) {
          s.isResting = true;
          s.energy = 0;
          continue;
        }

        const ATTACK_RANGE = 60;

        // AI soldiers attack player soldiers first, then workers, then buildings
        let nearestTarget = null;
        let minDist = Infinity;
        
        // Priority 1: Player Soldiers (outside fort)
        playerSoldiers.forEach(enemy => {
          if (enemy && enemy.hp > 0 && !enemy.isResting) {
            const dist = Math.hypot(enemy.x - s.x, enemy.y - s.y);
            if (dist < minDist) {
              minDist = dist;
              nearestTarget = enemy;
            }
          }
        });

        // Priority 2: Workers/Hunters
        if (!nearestTarget) {
          const targets = [...playerCharacters, ...hunters];
          targets.forEach(target => {
            if (target && target.hp > 0 && !target.isResting) {
              const dist = Math.hypot(target.x - s.x, target.y - s.y);
              if (dist < minDist) {
                minDist = dist;
                nearestTarget = target;
              }
            }
          });
        }

        // Priority 3: Buildings
        if (!nearestTarget) {
          const buildings = [...playerHouses, ...butcherShops, ...playerForts];
          buildings.forEach(target => {
            if (target && target.hp > 0) {
              const dist = Math.hypot(target.x - s.x, target.y - s.y);
              if (dist < minDist) {
                minDist = dist;
                nearestTarget = target;
              }
            }
          });
        }

        if (nearestTarget) {
          s.target = { x: nearestTarget.x, y: nearestTarget.y };
          const dist = Math.hypot(nearestTarget.x - s.x, nearestTarget.y - s.y);
          if (dist < ATTACK_RANGE) {
            s.state = 'ATTACKING';
            nearestTarget.hp -= 1/60;
            s.energy -= 0.05;
          } else if (dist > 0) {
            s.state = 'MOVING';
            s.energy -= 0.01;
            const dx = nearestTarget.x - s.x;
            const dy = nearestTarget.y - s.y;
            const moveX = (dx / dist) * SPEED;
            const moveY = (dy / dist) * SPEED;
            if (!isNaN(moveX) && !isNaN(moveY)) {
              s.x += moveX;
              s.y += moveY;
            }
          }
        } else {
          s.state = 'IDLE';
        }
      }

      // Remove dead entities
      const removeDead = (arr: any[]) => {
        for (let i = arr.length - 1; i >= 0; i--) {
          if (arr[i] && arr[i].hp <= 0) {
            // If it's a worker, remove from workers state too
            const deadId = arr[i].id;
            if (deadId !== undefined) {
              setWorkers(prev => prev.filter(w => w && w.id !== deadId));
            }
            arr.splice(i, 1);
          }
        }
      };

      removeDead(playerCharacters);
      removeDead(aiCharacters);
      removeDead(hunters);
      removeDead(aiHunters);
      removeDead(playerSoldiers);
      removeDead(aiSoldiers);
      removeDead(playerHouses);
      removeDead(aiHouses);
      removeDead(butcherShops);
      removeDead(aiButcherShops);
      removeDead(playerForts);
      removeDead(aiForts);
      removeDead(playerMarkets);

      // Update counts
      setPlayerHouseCount(playerHouses.length);
      setButcherShopCount(butcherShops.length);
      setFortCount(playerForts.length);
      setSoldierCount(playerSoldiers.length);
      setMarketCount(playerMarkets.length);
      setAiHouseCount(aiHouses.length);
      setAiButcherShopCount(aiButcherShops.length);
      setAiFortCount(aiForts.length);
      setAiSoldierCount(aiSoldiers.length);

      // Check Win/Loss Condition
      if (!gameOverRef.current) {
        if (playerHouses.length === 0 && butcherShops.length === 0 && playerForts.length === 0 && playerMarkets.length === 0) {
          gameOverRef.current = "¡Has perdido! El enemigo ha destruido todos tus edificios.";
          setGameOver(gameOverRef.current);
        } else if (currentPhase === 1) {
          if (currentWoodRef.current >= 50) {
            gameOverRef.current = "VICTORY_PHASE_1";
            setGameOver(gameOverRef.current);
          }
        } else if (currentPhase === 2) {
          if (playerHouses.length >= 2 && workersRef.current.length >= 4) {
            gameOverRef.current = "VICTORY_PHASE_2";
            setGameOver(gameOverRef.current);
          }
        } else if (currentPhase === 3) {
          if (butcherShops.length >= 1 && currentMeatRef.current > 0) {
            gameOverRef.current = "VICTORY_PHASE_3";
            setGameOver(gameOverRef.current);
          }
        } else if (currentPhase === 4) {
          if (activeCardsRef.current.size >= 3) {
            gameOverRef.current = "VICTORY_PHASE_4";
            setGameOver(gameOverRef.current);
          }
        } else if (currentPhase > 4) {
          if (aiHouses.length === 0 && aiButcherShops.length === 0 && aiForts.length === 0) {
            gameOverRef.current = "¡Has ganado! Has destruido todos los edificios enemigos.";
            setGameOver(gameOverRef.current);
          }
        }
      }

      // Grow trees
      for (const tree of trees) {
        if (tree.state === 'PLANTED' && tree.growTime && Date.now() >= tree.growTime) {
          tree.state = 'GROWN';
          tree.wood = 3;
        }
      }

      // Update player characters
      for (const p of playerCharacters) {
        if (!p) continue;
        const myHouse = playerHouses.find(h => h && h.id === p.houseId);
        if (!myHouse) {
          p.hp = 0; // Homeless workers die
          continue;
        }
        const workerConfig = workersRef.current.find(w => w && w.id === p.id);
        const workerMode = workerConfig ? workerConfig.mode : 'GATHER';
        
        const isWorking = p.state !== 'IDLE' || (p.state === 'IDLE' && (Math.abs(p.x - myHouse.x) > 1 || Math.abs(p.y - myHouse.y) > 1));
        
        // NEW: Hide if enemy soldier is nearby
        const enemySoldierNearby = aiSoldiers.some(s => s && Math.hypot(s.x - p.x, s.y - p.y) < 150);
        if (enemySoldierNearby) {
          p.isResting = true;
        }

        if (isWorking) {
          p.energy -= 0.025;
          if (p.energy <= 0 && !p.isExhausted) {
            p.energy = 0;
            p.isExhausted = true;
            p.isResting = true;
            p.state = 'IDLE';
            p.carrying = null;
          }
        }

        // Automatic resting logic
        if (p.energy <= restThresholdRef.current || p.isExhausted) {
          p.isResting = true;
        }
        
        // Forced idle mode
        if (workerMode === 'IDLE') {
          p.isResting = true;
        } else if (!p.isExhausted) {
          p.isResting = false;
        }

        if (p.isResting && p.state !== 'IDLE') {
           if (p.carrying === 'WOOD' && p.onReach === 'DROPPING_WOOD') {
              // let them finish dropping wood
           } else if (p.state === 'MOVING' && p.onReach === 'IDLE' && p.target?.x === myHouse.x) {
              // already heading home
           } else {
              // cancel and go home
              p.state = 'IDLE';
              p.carrying = null;
           }
        }

        if (p.state === 'IDLE') {
          if (p.isResting) {
            if (p.x !== myHouse.x || p.y !== myHouse.y) {
              p.target = { x: myHouse.x, y: myHouse.y };
              p.state = 'MOVING';
              p.onReach = 'IDLE';
            } else {
              // Recover energy
              if (p.energy < 100) {
                p.energy += p.isExhausted ? 0.5 : 1.0;
                if (p.energy >= 100) {
                  p.energy = 100;
                  p.isExhausted = false;
                  if (workerMode !== 'IDLE') {
                    p.isResting = false;
                  }
                }
              } else if (workerMode !== 'IDLE') {
                p.isResting = false;
              }
            }
          } else {
            if (workerMode === 'GATHER') {
              const nextTree = getClosestTree(myHouse, trees, 'PLAYER', p.id);
              if (nextTree) {
                p.target = { x: nextTree.x, y: nextTree.y, tree: nextTree };
                p.state = 'MOVING';
                p.onReach = 'CHOPPING';
              }
            } else if (workerMode === 'PLANT') {
              p.state = 'GETTING_SEED';
              p.timer = 30;
            }
          }
        } else if (p.state === 'MOVING') {
          if (p.target) {
            const dx = p.target.x - p.x;
            const dy = p.target.y - p.y;
            const dist = Math.hypot(dx, dy);
            
            if (dist < SPEED) {
              p.x = p.target.x;
              p.y = p.target.y;
              p.state = p.onReach;
              if (p.state === 'CHOPPING') p.timer = activeCardsRef.current.has('axe') ? 30 : 60;
              if (p.state === 'DROPPING_WOOD') p.timer = 30;
              if (p.state === 'PLANTING') p.timer = 60;
            } else {
              p.x += (dx / dist) * SPEED;
              p.y += (dy / dist) * SPEED;
            }
          }
        } else if (p.state === 'CHOPPING') {
          p.timer--;
          if (p.timer <= 0) {
            if (p.target && p.target.tree && p.target.tree.wood > 0) {
              p.target.tree.wood--;
              p.carrying = 'WOOD';
              p.target = { x: myHouse.x, y: myHouse.y };
              p.state = 'MOVING';
              p.onReach = 'DROPPING_WOOD';
            } else {
              p.state = 'IDLE';
              p.carrying = null;
            }
          }
        } else if (p.state === 'DROPPING_WOOD') {
          p.timer--;
          if (p.timer <= 0) {
            p.carrying = null;
            const extraWood = (activeCardsRef.current.has('old_tree') ? 1 : 0) + (activeCardsRef.current.has('reserves') ? 1 : 0);
            currentWoodRef.current += 2 + extraWood;
            setWood(currentWoodRef.current);
            p.state = 'IDLE';
            p.timer = 0;
          }
        } else if (p.state === 'GETTING_SEED') {
          p.timer--;
          if (p.timer <= 0) {
            p.carrying = 'SEED';
            const pos = getValidTreePosition(trees, 'PLAYER');
            if (pos) {
              p.target = { x: pos.x, y: pos.y };
              p.state = 'MOVING';
              p.onReach = 'PLANTING';
            } else {
              p.state = 'IDLE';
              p.carrying = null;
            }
          }
        } else if (p.state === 'PLANTING') {
          p.timer--;
          if (p.timer <= 0) {
            p.carrying = null;
            trees.push({
              id: nextTreeId++,
              x: p.x,
              y: p.y,
              wood: 0,
              state: 'PLANTED',
              growTime: Date.now() + (activeCardsRef.current.has('forester') ? 30000 : 60000),
              owner: 'PLAYER'
            });
            p.target = { x: myHouse.x, y: myHouse.y };
            p.state = 'MOVING';
            p.onReach = 'IDLE';
          }
        }
      }

      // Update wild boars
      if (Math.random() < 0.01 && wildBoars.length < 5) {
        wildBoars.push({
          x: Math.random() * WORLD_WIDTH,
          y: Math.random() * WORLD_HEIGHT,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
        });
      }
      for (const boar of wildBoars) {
        boar.x += boar.vx;
        boar.y += boar.vy;
        if (boar.x < 0 || boar.x > WORLD_WIDTH) boar.vx *= -1;
        if (boar.y < 0 || boar.y > WORLD_HEIGHT) boar.vy *= -1;
      }

      // Update hunters
      for (const h of hunters) {
        if (!h) continue;
        const myShop = butcherShops.find(s => s && s.id === h.shopId);
        if (!myShop) {
          h.hp = 0;
          continue;
        }
        const workerConfig = workersRef.current.find(w => w && w.id === h.id);
        const workerMode = workerConfig ? workerConfig.mode : 'HUNT';
        
        const isWorking = h.state !== 'IDLE' || (h.state === 'IDLE' && (Math.abs(h.x - myShop.x) > 1 || Math.abs(h.y - myShop.y) > 1));
        if (isWorking) {
          h.energy -= 0.025;
          if (h.energy <= 0 && !h.isExhausted) {
            h.energy = 0;
            h.isExhausted = true;
            h.isResting = true;
            h.state = 'IDLE';
          }
        }
        
        if (h.energy <= restThresholdRef.current || workerMode === 'IDLE') {
          h.isResting = true;
        }

        if (workerMode === 'IDLE' && h.state !== 'MOVING' && h.state !== 'IDLE') {
          h.state = 'IDLE';
          h.targetBoar = null;
          h.target = null;
        }

        if (h.state === 'IDLE') {
          if (h.isResting) {
            if (h.x !== myShop.x || h.y !== myShop.y) {
              h.target = { x: myShop.x, y: myShop.y };
              h.state = 'MOVING';
              h.onReach = 'IDLE';
            } else {
              h.energy += h.isExhausted ? 0.5 : 1.0;
              if (h.energy >= 100) {
                h.energy = 100;
                h.isExhausted = false;
                if (workerMode !== 'IDLE') {
                  h.isResting = false;
                }
              } else if (workerMode !== 'IDLE') {
                h.isResting = false;
              }
            }
          } else if (workerMode === 'HUNT' && wildBoars.length > 0) {
            // Find closest boar
            let closestBoar = null;
            let minDist = Infinity;
            wildBoars.forEach(boar => {
              const dist = Math.hypot(boar.x - h.x, boar.y - h.y);
              if (dist < minDist) {
                minDist = dist;
                closestBoar = boar;
              }
            });
            if (closestBoar) {
              h.targetBoar = closestBoar;
              h.target = { x: closestBoar.x, y: closestBoar.y };
              h.state = 'MOVING';
              h.onReach = 'HUNTING';
            }
          }
        } else if (h.state === 'MOVING') {
          if (h.target) {
            // Update target if hunting
            if (h.onReach === 'HUNTING' && h.targetBoar) {
                if (wildBoars.includes(h.targetBoar)) {
                    h.target = { x: h.targetBoar.x, y: h.targetBoar.y };
                } else {
                    h.state = 'IDLE';
                    h.targetBoar = null;
                    h.target = null;
                }
            }
            
            if (h.target) {
              const dx = h.target.x - h.x;
              const dy = h.target.y - h.y;
              const dist = Math.hypot(dx, dy);
              
              // Check for collision if hunting
              if (h.onReach === 'HUNTING' && h.targetBoar && dist < 10) {
                 h.x = h.target.x;
                 h.y = h.target.y;
                 h.state = 'HUNTING';
                 h.timer = 30;
                 wildBoars.splice(wildBoars.indexOf(h.targetBoar), 1);
                 h.targetBoar = null;
                 h.target = null;
              } else if (dist < SPEED) {
                h.x = h.target.x;
                h.y = h.target.y;
                h.state = h.onReach;
                if (h.state === 'HUNTING') h.timer = activeCardsRef.current.has('trap') ? 15 : 30;
                if (h.state === 'DROPPING_MEAT') h.timer = 30;
              } else {
                h.x += (dx / dist) * SPEED;
                h.y += (dy / dist) * SPEED;
              }
            }
          }
        } else if (h.state === 'HUNTING') {
          h.timer--;
          if (h.timer <= 0) {
            h.carrying = 'MEAT';
            // Find nearest butcher shop
            let nearestShop = butcherShops[0];
            let minDist = Infinity;
            butcherShops.forEach(s => {
                const dist = Math.hypot(s.x - h.x, s.y - h.y);
                if (dist < minDist) {
                    minDist = dist;
                    nearestShop = s;
                }
            });
            if (nearestShop) {
                h.target = { x: nearestShop.x, y: nearestShop.y };
                h.state = 'MOVING';
                h.onReach = 'DROPPING_MEAT';
            } else {
                h.state = 'IDLE';
                h.carrying = null;
            }
          }
        } else if (h.state === 'DROPPING_MEAT') {
          h.timer--;
          if (h.timer <= 0) {
            h.carrying = null;
            const meatAmount = activeCardsRef.current.has('butcher') ? 8 : 4;
            currentMeatRef.current += meatAmount;
            setMeat(currentMeatRef.current);
            h.state = 'IDLE';
            h.timer = 0;
          }
        }
      }

      // Update AI hunters
      for (const h of aiHunters) {
        if (!h) continue;
        const myShop = aiButcherShops.find(s => s && s.id === h.shopId);
        if (!myShop) {
          h.hp = 0;
          continue;
        }
        const isWorking = h.state !== 'IDLE' || (h.state === 'IDLE' && (Math.abs(h.x - myShop.x) > 1 || Math.abs(h.y - myShop.y) > 1));
        if (isWorking) {
          h.energy -= 0.025;
          if (h.energy <= 0 && !h.isExhausted) {
            h.energy = 0;
            h.isExhausted = true;
            h.isResting = true;
            h.state = 'IDLE';
          }
        }
        
        if (h.energy <= 10) h.isResting = true;

        if (h.state === 'IDLE') {
          if (h.isResting) {
            if (h.x !== myShop.x || h.y !== myShop.y) {
              h.target = { x: myShop.x, y: myShop.y };
              h.state = 'MOVING';
              h.onReach = 'IDLE';
            } else {
              h.energy += h.isExhausted ? 0.5 : 1.0;
              if (h.energy >= 100) {
                h.energy = 100;
                h.isExhausted = false;
                h.isResting = false;
              }
            }
          } else if (wildBoars.length > 0) {
            // Find closest boar
            let closestBoar = null;
            let minDist = Infinity;
            wildBoars.forEach(boar => {
              const dist = Math.hypot(boar.x - h.x, boar.y - h.y);
              if (dist < minDist) {
                minDist = dist;
                closestBoar = boar;
              }
            });
            if (closestBoar) {
              h.targetBoar = closestBoar;
              h.target = { x: closestBoar.x, y: closestBoar.y };
              h.state = 'MOVING';
              h.onReach = 'HUNTING';
            }
          }
        } else if (h.state === 'MOVING') {
          if (h.target) {
            if (h.onReach === 'HUNTING' && h.targetBoar) {
                if (wildBoars.includes(h.targetBoar)) {
                    h.target = { x: h.targetBoar.x, y: h.targetBoar.y };
                } else {
                    h.state = 'IDLE';
                    h.targetBoar = null;
                    h.target = null;
                }
            }
            
            if (h.target) {
              const dx = h.target.x - h.x;
              const dy = h.target.y - h.y;
              const dist = Math.hypot(dx, dy);
              
              if (h.onReach === 'HUNTING' && h.targetBoar && dist < 10) {
                 h.x = h.target.x;
                 h.y = h.target.y;
                 h.state = 'HUNTING';
                 h.timer = 30;
                 wildBoars.splice(wildBoars.indexOf(h.targetBoar), 1);
                 h.targetBoar = null;
                 h.target = null;
              } else if (dist < SPEED) {
                h.x = h.target.x;
                h.y = h.target.y;
                h.state = h.onReach;
                if (h.state === 'HUNTING') h.timer = 30;
                if (h.state === 'DROPPING_MEAT') h.timer = 30;
              } else {
                h.x += (dx / dist) * SPEED;
                h.y += (dy / dist) * SPEED;
              }
            }
          }
        } else if (h.state === 'HUNTING') {
          h.timer--;
          if (h.timer <= 0) {
            h.carrying = 'MEAT';
            let nearestShop = aiButcherShops[0];
            let minDist = Infinity;
            aiButcherShops.forEach(s => {
                const dist = Math.hypot(s.x - h.x, s.y - h.y);
                if (dist < minDist) {
                    minDist = dist;
                    nearestShop = s;
                }
            });
            if (nearestShop) {
                h.target = { x: nearestShop.x, y: nearestShop.y };
                h.state = 'MOVING';
                h.onReach = 'DROPPING_MEAT';
            } else {
                h.state = 'IDLE';
                h.carrying = null;
            }
          }
        } else if (h.state === 'DROPPING_MEAT') {
          h.timer--;
          if (h.timer <= 0) {
            h.carrying = null;
            currentAiMeatRef.current += 4;
            setAiMeat(currentAiMeatRef.current);
            h.state = 'IDLE';
            h.timer = 0;
          }
        }
      }

      // --- AI LOGIC ---
      if (currentPhase > 4) {
      // AI House Building
      if (aiHouseTimer > 0) aiHouseTimer--;
      const aiHouseCost = 25 * Math.pow(4, aiHouses.length - 1);
      if (aiHouseTimer <= 0 && currentAiWoodRef.current >= aiHouseCost && aiHouses.length < 5) {
        const pos = getValidBuildingPosition('AI');
        if (pos) {
          currentAiWoodRef.current -= aiHouseCost;
          setAiWood(currentAiWoodRef.current);
          const houseId = nextBuildingId++;
          aiHouses.push({ id: houseId, x: pos.x, y: pos.y, hp: 100, spawnTimer: 3600 });
          setAiHouseCount(aiHouses.length);
          aiCharacters.push({
            id: nextCharId++,
            houseId: houseId,
            x: pos.x,
            y: pos.y,
            state: 'IDLE',
            target: null,
            onReach: 'IDLE',
            timer: 0,
            carrying: null,
            energy: 100,
            isExhausted: false,
            isResting: false,
            currentMode: 'GATHER' as GameMode,
            hp: 10,
          });
          aiHouseTimer = 600; // 10 seconds cooldown
        }
      }

      // AI Butcher Shops
      if (aiButcherTimer > 0) aiButcherTimer--;
      const butcherShopCost = 100 * Math.pow(2, aiButcherShops.length);
      if (aiButcherTimer <= 0 && currentAiWoodRef.current >= butcherShopCost && aiHouses.length > 1 && aiButcherShops.length < 2) {
        const pos = getValidBuildingPosition('AI');
        if (pos) {
          currentAiWoodRef.current -= butcherShopCost;
          setAiWood(currentAiWoodRef.current);
          const shopId = nextBuildingId++;
          aiButcherShops.push({ id: shopId, x: pos.x, y: pos.y, hp: 100 });
          setAiButcherShopCount(aiButcherShops.length);
          aiHunters.push({
            id: nextCharId++,
            shopId: shopId,
            x: pos.x,
            y: pos.y,
            state: 'IDLE',
            target: null,
            onReach: 'IDLE',
            timer: 0,
            energy: 100,
            isExhausted: false,
            isResting: false,
            targetBoar: null,
            hp: 10,
          });
          aiButcherTimer = 1200; // 20 seconds cooldown
        }
      }

      // AI Forts
      if (aiFortTimer > 0) aiFortTimer--;
      const aiFortCost = 50 * Math.pow(2, aiForts.length); // Wood + Meat
      if (aiFortTimer <= 0 && aiButcherShops.length > 0 && currentAiWoodRef.current >= aiFortCost && currentAiMeatRef.current >= aiFortCost && aiForts.length < 2) {
        const pos = getValidBuildingPosition('AI');
        if (pos) {
          currentAiWoodRef.current -= aiFortCost;
          currentAiMeatRef.current -= aiFortCost;
          setAiWood(currentAiWoodRef.current);
          setAiMeat(currentAiMeatRef.current);
          aiForts.push({ id: nextBuildingId++, x: pos.x, y: pos.y, hp: 100 });
          setAiFortCount(aiForts.length);
          aiFortTimer = 1800; // 30 seconds cooldown
        }
      }

        // AI Soldiers
        if (aiSoldierTimer > 0) aiSoldierTimer--;
        if (aiSoldierTimer <= 0 && aiForts.length > 0 && currentAiMeatRef.current >= 50 && aiSoldiers.length < 10) {
          currentAiMeatRef.current -= 50;
          setAiMeat(currentAiMeatRef.current);
          aiSoldiers.push({ 
            id: nextCharId++,
            x: aiForts[0].x, 
            y: aiForts[0].y, 
            hp: 20,
            state: 'IDLE',
            target: null,
            onReach: 'IDLE',
            timer: 0,
            energy: 100,
            isExhausted: false,
            isResting: false,
            lastRestTime: 0,
          });
          setAiSoldierCount(aiSoldiers.length);
          aiSoldierTimer = 600; // 10 seconds cooldown
        }
      } // End of if (currentPhase > 3)

      for (const aiPerson of aiCharacters) {
        if (!aiPerson) continue;
        const myHouse = aiHouses.find(h => h && h.id === aiPerson.houseId);
        if (!myHouse) {
          aiPerson.hp = 0;
          continue;
        }

        const isWorking = aiPerson.state !== 'IDLE' || (aiPerson.state === 'IDLE' && (Math.abs(aiPerson.x - myHouse.x) > 1 || Math.abs(aiPerson.y - myHouse.y) > 1));
        
        // NEW: Hide if enemy soldier is nearby
        const enemySoldierNearby = playerSoldiers.some(s => s && Math.hypot(s.x - aiPerson.x, s.y - aiPerson.y) < 150);
        if (enemySoldierNearby) {
          aiPerson.isResting = true;
        }

        if (isWorking) {
          aiPerson.energy -= 0.025;
          if (aiPerson.energy <= 0 && !aiPerson.isExhausted) {
            aiPerson.energy = 0;
            aiPerson.isExhausted = true;
            aiPerson.isResting = true;
            aiPerson.state = 'IDLE';
            aiPerson.carrying = null;
          }
        }

        if (aiPerson.energy <= 10) {
          aiPerson.isResting = true;
        }

        if (aiPerson.isResting && aiPerson.state !== 'IDLE') {
           if (aiPerson.carrying === 'WOOD' && aiPerson.onReach === 'DROPPING_WOOD') {
              // let them finish dropping wood
           } else if (aiPerson.state === 'MOVING' && aiPerson.onReach === 'IDLE' && aiPerson.target?.x === myHouse.x) {
              // already heading home
           } else {
              // cancel and go home
              aiPerson.state = 'IDLE';
              aiPerson.carrying = null;
           }
        }

        if (aiPerson.state === 'IDLE') {
          if (aiPerson.isResting) {
            if (aiPerson.x !== myHouse.x || aiPerson.y !== myHouse.y) {
              aiPerson.target = { x: myHouse.x, y: myHouse.y };
              aiPerson.state = 'MOVING';
              aiPerson.onReach = 'IDLE';
            } else {
              if (aiPerson.energy < 100) {
                aiPerson.energy += aiPerson.isExhausted ? 0.5 : 1.0;
                if (aiPerson.energy >= 100) {
                  aiPerson.energy = 100;
                  aiPerson.isExhausted = false;
                  aiPerson.isResting = false;
                  aiPerson.currentMode = Math.random() > 0.3 ? 'GATHER' : 'PLANT';
                }
              } else {
                aiPerson.isResting = false;
              }
            }
          } else {
            if (aiPerson.currentMode === 'GATHER') {
              const nextTree = getClosestTree(myHouse, trees, 'AI', aiPerson.id);
              if (nextTree) {
                aiPerson.target = { x: nextTree.x, y: nextTree.y, tree: nextTree };
                aiPerson.state = 'MOVING';
                aiPerson.onReach = 'CHOPPING';
              } else {
                aiPerson.currentMode = 'PLANT';
              }
            } else if (aiPerson.currentMode === 'PLANT') {
              aiPerson.state = 'GETTING_SEED';
              aiPerson.timer = 30;
            }
          }
        } else if (aiPerson.state === 'MOVING') {
          if (aiPerson.target) {
            const dx = aiPerson.target.x - aiPerson.x;
            const dy = aiPerson.target.y - aiPerson.y;
            const dist = Math.hypot(dx, dy);
            
            if (dist < SPEED) {
              aiPerson.x = aiPerson.target.x;
              aiPerson.y = aiPerson.target.y;
              aiPerson.state = aiPerson.onReach;
              if (aiPerson.state === 'CHOPPING') aiPerson.timer = 60;
              if (aiPerson.state === 'DROPPING_WOOD') aiPerson.timer = 30;
              if (aiPerson.state === 'PLANTING') aiPerson.timer = 60;
            } else {
              aiPerson.x += (dx / dist) * SPEED;
              aiPerson.y += (dy / dist) * SPEED;
            }
          }
        } else if (aiPerson.state === 'CHOPPING') {
          aiPerson.timer--;
          if (aiPerson.timer <= 0) {
            if (aiPerson.target && aiPerson.target.tree && aiPerson.target.tree.wood > 0) {
              aiPerson.target.tree.wood--;
              aiPerson.carrying = 'WOOD';
              aiPerson.target = { x: myHouse.x, y: myHouse.y };
              aiPerson.state = 'MOVING';
              aiPerson.onReach = 'DROPPING_WOOD';
            } else {
              aiPerson.state = 'IDLE';
              aiPerson.carrying = null;
            }
          }
        } else if (aiPerson.state === 'DROPPING_WOOD') {
          aiPerson.timer--;
          if (aiPerson.timer <= 0) {
            aiPerson.carrying = null;
            currentAiWoodRef.current += 2;
            setAiWood(currentAiWoodRef.current);
            aiPerson.state = 'IDLE';
          }
        } else if (aiPerson.state === 'GETTING_SEED') {
          aiPerson.timer--;
          if (aiPerson.timer <= 0) {
            aiPerson.carrying = 'SEED';
            const pos = getValidTreePosition(trees, 'AI');
            if (pos) {
              aiPerson.target = { x: pos.x, y: pos.y };
              aiPerson.state = 'MOVING';
              aiPerson.onReach = 'PLANTING';
            } else {
              aiPerson.state = 'IDLE';
              aiPerson.carrying = null;
            }
          }
        } else if (aiPerson.state === 'PLANTING') {
          aiPerson.timer--;
          if (aiPerson.timer <= 0) {
            aiPerson.carrying = null;
            trees.push({
              id: nextTreeId++,
              x: aiPerson.x,
              y: aiPerson.y,
              wood: 0,
              state: 'PLANTED',
              growTime: Date.now() + 60000,
              owner: 'AI'
            });
            aiPerson.target = { x: myHouse.x, y: myHouse.y };
            aiPerson.state = 'MOVING';
            aiPerson.onReach = 'IDLE';
          }
        }
      }
    };

    const draw = (ctx: CanvasRenderingContext2D) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      // Auto-resize canvas to match CSS responsive size
      if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
      }

      // Clear screen (Infinite field color)
      ctx.fillStyle = '#fef9c3'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      
      // Apply Camera Transform
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(cameraRef.current.zoom, cameraRef.current.zoom);
      ctx.translate(-cameraRef.current.x, -cameraRef.current.y);

      // Draw base world layer (infinite field matches outside naturally)
      ctx.fillStyle = '#fef9c3';
      ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

      const drawHP = (x: number, y: number, current: number, max: number, color: string) => {
        ctx.fillStyle = '#d4d4d8';
        ctx.fillRect(x - 10, y + 10, 20, 3);
        ctx.fillStyle = color;
        ctx.fillRect(x - 10, y + 10, 20 * (current / max), 3);
        ctx.strokeStyle = '#52525b';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x - 10, y + 10, 20, 3);
      };

      const drawPixelHouse = (x: number, y: number, isAi: boolean) => {
        if (houseImageRef.current && houseImageRef.current.complete) {
          // Draw the custom house image
          // Center the image on (x, y)
          const width = 32;
          const height = 32;
          ctx.drawImage(houseImageRef.current, x - width / 2, y - height / 2, width, height);
          
          // Add a small indicator for AI houses if needed, or just rely on the image
          if (isAi) {
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            ctx.strokeRect(x - width / 2, y - height / 2, width, height);
          }
          return;
        }
        
        // Fallback if image is not loaded
        ctx.fillStyle = isAi ? '#991b1b' : '#d9a347';
        ctx.fillRect(x - 16, y - 16, 32, 32);
      };

      // Draw Player Houses
      playerHouses.forEach(h => {
        if (!h) return;
        drawPixelHouse(h.x, h.y, false);
        drawHP(h.x, h.y + 15, h.hp, 100, '#16a34a');
      });

      // Draw Trees ('a' in green/blue, 'p' for planted)
      // Viewport Culling & Z-Index Sorting
      const viewW = canvas.width / cameraRef.current.zoom;
      const viewH = canvas.height / cameraRef.current.zoom;
      const viewX = cameraRef.current.x - viewW / 2 - 100;
      const viewY = cameraRef.current.y - viewH / 2 - 100;
      const maxViewX = cameraRef.current.x + viewW / 2 + 100;
      const maxViewY = cameraRef.current.y + viewH / 2 + 100;

      ctx.font = 'bold 24px monospace';
      
      const visibleTrees = trees.filter(t => t.x >= viewX && t.x <= maxViewX && t.y >= viewY && t.y <= maxViewY);
      
      [...visibleTrees].sort((a, b) => a.y - b.y).forEach((t) => {
        if (t.state === 'GROWN' && (t.wood > 0 || t.owner === 'BORDER')) {
          const isBorder = t.owner === 'BORDER';
          const img = isBorder ? borderTreeImageRef.current : grownTreeImageRef.current;
          if (img && img.complete) {
            const width = 32;
            const height = 32;
            ctx.drawImage(img, t.x - width / 2, t.y - height / 2.5, width, height);
          } else {
            ctx.fillStyle = t.owner === 'PLAYER' ? '#2563eb' : '#16a34a'; // blue-600 : green-600
            ctx.fillText(isBorder ? 'B' : 'a', t.x, t.y);
          }
        } else if (t.state === 'PLANTED') {
          if (plantedTreeImageRef.current && plantedTreeImageRef.current.complete) {
            const width = 24;
            const height = 24;
            ctx.drawImage(plantedTreeImageRef.current, t.x - width / 2, t.y - height / 2.5, width, height);
          } else {
            ctx.fillStyle = t.owner === 'PLAYER' ? '#60a5fa' : '#84cc16'; // blue-400 : lime-500
            ctx.fillText('p', t.x, t.y);
          }
        }
      });

      // Draw Player Characters
      playerCharacters.forEach(p => {
        if (!p) return;
        const angle = p.id * 2.39996;
        const r = 35 + (p.id % 3) * 5;
        const px = p.x + Math.cos(angle) * r;
        const py = p.y + Math.sin(angle) * r;
        ctx.fillStyle = 'black';
        ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
        
        if (p.carrying === 'WOOD') {
          ctx.fillStyle = '#8B4513';
          ctx.fillRect(p.x - 4, p.y - 8, 8, 3);
        } else if (p.carrying === 'SEED') {
          ctx.fillStyle = '#60a5fa';
          ctx.fillRect(p.x - 2, p.y - 6, 4, 4);
        }

        ctx.fillStyle = '#d4d4d8';
        ctx.fillRect(p.x - 10, p.y - 15, 20, 4);
        ctx.fillStyle = p.isExhausted ? '#ef4444' : '#3b82f6';
        ctx.fillRect(p.x - 10, p.y - 15, 20 * (p.energy / 100), 4);
        ctx.strokeStyle = '#52525b';
        ctx.strokeRect(p.x - 10, p.y - 15, 20, 4);
        
        drawHP(p.x, p.y - 30, p.hp, 10, '#ef4444');

        const workerConfig = workersRef.current.find(w => w && w.id === p.id);
        if (workerConfig) {
          ctx.fillStyle = '#1e3a8a';
          ctx.font = '10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(workerConfig.name, p.x, p.y - 30);
        }
      });

      // Draw AI Houses
      if (currentPhase > 4) {
        aiHouses.forEach(h => {
          if (!h) return;
          drawPixelHouse(h.x, h.y, true);
          drawHP(h.x, h.y + 15, h.hp, 100, '#ef4444');
        });
      }

      // Draw AI Characters
      if (currentPhase > 4) {
        aiCharacters.forEach(p => {
          if (!p) return;
          const angle = p.id * 2.39996;
          const r = 35 + (p.id % 3) * 5;
          const px = p.x + Math.cos(angle) * r;
          const py = p.y + Math.sin(angle) * r;
          ctx.fillStyle = '#dc2626';
          ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
          
          if (p.carrying === 'WOOD') {
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(p.x - 4, p.y - 8, 8, 3);
          } else if (p.carrying === 'SEED') {
            ctx.fillStyle = '#84cc16';
            ctx.fillRect(p.x - 2, p.y - 6, 4, 4);
          }

          ctx.fillStyle = '#d4d4d8';
          ctx.fillRect(p.x - 10, p.y - 15, 20, 4);
          ctx.fillStyle = p.isExhausted ? '#ef4444' : '#dc2626';
          ctx.fillRect(p.x - 10, p.y - 15, 20 * (p.energy / 100), 4);
          ctx.strokeStyle = '#52525b';
          ctx.strokeRect(p.x - 10, p.y - 15, 20, 4);

          drawHP(p.x, p.y - 30, p.hp, 10, '#ef4444');
        });
      }

      // Draw Butcher Shops ('C' in red)
      ctx.fillStyle = '#991b1b'; // red-800
      ctx.font = 'bold 28px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      butcherShops.forEach(h => {
        if (!h) return;
        ctx.fillText('C', h.x, h.y);
        drawHP(h.x, h.y + 5, h.hp, 100, '#16a34a');
      });

      // Draw AI Butcher Shops ('C' in dark red)
      if (currentPhase > 4) {
        ctx.fillStyle = '#7f1d1d'; // red-900
        aiButcherShops.forEach(h => {
          if (!h) return;
          ctx.fillText('C', h.x, h.y);
          drawHP(h.x, h.y + 5, h.hp, 100, '#ef4444');
        });
      }

      // Draw Hunters
      hunters.forEach(h => {
        if (!h) return;
        const angle = h.id * 2.39996;
        const r = 35 + (h.id % 3) * 5;
        const px = h.x + Math.cos(angle) * r;
        const py = h.y + Math.sin(angle) * r;
        ctx.fillStyle = '#7c3aed'; // violet-600
        ctx.fillRect(h.x - 3, h.y - 3, 6, 6);
        
        ctx.fillStyle = '#d4d4d8';
        ctx.fillRect(h.x - 10, h.y - 15, 20, 4);
        ctx.fillStyle = h.isExhausted ? '#ef4444' : '#7c3aed';
        ctx.fillRect(h.x - 10, h.y - 15, 20 * (h.energy / 100), 4);
        ctx.strokeStyle = '#52525b';
        ctx.strokeRect(h.x - 10, h.y - 15, 20, 4);

        drawHP(h.x, h.y - 30, h.hp, 10, '#ef4444');

        const workerConfig = workersRef.current.find(w => w && w.id === h.id);
        if (workerConfig) {
          ctx.fillStyle = '#5b21b6';
          ctx.font = '10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(workerConfig.name, h.x, h.y - 30);
        }
      });

      // Draw AI Hunters
      if (currentPhase > 4) {
        aiHunters.forEach(h => {
          if (!h) return;
          const angle = h.id * 2.39996;
          const r = 35 + (h.id % 3) * 5;
          const px = h.x + Math.cos(angle) * r;
          const py = h.y + Math.sin(angle) * r;
          ctx.fillStyle = '#be185d'; // pink-700
          ctx.fillRect(h.x - 3, h.y - 3, 6, 6);
          
          ctx.fillStyle = '#d4d4d8';
          ctx.fillRect(h.x - 10, h.y - 15, 20, 4);
          ctx.fillStyle = h.isExhausted ? '#ef4444' : '#be185d';
          ctx.fillRect(h.x - 10, h.y - 15, 20 * (h.energy / 100), 4);
          ctx.strokeStyle = '#52525b';
          ctx.strokeRect(h.x - 10, h.y - 15, 20, 4);

          drawHP(h.x, h.y - 30, h.hp, 10, '#ef4444');
        });
      }

      // Draw Forts ('F' or fuerte.png)
      playerForts.forEach(f => {
        if (!f) return;
        if (fortImageRef.current && fortImageRef.current.complete) {
          const width = 48; 
          const height = 48;
          ctx.drawImage(fortImageRef.current, f.x - width / 2, f.y - height / 2, width, height);
        } else {
          ctx.fillStyle = '#1e40af'; // blue-800
          ctx.font = 'bold 32px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('F', f.x, f.y);
        }
        drawHP(f.x, f.y + 20, f.hp, 100, '#16a34a');
      });
      
      // Draw AI Forts ('F' or fuerte.png)
      if (currentPhase > 4) {
        aiForts.forEach(f => {
          if (!f) return;
          if (fortImageRef.current && fortImageRef.current.complete) {
            const width = 48;
            const height = 48;
            ctx.drawImage(fortImageRef.current, f.x - width / 2, f.y - height / 2, width, height);
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            ctx.strokeRect(f.x - width / 2, f.y - height / 2, width, height);
          } else {
            ctx.fillStyle = '#9f1239'; // rose-800
            ctx.font = 'bold 32px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('F', f.x, f.y);
          }
          drawHP(f.x, f.y + 20, f.hp, 100, '#ef4444');
        });
      }

      // Draw Player Soldiers
      playerSoldiers.forEach(s => {
        if (!s) return;
        const angle = s.id * 2.39996;
        const r = 35 + (s.id % 3) * 5;
        const px = s.x + Math.cos(angle) * r;
        const py = s.y + Math.sin(angle) * r;
        ctx.fillStyle = '#2563eb'; // blue-600
        ctx.fillRect(s.x - 5, s.y - 5, 10, 10);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(s.x - 5, s.y - 5, 10, 10);
        drawHP(s.x, s.y - 15, s.hp, 20, '#ef4444');

        if (s.state === 'ATTACKING' && s.target) {
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(s.target.x, s.target.y);
          ctx.stroke();
          const dx = s.target.x - s.x;
          const dy = s.target.y - s.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 5) {
            const headX = s.x + (dx / dist) * (dist - 5);
            const headY = s.y + (dy / dist) * (dist - 5);
            ctx.fillStyle = '#475569';
            ctx.beginPath();
            ctx.arc(headX, headY, 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Draw energy bar for soldiers
        ctx.fillStyle = '#d4d4d8';
        ctx.fillRect(s.x - 10, s.y - 10, 20, 3);
        ctx.fillStyle = s.isResting ? '#ef4444' : '#2563eb';
        ctx.fillRect(s.x - 10, s.y - 10, 20 * (s.energy / 100), 3);
        ctx.strokeStyle = '#52525b';
        ctx.strokeRect(s.x - 10, s.y - 10, 20, 3);

        const workerConfig = workersRef.current.find(w => w && w.id === s.id);
        if (workerConfig) {
          ctx.fillStyle = '#1e40af';
          ctx.font = '10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(workerConfig.name, s.x, s.y - 20);
        }
      });

      // Draw AI Soldiers
      aiSoldiers.forEach(s => {
        if (!s) return;
        const angle = s.id * 2.39996;
        const r = 35 + (s.id % 3) * 5;
        const px = s.x + Math.cos(angle) * r;
        const py = s.y + Math.sin(angle) * r;
        ctx.fillStyle = '#e11d48'; // rose-600
        ctx.fillRect(s.x - 5, s.y - 5, 10, 10);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(s.x - 5, s.y - 5, 10, 10);
        drawHP(s.x, s.y - 15, s.hp, 20, '#ef4444');

        if (s.state === 'ATTACKING' && s.target) {
          ctx.strokeStyle = '#fca5a5';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(s.target.x, s.target.y);
          ctx.stroke();
          const dx = s.target.x - s.x;
          const dy = s.target.y - s.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 5) {
            const headX = s.x + (dx / dist) * (dist - 5);
            const headY = s.y + (dy / dist) * (dist - 5);
            ctx.fillStyle = '#991b1b';
            ctx.beginPath();
            ctx.arc(headX, headY, 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Draw energy bar for soldiers
        ctx.fillStyle = '#d4d4d8';
        ctx.fillRect(s.x - 10, s.y - 10, 20, 3);
        ctx.fillStyle = s.isResting ? '#ef4444' : '#e11d48';
        ctx.fillRect(s.x - 10, s.y - 10, 20 * (s.energy / 100), 3);
        ctx.strokeStyle = '#52525b';
        ctx.strokeRect(s.x - 10, s.y - 10, 20, 3);
      });

      // Draw Wild Boars ('J')
      ctx.fillStyle = '#57534e';
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      wildBoars.forEach(b => {
        ctx.fillText('J', b.x, b.y);
      });

      // Draw Player Markets ('M' in yellow-gold)
      ctx.fillStyle = '#ca8a04';
      ctx.font = 'bold 30px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      playerMarkets.forEach(m => {
        if (!m) return;
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(m.x - 18, m.y - 18, 36, 36);
        ctx.fillStyle = '#78350f';
        ctx.font = 'bold 22px monospace';
        ctx.fillText('M', m.x, m.y);
        drawHP(m.x, m.y + 22, m.hp, 200, '#16a34a');
      });
    };

    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, [gameState, currentPhase]);

  if (gameState === 'MAP') {
    return (
      <div className="min-h-screen bg-emerald-900 flex flex-col items-center justify-center p-4 font-sans pattern-isometric">
        <h1 className="text-5xl font-black text-white mb-12 drop-shadow-lg italic tracking-tight">MAPA DE MUNDO</h1>
        
        <div className="flex gap-8 items-center bg-emerald-800/80 p-12 rounded-3xl shadow-2xl backdrop-blur-md border border-emerald-700/50">
          {/* Phase 1 */}
          <div className="flex flex-col items-center gap-3">
            <button 
              onClick={() => { setCurrentPhase(1); setGameState('PLAYING'); }}
              className="w-24 h-24 rounded-full bg-amber-400 border-4 border-amber-200 flex items-center justify-center text-3xl font-black text-amber-900 shadow-[0_10px_0_theme(colors.amber.600)] hover:translate-y-2 hover:shadow-[0_2px_0_theme(colors.amber.600)] transition-all cursor-pointer"
            >
              1
            </button>
            <span className="text-emerald-100 font-bold tracking-wide">La Tala</span>
          </div>

          <div className="w-16 h-4 border-y-4 border-dashed border-emerald-700"></div>

          {/* Phase 2 */}
          <div className={`flex flex-col items-center gap-3 ${maxUnlockedPhase < 2 ? 'opacity-50' : ''}`}>
            <button 
              disabled={maxUnlockedPhase < 2}
              onClick={() => { setCurrentPhase(2); setGameState('PLAYING'); }}
              className={`w-24 h-24 rounded-full border-4 flex items-center justify-center text-3xl font-black transition-all ${maxUnlockedPhase >= 2 ? 'cursor-pointer bg-sky-400 border-sky-200 text-sky-900 shadow-[0_10px_0_theme(colors.sky.600)] hover:translate-y-2 hover:shadow-[0_2px_0_theme(colors.sky.600)]' : 'cursor-not-allowed bg-slate-400 border-slate-300 text-slate-800 shadow-[0_10px_0_theme(colors.slate.600)]'}`}
            >
              2
            </button>
            <span className="text-emerald-100 font-bold tracking-wide">La Aldea</span>
          </div>

          <div className="w-16 h-4 border-y-4 border-dashed border-emerald-700"></div>

          {/* Phase 3 */}
          <div className={`flex flex-col items-center gap-3 ${maxUnlockedPhase < 3 ? 'opacity-50' : ''}`}>
            <button 
              disabled={maxUnlockedPhase < 3}
              onClick={() => { setCurrentPhase(3); setGameState('PLAYING'); }}
              className={`w-24 h-24 rounded-full border-4 flex items-center justify-center text-3xl font-black transition-all ${maxUnlockedPhase >= 3 ? 'cursor-pointer bg-red-400 border-red-200 text-red-900 shadow-[0_10px_0_theme(colors.red.600)] hover:translate-y-2 hover:shadow-[0_2px_0_theme(colors.red.600)]' : 'cursor-not-allowed bg-slate-400 border-slate-300 text-slate-800 shadow-[0_10px_0_theme(colors.slate.600)]'}`}
            >
              3
            </button>
            <span className="text-emerald-100 font-bold tracking-wide">La Caza</span>
          </div>

          <div className="w-16 h-4 border-y-4 border-dashed border-emerald-700"></div>

          {/* Phase 4 */}
          <div className={`flex flex-col items-center gap-3 ${maxUnlockedPhase < 4 ? 'opacity-50' : ''}`}>
            <button 
              disabled={maxUnlockedPhase < 4}
              onClick={() => { setCurrentPhase(4); setGameState('PLAYING'); }}
              className={`w-24 h-24 rounded-full border-4 flex items-center justify-center text-3xl font-black transition-all ${maxUnlockedPhase >= 4 ? 'cursor-pointer bg-yellow-400 border-yellow-200 text-yellow-900 shadow-[0_10px_0_theme(colors.yellow.600)] hover:translate-y-2 hover:shadow-[0_2px_0_theme(colors.yellow.600)]' : 'cursor-not-allowed bg-slate-400 border-slate-300 text-slate-800 shadow-[0_10px_0_theme(colors.slate.600)]'}`}
            >
              4
            </button>
            <span className="text-emerald-100 font-bold tracking-wide">{maxUnlockedPhase >= 4 ? 'El Comercio' : 'Próximamente'}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-stone-900 flex flex-col overflow-hidden font-sans">
      
      {/* Top Game View */}
      <div className="flex-1 relative flex overflow-hidden bg-[#fef9c3] min-h-0">
        <canvas
          ref={canvasRef}
          width={WORLD_WIDTH}
          height={WORLD_HEIGHT}
          onMouseDown={(e) => {
            isDraggingRef.current = true;
            lastMousePosRef.current = { x: e.clientX, y: e.clientY };
          }}
          onMouseMove={(e) => {
            if (!isDraggingRef.current) return;
            const dx = e.clientX - lastMousePosRef.current.x;
            const dy = e.clientY - lastMousePosRef.current.y;
            targetCameraRef.current.x -= dx / targetCameraRef.current.zoom;
            targetCameraRef.current.y -= dy / targetCameraRef.current.zoom;
            
            // Constrain camera center to keep the forest as a visual edge
            const BORDER = 1200;
            targetCameraRef.current.x = Math.max(-BORDER, Math.min(WORLD_WIDTH + BORDER, targetCameraRef.current.x));
            targetCameraRef.current.y = Math.max(-BORDER, Math.min(WORLD_HEIGHT + BORDER, targetCameraRef.current.y));

            lastMousePosRef.current = { x: e.clientX, y: e.clientY };
          }}
          onMouseUp={() => isDraggingRef.current = false}
          onMouseLeave={() => isDraggingRef.current = false}
          onWheel={(e) => {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (!rect) return;
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const oldZoom = targetCameraRef.current.zoom;
            const zoomAmount = e.deltaY * -0.0015;

            // Compute minimum zoom so the viewport never exceeds the tree-covered area
            // Trees extend ~1200px beyond world boundary in each direction
            const safeExtent = 1200;
            const minZoomX = rect.width / (WORLD_WIDTH + safeExtent * 2);
            const minZoomY = rect.height / (WORLD_HEIGHT + safeExtent * 2);
            const minZoom = Math.max(minZoomX, minZoomY);

            const newZoom = Math.min(Math.max(minZoom, oldZoom + zoomAmount), 3);
            
            const worldX = targetCameraRef.current.x + (mouseX - rect.width / 2) / oldZoom;
            const worldY = targetCameraRef.current.y + (mouseY - rect.height / 2) / oldZoom;
            
            targetCameraRef.current.x = worldX - (mouseX - rect.width / 2) / newZoom;
            targetCameraRef.current.y = worldY - (mouseY - rect.height / 2) / newZoom;
            
            // Constrain camera center to keep the forest as a visual edge
            const BORDER = 1200;
            targetCameraRef.current.x = Math.max(-BORDER, Math.min(WORLD_WIDTH + BORDER, targetCameraRef.current.x));
            targetCameraRef.current.y = Math.max(-BORDER, Math.min(WORLD_HEIGHT + BORDER, targetCameraRef.current.y));
            
            targetCameraRef.current.zoom = newZoom;
          }}
          className="w-full h-full bg-[#fef9c3] cursor-grab active:cursor-grabbing border-b-4 border-amber-700"
          style={{ display: 'block', touchAction: 'none' }}
        />
        
        {/* Tutorial Overlay */}
        {showTutorial && PHASE_TUTORIAL[currentPhase] && (
          <div className="absolute inset-0 bg-black/75 flex items-center justify-center z-40 backdrop-blur-sm">
            <div className="bg-stone-900 border-2 border-amber-500 rounded-2xl p-8 max-w-lg w-full mx-4 shadow-[0_0_60px_rgba(245,158,11,0.3)]">
              <h2 className="text-3xl font-black text-amber-400 mb-1 tracking-tight">{PHASE_TUTORIAL[currentPhase].title}</h2>
              <div className="w-16 h-1 bg-amber-500 rounded mb-5" />
              <ul className="space-y-3 mb-6">
                {PHASE_TUTORIAL[currentPhase].steps.map((step, i) => (
                  <li key={i} className="flex gap-3 text-stone-200">
                    <span className="text-amber-500 font-black mt-0.5">{i + 1}.</span>
                    <span className="text-sm leading-relaxed">{step}</span>
                  </li>
                ))}
              </ul>
              <div className="bg-amber-950/50 border border-amber-700/50 rounded-lg p-3 mb-6">
                <p className="text-amber-300 font-bold text-sm">{PHASE_TUTORIAL[currentPhase].goal}</p>
              </div>
              <button
                onClick={() => setShowTutorial(false)}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-amber-950 font-black text-lg rounded-xl transition-colors tracking-wide"
              >
                ¡Entendido! →
              </button>
            </div>
          </div>
        )}

        {/* Market Shop Modal */}
        {marketOpen && currentPhase === 4 && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-40 backdrop-blur-sm">
            <div className="bg-stone-900 border-2 border-yellow-500 rounded-2xl p-6 max-w-2xl w-full mx-4 shadow-[0_0_60px_rgba(234,179,8,0.3)] max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-black text-yellow-400">🏪 Tienda del Mercader</h2>
                <div className="flex items-center gap-3">
                  <span className="text-yellow-300 font-black text-lg">💰 {gold} oro</span>
                  <button onClick={() => setMarketOpen(false)} className="text-stone-400 hover:text-white text-2xl font-bold">×</button>
                </div>
              </div>

              {/* Exchange section */}
              <div className="bg-stone-800 rounded-xl p-4 mb-5">
                <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">Intercambio de recursos</p>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => { if (wood >= 10) { setWood(w => w - 10); currentWoodRef.current -= 10; const bonus = activeCards.some(c => c.id === 'trade_net') ? 2 : 1; setGold(g => g + bonus); currentGoldRef.current += bonus; } }}
                    disabled={wood < 10}
                    className="px-3 py-2 bg-amber-800 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-bold text-amber-200 transition-colors"
                  >
                    10 🪵 → {activeCards.some(c => c.id === 'trade_net') ? 2 : 1} 💰
                  </button>
                  <button
                    onClick={() => { if (wood >= 50) { setWood(w => w - 50); currentWoodRef.current -= 50; const bonus = activeCards.some(c => c.id === 'trade_net') ? 8 : 5; setGold(g => g + bonus); currentGoldRef.current += bonus; } }}
                    disabled={wood < 50}
                    className="px-3 py-2 bg-amber-800 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-bold text-amber-200 transition-colors"
                  >
                    50 🪵 → {activeCards.some(c => c.id === 'trade_net') ? 8 : 5} 💰
                  </button>
                  <button
                    onClick={() => { if (meat >= 5) { setMeat(m => m - 5); currentMeatRef.current -= 5; const bonus = activeCards.some(c => c.id === 'trade_net') ? 2 : 1; setGold(g => g + bonus); currentGoldRef.current += bonus; } }}
                    disabled={meat < 5}
                    className="px-3 py-2 bg-red-900 hover:bg-red-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-bold text-red-200 transition-colors"
                  >
                    5 🥩 → {activeCards.some(c => c.id === 'trade_net') ? 2 : 1} 💰
                  </button>
                  <button
                    onClick={() => { if (meat >= 20) { setMeat(m => m - 20); currentMeatRef.current -= 20; const bonus = activeCards.some(c => c.id === 'trade_net') ? 6 : 4; setGold(g => g + bonus); currentGoldRef.current += bonus; } }}
                    disabled={meat < 20}
                    className="px-3 py-2 bg-red-900 hover:bg-red-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-bold text-red-200 transition-colors"
                  >
                    20 🥩 → {activeCards.some(c => c.id === 'trade_net') ? 6 : 4} 💰
                  </button>
                </div>
              </div>

              {/* Cards in deck */}
              <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">Cartas disponibles ({deck.length} restantes)</p>
              {deck.length === 0 ? (
                <p className="text-stone-500 text-sm italic">No quedan cartas en el mazo.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {deck.map((card, i) => (
                    <div key={card.id} className={`rounded-xl border-2 p-4 flex flex-col gap-2 transition-all ${
                      i === 0 ? 'border-yellow-500 bg-yellow-950/40' : 'border-stone-700 bg-stone-800/50 opacity-50'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{card.icon}</span>
                        <span className="font-black text-sm text-white">{card.name}</span>
                      </div>
                      <p className="text-xs text-stone-300 leading-relaxed flex-1">{card.effect}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-yellow-400 font-black text-sm">💰 {card.cost} oro</span>
                        {i === 0 ? (
                          <button
                            onClick={() => {
                              if (gold >= card.cost) {
                                setGold(g => g - card.cost);
                                currentGoldRef.current -= card.cost;
                                setActiveCards(prev => [...prev, card]);
                                setDeck(prev => prev.slice(1));
                              }
                            }}
                            disabled={gold < card.cost}
                            className="px-3 py-1 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed text-yellow-950 font-black text-xs rounded-lg transition-colors"
                          >
                            Comprar
                          </button>
                        ) : (
                          <span className="text-stone-600 text-xs italic">Bloqueada</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Active cards */}
              {activeCards.length > 0 && (
                <>
                  <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-3">Cartas activas ({activeCards.length}/3 para ganar)</p>
                  <div className="flex flex-wrap gap-2">
                    {activeCards.map(card => (
                      <div key={card.id} className="flex items-center gap-2 bg-emerald-950/50 border border-emerald-700 rounded-lg px-3 py-2">
                        <span>{card.icon}</span>
                        <span className="text-xs font-bold text-emerald-300">{card.name}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Game Over Overlays */}
        {gameOver === "VICTORY_PHASE_1" && (
          <div className="absolute inset-0 bg-amber-500/80 flex flex-col items-center justify-center text-white p-8 text-center backdrop-blur-sm z-50">
            <h2 className="text-7xl font-black mb-4 tracking-tighter uppercase italic drop-shadow-xl text-yellow-100">¡Hilas fino talando!</h2>
            <p className="text-2xl font-bold mb-12 max-w-md drop-shadow-md">Has conseguido 50 de madera superando la fase 1.</p>
            <button 
              onClick={() => {
                setMaxUnlockedPhase(Math.max(maxUnlockedPhase, 2));
                setGameState('MAP');
              }}
              className="px-12 py-5 bg-white text-amber-600 font-black text-xl uppercase italic rounded-full hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.8)]"
            >
              Volver al Mapa
            </button>
          </div>
        )}
        {gameOver === "VICTORY_PHASE_2" && (
          <div className="absolute inset-0 bg-sky-500/80 flex flex-col items-center justify-center text-white p-8 text-center backdrop-blur-sm z-50">
            <h2 className="text-7xl font-black mb-4 tracking-tighter uppercase italic drop-shadow-xl text-sky-100">¡Crece la Aldea!</h2>
            <p className="text-2xl font-bold mb-12 max-w-md drop-shadow-md">Has construido tu segunda casa y tienes una aldea de 4 trabajadores superando la fase 2.</p>
            <button 
              onClick={() => {
                setMaxUnlockedPhase(Math.max(maxUnlockedPhase, 3));
                setGameState('MAP');
              }}
              className="px-12 py-5 bg-white text-sky-600 font-black text-xl uppercase italic rounded-full hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.8)]"
            >
              Volver al Mapa
            </button>
          </div>
        )}
        {gameOver === "VICTORY_PHASE_3" && (
          <div className="absolute inset-0 bg-red-800/80 flex flex-col items-center justify-center text-white p-8 text-center backdrop-blur-sm z-50">
            <h2 className="text-7xl font-black mb-4 tracking-tighter uppercase italic drop-shadow-xl text-red-100">¡Primera Sangre!</h2>
            <p className="text-2xl font-bold mb-12 max-w-md drop-shadow-md">Nuestros aldeanos tendrán un buen banquete esta noche superando la fase 3.</p>
            <button 
              onClick={() => {
                setMaxUnlockedPhase(Math.max(maxUnlockedPhase, 4));
                setGameState('MAP');
              }}
              className="px-12 py-5 bg-white text-red-800 font-black text-xl uppercase italic rounded-full hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.8)]"
            >
              Volver al Mapa
            </button>
          </div>
        )}
        {gameOver === "VICTORY_PHASE_4" && (
          <div className="absolute inset-0 bg-yellow-600/80 flex flex-col items-center justify-center text-white p-8 text-center backdrop-blur-sm z-50">
            <h2 className="text-7xl font-black mb-4 tracking-tighter uppercase italic drop-shadow-xl text-yellow-100">¡El Mercader Sonríe!</h2>
            <p className="text-2xl font-bold mb-4 max-w-md drop-shadow-md">Has adquirido 3 Cartas de Mejora y tu aldea prospera más que nunca.</p>
            <div className="flex gap-3 mb-12">
              {activeCards.map(c => <span key={c.id} className="text-4xl">{c.icon}</span>)}
            </div>
            <button 
              onClick={() => { setGameState('MAP'); }}
              className="px-12 py-5 bg-white text-yellow-700 font-black text-xl uppercase italic rounded-full hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.8)]"
            >
              Volver al Mapa
            </button>
          </div>
        )}
        {gameOver && gameOver !== "VICTORY_PHASE_1" && gameOver !== "VICTORY_PHASE_2" && gameOver !== "VICTORY_PHASE_3" && gameOver !== "VICTORY_PHASE_4" && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white p-8 text-center backdrop-blur-sm z-50">
            <h2 className="text-5xl font-black mb-4 tracking-tighter uppercase italic drop-shadow-lg">Fin de la Partida</h2>
            <p className="text-2xl font-bold mb-8 max-w-md drop-shadow-md">{gameOver}</p>
            <button 
              onClick={() => { setGameState('MAP'); }}
              className="px-10 py-4 bg-white text-black font-black uppercase italic rounded-full hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.4)]"
            >
              Volver al Menú
            </button>
          </div>
        )}
      </div>

      {/* Bottom HUD */}
      <div className="h-56 min-h-[224px] shrink-0 bg-stone-800 border-t-4 border-amber-700 flex text-stone-200">
        
        {/* Left Column: Resources & Info */}
        <div className="w-1/4 p-4 border-r-2 border-stone-700 flex flex-col overflow-y-auto">
          <h2 className="text-xl font-black text-amber-500 mb-2 tracking-wider">
            {currentPhase === 1 ? 'FASE 1: LA TALA' : currentPhase === 2 ? 'FASE 2: LA ALDEA' : currentPhase === 3 ? 'FASE 3: LA CAZA' : 'FASE 4: EL COMERCIO'}
          </h2>
          
          <div className="flex flex-col gap-2">
            <div className="bg-stone-900/50 p-2 rounded">
              <p className="text-[10px] text-stone-400 uppercase font-bold tracking-wider mb-1">Tu Imperio</p>
              <div className="grid grid-cols-2 gap-1 text-sm font-bold">
                <span className="text-amber-600">Madera: {Math.floor(wood)}</span>
                <span className="text-red-400">Carne: {Math.floor(meat)}</span>
                {currentPhase >= 4 && <span className="text-yellow-400 col-span-2">💰 Oro: {Math.floor(gold)}</span>}
                <span className="text-slate-400">Fuertes: {fortCount}</span>
                <span className="text-blue-400">Soldados: {soldierCount}</span>
              </div>
            </div>

            {/* Tutorial reminder button */}
            <button
              onClick={() => setShowTutorial(true)}
              className="text-[9px] text-stone-500 hover:text-amber-400 text-left transition-colors"
            >
              ❓ Ver instrucciones de la fase
            </button>
            
            {currentPhase > 4 && (
              <div className="bg-red-950/20 p-2 rounded border border-red-900/30">
                <p className="text-[10px] text-red-500/70 uppercase font-bold tracking-wider mb-1">Ordenador</p>
                <div className="grid grid-cols-2 gap-1 text-xs text-stone-400">
                  <span>Madera: {aiWood}</span>
                  <span>Carne: {aiMeat}</span>
                  <span>Fuertes: {aiFortCount}</span>
                  <span>Soldados: {aiSoldierCount}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Middle Column: Workers Control */}
        <div className="flex-1 p-4 border-r-2 border-stone-700 flex flex-col overflow-hidden">
          <div className="flex justify-between items-center mb-2 shrink-0">
            <h3 className="text-xs font-bold text-amber-500 uppercase tracking-widest">Trabajadores ({workers.length})</h3>
            <div className="flex gap-1">
              <button title="Todos: Atacar Soldados" onClick={() => setWorkers(prev => prev.map(w => w.role === 'SOLDIER' ? { ...w, mode: 'ATTACK_SOLDIERS' } : w))} className="px-2 py-1 text-[10px] font-bold bg-blue-900 border border-blue-700 hover:bg-blue-800 rounded">Sold.</button>
              <button title="Todos: Atacar Trabajadores" onClick={() => setWorkers(prev => prev.map(w => w.role === 'SOLDIER' ? { ...w, mode: 'ATTACK_WORKERS' } : w))} className="px-2 py-1 text-[10px] font-bold bg-red-900 border border-red-700 hover:bg-red-800 rounded">Trab.</button>
              <button title="Todos: Atacar Edificios" onClick={() => setWorkers(prev => prev.map(w => w.role === 'SOLDIER' ? { ...w, mode: 'ATTACK_BUILDINGS' } : w))} className="px-2 py-1 text-[10px] font-bold bg-orange-900 border border-orange-700 hover:bg-orange-800 rounded">Edif.</button>
              <button title="Todos: Descansar" onClick={() => setWorkers(prev => prev.map(w => w.role === 'SOLDIER' ? { ...w, mode: 'IDLE' } : w))} className="px-2 py-1 text-[10px] font-bold bg-stone-700 border border-stone-500 hover:bg-stone-600 rounded">Desc.</button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-1">
            {workers.map(worker => (
              <div key={worker.id} className="flex items-center justify-between bg-stone-900 p-1.5 rounded border border-stone-800">
                <div className="flex items-center gap-2 w-1/3 truncate">
                  <span className="font-bold text-xs truncate max-w-[60px]">{worker.name}</span>
                  <span className={`px-1.5 py-0.5 rounded-[3px] text-[8px] uppercase font-black ${worker.role==='WOOD'?'bg-amber-900/50 text-amber-500':worker.role==='MEAT'?'bg-red-900/50 text-red-500':'bg-blue-900/50 text-blue-400'}`}>
                    {worker.role === 'WOOD' ? 'Leñador' : worker.role === 'MEAT' ? 'Cazador' : 'Soldado'}
                  </span>
                </div>
                
                <div className="flex gap-1 justify-end w-2/3">
                  {worker.role === 'WOOD' && (
                    <>
                      <button onClick={() => setWorkers(prev => prev.map(w => w.id === worker.id ? { ...w, mode: 'GATHER' } : w))} className={`px-2 py-0.5 text-[10px] rounded transition-colors ${worker.mode === 'GATHER' ? 'bg-amber-600 font-bold' : 'bg-stone-700 hover:bg-stone-600'}`}>Talar</button>
                      <button onClick={() => setWorkers(prev => prev.map(w => w.id === worker.id ? { ...w, mode: 'PLANT' } : w))} className={`px-2 py-0.5 text-[10px] rounded transition-colors ${worker.mode === 'PLANT' ? 'bg-emerald-600 font-bold' : 'bg-stone-700 hover:bg-stone-600'}`}>Plantar</button>
                    </>
                  )}
                  {worker.role === 'MEAT' && (
                    <button onClick={() => setWorkers(prev => prev.map(w => w.id === worker.id ? { ...w, mode: 'HUNT' } : w))} className={`px-4 py-0.5 text-[10px] rounded transition-colors ${worker.mode === 'HUNT' ? 'bg-red-700 font-bold' : 'bg-stone-700 hover:bg-stone-600'}`}>Cazar</button>
                  )}
                  {worker.role === 'SOLDIER' && (
                    <>
                      <button onClick={() => setWorkers(prev => prev.map(w => w.id === worker.id ? { ...w, mode: 'ATTACK_SOLDIERS' } : w))} className={`px-1.5 py-0.5 text-[10px] rounded transition-colors title="Atacar Soldados" ${worker.mode === 'ATTACK_SOLDIERS' ? 'bg-blue-600 font-bold' : 'bg-stone-700 hover:bg-stone-600'}`}>Sold</button>
                      <button onClick={() => setWorkers(prev => prev.map(w => w.id === worker.id ? { ...w, mode: 'ATTACK_WORKERS' } : w))} className={`px-1.5 py-0.5 text-[10px] rounded transition-colors title="Atacar Trabajadores" ${worker.mode === 'ATTACK_WORKERS' ? 'bg-red-600 font-bold' : 'bg-stone-700 hover:bg-stone-600'}`}>Trab</button>
                      <button onClick={() => setWorkers(prev => prev.map(w => w.id === worker.id ? { ...w, mode: 'ATTACK_BUILDINGS' } : w))} className={`px-1.5 py-0.5 text-[10px] rounded transition-colors title="Atacar Edificios" ${worker.mode === 'ATTACK_BUILDINGS' ? 'bg-orange-600 font-bold' : 'bg-stone-700 hover:bg-stone-600'}`}>Edif</button>
                    </>
                  )}
                  <button onClick={() => setWorkers(prev => prev.map(w => w.id === worker.id ? { ...w, mode: 'IDLE' } : w))} className={`px-2 py-0.5 text-[10px] rounded ml-1 transition-colors ${worker.mode === 'IDLE' ? 'bg-stone-200 text-stone-900 font-bold' : 'bg-stone-800 border border-stone-600 hover:bg-stone-700'}`}>Zz</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Build & Settings */}
        <div className="w-1/4 p-4 flex flex-col overflow-y-auto">
          <h3 className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-2 shrink-0">Construcción</h3>
          <div className="grid grid-cols-2 gap-1 flex-1">
            <button 
              onClick={() => {
                const cost = 25 * Math.pow(2, playerHouseCount - 1);
                console.log(`CASA BUTTON CLICKED: wood=${wood}, cost=${cost}`);
                if (wood >= cost) {
                  buildHouseRef.current++;
                  console.log(`Casa queued! Ref is now: ${buildHouseRef.current}`);
                }
              }}
              disabled={wood < 25 * Math.pow(2, playerHouseCount - 1)}
              className="flex flex-col items-center justify-center p-1 bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-amber-700 hover:border-amber-500 border border-stone-600 rounded relative"
            >
              <span className="font-bold text-xs">Casa</span>
              <span className="text-[9px] text-amber-300">{25 * Math.pow(2, playerHouseCount - 1)} M</span>
            </button>
            <button 
              onClick={() => {
                const cost = 100 * Math.pow(2, butcherShopCount);
                console.log(`BUTCHER BUTTON CLICKED: wood=${wood}, cost=${cost}`);
                if (wood >= cost) {
                  buildButcherShopRef.current++;
                  console.log(`Butcher queued! Ref is now: ${buildButcherShopRef.current}`);
                }
              }}
              disabled={wood < 100 * Math.pow(2, butcherShopCount)}
              className="flex flex-col items-center justify-center p-1 bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-red-800 hover:border-red-500 border border-stone-600 rounded relative"
            >
              <span className="font-bold text-xs">Carnicería</span>
              <span className="text-[9px] text-amber-300">{100 * Math.pow(2, butcherShopCount)} M</span>
            </button>
            <button 
              onClick={() => wood >= 50 * Math.pow(2, fortCount) && meat >= 50 * Math.pow(2, fortCount) && buildFortRef.current++}
              disabled={wood < 50 * Math.pow(2, fortCount) || meat < 50 * Math.pow(2, fortCount)}
              className="flex flex-col items-center justify-center p-1 bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-blue-800 hover:border-blue-500 border border-stone-600 rounded relative"
            >
              <span className="font-bold text-xs">Fuerte</span>
              <div className="flex gap-1">
                <span className="text-[9px] text-amber-300">{50 * Math.pow(2, fortCount)} M</span>
                <span className="text-[9px] text-red-300">{50 * Math.pow(2, fortCount)} C</span>
              </div>
            </button>
            <button 
              onClick={() => meat >= (activeCards.some(c=>c.id==='mercenary')?25:50) && fortCount > 0 && buildSoldierRef.current++}
              disabled={meat < (activeCards.some(c=>c.id==='mercenary')?25:50) || fortCount === 0}
              className="flex flex-col items-center justify-center p-1 bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-600 hover:border-slate-400 border border-stone-600 rounded relative"
            >
              <span className="font-bold text-xs">Soldado</span>
              <span className="text-[9px] text-red-300">{activeCards.some(c=>c.id==='mercenary')?25:50} C</span>
            </button>
            {currentPhase === 4 && (
              <button
                onClick={() => wood >= 150 && meat >= 50 && buildMarketRef.current++}
                disabled={wood < 150 || meat < 50}
                className="flex flex-col items-center justify-center p-1 bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-yellow-700 hover:border-yellow-500 border border-stone-600 rounded relative col-span-2"
              >
                <span className="font-bold text-xs">🏪 Comercio</span>
                <div className="flex gap-2">
                  <span className="text-[9px] text-amber-300">150 M</span>
                  <span className="text-[9px] text-red-300">50 C</span>
                </div>
              </button>
            )}
            {currentPhase === 4 && marketCount > 0 && (
              <button
                onClick={() => setMarketOpen(true)}
                className="flex flex-col items-center justify-center p-1 bg-yellow-800 hover:bg-yellow-700 border border-yellow-600 rounded relative col-span-2 animate-pulse"
              >
                <span className="font-bold text-xs text-yellow-200">🏪 Tienda 💰 {gold}</span>
                <span className="text-[9px] text-yellow-300">{activeCards.length} cartas activas</span>
              </button>
            )}
          </div>

          <div className="mt-2 bg-stone-900 border border-stone-700 p-2 rounded shrink-0">
            <div className="flex justify-between items-center mb-1">
              <label className="text-[9px] font-bold text-stone-400 uppercase">Descanso Auto.</label>
              <span className="text-amber-500 font-bold text-[10px]">{restThreshold}%</span>
            </div>
            <input 
              type="range" min="0" max="100" value={restThreshold} 
              onChange={(e) => setRestThreshold(Number(e.target.value))}
              className="w-full h-1 bg-stone-600 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>
        </div>

      </div>
    </div>
  );
}
