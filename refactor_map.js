const fs = require('fs');

try {
  let code = fs.readFileSync('src/App.tsx', 'utf8');

  // 1. Rename constants and set new values
  code = code.replace('const CANVAS_WIDTH = 800;', 'const WORLD_WIDTH = 2400;');
  code = code.replace('const CANVAS_HEIGHT = 600;', 'const WORLD_HEIGHT = 1800;');
  code = code.replace(/CANVAS_WIDTH/g, 'WORLD_WIDTH');
  code = code.replace(/CANVAS_HEIGHT/g, 'WORLD_HEIGHT');

  // 2. Inject camera refs and state
  const refsInjection = `  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef({ x: 0, y: 0, zoom: 1 });
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });`;

  code = code.replace('  const canvasRef = useRef<HTMLCanvasElement>(null);', refsInjection);

  // 3. Inject Canvas Handlers
  const canvasElementOld = `<canvas
          ref={canvasRef}
          width={WORLD_WIDTH}
          height={WORLD_HEIGHT}
          className="bg-[#fef08a] shadow-lg rounded-sm"
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />`;

  const canvasElementNew = `<canvas
          ref={canvasRef}
          onMouseDown={(e) => {
            isDraggingRef.current = true;
            lastMousePosRef.current = { x: e.clientX, y: e.clientY };
          }}
          onMouseMove={(e) => {
            if (!isDraggingRef.current) return;
            const dx = e.clientX - lastMousePosRef.current.x;
            const dy = e.clientY - lastMousePosRef.current.y;
            cameraRef.current.x -= dx / cameraRef.current.zoom;
            cameraRef.current.y -= dy / cameraRef.current.zoom;
            
            // Constrain camera to world bounds
            cameraRef.current.x = Math.max(0, Math.min(WORLD_WIDTH - (canvasRef.current?.width || 0) / cameraRef.current.zoom, cameraRef.current.x));
            cameraRef.current.y = Math.max(0, Math.min(WORLD_HEIGHT - (canvasRef.current?.height || 0) / cameraRef.current.zoom, cameraRef.current.y));

            lastMousePosRef.current = { x: e.clientX, y: e.clientY };
          }}
          onMouseUp={() => isDraggingRef.current = false}
          onMouseLeave={() => isDraggingRef.current = false}
          onWheel={(e) => {
            e.preventDefault();
            const zoomAmount = e.deltaY * -0.001;
            const newZoom = Math.min(Math.max(0.4, cameraRef.current.zoom + zoomAmount), 2.5);
            cameraRef.current.zoom = newZoom;
          }}
          className="bg-[#fef9c3] cursor-grab active:cursor-grabbing"
          style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }}
        />`;

  code = code.replace(canvasElementOld, canvasElementNew);

  // 4. Update the Draw function to use canvas responsive size and camera
  const drawOld = `    const draw = (ctx: CanvasRenderingContext2D) => {
      // Clear canvas (Fondo amarillo clarito)
      ctx.fillStyle = '#fef9c3';
      ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);`;

  const drawNew = `    const draw = (ctx: CanvasRenderingContext2D) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      // Auto-resize canvas to match CSS responsive size
      if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
      }

      // Clear screen (Outer black)
      ctx.fillStyle = '#1c1917'; // stone-900 border color
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      
      // Apply Camera Transform
      ctx.scale(cameraRef.current.zoom, cameraRef.current.zoom);
      ctx.translate(-cameraRef.current.x, -cameraRef.current.y);

      // Draw world bounds (Fondo amarillo clarito)
      ctx.fillStyle = '#fef9c3';
      ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);`;

  code = code.replace(drawOld, drawNew);

  // 5. Restore context inside loop to fix transform scaling issues
  const loopOld = `    const loop = () => {
      if (gameOverRef.current) return;
      update();
      draw(ctx);
      animationId = requestAnimationFrame(loop);
    };`;

  const loopNew = `    const loop = () => {
      if (gameOverRef.current) return;
      update();
      draw(ctx);
      if (ctx.restore) ctx.restore(); // Restore camera transform applied in draw()
      animationId = requestAnimationFrame(loop);
    };`;

  code = code.replace(loopOld, loopNew);

  // 6. Fix useLayoutEffect for attaching wheel event properly (React onWheel is passive)
  const effectInjection = `  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const preventDefaultWheel = (e: WheelEvent) => { e.preventDefault(); };
      canvas.addEventListener('wheel', preventDefaultWheel, { passive: false });
      return () => canvas.removeEventListener('wheel', preventDefaultWheel);
    }
  }, []);\n\n  useEffect(() => {
    currentPhaseRef.current = currentPhase;
  }, [currentPhase]);`;

  code = code.replace(`  useEffect(() => {
    currentPhaseRef.current = currentPhase;
  }, [currentPhase]);`, effectInjection);

  fs.writeFileSync('src/App.tsx', code);
  console.log('App.tsx successfully patched for camera and world bounds.');
} catch(e) {
  console.error("Error during patching:", e);
}
