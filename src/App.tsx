import React, { useEffect, useRef, useState } from 'react';

// Game constants
const WORLD_WIDTH = 2400;
const WORLD_HEIGHT = 1800;
const SPEED = 1.2;
const BOAR_SPEED = 0.8;
const BOAR_EAT_DURATION = 300; 
const BOAR_REST_DURATION = 600;
const BOAR_REST_POINT = { x: WORLD_WIDTH - 200, y: WORLD_HEIGHT - 200 };

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
type ViewState = 'TITLE' | 'MAP' | 'PLAYING' | 'LOBBY';

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
    goal: '🎯 Acumula 25 de madera para superar la fase',
  },
  2: {
    title: '🏠 La Aldea',
    steps: [
      'Ahora puedes Construir edificios desde el panel inferior derecho.',
      'Construye una segunda Casa (25M) para reclutar más trabajadores.',
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
  5: {
    title: '🏰 El Fuerte',
    steps: [
      'El Fuerte (F) es la base de tus operaciones militares.',
      'Requiere Madera y Carne para su construcción.',
      'Desde el Fuerte puedes reclutar Soldados para defender tu aldea o atacar al enemigo.',
      '¡Atención! A partir de ahora, otras aldeas podrían expandirse por el mapa.',
    ],
    goal: '🎯 Construye un Fuerte y recluta a tu primer Soldado',
  },
  6: {
    title: '⚔️ La Batalla Final',
    steps: [
      'Esta es una partida completa: tú contra la máquina.',
      'Expande tu aldea, recolecta recursos y entrena un gran ejército.',
      'Localiza la base enemiga y destrúyela por completo.',
    ],
    goal: '🎯 Destruye todos los edificios enemigos para ganar el juego',
  },
};

export default function App() {
  console.log("App rendered");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef({ x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2, zoom: 1 });
  const targetCameraRef = useRef({ x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2, zoom: 1 });
  const isDraggingRef = useRef(false);
  const marketOpenRef = useRef(false);
  const lastUpdateRef = useRef(performance.now());
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const [gameState, setGameState] = useState<ViewState>('TITLE');
  const [currentPhase, setCurrentPhase] = useState(1);
  const [maxUnlockedPhase, setMaxUnlockedPhase] = useState(1);
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
  const [towerCount, setTowerCount] = useState(0);
  const [aiTowerCount, setAiTowerCount] = useState(0);
  const [isPlacingTower, setIsPlacingTower] = useState(false);
  const [aiSoldierCount, setAiSoldierCount] = useState(0);
  const [gameOver, setGameOver] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [gold, setGold] = useState(0);
  const [playerName, setPlayerName] = useState('');
  const [showNameEntry, setShowNameEntry] = useState(false);
  const [chatMessages, setChatMessages] = useState<{user: string, text: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [onlinePlayers, setOnlinePlayers] = useState([
    { name: 'Paco_El_Leñador', status: 'Lobby' },
    { name: 'Maria_G', status: 'Jugando' },
    { name: 'Carlos_R', status: 'Lobby' },
  ]);
  const [marketOpen, setMarketOpen] = useState(false);
  const grassTileImageRef = useRef<HTMLImageElement | null>(null);
  const grassPatternRef = useRef<CanvasPattern | null>(null);
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
  const grassImageRef = useRef<HTMLImageElement | null>(null);
  const rockImageRef = useRef<HTMLImageElement | null>(null);
  const towerImageRef = useRef<HTMLImageElement | null>(null);

  const terrainPatchesRef = useRef<{x: number, y: number, r: number, color: string}[]>([]);
  const decorationsRef = useRef<{x: number, y: number, type: 'grass' | 'rock', scale: number, rotation: number}[]>([]);
  const borderTreeImageRef = useRef<HTMLImageElement | null>(null);
  const carniceriaImageRef = useRef<HTMLImageElement | null>(null);
  const currentPhaseRef = useRef(currentPhase);
  const currentGoldRef = useRef(0);
  const buildMarketRef = useRef(0);
  const activeCardsRef = useRef<Set<string>>(new Set());

  // Entity Refs for Editor and Logic Access
  const playerHousesRef = useRef<(Point & { id: number, hp: number, spawnTimer: number })[]>([]);
  const aiHousesRef = useRef<(Point & { id: number, hp: number, spawnTimer: number })[]>([]);
  const butcherShopsRef = useRef<(Point & { id: number, hp: number })[]>([]);
  const aiButcherShopsRef = useRef<(Point & { id: number, hp: number })[]>([]);
  const playerFortsRef = useRef<(Point & { id: number, hp: number })[]>([]);
  const aiFortsRef = useRef<(Point & { id: number, hp: number })[]>([]);
  const playerMarketsRef = useRef<(Point & { id: number, hp: number })[]>([]);
  const playerTowersRef = useRef<(Point & { id: number, hp: number, lastAttack: number })[]>([]);
  const aiTowersRef = useRef<(Point & { id: number, hp: number, lastAttack: number })[]>([]);
  const playerHuntersRef = useRef<any[]>([]);
  const aiHuntersRef = useRef<any[]>([]);
  const playerCharactersRef = useRef<any[]>([]);
  const aiCharactersRef = useRef<any[]>([]);
  const playerSoldiersRef = useRef<any[]>([]);
  const aiSoldiersRef = useRef<any[]>([]);
  const wildBoarsRef = useRef<any[]>([]);
  const treesRef = useRef<Tree[]>([]);
  
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [editorTool, setEditorTool] = useState<string>('MOVE');
  const previousPlayedPhaseRef = useRef<number | null>(null);
  const nextBuildingIdRef = useRef(1);
  const nextCharIdRef = useRef(1);
  const nextTreeIdRef = useRef(1);
  const initialPinchDistRef = useRef<number | null>(null);
  const initialZoomRef = useRef<number | null>(null);
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

    const imgCarniceria = new Image();
    imgCarniceria.src = `${import.meta.env.BASE_URL}Carniceria.png`;
    imgCarniceria.onload = () => {
      carniceriaImageRef.current = imgCarniceria;
    };

    const imgTower = new Image();
    imgTower.src = `${import.meta.env.BASE_URL}torre.png`;
    imgTower.onload = () => {
      towerImageRef.current = imgTower;
    };

    const imgGrass = new Image();
    imgGrass.src = `${import.meta.env.BASE_URL}hierba_decorativa.png`;
    imgGrass.onload = () => {
      grassImageRef.current = imgGrass;
    };

    const imgRock = new Image();
    imgRock.src = `${import.meta.env.BASE_URL}roca_decorativa.png`;
    imgRock.onload = () => {
      rockImageRef.current = imgRock;
    };

    const imgGrassTile = new Image();
    imgGrassTile.src = `${import.meta.env.BASE_URL}grass_tile_v2.png`;
    imgGrassTile.onload = () => {
      grassTileImageRef.current = imgGrassTile;
      
      // Create a slightly smaller "macro" pattern to find the perfect balance
      const offCanvas = document.createElement('canvas');
      const size = 120; // Slightly smaller than 144px
      offCanvas.width = size;
      offCanvas.height = size;
      const offCtx = offCanvas.getContext('2d');
      if (offCtx) {
        offCtx.drawImage(imgGrassTile, 0, 0, size, size);
        // Create pattern using an offscreen canvas to ensure it's always ready
        const dummyCanvas = document.createElement('canvas');
        const dummyCtx = dummyCanvas.getContext('2d');
        if (dummyCtx) {
           grassPatternRef.current = dummyCtx.createPattern(offCanvas, 'repeat');
        }
      }
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

    const isContinuingTutorial = previousPlayedPhaseRef.current !== null && 
                                 currentPhase === previousPlayedPhaseRef.current + 1 && 
                                 currentPhase <= 5;

    // Phase 6 always starts fresh
    const forceReset = currentPhase === 6;

    if (!isContinuingTutorial || forceReset) {
      setWood(0); setAiWood(0); setMeat(0); setAiMeat(0);
      setWorkers([{ id: 0, name: 'Juan', mode: 'GATHER', role: 'WOOD' }]);
      setPlayerHouseCount(1); setButcherShopCount(0); setFortCount(0); setSoldierCount(0); setMarketCount(0); setTowerCount(0);
      setAiHouseCount(currentPhase <= 5 ? 0 : 1); setAiButcherShopCount(0); setAiFortCount(0); setAiSoldierCount(0); setAiTowerCount(0);
      setGold(0);
      setMarketOpen(false);
      setIsPlacingTower(false);
      setActiveCards([]);
      activeCardsRef.current = new Set();
      currentGoldRef.current = 0;
      buildMarketRef.current = 0;
      currentWoodRef.current = 0;
      currentAiWoodRef.current = 0;
      currentMeatRef.current = 0;
      currentAiMeatRef.current = 0;
    } else {
      // Logic for continuing: keep resources and buildings
      setWood(Math.floor(currentWoodRef.current));
      setMeat(Math.floor(currentMeatRef.current));
      setGold(Math.floor(currentGoldRef.current));
      
      // Preserve workers
      setWorkers([...workersRef.current]);
      
      // Sync counts
      setPlayerHouseCount(playerHousesRef.current.length);
      setButcherShopCount(butcherShopsRef.current.length);
      setFortCount(playerFortsRef.current.length);
      setMarketCount(playerMarketsRef.current.length);
      setSoldierCount(playerSoldiersRef.current.length);
      setTowerCount(playerTowersRef.current.length);

      setAiWood(0); setAiMeat(0);
      setAiHouseCount(0); setAiButcherShopCount(0); setAiFortCount(0); setAiSoldierCount(0); setAiTowerCount(0);
      currentAiWoodRef.current = 0;
      currentAiMeatRef.current = 0;

      // Migrate Phase 1 buildings to Phase 2 start area
      if (previousPlayedPhaseRef.current === 1 && currentPhase === 2) {
          const dx = 150 - PHASE1_CENTER_X;
          const dy = 300 - PHASE1_CENTER_Y;
          playerHousesRef.current.forEach(h => { h.x += dx; h.y += dy; });
          playerCharactersRef.current.forEach(c => { c.x += dx; c.y += dy; });
          butcherShopsRef.current.forEach(b => { b.x += dx; b.y += dy; });
          playerHuntersRef.current.forEach(h => { h.x += dx; h.y += dy; });
          playerMarketsRef.current.forEach(m => { m.x += dx; m.y += dy; });
          playerFortsRef.current.forEach(f => { f.x += dx; f.y += dy; });
          playerSoldiersRef.current.forEach(s => { s.x += dx; s.y += dy; });
          playerTowersRef.current.forEach(t => { t.x += dx; t.y += dy; });
          
          // Move camera to the new focus
          cameraRef.current = { x: 150, y: 300, zoom: 1.2 };
          targetCameraRef.current = { x: 150, y: 300, zoom: 1.2 };
      }
    }

    setGameOver(null);
    setShowTutorial(true);
    
    if (currentPhase >= 4 && !isContinuingTutorial) {
      const shuffled = [...ALL_CARDS].sort(() => Math.random() - 0.5);
      setDeck(shuffled);
    } else if (currentPhase >= 4 && isContinuingTutorial && deck.length === 0) {
      const shuffled = [...ALL_CARDS].sort(() => Math.random() - 0.5);
      setDeck(shuffled);
    }
    
    previousPlayedPhaseRef.current = currentPhase;
    gameOverRef.current = null;
    lastUpdateRef.current = performance.now();
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

    if (!isContinuingTutorial) {
      // Initialize Entity Refs
      nextBuildingIdRef.current = 2;
      nextCharIdRef.current = 2;
      nextTreeIdRef.current = 1;

      const houseX = currentPhase === 1 ? PHASE1_CENTER_X : 150;
      const houseY = currentPhase === 1 ? PHASE1_CENTER_Y : 300;
      
      playerHousesRef.current = [{ id: 0, x: houseX, y: houseY, hp: 100, spawnTimer: 3600 }];
      butcherShopsRef.current = [];
      playerMarketsRef.current = [];
      playerFortsRef.current = [];
      playerTowersRef.current = [];
      playerSoldiersRef.current = [];
      wildBoarsRef.current = [];
      
      playerCharactersRef.current = [
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

      aiHousesRef.current = currentPhase <= 4 ? [] : [{ id: 1000, x: 650, y: 300, hp: 100, spawnTimer: 3600 }];
      aiButcherShopsRef.current = [];
      aiFortsRef.current = [];
      aiTowersRef.current = [];
      aiSoldiersRef.current = [];
      playerHuntersRef.current = [];
      aiHuntersRef.current = [];

      aiCharactersRef.current = currentPhase <= 4 ? [] : [
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
    } else {
        // AI initialization for continuing phases
        aiHousesRef.current = currentPhase <= 4 ? [] : [{ id: 1000, x: 650, y: 300, hp: 100, spawnTimer: 3600 }];
        aiButcherShopsRef.current = [];
        aiFortsRef.current = [];
        aiSoldiersRef.current = [];
        aiHuntersRef.current = [];

        aiCharactersRef.current = currentPhase <= 4 ? [] : [
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
    }
    
    // Aliases for local usage within initialization to satisfy existing logic
    const playerHouses = playerHousesRef.current;
    const aiHouses = aiHousesRef.current;
    const butcherShops = butcherShopsRef.current;
    const aiButcherShops = aiButcherShopsRef.current;
    const playerForts = playerFortsRef.current;
    const aiForts = aiFortsRef.current;
    const playerMarkets = playerMarketsRef.current;
    const playerCharacters = playerCharactersRef.current;
    const aiCharacters = aiCharactersRef.current;
    const wildBoars = wildBoarsRef.current;
    const playerSoldiers = playerSoldiersRef.current;
    const aiSoldiers = aiSoldiersRef.current;
    const hunters = playerHuntersRef.current;
    const aiHunters = aiHuntersRef.current;
    
    // For ID references which are already numeric, we need to be careful.
    // However, much of the code incremented local 'nextBuildingId' vars.
    // We'll use getters/setters or just proxy them locally if needed.
    // For now, let's just make the initialization block use the logic normally
    // and we'll refactor the update loop to use the Refs.

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
    
    // 4) Clean Background (Removed patches and decorations for a cleaner look)
    terrainPatchesRef.current = [];
    decorationsRef.current = [];

    const trees: Tree[] = [];
    let nextTreeId = 0;

    // Helper for clustered generation
    const addCluster = (centerX: number, centerY: number, count: number, spread: number, owner: 'PLAYER' | 'AI' | 'BORDER', existing: Tree[]) => {
        for (let j = 0; j < count; j++) {
            const rx = centerX + (Math.random() - 0.5) * spread;
            const ry = centerY + (Math.random() - 0.5) * spread;
            
            // Boundary checks for player/AI trees
            if (owner !== 'BORDER') {
                if (rx < 40 || rx > WORLD_WIDTH - 40 || ry < 40 || ry > WORLD_HEIGHT - 40) continue;
            }

            // Simple distance check
            const tooClose = existing.some(t => Math.hypot(t.x - rx, t.y - ry) < 32);
            if (!tooClose) {
                existing.push({
                    id: nextTreeId++,
                    x: rx,
                    y: ry,
                    wood: owner === 'BORDER' ? 0 : 3,
                    state: 'GROWN',
                    owner
                });
            }
        }
    };

    if (currentPhase === 1) {
      // Phase 1 Clustered
      addCluster(PHASE1_CENTER_X, PHASE1_CENTER_Y, 15, 300, 'PLAYER', trees);
      
      // Border Rings
      const RING_COUNT = 80;
      for (let i = 0; i < RING_COUNT; i++) {
        const angle = (i / RING_COUNT) * Math.PI * 2;
        for (let ring = 0; ring < 4; ring++) {
          const r = PHASE1_BORDER_RADIUS + ring * 38 + (Math.random() - 0.5) * 20;
          const rx = PHASE1_CENTER_X + Math.cos(angle + ring * 0.05) * r;
          const ry = PHASE1_CENTER_Y + Math.sin(angle + ring * 0.05) * r;
          trees.push({ id: nextTreeId++, x: rx, y: ry, wood: 0, state: 'GROWN', owner: 'BORDER' });
        }
      }
      
      // Exterior Density Seeds
      for (let i = 0; i < 40; i++) {
          const sx = Math.random() * WORLD_WIDTH;
          const sy = Math.random() * WORLD_HEIGHT;
          if (Math.hypot(sx - PHASE1_CENTER_X, sy - PHASE1_CENTER_Y) < PHASE1_BORDER_RADIUS) continue;
          addCluster(sx, sy, 50, 400, 'BORDER', trees);
      }
    } else {
      // General Phases Clustered
      addCluster(150, 300, 10, 200, 'PLAYER', trees);
      if (currentPhase > 4) addCluster(650, 300, 10, 200, 'AI', trees);

      const BORDER_MARGIN = 1500;
      // Border seeds
      for (let i = 0; i < 150; i++) {
          const rx = -BORDER_MARGIN + Math.random() * (WORLD_WIDTH + BORDER_MARGIN * 2);
          const ry = -BORDER_MARGIN + Math.random() * (WORLD_HEIGHT + BORDER_MARGIN * 2);
          if (rx > -50 && rx < WORLD_WIDTH + 50 && ry > -50 && ry < WORLD_HEIGHT + 50) continue;
          addCluster(rx, ry, 40, 500, 'BORDER', trees);
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




    const processUpdate = (now: number) => {
      if (gameOverRef.current) return;
      
      let delta = (now - lastUpdateRef.current) / 16.67;
      lastUpdateRef.current = now;

      // Cap extreme jumps to 1 hour (216000 frames @ 60fps) to prevent freezing
      delta = Math.min(delta, 216000); 

      // Process logic in stable steps to maintain physics consistency
      const MAX_STEP = 2.0;
      while (delta > 0) {
        const step = Math.min(delta, MAX_STEP);
        update(step);
        delta -= step;
        if (delta < 0.01) break;
      }
    };

    const loop = () => {
      if (gameOverRef.current) return;
      
      const now = performance.now();
      processUpdate(now);

      // Smooth Camera Interpolation (LERP)
      // Use a fixed dt of 1.0 for visual interpolation to keep it smooth regardless of logic slowdowns
      const visualDt = 1.0; 
      cameraRef.current.x += (targetCameraRef.current.x - cameraRef.current.x) * 0.15 * visualDt;
      cameraRef.current.y += (targetCameraRef.current.y - cameraRef.current.y) * 0.15 * visualDt;
      cameraRef.current.zoom += (targetCameraRef.current.zoom - cameraRef.current.zoom) * 0.15 * visualDt;
      
      draw(ctx);
      if (ctx.restore) ctx.restore(); 
      animationId = requestAnimationFrame(loop);
    };

    // Background logic loop using SetInterval (which runs in background tabs @ ~1Hz)
    let backgroundInterval: any = null;
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Stop RAF if needed, though browsers do this automatically. 
        // We start a logic-only pulse for background progression.
        if (!backgroundInterval) {
          backgroundInterval = setInterval(() => {
            processUpdate(performance.now());
          }, 1000);
        }
      } else {
        if (backgroundInterval) {
          clearInterval(backgroundInterval);
          backgroundInterval = null;
        }
        // When coming back, the first processUpdate call will handle the catch-up
        // for the time elapsed between the last background pulse and now.
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const update = (dt: number) => {
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
            const houseId = nextBuildingIdRef.current++;
            const houseHp = activeCardsRef.current.has('strategist') ? 150 : 100;
            playerHouses.push({ id: houseId, x: pos.x, y: pos.y, hp: houseHp, spawnTimer: 3600 });
            setPlayerHouseCount(playerHouses.length);
            const newId = nextCharIdRef.current++;
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
        const cost = Math.floor(25 * Math.pow(2, butcherShops.length));
        if (currentWoodRef.current >= cost) {
          const pos = getValidBuildingPosition('PLAYER');
          if (pos) {
            console.log("Butcher Shop built at", pos);
            buildButcherShopRef.current--;
            currentWoodRef.current -= cost;
            setWood(Math.floor(currentWoodRef.current));
            const shopId = nextBuildingIdRef.current++;
            const shopHp = activeCardsRef.current.has('strategist') ? 150 : 100;
            butcherShops.push({ id: shopId, x: pos.x, y: pos.y, hp: shopHp });
            setButcherShopCount(butcherShops.length);
            const newId = nextCharIdRef.current++;
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
          h.spawnTimer -= dt;
          if (h.spawnTimer <= 0) {
            h.spawnTimer = 3600; // 1 minute
            const newId = nextCharIdRef.current++;
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
          h.spawnTimer -= dt;
          if (h.spawnTimer <= 0) {
            h.spawnTimer = 3600; // 1 minute
            const newId = nextCharIdRef.current++;
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
            playerForts.push({ id: nextBuildingIdRef.current++, x: pos.x, y: pos.y, hp: fortHp });
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
            playerMarkets.push({ id: nextBuildingIdRef.current++, x: pos.x, y: pos.y, hp: marketHp });
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
          const newId = nextCharIdRef.current++;
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
              s.x += (dx / distToFort) * SPEED * dt;
              s.y += (dy / distToFort) * SPEED * dt;
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
        nearestSoldier.hp -= (activeCardsRef.current.has('brute') ? 2/60 : 1/60) * dt; 
              s.energy -= 0.05 * dt;
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
          [...aiCharacters, ...aiHuntersRef.current].forEach(target => {
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
          if (dist > SPEED * dt) {
            const moveX = (dx / dist) * SPEED * dt;
            const moveY = (dy / dist) * SPEED * dt;
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
              s.x += (dx / distToFort) * SPEED * dt;
              s.y += (dy / distToFort) * SPEED * dt;
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
          const targets = [...playerCharacters, ...playerHuntersRef.current];
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
            nearestTarget.hp -= (1/60) * dt;
            s.energy -= 0.05 * dt;
          } else if (dist > 0) {
            s.state = 'MOVING';
            s.energy -= 0.01;
            const dx = nearestTarget.x - s.x;
            const dy = nearestTarget.y - s.y;
            const moveX = (dx / dist) * SPEED * dt;
            const moveY = (dy / dist) * SPEED * dt;
            if (!isNaN(moveX) && !isNaN(moveY)) {
              s.x += moveX;
              s.y += moveY;
            }
          }
        } else {
          s.state = 'IDLE';
        }
      }

      // Update Towers (Attack nearby AI units)
      for (const t of playerTowersRef.current) {
        if (!t) continue;
        t.lastAttack -= dt;
        if (t.lastAttack <= 0) {
          // Find nearest enemy (soldier or character)
          let nearestEnemy = null;
          let minEnemyDist = Infinity;
          const enemies = [...aiSoldiers, ...aiCharacters, ...aiHuntersRef.current];
          enemies.forEach(e => {
            if (e && e.hp > 0) {
              const dist = Math.hypot(e.x - t.x, e.y - t.y);
              if (dist < minEnemyDist) {
                minEnemyDist = dist;
                nearestEnemy = e;
              }
            }
          });

          if (nearestEnemy && minEnemyDist < 150) {
            nearestEnemy.hp -= 2; // High damage tower shot
            t.lastAttack = 60; // 1 second cooldown
            // Visual effect is handled in draw or just left as is
          }
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
      removeDead(playerHuntersRef.current);
      removeDead(aiHuntersRef.current);
      removeDead(playerSoldiers);
      removeDead(aiSoldiers);
      removeDead(playerHouses);
      removeDead(aiHouses);
      removeDead(butcherShops);
      removeDead(aiButcherShops);
      removeDead(playerForts);
      removeDead(aiForts);
      removeDead(playerMarkets);
      removeDead(playerTowersRef.current);
      removeDead(aiTowersRef.current);

      // Update counts
      setPlayerHouseCount(playerHouses.length);
      setButcherShopCount(butcherShops.length);
      setFortCount(playerForts.length);
      setSoldierCount(playerSoldiers.length);
      setMarketCount(playerMarkets.length);
      setTowerCount(playerTowersRef.current.length);
      setAiHouseCount(aiHouses.length);
      setAiButcherShopCount(aiButcherShops.length);
      setAiFortCount(aiForts.length);
      setAiSoldierCount(aiSoldiers.length);
      setAiTowerCount(aiTowersRef.current.length);

      // Check Win/Loss Condition
      if (!gameOverRef.current) {
        if (playerHouses.length === 0 && butcherShops.length === 0 && playerForts.length === 0 && playerMarkets.length === 0) {
          gameOverRef.current = "¡Has perdido! El enemigo ha destruido todos tus edificios.";
          setGameOver(gameOverRef.current);
        } else if (currentPhase === 1) {
          if (currentWoodRef.current >= 25) {
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
        } else if (currentPhase === 5) {
          if (playerForts.length >= 1 && playerSoldiers.length >= 1) {
            gameOverRef.current = "VICTORY_PHASE_5";
            setGameOver(gameOverRef.current);
          }
        } else if (currentPhase === 6) {
          if (aiHouses.length === 0 && aiButcherShops.length === 0 && aiForts.length === 0) {
            gameOverRef.current = "VICTORY_PHASE_6";
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
          p.energy -= 0.025 * dt;
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
                p.energy += (p.isExhausted ? 0.5 : 1.0) * dt;
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
            
            if (dist < SPEED * dt) {
              p.x = p.target.x;
              p.y = p.target.y;
              p.state = p.onReach;
              if (p.state === 'CHOPPING') p.timer = activeCardsRef.current.has('axe') ? 30 : 60;
              if (p.state === 'DROPPING_WOOD') p.timer = 30;
              if (p.state === 'PLANTING') p.timer = 60;
            } else {
              p.x += (dx / dist) * SPEED * dt;
              p.y += (dy / dist) * SPEED * dt;
            }
          }
        } else if (p.state === 'CHOPPING') {
          p.timer -= dt;
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
          p.timer -= dt;
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
          p.timer -= dt;
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

      // Update wild boars (Advanced AI: Move to trees to eat acorns, luego a descansar)
      if (Math.random() < 0.005 && wildBoars.length < 5) {
        wildBoars.push({
          x: Math.random() * WORLD_WIDTH,
          y: Math.random() * WORLD_HEIGHT,
          state: 'IDLE',
          target: null,
          timer: 0,
          hp: 1,
          wobblePhase: Math.random() * Math.PI * 2,
          wobbleSpeed: 0.02 + Math.random() * 0.04,
          angle: 0
        });
      }
      for (const boar of wildBoars) {
        if (!boar) continue;
        
        if (boar.state === 'IDLE') {
          // Reset wobble for new movement
          boar.wobblePhase = Math.random() * Math.PI * 2;
          
          if (Math.random() < 0.1) {
            boar.target = BOAR_REST_POINT;
            boar.state = 'MOVING_TO_REST';
          } else {
            const edibleTrees = trees.filter(t => t.state === 'GROWN' && t.wood > 0);
            if (edibleTrees.length > 0) {
              const targetTree = edibleTrees[Math.floor(Math.random() * edibleTrees.length)];
              boar.target = { x: targetTree.x, y: targetTree.y };
              boar.state = 'MOVING_TO_TREE';
            } else {
              boar.vx = (Math.random() - 0.5) * 2;
              boar.vy = (Math.random() - 0.5) * 2;
              boar.state = 'WANDERING';
              boar.timer = 60;
            }
          }
        } else if (boar.state === 'MOVING_TO_TREE' || boar.state === 'MOVING_TO_REST') {
          if (boar.target) {
            const dx = boar.target.x - boar.x;
            const dy = boar.target.y - boar.y;
            const dist = Math.hypot(dx, dy);

            // New: Start circling trees when close (Organic search)
            if (dist < 60 && boar.state === 'MOVING_TO_TREE') {
              boar.state = 'CIRCLING';
              boar.timer = 180 + Math.random() * 180; // 3-6 seconds of circling
              boar.angle = Math.atan2(boar.y - boar.target.y, boar.x - boar.target.x);
            } else if (dist < BOAR_SPEED * dt) {
              boar.x = boar.target.x;
              boar.y = boar.target.y;
              if (boar.state === 'MOVING_TO_REST') {
                boar.state = 'RESTING';
                boar.timer = BOAR_REST_DURATION;
              } else {
                boar.state = 'IDLE';
              }
            } else {
              // Organic wobble movement
              const baseAngle = Math.atan2(dy, dx);
              boar.wobblePhase += boar.wobbleSpeed * dt;
              const wobble = Math.sin(boar.wobblePhase) * 0.6; // side to side movement
              const finalAngle = baseAngle + wobble;
              
              boar.x += Math.cos(finalAngle) * BOAR_SPEED * dt;
              boar.y += Math.sin(finalAngle) * BOAR_SPEED * dt;
            }
          } else {
            boar.state = 'IDLE';
          }
        } else if (boar.state === 'CIRCLING') {
          // Orbit around the tree
          boar.angle += 0.015 * dt; // orbital speed
          const orbitRadius = 45;
          const tx = boar.target.x + Math.cos(boar.angle) * orbitRadius;
          const ty = boar.target.y + Math.sin(boar.angle) * orbitRadius;
          
          const dx = tx - boar.x;
          const dy = ty - boar.y;
          const d = Math.hypot(dx, dy);
          if (d > 1) {
            boar.x += (dx / d) * BOAR_SPEED * dt;
            boar.y += (dy / d) * BOAR_SPEED * dt;
          }
          
          boar.timer -= dt;
          if (boar.timer <= 0) {
            boar.state = 'EATING';
            boar.timer = BOAR_EAT_DURATION;
          }
        } else if (boar.state === 'EATING' || boar.state === 'RESTING') {
          boar.timer -= dt;
          // While eating, oscillate slightly for "organic" feel
          if (boar.state === 'EATING') {
            boar.x += Math.sin(Date.now() / 200) * 0.1 * dt;
            boar.y += Math.cos(Date.now() / 200) * 0.1 * dt;
          }
          if (boar.timer <= 0) {
            boar.state = 'IDLE';
          }
        } else if (boar.state === 'WANDERING') {
          boar.x += boar.vx;
          boar.y += boar.vy;
          boar.timer--;
          if (boar.timer <= 0 || boar.x < 0 || boar.x > WORLD_WIDTH || boar.y < 0 || boar.y > WORLD_HEIGHT) {
            boar.state = 'IDLE';
          }
        }
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
              } else if (dist < SPEED * dt) {
                h.x = h.target.x;
                h.y = h.target.y;
                h.state = h.onReach;
                if (h.state === 'HUNTING') h.timer = (activeCardsRef.current.has('trap') ? 15 : 30);
                if (h.state === 'DROPPING_MEAT') h.timer = 30;
              } else {
                h.x += (dx / dist) * SPEED * dt;
                h.y += (dy / dist) * SPEED * dt;
              }
            }
          }
        } else if (h.state === 'HUNTING') {
          h.timer -= dt;
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
          h.timer -= dt;
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
              } else if (dist < SPEED * dt) {
                h.x = h.target.x;
                h.y = h.target.y;
                h.state = h.onReach;
                if (h.state === 'HUNTING') h.timer = 30;
                if (h.state === 'DROPPING_MEAT') h.timer = 30;
              } else {
                h.x += (dx / dist) * SPEED * dt;
                h.y += (dy / dist) * SPEED * dt;
              }
            }
          }
        } else if (h.state === 'HUNTING') {
          h.timer -= dt;
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
          h.timer -= dt;
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
      if (aiHouseTimer > 0) aiHouseTimer -= dt;
      const aiHouseCost = 25 * Math.pow(4, aiHouses.length - 1);
      if (aiHouseTimer <= 0 && currentAiWoodRef.current >= aiHouseCost && aiHouses.length < 5) {
        const pos = getValidBuildingPosition('AI');
        if (pos) {
          currentAiWoodRef.current -= aiHouseCost;
          setAiWood(currentAiWoodRef.current);
          const houseId = nextBuildingIdRef.current++;
          aiHouses.push({ id: houseId, x: pos.x, y: pos.y, hp: 100, spawnTimer: 3600 });
          setAiHouseCount(aiHouses.length);
          aiCharacters.push({
            id: nextCharIdRef.current++,
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
      if (aiButcherTimer > 0) aiButcherTimer -= dt;
      const butcherShopCost = 25 * Math.pow(2, aiButcherShops.length);
      if (aiButcherTimer <= 0 && currentAiWoodRef.current >= butcherShopCost && aiHouses.length > 1 && aiButcherShops.length < 2) {
        const pos = getValidBuildingPosition('AI');
        if (pos) {
          currentAiWoodRef.current -= butcherShopCost;
          setAiWood(currentAiWoodRef.current);
          const shopId = nextBuildingIdRef.current++;
          aiButcherShops.push({ id: shopId, x: pos.x, y: pos.y, hp: 100 });
          setAiButcherShopCount(aiButcherShops.length);
          aiHunters.push({
            id: nextCharIdRef.current++,
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
      if (aiFortTimer > 0) aiFortTimer -= dt;
      const aiFortCost = 50 * Math.pow(2, aiForts.length); // Wood + Meat
      if (aiFortTimer <= 0 && aiButcherShops.length > 0 && currentAiWoodRef.current >= aiFortCost && currentAiMeatRef.current >= aiFortCost && aiForts.length < 2) {
        const pos = getValidBuildingPosition('AI');
        if (pos) {
          currentAiWoodRef.current -= aiFortCost;
          currentAiMeatRef.current -= aiFortCost;
          setAiWood(currentAiWoodRef.current);
          setAiMeat(currentAiMeatRef.current);
          aiForts.push({ id: nextBuildingIdRef.current++, x: pos.x, y: pos.y, hp: 100 });
          setAiFortCount(aiForts.length);
          aiFortTimer = 1800; // 30 seconds cooldown
        }
      }

        // AI Soldiers
        if (aiSoldierTimer > 0) aiSoldierTimer -= dt;
        if (aiSoldierTimer <= 0 && aiForts.length > 0 && currentAiMeatRef.current >= 50 && aiSoldiers.length < 10) {
          currentAiMeatRef.current -= 50;
          setAiMeat(currentAiMeatRef.current);
          aiSoldiers.push({ 
            id: nextCharIdRef.current++,
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
          aiPerson.energy -= 0.025 * dt;
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
            
            if (dist < SPEED * dt) {
              aiPerson.x = aiPerson.target.x;
              aiPerson.y = aiPerson.target.y;
              aiPerson.state = aiPerson.onReach;
              if (aiPerson.state === 'CHOPPING') aiPerson.timer = 60;
              if (aiPerson.state === 'DROPPING_WOOD') aiPerson.timer = 30;
              if (aiPerson.state === 'PLANTING') aiPerson.timer = 60;
            } else {
              aiPerson.x += (dx / dist) * SPEED * dt;
              aiPerson.y += (dy / dist) * SPEED * dt;
            }
          }
        } else if (aiPerson.state === 'CHOPPING') {
          aiPerson.timer -= dt;
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
          aiPerson.timer -= dt;
          if (aiPerson.timer <= 0) {
            aiPerson.carrying = null;
            currentAiWoodRef.current += 2;
            setAiWood(currentAiWoodRef.current);
            aiPerson.state = 'IDLE';
          }
        } else if (aiPerson.state === 'GETTING_SEED') {
          aiPerson.timer -= dt;
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
          aiPerson.timer -= dt;
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

      // Clear screen (Solid tan background)
      ctx.fillStyle = '#e1d4b7'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      
      // Apply Camera Transform
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(cameraRef.current.zoom, cameraRef.current.zoom);
      ctx.translate(-cameraRef.current.x, -cameraRef.current.y);

      // Draw base world layer (solid tan matches outside)
      ctx.fillStyle = '#e1d4b7';
      ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

      // Helper functions for drawing
      const drawHP = (x: number, y: number, current: number, max: number, color: string) => {
        ctx.fillStyle = '#d4d4d8';
        ctx.fillRect(x - 10, y + 10, 20, 3);
        ctx.fillStyle = color;
        ctx.fillRect(x - 10, y + 10, 20 * (current / max), 3);
        ctx.strokeStyle = '#52525b';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x - 10, y + 10, 20, 3);
      };

      const drawShadow = (x: number, y: number, w: number, h: number) => {
          ctx.save();
          ctx.translate(x, y);
          ctx.scale(1, 0.5);
          ctx.fillStyle = 'rgba(0,0,0,0.1)';
          ctx.beginPath();
          ctx.arc(0, 0, w, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
      };

      const drawPixelHouse = (x: number, y: number, isAi: boolean) => {
        if (houseImageRef.current && houseImageRef.current.complete) {
          const width = 32;
          const height = 32;
          ctx.drawImage(houseImageRef.current, x - width / 2, y - height / 2, width, height);
          if (isAi) {
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            ctx.strokeRect(x - width / 2, y - height / 2, width, height);
          }
          return;
        }
        ctx.fillStyle = isAi ? '#991b1b' : '#d9a347';
        ctx.fillRect(x - 16, y - 16, 32, 32);
      };

      // Draw Map Decorations (Grass, Rocks) - REMOVED for clean look
      /*
      decorationsRef.current.forEach(d => {
         ...
      });
      */

      // Draw Player Houses
      playerHouses.forEach(h => {
        if (!h) return;
        drawShadow(h.x, h.y + 10, 20, 10);
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
          drawShadow(t.x, t.y + 8, 12, 6);
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
          drawShadow(t.x, t.y + 4, 6, 3);
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
          drawShadow(h.x, h.y + 10, 20, 10);
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

      // Draw Butcher Shops
      butcherShops.forEach(h => {
        if (!h) return;
        drawShadow(h.x, h.y + 10, 24, 12);
        if (carniceriaImageRef.current && carniceriaImageRef.current.complete) {
          const width = 36;
          const height = 36;
          ctx.drawImage(carniceriaImageRef.current, h.x - width / 2, h.y - height / 2, width, height);
        } else {
          ctx.fillStyle = '#991b1b'; // red-800
          ctx.font = 'bold 28px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('C', h.x, h.y);
        }
        drawHP(h.x, h.y + 20, h.hp, 100, '#16a34a');
      });

      // Draw AI Butcher Shops
      if (currentPhase > 4) {
        aiButcherShops.forEach(h => {
          if (!h) return;
          if (carniceriaImageRef.current && carniceriaImageRef.current.complete) {
            const width = 36;
            const height = 36;
            ctx.drawImage(carniceriaImageRef.current, h.x - width / 2, h.y - height / 2, width, height);
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            ctx.strokeRect(h.x - width / 2, h.y - height / 2, width, height);
          } else {
            ctx.fillStyle = '#7f1d1d'; // red-900
            ctx.font = 'bold 28px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('C', h.x, h.y);
          }
          drawHP(h.x, h.y + 20, h.hp, 100, '#ef4444');
        });
      }

      // Draw Hunters
      playerHuntersRef.current.forEach(h => {
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
        aiHuntersRef.current.forEach(h => {
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
        drawShadow(f.x, f.y + 15, 30, 15);
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

      // Draw Player Towers
      playerTowersRef.current.forEach(t => {
        if (!t) return;
        drawShadow(t.x, t.y + 10, 20, 10);
        if (towerImageRef.current && towerImageRef.current.complete) {
          const width = 40;
          const height = 40;
          ctx.drawImage(towerImageRef.current, t.x - width / 2, t.y - height / 2, width, height);
        } else {
          ctx.fillStyle = '#4b5563'; // gray-600
          ctx.fillRect(t.x - 15, t.y - 20, 30, 40);
          ctx.fillStyle = '#1f2937';
          ctx.fillRect(t.x - 12, t.y - 23, 24, 6);
        }
        drawHP(t.x, t.y + 25, t.hp, 100, '#16a34a');
      });

      // Draw AI Towers
      aiTowersRef.current.forEach(t => {
        if (!t) return;
        drawShadow(t.x, t.y + 10, 20, 10);
        if (towerImageRef.current && towerImageRef.current.complete) {
          const width = 40;
          const height = 40;
          ctx.drawImage(towerImageRef.current, t.x - width / 2, t.y - height / 2, width, height);
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.strokeRect(t.x - width / 2, t.y - height / 2, width, height);
        } else {
          ctx.fillStyle = '#7f1d1d';
          ctx.fillRect(t.x - 15, t.y - 20, 30, 40);
        }
        drawHP(t.x, t.y + 25, t.hp, 100, '#ef4444');
      });
    };

    animationId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animationId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (backgroundInterval) clearInterval(backgroundInterval);
    };
  }, [gameState, currentPhase]);

  if (gameState === 'TITLE') {
    return (
      <div 
        className="bg-stone-900 flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden"
        style={{ minHeight: '100dvh', width: '100vw', margin: 0, padding: 0 }}
      >
        {/* Animated Forest Background Placeholder */}
        <div className="absolute inset-0 opacity-5 pointer-events-none">
           <div className="absolute top-10 left-10 text-5xl">🌲</div>
           <div className="absolute bottom-20 right-20 text-6xl">🌳</div>
           <div className="absolute top-1/2 left-1/4 text-4xl">🌲</div>
           <div className="absolute bottom-1/4 right-1/3 text-5xl">🌳</div>
        </div>

        <div className="z-10 flex flex-col items-center max-w-lg w-full px-8">
          
          {/* Header Section: More Space, Clean Typography */}
          <div className="flex flex-col items-center mb-24 mt-12 relative">
            <span className="absolute -left-12 -top-4 text-4xl transform -rotate-12 opacity-80">🪓</span>
            <div className="flex flex-col items-center gap-1">
               <h1 className="text-4xl md:text-5xl font-black text-white drop-shadow-[0_4px_0_theme(colors.amber.700)] italic tracking-tighter uppercase leading-none">WOOD</h1>
               <h1 className="text-4xl md:text-5xl font-black text-amber-500 drop-shadow-[0_4px_0_theme(colors.amber.800)] italic tracking-tighter uppercase leading-none">GATHERER</h1>
            </div>
          </div>
          
          <div className="flex flex-col gap-5 w-full max-w-xs">
            <button 
              onClick={() => setGameState('MAP')}
              className="group relative px-6 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl border-b-4 border-emerald-800 active:border-b-0 active:translate-y-1 transition-all flex flex-col items-center"
            >
              <span className="text-xl font-black italic tracking-widest uppercase mb-0.5">Campaña</span>
              <span className="text-emerald-200 text-[9px] font-bold font-mono tracking-widest uppercase opacity-70">Single Player Quest</span>
            </button>

            <button 
              onClick={() => setShowNameEntry(true)}
              className="group relative px-6 py-4 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl border-b-4 border-stone-900 active:border-b-0 active:translate-y-1 transition-all flex flex-col items-center"
            >
              <span className="text-xl font-black italic tracking-widest uppercase mb-0.5">Multijugador</span>
              <span className="text-stone-500 text-[9px] font-bold font-mono tracking-widest uppercase">Entrar al Lobby</span>
            </button>
            
            <div className="mt-16 flex flex-col items-center opacity-40">
              <p className="text-stone-600 text-[8px] uppercase font-bold tracking-[0.4em] text-center">
                v1.2.7 — Pedro Lopez Lagarda
              </p>
              <div className="w-8 h-0.5 bg-stone-700 mt-2 rounded-full" />
            </div>
          </div>
        </div>

        {/* Name Entry Popup */}
        {showNameEntry && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-stone-900 border-4 border-amber-600 p-8 rounded-3xl max-w-sm w-full shadow-[0_0_50px_rgba(217,119,6,0.2)]">
              <h2 className="text-3xl font-black text-amber-500 italic mb-6 uppercase tracking-tighter">¿Cómo te llamas?</h2>
              <input 
                type="text" 
                maxLength={15}
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Introduce tu nick..."
                className="w-full bg-stone-800 border-2 border-stone-700 rounded-xl p-4 text-white font-bold mb-6 focus:outline-none focus:border-amber-600 transition-colors"
                onKeyDown={(e) => e.key === 'Enter' && playerName && setGameState('LOBBY')}
              />
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowNameEntry(false)}
                  className="flex-1 px-4 py-3 bg-stone-800 text-stone-400 font-bold rounded-xl hover:bg-stone-700 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  disabled={!playerName}
                  onClick={() => { setShowNameEntry(false); setGameState('LOBBY'); }}
                  className="flex-1 px-4 py-3 bg-amber-600 text-white font-black rounded-xl hover:bg-amber-500 disabled:opacity-50 transition-all uppercase italic"
                >
                  Entrar →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (gameState === 'LOBBY') {
    return (
      <div 
        className="bg-stone-950 flex flex-col md:flex-row font-sans overflow-y-auto md:overflow-hidden h-screen w-screen"
        style={{ margin: 0, padding: 0 }}
      >
        {/* Left: Players List */}
        <div className="w-full md:w-1/4 border-b-2 md:border-b-0 md:border-r-2 border-stone-800 flex flex-col bg-stone-900/50 min-h-[300px] shrink-0">
          <div className="p-6 border-b-2 border-stone-800">
            <h2 className="text-xl font-black text-amber-500 italic tracking-tighter uppercase mb-1">Jugadores Online</h2>
            <p className="text-[10px] text-stone-500 font-bold tracking-widest">SÉ EL HOST DE LA PARTIDA</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            <div className="p-4 bg-amber-600/10 border border-amber-600/30 rounded-xl flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="font-bold text-amber-500 whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]">{playerName} (Tú)</span>
              </div>
              <span className="text-[9px] font-black bg-amber-600 text-white px-2 py-0.5 rounded italic">LOBBY</span>
            </div>
            {onlinePlayers.map((p, i) => (
              <div key={i} className="p-4 bg-stone-800/50 border border-stone-700/50 rounded-xl flex justify-between items-center group">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 ${p.status === 'Lobby' ? 'bg-green-500' : 'bg-stone-600'} rounded-full`}></span>
                  <span className="font-bold text-stone-300">{p.name}</span>
                </div>
                {p.status === 'Lobby' ? (
                  <button className="text-[9px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded italic opacity-0 group-hover:opacity-100 transition-opacity">INVITAR</button>
                ) : (
                  <span className="text-[9px] font-black bg-stone-700 text-stone-500 px-2 py-0.5 rounded italic uppercase">{p.status}</span>
                )}
              </div>
            ))}
          </div>
          <div className="p-4 border-t-2 border-stone-800">
             <button 
              onClick={() => { setGameState('TITLE'); }}
              className="w-full py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold rounded-xl transition-all"
            >
              ← Volver al Menú
            </button>
          </div>
        </div>

        {/* Center: Hero/Room Area */}
        <div className="flex-1 w-full flex flex-col items-center justify-center p-8 md:p-12 relative min-h-[400px] shrink-0">
           <div className="absolute top-12 text-center">
              <h1 className="text-6xl font-black text-white/10 italic tracking-tighter uppercase select-none">MULTIPLAYER</h1>
           </div>
           
           <div className="flex flex-col items-center gap-8 text-center max-w-md">
              <div className="w-32 h-32 bg-amber-600/20 rounded-full flex items-center justify-center text-6xl animate-pulse">🏹</div>
              <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none">Buscando Aliados...</h2>
              <p className="text-stone-500 font-bold">¡Invita a tus amigos del chat o espera a que alguien te desafíe! Soporte para hasta 4 jugadores.</p>
              
              <button className="mt-8 px-12 py-6 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl border-b-8 border-amber-800 active:border-b-0 active:translate-y-2 transition-all flex flex-col items-center w-full">
                <span className="text-3xl font-black italic tracking-widest uppercase">Crear Partida</span>
                <span className="text-amber-200 text-xs font-bold font-mono tracking-widest uppercase opacity-70">Privada / Pública</span>
              </button>
           </div>
        </div>

        {/* Right: Global Chat */}
        <div className="w-full md:w-1/4 border-t-2 md:border-t-0 md:border-l-2 border-stone-800 flex flex-col bg-stone-900/80 min-h-[400px] shrink-0">
          <div className="p-6 border-b-2 border-stone-800">
            <h2 className="text-xl font-black text-white italic tracking-tighter uppercase mb-1">Chat Global</h2>
            <div className="flex items-center gap-2">
               <span className="w-2 h-2 bg-green-500 rounded-full"></span>
               <span className="text-[10px] text-green-500 font-bold tracking-widest">LIVE SERVER</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
            <div className="text-[10px] text-stone-500 font-bold text-center my-4 uppercase tracking-[0.3em]">Conectado al canal global</div>
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.user === playerName ? 'items-end' : 'items-start'}`}>
                <span className="text-[9px] font-black text-stone-500 mb-0.5 uppercase tracking-tighter">{msg.user}</span>
                <div className={`px-4 py-2 rounded-2xl max-w-[90%] text-sm font-bold ${msg.user === playerName ? 'bg-amber-600 text-white rounded-tr-none' : 'bg-stone-800 text-stone-200 rounded-tl-none'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t-2 border-stone-800 bg-stone-900">
            <form 
              className="relative"
              onSubmit={(e) => {
                e.preventDefault();
                if (!chatInput.trim()) return;
                setChatMessages([...chatMessages, { user: playerName, text: chatInput }]);
                setChatInput('');
              }}
            >
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Escribe un mensaje..."
                className="w-full bg-stone-950 border border-stone-800 rounded-xl p-4 pr-12 text-sm text-white font-bold focus:outline-none focus:border-amber-600 transition-colors"
              />
              <button 
                type="submit"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-500 hover:text-amber-400 p-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'MAP') {
    const phases = [
      { id: 1, name: 'La Tala',     desc: 'Recolección de madera básica', pos: { top: '65%', left: '20%' }, iconPos: '0% 0%'   },
      { id: 2, name: 'La Aldea',    desc: 'Construye casas y crece',       pos: { top: '45%', left: '35%' }, iconPos: '25% 0%'  },
      { id: 3, name: 'La Caza',     desc: 'Caza animales para carne',      pos: { top: '25%', left: '30%' }, iconPos: '50% 0%'  },
      { id: 4, name: 'El Comercio', desc: 'Intercambia y mejora',          pos: { top: '40%', left: '65%' }, iconPos: '75% 0%'  },
      { id: 5, name: 'El Fuerte',   desc: 'Defensa y entrenamiento',       pos: { top: '20%', left: '80%' }, iconPos: '100% 0%' },
      { id: 6, name: 'La Gran Batalla', desc: 'Duelo final contra la máquina', pos: { top: '35%', left: '85%' }, iconPos: '25% 0%'  },
    ];

    return (
      <div
        className="relative font-sans overflow-hidden"
        style={{ height: '100dvh', width: '100vw', margin: 0, padding: 0 }}
      >
        {/* World map background fills the full viewport */}
        <div
          className="absolute inset-0 bg-no-repeat bg-cover bg-center"
          style={{ backgroundImage: `url(${import.meta.env.BASE_URL}world_map.png)` }}
        />
        
        {/* Overlay Gradient for depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />

        <button
          onClick={() => setGameState('TITLE')}
          className="absolute top-4 left-4 z-30 px-4 py-2 bg-stone-900/90 hover:bg-stone-800 text-stone-200 font-black rounded-xl border-2 border-amber-600/30 backdrop-blur-md transition-all flex items-center gap-2 group text-sm md:text-base md:px-6 md:py-3 md:top-8 md:left-8"
        >
          <span className="group-hover:-translate-x-1 transition-transform">←</span>
          <span>MENÚ PRINCIPAL</span>
        </button>

        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 text-center md:top-8">
          <h1 className="text-2xl md:text-5xl font-black text-white italic tracking-tighter uppercase drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)] whitespace-nowrap">
            Expansión Territorial
          </h1>
          <div className="h-1 w-20 md:w-32 bg-amber-500 mx-auto mt-1 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
        </div>

        {/* SVG connectors between pins - rendered over full viewport */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
          {phases.slice(0, -1).map((p, i) => {
            const next = phases[i + 1];
            const isUnlocked = maxUnlockedPhase > p.id;
            return (
              <line
                key={i}
                x1={p.pos.left} y1={p.pos.top}
                x2={next.pos.left} y2={next.pos.top}
                stroke={isUnlocked ? '#fbbf24' : '#555'}
                strokeWidth="3"
                strokeDasharray="8,8"
                style={{ transition: 'stroke 0.5s ease' }}
              />
            );
          })}
        </svg>

        {/* Phase pins overlaid directly on the background */}
        {phases.map((p) => {
          const isUnlocked = maxUnlockedPhase >= p.id;
          const isNext = maxUnlockedPhase === p.id;
          return (
            <div
              key={p.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 group z-30"
              style={{ top: p.pos.top, left: p.pos.left }}
            >
              <button
                disabled={!isUnlocked}
                onClick={() => { setCurrentPhase(p.id); setGameState('PLAYING'); }}
                className={`
                  relative w-14 h-14 md:w-20 md:h-20 rounded-2xl border-4 transition-all duration-300
                  flex items-center justify-center
                  ${isUnlocked
                    ? 'bg-stone-900/90 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:scale-110 hover:-translate-y-2 cursor-pointer active:scale-95'
                    : 'bg-stone-950/90 border-stone-800 grayscale cursor-not-allowed opacity-80'
                  }
                `}
              >
                <div
                  className="w-10 h-10 md:w-14 md:h-14 bg-no-repeat bg-contain"
                  style={{
                    backgroundImage: `url(${import.meta.env.BASE_URL}phase_icons.png)`,
                    backgroundPosition: p.iconPos,
                    backgroundSize: '500% 100%'
                  }}
                />
                <div className="absolute bottom-0 right-0 bg-amber-600 text-white text-[8px] md:text-[10px] font-black px-1.5 py-0.5 rounded-tl-md italic">
                  F{p.id}
                </div>
                {!isUnlocked && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-xl">
                    <span className="text-base md:text-xl">🔒</span>
                  </div>
                )}
              </button>

              {isNext && (
                <div className="absolute -inset-2 border-2 border-amber-400 rounded-2xl animate-ping opacity-50 pointer-events-none" />
              )}

              {/* Hover tooltip — desktop only */}
              <div className="hidden md:block absolute top-full mt-3 left-1/2 -translate-x-1/2 w-48 bg-stone-900/95 border border-amber-600/30 p-3 rounded-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none backdrop-blur-md shadow-2xl translate-y-2 group-hover:translate-y-0 z-50">
                <h3 className="text-amber-500 font-black text-xs uppercase italic tracking-widest mb-1">{p.name}</h3>
                <p className="text-stone-300 text-[10px] font-bold leading-tight">{p.desc}</p>
              </div>

              {/* Mobile label under pin */}
              <div className="md:hidden mt-1 text-center pointer-events-none">
                <span className="text-[9px] font-black text-white drop-shadow uppercase bg-black/40 rounded px-1">{p.name}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div 
      className="bg-stone-900 flex flex-col overflow-hidden font-sans relative"
      style={{ height: '100dvh', width: '100vw', margin: 0, padding: 0 }}
    >
      
      {/* Top Game View */}
      <div className="flex-1 relative flex overflow-hidden bg-[#e1d4b7] min-h-0">
        <canvas
          ref={canvasRef}
          width={1}
          height={1}
          onMouseDown={(e) => {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (!rect) return;
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const wx = cameraRef.current.x + (mouseX - rect.width / 2) / cameraRef.current.zoom;
            const wy = cameraRef.current.y + (mouseY - rect.height / 2) / cameraRef.current.zoom;

            if (isPlacingTower) {
              if (wood >= 50) {
                const id = nextBuildingIdRef.current++;
                playerTowersRef.current.push({ id, x: wx, y: wy, hp: 100, lastAttack: 0 });
                setWood(w => w - 50);
                currentWoodRef.current -= 50;
                setTowerCount(playerTowersRef.current.length);
                setIsPlacingTower(false);
              }
              return;
            }

            if (isAdminMode) {
              if (editorTool === 'DELETE') {
                const findAndRemove = (arrRef: React.MutableRefObject<any[]>, threshold = 32) => {
                  const idx = arrRef.current.findIndex(obj => Math.hypot(obj.x - wx, obj.y - wy) < threshold);
                  if (idx !== -1) {
                    arrRef.current.splice(idx, 1);
                    return true;
                  }
                  return false;
                };
                
                if (findAndRemove(treesRef)) {}
                else if (findAndRemove(playerCharactersRef)) {}
                else if (findAndRemove(aiCharactersRef)) {}
                else if (findAndRemove(playerHousesRef, 64)) {}
                else if (findAndRemove(aiHousesRef, 64)) {}
                else if (findAndRemove(butcherShopsRef, 48)) {}
                else if (findAndRemove(aiButcherShopsRef, 48)) {}
                else if (findAndRemove(playerFortsRef, 80)) {}
                else if (findAndRemove(aiFortsRef, 80)) {}
                else if (findAndRemove(playerMarketsRef, 60)) {}
                else if (findAndRemove(playerTowersRef, 40)) {}
                else if (findAndRemove(aiTowersRef, 40)) {}
                else if (findAndRemove(wildBoarsRef)) {}
                else if (findAndRemove(playerSoldiersRef)) {}
                else if (findAndRemove(aiSoldiersRef)) {}
                
                // Update UI counts after deletion
                setPlayerHouseCount(playerHousesRef.current.length);
                setButcherShopCount(butcherShopsRef.current.length);
                setFortCount(playerFortsRef.current.length);
                setSoldierCount(playerSoldiersRef.current.length);
                setMarketCount(playerMarketsRef.current.length);
                setTowerCount(playerTowersRef.current.length);
                setAiHouseCount(aiHousesRef.current.length);
                setAiButcherShopCount(aiButcherShopsRef.current.length);
                setAiFortCount(aiFortsRef.current.length);
                setAiSoldierCount(aiSoldiersRef.current.length);
                setAiTowerCount(aiTowersRef.current.length);
              } else {
                // Placement Logic
                const id = nextBuildingIdRef.current++;
                const charId = nextCharIdRef.current++;
                if (editorTool === 'TREE') treesRef.current.push({ id: nextTreeIdRef.current++, x: wx, y: wy, wood: 3, state: 'GROWN', owner: 'PLAYER' });
                else if (editorTool === 'TREE_BORDER') treesRef.current.push({ id: nextTreeIdRef.current++, x: wx, y: wy, wood: 0, state: 'GROWN', owner: 'BORDER' });
                else if (editorTool === 'BOAR') wildBoarsRef.current.push({ x: wx, y: wy, state: 'IDLE', target: null, timer: 0, hp: 1, wobblePhase: Math.random() * Math.PI*2, wobbleSpeed: 0.05, angle: 0 });
                else if (editorTool === 'HOUSE_P') {
                  const hId = nextBuildingIdRef.current++;
                  playerHousesRef.current.push({ id: hId, x: wx, y: wy, hp: 100, spawnTimer: 3600 });
                  playerCharactersRef.current.push({ id: nextCharIdRef.current++, houseId: hId, x: wx, y: wy, state: 'IDLE', target: null, onReach: 'IDLE', timer: 0, carrying: null, energy: 100, isExhausted: false, isResting: false, hp: 10, currentMode: 'GATHER' });
                }
                else if (editorTool === 'HOUSE_AI') {
                   const hId = nextBuildingIdRef.current++;
                   aiHousesRef.current.push({ id: hId, x: wx, y: wy, hp: 100, spawnTimer: 3600 });
                   aiCharactersRef.current.push({ id: nextCharIdRef.current++, houseId: hId, x: wx, y: wy, state: 'IDLE', target: null, onReach: 'IDLE', timer: 0, carrying: null, energy: 100, isExhausted: false, isResting: false, hp: 10, currentMode: 'GATHER' });
                }
                else if (editorTool === 'BUTCHER_P') butcherShopsRef.current.push({ id, x: wx, y: wy, hp: 100 });
                else if (editorTool === 'BUTCHER_AI') aiButcherShopsRef.current.push({ id, x: wx, y: wy, hp: 100 });
                else if (editorTool === 'FORT_P') playerFortsRef.current.push({ id, x: wx, y: wy, hp: 100 });
                else if (editorTool === 'FORT_AI') aiFortsRef.current.push({ id, x: wx, y: wy, hp: 100 });
                else if (editorTool === 'TOWER_P') playerTowersRef.current.push({ id, x: wx, y: wy, hp: 100, lastAttack: 0 });
                else if (editorTool === 'TOWER_AI') aiTowersRef.current.push({ id, x: wx, y: wy, hp: 100, lastAttack: 0 });
                
                setPlayerHouseCount(playerHousesRef.current.length);
                setButcherShopCount(butcherShopsRef.current.length);
                setFortCount(playerFortsRef.current.length);
                setTowerCount(playerTowersRef.current.length);
                setAiHouseCount(aiHousesRef.current.length);
                setAiButcherShopCount(aiButcherShopsRef.current.length);
                setAiFortCount(aiFortsRef.current.length);
                setAiTowerCount(aiTowersRef.current.length);
              }
              return;
            }
            isDraggingRef.current = true;
            lastMousePosRef.current = { x: e.clientX, y: e.clientY };
          }}
          onMouseMove={(e) => {
            if (!isDraggingRef.current) return;
            const rect = canvasRef.current?.getBoundingClientRect();
            if (!rect) return;

            const dx = e.clientX - lastMousePosRef.current.x;
            const dy = e.clientY - lastMousePosRef.current.y;
            targetCameraRef.current.x -= dx / targetCameraRef.current.zoom;
            targetCameraRef.current.y -= dy / targetCameraRef.current.zoom;
            
            // Constrain camera center to keep the forest as a visual edge
            const margin = currentPhase === 1 ? 400 : 1200;
            const safeMargin = margin - 300; // Tighter margin to keep forest always visible
            
            const viewW = rect.width / targetCameraRef.current.zoom;
            const viewH = rect.height / targetCameraRef.current.zoom;

            // In Phase 1, center is fixed, very little movement allowed
            if (currentPhase === 1) {
              const maxDist = 150; // Max allowed camera offset from center
              const dx_clamped = targetCameraRef.current.x - PHASE1_CENTER_X;
              const dy_clamped = targetCameraRef.current.y - PHASE1_CENTER_Y;
              const dist = Math.hypot(dx_clamped, dy_clamped);
              if (dist > maxDist) {
                targetCameraRef.current.x = PHASE1_CENTER_X + (dx_clamped / dist) * maxDist;
                targetCameraRef.current.y = PHASE1_CENTER_Y + (dy_clamped / dist) * maxDist;
              }
            } else {
              const minX = -safeMargin + viewW / 2;
              const maxX = WORLD_WIDTH + safeMargin - viewW / 2;
              const minY = -safeMargin + viewH / 2;
              const maxY = WORLD_HEIGHT + safeMargin - viewH / 2;

              targetCameraRef.current.x = Math.max(minX, Math.min(maxX, targetCameraRef.current.x));
              targetCameraRef.current.y = Math.max(minY, Math.min(maxY, targetCameraRef.current.y));
            }

            lastMousePosRef.current = { x: e.clientX, y: e.clientY };
          }}
          onMouseUp={() => isDraggingRef.current = false}
          onMouseLeave={() => isDraggingRef.current = false}
          onTouchStart={(e) => {
            if (e.touches.length === 1) {
              isDraggingRef.current = true;
              lastMousePosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            } else if (e.touches.length === 2) {
              const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
              );
              initialPinchDistRef.current = dist;
              initialZoomRef.current = targetCameraRef.current.zoom;
            }
          }}
          onTouchMove={(e) => {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (!rect) return;

            if (e.touches.length === 1 && isDraggingRef.current) {
              const dx = e.touches[0].clientX - lastMousePosRef.current.x;
              const dy = e.touches[0].clientY - lastMousePosRef.current.y;
              targetCameraRef.current.x -= dx / targetCameraRef.current.zoom;
              targetCameraRef.current.y -= dy / targetCameraRef.current.zoom;
              
              const margin = currentPhase === 1 ? 400 : 1200;
              const safeMargin = margin - 300;
              const viewW = rect.width / targetCameraRef.current.zoom;
              const viewH = rect.height / targetCameraRef.current.zoom;

              if (currentPhase === 1) {
                const maxDist = 150;
                const dx_clamped = targetCameraRef.current.x - PHASE1_CENTER_X;
                const dy_clamped = targetCameraRef.current.y - PHASE1_CENTER_Y;
                const dist = Math.hypot(dx_clamped, dy_clamped);
                if (dist > maxDist) {
                  targetCameraRef.current.x = PHASE1_CENTER_X + (dx_clamped / dist) * maxDist;
                  targetCameraRef.current.y = PHASE1_CENTER_Y + (dy_clamped / dist) * maxDist;
                }
              } else {
                const minX = -safeMargin + viewW / 2;
                const maxX = WORLD_WIDTH + safeMargin - viewW / 2;
                const minY = -safeMargin + viewH / 2;
                const maxY = WORLD_HEIGHT + safeMargin - viewH / 2;

                targetCameraRef.current.x = Math.max(minX, Math.min(maxX, targetCameraRef.current.x));
                targetCameraRef.current.y = Math.max(minY, Math.min(maxY, targetCameraRef.current.y));
              }

              lastMousePosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            } else if (e.touches.length === 2 && initialPinchDistRef.current !== null && initialZoomRef.current !== null) {
              const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
              );
              const scale = dist / initialPinchDistRef.current;
              let newZoom = initialZoomRef.current * scale;
              
              const margin = currentPhase === 1 ? 400 : 1200;
              const safeMargin = margin - 300;
              const minZoomX = rect.width / (WORLD_WIDTH + safeMargin * 2);
              const minZoomY = rect.height / (WORLD_HEIGHT + safeMargin * 2);
              const minZoom = Math.max(minZoomX, minZoomY);
              
              newZoom = Math.min(Math.max(minZoom, newZoom), 3);
              targetCameraRef.current.zoom = newZoom;
            }
          }}
          onTouchEnd={(e) => {
            if (e.touches.length < 2) {
              initialPinchDistRef.current = null;
              initialZoomRef.current = null;
            }
            if (e.touches.length === 0) {
              isDraggingRef.current = false;
            } else if (e.touches.length === 1) {
              // resume panning mode from the remaining finger
              lastMousePosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
          }}
          onWheel={(e) => {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (!rect) return;
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const oldZoom = targetCameraRef.current.zoom;
            const zoomAmount = e.deltaY * -0.0015;

            const margin = currentPhase === 1 ? 400 : 1200;
            const safeMargin = margin - 300;

            const minZoomX = rect.width / (WORLD_WIDTH + safeMargin * 2);
            const minZoomY = rect.height / (WORLD_HEIGHT + safeMargin * 2);
            const minZoom = Math.max(minZoomX, minZoomY);

            const newZoom = Math.min(Math.max(minZoom, oldZoom + zoomAmount), 3);
            
            const worldX = targetCameraRef.current.x + (mouseX - rect.width / 2) / oldZoom;
            const worldY = targetCameraRef.current.y + (mouseY - rect.height / 2) / oldZoom;
            
            let tx = worldX - (mouseX - rect.width / 2) / newZoom;
            let ty = worldY - (mouseY - rect.height / 2) / newZoom;
            
            // Constrain camera center to keep the forest as a visual edge
            const viewW = rect.width / newZoom;
            const viewH = rect.height / newZoom;

            if (currentPhase === 1) {
              const maxDist = 150;
              const dx_clamped = tx - PHASE1_CENTER_X;
              const dy_clamped = ty - PHASE1_CENTER_Y;
              const dist = Math.hypot(dx_clamped, dy_clamped);
              if (dist > maxDist) {
                targetCameraRef.current.x = PHASE1_CENTER_X + (dx_clamped / dist) * maxDist;
                targetCameraRef.current.y = PHASE1_CENTER_Y + (dy_clamped / dist) * maxDist;
              } else {
                targetCameraRef.current.x = tx;
                targetCameraRef.current.y = ty;
              }
            } else {
              const minX = -safeMargin + viewW / 2;
              const maxX = WORLD_WIDTH + safeMargin - viewW / 2;
              const minY = -safeMargin + viewH / 2;
              const maxY = WORLD_HEIGHT + safeMargin - viewH / 2;

              targetCameraRef.current.x = Math.max(minX, Math.min(maxX, tx));
              targetCameraRef.current.y = Math.max(minY, Math.min(maxY, ty));
            }
            
            targetCameraRef.current.zoom = newZoom;
          }}
          className={`w-full h-full bg-[#e1d4b7] ${isAdminMode ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'} border-b-4 border-amber-700`}
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
        {marketOpen && currentPhase >= 4 && (
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
                  {deck.map((card) => (
                    <div key={card.id} className="rounded-xl border-2 border-yellow-500 bg-yellow-950/40 p-4 flex flex-col gap-2 transition-all">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{card.icon}</span>
                        <span className="font-black text-sm text-white">{card.name}</span>
                      </div>
                      <p className="text-xs text-stone-300 leading-relaxed flex-1">{card.effect}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-yellow-400 font-black text-sm">💰 {card.cost} oro</span>
                        <button
                          onClick={() => {
                            if (gold >= card.cost) {
                              setGold(g => g - card.cost);
                              currentGoldRef.current -= card.cost;
                              setActiveCards(prev => [...prev, card]);
                              setDeck(prev => prev.filter(c => c.id !== card.id));
                            }
                          }}
                          disabled={gold < card.cost}
                          className="px-3 py-1 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed text-yellow-950 font-black text-xs rounded-lg transition-colors"
                        >
                          Comprar
                        </button>
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
            <p className="text-2xl font-bold mb-12 max-w-md drop-shadow-md">Has conseguido 25 de madera superando la fase 1.</p>
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
              onClick={() => {
                setMaxUnlockedPhase(Math.max(maxUnlockedPhase, 5));
                setGameState('MAP');
              }}
              className="px-12 py-5 bg-white text-yellow-700 font-black text-xl uppercase italic rounded-full hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.8)]"
            >
              Siguiente Fase →
            </button>
          </div>
        )}
        {gameOver === "VICTORY_PHASE_5" && (
          <div className="absolute inset-0 bg-indigo-600/80 flex flex-col items-center justify-center text-white p-8 text-center backdrop-blur-sm z-50">
            <h2 className="text-7xl font-black mb-4 tracking-tighter uppercase italic drop-shadow-xl text-indigo-100">¡Fortaleza Erigida!</h2>
            <p className="text-2xl font-bold mb-12 max-w-md drop-shadow-md">Has establecido un fuerte y entrenado a tu primer soldado. El enemigo ahora sabe que no estamos solos.</p>
            <button 
              onClick={() => {
                setMaxUnlockedPhase(Math.max(maxUnlockedPhase, 6)); // Unlock Phase 6 if exists
                setGameState('MAP');
              }}
              className="px-12 py-5 bg-white text-indigo-700 font-black text-xl uppercase italic rounded-full hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.8)]"
            >
              ¡A la Batalla! →
            </button>
          </div>
        )}
        {gameOver === "VICTORY_PHASE_6" && (
          <div className="absolute inset-0 bg-stone-900 flex flex-col items-center justify-center text-white p-8 text-center backdrop-blur-sm z-50 overflow-hidden">
            <h2 className="text-5xl md:text-8xl font-black mb-6 tracking-tighter uppercase italic drop-shadow-2xl text-amber-500 animate-bounce">¡CONQUISTA TOTAL!</h2>
            <div className="w-32 h-2 bg-amber-600 rounded-full mb-8 shadow-[0_0_20px_rgba(245,158,11,0.5)]" />
            <p className="text-xl md:text-3xl font-bold mb-12 max-w-2xl drop-shadow-md leading-tight text-stone-300">
              Has derrotado a la máquina y unificado las tierras boscosas bajo tu mando. 
              <br/><span className="text-amber-400 mt-4 block">¡Eres el Wood Gatherer definitivo!</span>
            </p>
            <div className="flex flex-col md:flex-row gap-6">
              <button 
                onClick={() => { setGameState('TITLE'); }}
                className="px-12 py-5 bg-amber-600 text-white font-black text-xl uppercase italic rounded-2xl hover:bg-amber-500 hover:scale-105 transition-all shadow-xl"
              >
                Menú Principal
              </button>
              <button 
                onClick={() => { setGameState('MAP'); }}
                className="px-12 py-5 bg-stone-800 text-stone-300 font-black text-xl uppercase italic rounded-2xl hover:bg-stone-700 hover:scale-105 transition-all shadow-xl"
              >
                Volver al Mapa
              </button>
            </div>
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
      <div className="md:h-56 shrink-0 bg-stone-800 border-t-4 border-amber-700 flex flex-col md:flex-row text-stone-200 overflow-y-auto md:overflow-hidden max-h-[50vh] md:max-h-none">
        
        {/* Left Column: Resources & Info */}
        <div className="w-full md:w-1/4 p-4 md:border-r-2 border-b-2 md:border-b-0 border-stone-700 flex flex-col overflow-y-auto touch-pan-y shrink-0 md:shrink">
          <h2 className="text-xl font-black text-amber-500 mb-2 tracking-wider">
            {currentPhase === 1 ? 'FASE 1: LA TALA' : currentPhase === 2 ? 'FASE 2: LA ALDEA' : currentPhase === 3 ? 'FASE 3: LA CAZA' : currentPhase === 4 ? 'FASE 4: EL COMERCIO' : currentPhase === 5 ? 'FASE 5: EL FUERTE' : 'FASE 6: LA GRAN BATALLA'}
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
        <div className="flex-1 p-4 md:border-r-2 border-b-2 md:border-b-0 border-stone-700 flex flex-col overflow-y-auto touch-pan-y md:overflow-hidden min-h-[200px] md:min-h-0 shrink-0 md:shrink">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-2 shrink-0 gap-2">
            <h3 className="text-xs font-bold text-amber-500 uppercase tracking-widest">Trabajadores ({workers.length})</h3>
            <div className="flex gap-1">
              <button title="Todos: Atacar Soldados" onClick={() => setWorkers(prev => prev.map(w => w.role === 'SOLDIER' ? { ...w, mode: 'ATTACK_SOLDIERS' } : w))} className="px-2 py-1 text-[10px] font-bold bg-blue-900 border border-blue-700 hover:bg-blue-800 rounded">Sold.</button>
              <button title="Todos: Atacar Trabajadores" onClick={() => setWorkers(prev => prev.map(w => w.role === 'SOLDIER' ? { ...w, mode: 'ATTACK_WORKERS' } : w))} className="px-2 py-1 text-[10px] font-bold bg-red-900 border border-red-700 hover:bg-red-800 rounded">Trab.</button>
              <button title="Todos: Atacar Edificios" onClick={() => setWorkers(prev => prev.map(w => w.role === 'SOLDIER' ? { ...w, mode: 'ATTACK_BUILDINGS' } : w))} className="px-2 py-1 text-[10px] font-bold bg-orange-900 border border-orange-700 hover:bg-orange-800 rounded">Edif.</button>
              <button title="Todos: Descansar" onClick={() => setWorkers(prev => prev.map(w => w.role === 'SOLDIER' ? { ...w, mode: 'IDLE' } : w))} className="px-2 py-1 text-[10px] font-bold bg-stone-700 border border-stone-500 hover:bg-stone-600 rounded">Desc.</button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto touch-pan-y pr-2 flex flex-col gap-3">
            {['WOOD', 'MEAT', 'SOLDIER'].map(role => {
              const groupWorkers = workers.filter(w => w.role === role);
              if (groupWorkers.length === 0) return null;
              
              const roleName = role === 'WOOD' ? 'Leñadores' : role === 'MEAT' ? 'Cazadores' : 'Soldados';
              const badgeColor = role === 'WOOD' ? 'bg-amber-900/50 text-amber-500 border-amber-700/50' : role === 'MEAT' ? 'bg-red-900/50 text-red-500 border-red-700/50' : 'bg-blue-900/50 text-blue-400 border-blue-700/50';

              return (
                <div key={role} className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[11px] uppercase font-black border ${badgeColor}`}>
                      {roleName} ({groupWorkers.length})
                    </span>
                    <div className="h-px bg-stone-700 flex-1"></div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {groupWorkers.map(worker => (
                      <div key={worker.id} className="flex flex-col bg-stone-900 p-1.5 rounded border border-stone-700 min-w-[125px] shadow-sm">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="font-bold text-[13px] text-stone-200 truncate max-w-[90px]">{worker.name}</span>
                        </div>
                        <div className="flex gap-1 justify-start">
                          {worker.role === 'WOOD' && (
                            <>
                              <button onClick={() => setWorkers(prev => prev.map(w => w.id === worker.id ? { ...w, mode: 'GATHER' } : w))} className={`px-2 py-0.5 text-[11px] rounded transition-colors ${worker.mode === 'GATHER' ? 'bg-amber-600 font-bold' : 'bg-stone-700 hover:bg-stone-600'}`}>Talar</button>
                              <button onClick={() => setWorkers(prev => prev.map(w => w.id === worker.id ? { ...w, mode: 'PLANT' } : w))} className={`px-2 py-0.5 text-[11px] rounded transition-colors ${worker.mode === 'PLANT' ? 'bg-emerald-600 font-bold' : 'bg-stone-700 hover:bg-stone-600'}`}>Plantar</button>
                            </>
                          )}
                          {worker.role === 'MEAT' && (
                            <button onClick={() => setWorkers(prev => prev.map(w => w.id === worker.id ? { ...w, mode: 'HUNT' } : w))} className={`px-3 py-0.5 text-[11px] rounded transition-colors flex-1 ${worker.mode === 'HUNT' ? 'bg-red-700 font-bold' : 'bg-stone-700 hover:bg-stone-600'}`}>Cazar</button>
                          )}
                          {worker.role === 'SOLDIER' && (
                            <>
                              <button onClick={() => setWorkers(prev => prev.map(w => w.id === worker.id ? { ...w, mode: 'ATTACK_SOLDIERS' } : w))} title="Atacar Soldados" className={`px-1.5 py-0.5 text-[11px] rounded transition-colors ${worker.mode === 'ATTACK_SOLDIERS' ? 'bg-blue-600 font-bold' : 'bg-stone-700 hover:bg-stone-600'}`}>S</button>
                              <button onClick={() => setWorkers(prev => prev.map(w => w.id === worker.id ? { ...w, mode: 'ATTACK_WORKERS' } : w))} title="Atacar Trabajadores" className={`px-1.5 py-0.5 text-[11px] rounded transition-colors ${worker.mode === 'ATTACK_WORKERS' ? 'bg-red-600 font-bold' : 'bg-stone-700 hover:bg-stone-600'}`}>T</button>
                              <button onClick={() => setWorkers(prev => prev.map(w => w.id === worker.id ? { ...w, mode: 'ATTACK_BUILDINGS' } : w))} title="Atacar Edificios" className={`px-1.5 py-0.5 text-[11px] rounded transition-colors ${worker.mode === 'ATTACK_BUILDINGS' ? 'bg-orange-600 font-bold' : 'bg-stone-700 hover:bg-stone-600'}`}>E</button>
                            </>
                          )}
                          <button onClick={() => setWorkers(prev => prev.map(w => w.id === worker.id ? { ...w, mode: 'IDLE' } : w))} className={`px-1.5 py-0.5 text-[11px] rounded ml-auto transition-colors ${worker.mode === 'IDLE' ? 'bg-stone-200 text-stone-900 font-bold' : 'bg-stone-800 border border-stone-600 hover:bg-stone-700'}`}>Zz</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Build & Settings */}
        <div className="w-full md:w-1/4 p-4 flex flex-col overflow-y-auto touch-pan-y shrink-0 md:shrink">
          <h3 className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-2 shrink-0">Construcción</h3>
          <div className="flex-1 flex flex-col md:flex-row gap-2 p-2 min-h-0 bg-stone-900 overflow-y-auto">
            {/* Resources HUD (Simplified) */}
            <div className="flex flex-col gap-1 p-2 bg-stone-800 rounded-lg border border-stone-700 md:w-48 shrink-0">
              <div className="grid grid-cols-2 gap-x-2 text-[10px] md:text-sm font-black whitespace-nowrap">
                <span className="text-amber-400">🌲 Madera: {Math.floor(wood)}</span>
                <span className="text-red-400">🍖 Carne: {Math.floor(meat)}</span>
                {currentPhase >= 4 && <span className="text-yellow-400 col-span-2">💰 Oro: {Math.floor(gold)}</span>}
                <span className="text-slate-400">Fuertes: {fortCount}</span>
                <span className="text-blue-400">Soldados: {soldierCount}</span>
                <span className="text-stone-400">Torres: {towerCount}</span>
              </div>
            </div>

            {/* Action Buttons GRID */}
            <div className="flex-1 grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1.5 p-1 min-h-0">
              {/* Row 1: Buildings (Unlocked per Phase) */}
              {currentPhase >= 2 && (
                <button 
                  onClick={() => {
                    const cost = 25 * Math.pow(2, playerHouseCount - 1);
                    if (wood >= cost) buildHouseRef.current++;
                  }}
                  disabled={wood < (25 * Math.pow(2, playerHouseCount - 1))}
                  className="flex flex-col items-center justify-center p-1 bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-stone-600 border border-stone-600 rounded relative"
                >
                  <span className="font-bold text-xs">Casa</span>
                  <span className="text-[9px] text-amber-300">{Math.floor(25 * Math.pow(2, playerHouseCount - 1))} M</span>
                </button>
              )}

              {currentPhase >= 3 && (
                <button 
                  onClick={() => {
                    const cost = 25 * Math.pow(2, butcherShopCount);
                    if (wood >= cost) buildButcherShopRef.current++;
                  }}
                  disabled={wood < (25 * Math.pow(2, butcherShopCount))}
                  className="flex flex-col items-center justify-center p-1 bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-stone-600 border border-stone-600 rounded relative"
                >
                  <span className="font-bold text-xs">Caza</span>
                  <span className="text-[9px] text-amber-300">{Math.floor(25 * Math.pow(2, butcherShopCount))} M</span>
                </button>
              )}

              {currentPhase >= 4 && (
                <>
                  <button 
                    onClick={() => {
                      if (wood >= 150 && meat >= 50) buildMarketRef.current++;
                    }}
                    disabled={wood < 150 || meat < 50 || marketCount >= 1}
                    className="flex flex-col items-center justify-center p-1 bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-stone-600 border border-stone-600 rounded relative"
                  >
                    <span className="font-bold text-xs">Comercio</span>
                    <span className="text-[9px] text-amber-300">150 M / 50 C</span>
                  </button>
                  <button 
                    onClick={() => marketCount > 0 && setMarketOpen(!marketOpen)}
                    disabled={marketCount === 0}
                    className={`flex flex-col items-center justify-center p-1 ${marketOpen ? 'bg-amber-600 border-white' : 'bg-stone-700'} disabled:opacity-30 hover:bg-amber-700 border border-stone-600 rounded relative`}
                  >
                    <span className="font-bold text-xs">Tienda</span>
                    <span className="text-[9px] text-yellow-300">Cartas</span>
                  </button>
                </>
              )}

              {currentPhase >= 5 && (
                <>
                  <button 
                    onClick={() => {
                      const cost = 50 * Math.pow(2, fortCount);
                      if (wood >= cost && meat >= cost) buildFortRef.current++;
                    }}
                    disabled={wood < (50 * Math.pow(2, fortCount)) || meat < (50 * Math.pow(2, fortCount)) || fortCount >= 1}
                    className="flex flex-col items-center justify-center p-1 bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-stone-600 border border-stone-600 rounded relative"
                  >
                    <span className="font-bold text-xs">Fuerte</span>
                    <span className="text-[9px] text-amber-300">{50 * Math.pow(2, fortCount)} M/C</span>
                  </button>
                  <button 
                    onClick={() => {
                      const cost = activeCards.some(c=>c.id==='mercenary')?25:50;
                      if (meat >= cost) buildSoldierRef.current++;
                    }}
                    disabled={(activeCards.some(c=>c.id==='mercenary')?meat<25:meat<50) || fortCount === 0}
                    className="flex flex-col items-center justify-center p-1 bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-stone-600 border border-stone-600 rounded relative"
                  >
                    <span className="font-bold text-xs">Soldado</span>
                    <span className="text-[9px] text-red-300">{activeCards.some(c=>c.id==='mercenary')?25:50} C</span>
                  </button>
                  <button 
                    onClick={() => wood >= 50 && setIsPlacingTower(!isPlacingTower)}
                    disabled={wood < 50}
                    className={`flex flex-col items-center justify-center p-1 ${isPlacingTower ? 'bg-amber-600 border-white' : 'bg-stone-700'} disabled:opacity-30 disabled:cursor-not-allowed hover:bg-amber-700 border border-stone-600 rounded relative`}
                  >
                    <span className="font-bold text-xs">Torre</span>
                    <span className="text-[9px] text-amber-300">50 M</span>
                  </button>
                </>
              )}
            </div>
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
