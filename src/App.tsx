import React, { useEffect, useRef, useState } from 'react';

// Game constants
const WORLD_WIDTH = 2400;
const WORLD_HEIGHT = 1800;
const SPEED = 1;

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
  const [aiHouseCount, setAiHouseCount] = useState(1);
  const [aiButcherShopCount, setAiButcherShopCount] = useState(0);
  const [aiFortCount, setAiFortCount] = useState(0);
  const [aiSoldierCount, setAiSoldierCount] = useState(0);
  const [gameOver, setGameOver] = useState<string | null>(null);

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
    setPlayerHouseCount(1); setButcherShopCount(0); setFortCount(0); setSoldierCount(0);
    setAiHouseCount(currentPhase <= 3 ? 0 : 1); setAiButcherShopCount(0); setAiFortCount(0); setAiSoldierCount(0);
    setGameOver(null);
    gameOverRef.current = null;
    currentWoodRef.current = 0;
    currentAiWoodRef.current = 0;
    currentMeatRef.current = 0;
    currentAiMeatRef.current = 0;
    let animationId: any;

    console.log("Game initialized for phase", currentPhase);
    // Focus camera on the player's initial spawn base
    cameraRef.current = { x: 150, y: 300, zoom: 1.5 };
    targetCameraRef.current = { x: 150, y: 300, zoom: 1.5 };
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Game state
    let nextBuildingId = 1;
    const playerHouses: (Point & { id: number, hp: number, spawnTimer: number })[] = [{ id: 0, x: 150, y: 300, hp: 100, spawnTimer: 3600 }];
    const butcherShops: (Point & { id: number, hp: number })[] = [];
    const hunters: any[] = [];
    const playerForts: (Point & { id: number, hp: number })[] = [];
    const playerSoldiers: any[] = [];
    const wildBoars: any[] = [];
    let nextCharId = 1;

    const playerCharacters = [
      {
        id: 0,
        houseId: 0,
        x: 150,
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
      }
    ];

    const aiHouses: (Point & { id: number, hp: number, spawnTimer: number })[] = currentPhase <= 3 ? [] : [{ id: 1000, x: 650, y: 300, hp: 100, spawnTimer: 3600 }];
    const aiButcherShops: (Point & { id: number, hp: number })[] = [];
    const aiHunters: any[] = [];
    const aiForts: (Point & { id: number, hp: number })[] = [];
    const aiSoldiers: any[] = [];
    const aiCharacters = currentPhase <= 3 ? [] : [
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
        currentMode: 'GATHER' as GameMode,
        hp: 10,
      }
    ];

    const MIN_TREE_DISTANCE = 48;
    const MIN_HOUSE_DISTANCE = 64;

    const getValidTreePosition = (existingTrees: Tree[], owner: 'PLAYER' | 'AI'): Point | null => {
      let x = 0, y = 0;
      let valid = false;
      let attempts = 0;
      const allHouses = [...playerHouses, ...aiHouses, ...butcherShops, ...aiButcherShops, ...playerForts, ...aiForts];
      while (!valid && attempts < 200) {
        if (owner === 'PLAYER') {
          x = 200 + (Math.random() - 0.5) * 360; // Player side
        } else {
          x = 600 + (Math.random() - 0.5) * 360; // AI side
        }
        y = 300 + (Math.random() - 0.5) * 560;
        
        // Clamp to canvas
        x = Math.max(20, Math.min(WORLD_WIDTH - 20, x));
        y = Math.max(20, Math.min(WORLD_HEIGHT - 20, y));

        valid = true;
        for (const tree of existingTrees) {
          if (Math.abs(tree.x - x) < MIN_TREE_DISTANCE && Math.abs(tree.y - y) < MIN_TREE_DISTANCE) {
            valid = false;
            break;
          }
        }
        if (valid) {
          for (const house of allHouses) {
            if (Math.abs(house.x - x) < MIN_HOUSE_DISTANCE && Math.abs(house.y - y) < MIN_HOUSE_DISTANCE) {
              valid = false;
              break;
            }
          }
        }
        attempts++;
      }
      return valid ? { x, y } : null;
    };

    const getValidBuildingPosition = (owner: 'PLAYER' | 'AI'): Point | null => {
      let x = 0, y = 0;
      let valid = false;
      let attempts = 0;
      const allBuildings = [...playerHouses, ...aiHouses, ...butcherShops, ...aiButcherShops, ...playerForts, ...aiForts];
      while (!valid && attempts < 200) {
        if (owner === 'PLAYER') {
          x = 150 + (Math.random() - 0.5) * 150;
          x = Math.max(20, Math.min(350, x));
        } else {
          x = 650 + (Math.random() - 0.5) * 150;
          x = Math.max(450, Math.min(WORLD_WIDTH - 20, x));
        }
        y = 300 + (Math.random() - 0.5) * 300;
        y = Math.max(20, Math.min(WORLD_HEIGHT - 20, y));

        valid = true;
        for (const b of allBuildings) {
          if (Math.abs(b.x - x) < MIN_HOUSE_DISTANCE && Math.abs(b.y - y) < MIN_HOUSE_DISTANCE) {
            valid = false;
            break;
          }
        }
        if (valid) {
          for (const t of trees) {
            if (Math.abs(t.x - x) < MIN_HOUSE_DISTANCE && Math.abs(t.y - y) < MIN_HOUSE_DISTANCE) {
              valid = false;
              break;
            }
          }
        }
        attempts++;
      }
      return valid ? { x, y } : null;
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
    if (currentPhase > 3) {
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
    // Generate massive irregular border forest
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
      while (buildHouseRef.current > 0) {
        buildHouseRef.current--;
        const currentCost = 25 * Math.pow(4, playerHouses.length - 1);
        if (currentWoodRef.current >= currentCost) {
          const pos = getValidBuildingPosition('PLAYER');
          if (pos) {
            currentWoodRef.current -= currentCost;
            setWood(currentWoodRef.current);
            const houseId = nextBuildingId++;
            playerHouses.push({ id: houseId, x: pos.x, y: pos.y, hp: 100, spawnTimer: 3600 });
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
            });
            setWorkers(prev => [...prev, { id: newId, name: NAMES[prev.length % NAMES.length], mode: 'GATHER', role: 'WOOD' }]);
          }
        }
      }

      // House Spawning Logic
      playerHouses.forEach(h => {
        if (!h) return;
        const members = playerCharacters.filter(c => c && c.houseId === h.id).length;
        if (members < 2) {
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

      // Check pending butcher shops
      while (buildButcherShopRef.current > 0) {
        buildButcherShopRef.current--;
        const currentCost = 100 * Math.pow(2, butcherShops.length);
        if (currentWoodRef.current >= currentCost) {
          const pos = getValidBuildingPosition('PLAYER');
          if (pos) {
            currentWoodRef.current -= currentCost;
            setWood(currentWoodRef.current);
            const shopId = nextBuildingId++;
            butcherShops.push({ id: shopId, x: pos.x, y: pos.y, hp: 100 });
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
            });
            setWorkers(prev => [...prev, { id: newId, name: NAMES[prev.length % NAMES.length], mode: 'HUNT', role: 'MEAT' }]);
          }
        }
      }

      // Check pending forts
      while (buildFortRef.current > 0) {
        buildFortRef.current--;
        const fortCost = 50 * Math.pow(2, playerForts.length);
        if (currentWoodRef.current >= fortCost && currentMeatRef.current >= fortCost) {
          const pos = getValidBuildingPosition('PLAYER');
          if (pos) {
            currentWoodRef.current -= fortCost;
            currentMeatRef.current -= fortCost;
            setWood(currentWoodRef.current);
            setMeat(currentMeatRef.current);
            playerForts.push({ id: nextBuildingId++, x: pos.x, y: pos.y, hp: 100 });
            setFortCount(playerForts.length);
          }
        }
      }

      // Check pending soldiers
      while (buildSoldierRef.current > 0) {
        buildSoldierRef.current--;
        if (currentMeatRef.current >= 50 && playerForts.length > 0) {
          currentMeatRef.current -= 50;
          setMeat(currentMeatRef.current);
          const newId = nextCharId++;
          playerSoldiers.push({
            id: newId,
            x: playerForts[0].x,
            y: playerForts[0].y,
            hp: 20,
            state: 'IDLE',
            target: null,
            onReach: 'IDLE',
            timer: 0,
            energy: 100,
            isExhausted: false,
            isResting: false,
          });
          setSoldierCount(playerSoldiers.length);
          setWorkers(prev => [...prev, { id: newId, name: NAMES[prev.length % NAMES.length], mode: 'IDLE', role: 'SOLDIER' }]);
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
              nearestSoldier.hp -= 1/60; // 1 HP per second
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
              nearestSoldier.hp -= 1/60;
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

      // Update counts
      setPlayerHouseCount(playerHouses.length);
      setButcherShopCount(butcherShops.length);
      setFortCount(playerForts.length);
      setSoldierCount(playerSoldiers.length);
      setAiHouseCount(aiHouses.length);
      setAiButcherShopCount(aiButcherShops.length);
      setAiFortCount(aiForts.length);
      setAiSoldierCount(aiSoldiers.length);

      // Check Win/Loss Condition
      if (!gameOverRef.current) {
        if (playerHouses.length === 0 && butcherShops.length === 0 && playerForts.length === 0) {
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
        } else {
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
              if (p.state === 'CHOPPING') p.timer = 60;
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
            currentWoodRef.current += 2;
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
              growTime: Date.now() + 60000,
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
            currentMeatRef.current += 4;
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
      if (currentPhase > 3) {
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
            const width = isBorder ? 48 : 32;
            const height = isBorder ? 48 : 32;
            ctx.drawImage(img, t.x - width / 2, t.y - height / (isBorder ? 1.5 : 2.5), width, height);
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
      aiHouses.forEach(h => {
        if (!h) return;
        drawPixelHouse(h.x, h.y, true);
        drawHP(h.x, h.y + 15, h.hp, 100, '#ef4444');
      });

      // Draw AI Characters
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
      ctx.fillStyle = '#7f1d1d'; // red-900
      aiButcherShops.forEach(h => {
        if (!h) return;
        ctx.fillText('C', h.x, h.y);
        drawHP(h.x, h.y + 5, h.hp, 100, '#ef4444');
      });

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
      ctx.fillStyle = '#57534e'; // stone-600
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      wildBoars.forEach(b => {
        ctx.fillText('J', b.x, b.y);
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
          <div className="flex flex-col items-center gap-3 opacity-50">
            <button 
              disabled={maxUnlockedPhase < 4}
              onClick={() => { setCurrentPhase(4); setGameState('PLAYING'); }}
              className="w-24 h-24 rounded-full bg-slate-400 border-4 border-slate-300 flex items-center justify-center text-3xl font-black text-slate-800 shadow-[0_10px_0_theme(colors.slate.600)] transition-all cursor-not-allowed"
            >
              4
            </button>
            <span className="text-emerald-100 font-bold tracking-wide">Próximamente</span>
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
            targetCameraRef.current.x = Math.max(-100, Math.min(WORLD_WIDTH + 100, targetCameraRef.current.x));
            targetCameraRef.current.y = Math.max(-100, Math.min(WORLD_HEIGHT + 100, targetCameraRef.current.y));

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
            const newZoom = Math.min(Math.max(0.4, oldZoom + zoomAmount), 3);
            
            const worldX = targetCameraRef.current.x + (mouseX - rect.width / 2) / oldZoom;
            const worldY = targetCameraRef.current.y + (mouseY - rect.height / 2) / oldZoom;
            
            targetCameraRef.current.x = worldX - (mouseX - rect.width / 2) / newZoom;
            targetCameraRef.current.y = worldY - (mouseY - rect.height / 2) / newZoom;
            
            // Constrain camera center to keep the forest as a visual edge
            targetCameraRef.current.x = Math.max(-100, Math.min(WORLD_WIDTH + 100, targetCameraRef.current.x));
            targetCameraRef.current.y = Math.max(-100, Math.min(WORLD_HEIGHT + 100, targetCameraRef.current.y));
            
            targetCameraRef.current.zoom = newZoom;
          }}
          className="w-full h-full bg-[#fef9c3] cursor-grab active:cursor-grabbing border-b-4 border-amber-700"
          style={{ display: 'block', touchAction: 'none' }}
        />
        
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
        {gameOver && gameOver !== "VICTORY_PHASE_1" && gameOver !== "VICTORY_PHASE_2" && gameOver !== "VICTORY_PHASE_3" && (
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
            {currentPhase === 1 ? 'FASE 1: LA TALA' : currentPhase === 2 ? 'FASE 2: LA ALDEA' : currentPhase === 3 ? 'FASE 3: LA CAZA' : 'WOOD GATHERER'}
          </h2>
          
          <div className="flex flex-col gap-2">
            <div className="bg-stone-900/50 p-2 rounded">
              <p className="text-[10px] text-stone-400 uppercase font-bold tracking-wider mb-1">Tu Imperio</p>
              <div className="grid grid-cols-2 gap-1 text-sm font-bold">
                <span className="text-amber-600">Madera: {wood}</span>
                <span className="text-red-400">Carne: {meat}</span>
                <span className="text-slate-400">Fuertes: {fortCount}</span>
                <span className="text-blue-400">Soldados: {soldierCount}</span>
              </div>
            </div>
            
            <div className="bg-red-950/20 p-2 rounded border border-red-900/30">
              <p className="text-[10px] text-red-500/70 uppercase font-bold tracking-wider mb-1">Ordenador</p>
              <div className="grid grid-cols-2 gap-1 text-xs text-stone-400">
                <span>Madera: {aiWood}</span>
                <span>Carne: {aiMeat}</span>
                <span>Fuertes: {aiFortCount}</span>
                <span>Soldados: {aiSoldierCount}</span>
              </div>
            </div>
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
              onClick={() => wood >= 25 * Math.pow(4, playerHouseCount - 1) && buildHouseRef.current++}
              disabled={wood < 25 * Math.pow(4, playerHouseCount - 1)}
              className="flex flex-col items-center justify-center p-1 bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-amber-700 hover:border-amber-500 border border-stone-600 rounded relative"
            >
              <span className="font-bold text-xs">Casa</span>
              <span className="text-[9px] text-amber-300">{25 * Math.pow(4, playerHouseCount - 1)} M</span>
            </button>
            <button 
              onClick={() => wood >= 100 * Math.pow(2, butcherShopCount) && buildButcherShopRef.current++}
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
              onClick={() => meat >= 50 && fortCount > 0 && buildSoldierRef.current++}
              disabled={meat < 50 || fortCount === 0}
              className="flex flex-col items-center justify-center p-1 bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-600 hover:border-slate-400 border border-stone-600 rounded relative"
            >
              <span className="font-bold text-xs">Soldado</span>
              <span className="text-[9px] text-red-300">50 C</span>
            </button>
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
