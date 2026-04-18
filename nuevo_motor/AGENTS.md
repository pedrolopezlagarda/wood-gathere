# Project Rules & Constraints

## Tile Painting & Autotiling (LOCKED)
The logic for tile painting and autotiling is strictly defined and MUST NOT be modified without explicit user request.

### 1. Autotiling Hierarchy (getRoleFromMask)
- **Centers**: Priority for junctions (3-4 neighbors) and straight lines (2 opposite neighbors). This ensures solid masses and T-junctions.
- **Ends**: Used for tiles with exactly 1 neighbor (rounded tips).
- **Corners**: Used for tiles with exactly 2 adjacent neighbors (L-shapes).
- **Inner Corners**: NEVER automatically assigned during normal drawing.

### 2. Interaction Logic (handlePaint)
- **Drag Protection**: While dragging the brush (mouse move), tiles are reset to the default `cornerStyle`. No manual variants are applied.
- **4-way Toggle (Manual Only)**: Manual tile variation is ONLY triggered on a single `onClick` event.
- **Cycle Order**: `rounded (auto)` -> `square (center)` -> `outer (normal corner)` -> `inner (concave corner)` -> `rounded`.
- **Inner Corners**: These are EXCLUSIVELY accessible via the manual toggle cycle.

### 3. General Principle
- "Start from zero" logic: Keep it simple, prioritize mass connectivity, and leave manual overrides for fine-tuning.

## PNG Transparency & Layer Rendering (LOCKED)
The rendering system for layers and transparency is strictly defined to ensure Photoshop-like behavior.

### 1. Multi-Canvas Architecture
- Each layer type (`ground`, `objects`, `shadows`) MUST render to its own dedicated canvas ref (`canvasRefs`).
- All canvases MUST be cleared simultaneously at the start of the render cycle using `ctx.clearRect`.

### 2. Ground Layer Transparency
- Ground layers MUST behave like transparent PNGs.
- **No Black Backgrounds**: The rendering loop must never draw solid backgrounds behind tiles.
- **Two-Pass Rendering**: 
    - Pass 1 (Base): Draws the central 32x32 area of tiles.
    - Pass 2 (Overflow): Draws the padding/edges that overlap adjacent tiles.
- **Composition**: Must use default `source-over` composite operation to allow underlying layers to show through transparent pixels.

### 3. Layer Independence
- Layers are independent. Reordering or toggling visibility of one layer must not affect the pixel data or transparency of others.
- Opacity/Transparency in a ground layer must always reveal the layer immediately below it in the stack.

## Animation & Spritesheet System (LOCKED)
The animation system for tiles and sprites is strictly defined.

### 1. Spritesheet Format
- Animated tiles MUST be exported as horizontal strips (spritesheets) where `width = gridSize * frameCount`.
- The `TileData` and `tileMetadata` MUST store the `frameCount` to allow correct slicing.

### 2. Map Rendering Logic
- The map render loop MUST use a global `animationFrame` state to synchronize all tiles.
- The `drawTile` function MUST calculate the `sourceX` using `(animationFrame % frameCount) * (img.width / frameCount)`.
- This logic MUST be compatible with both standard tiles and autotiled groups.

## Layer Management & Shadows (LOCKED)
### 1. Dynamic Layer Types
- Layers (except the dedicated `shadows` layer) MUST be toggleable between `ground` and `objects` types.
- `objects` layers MUST automatically trigger shadow generation on the `shadows` layer if the tile has `hasShadow: true`.

### 2. Shadow Synchronization
- Operations like `fill` or `eraser` on an `objects` layer MUST also update the corresponding positions in the `shadows` layer to maintain visual consistency.

## Lighting System (LOCKED)
The lighting system uses a multi-pass canvas approach for ambient light and dynamic sources.

### 1. Rendering Pipeline
- **Ambient Pass**: Fills the `lighting` canvas with `ambientLight.color` at `1 - ambientLight.intensity` opacity.
- **Subtraction Pass**: Uses `globalCompositeOperation = 'destination-out'` with radial gradients to "carve" light into the ambient darkness.
- **Glow Pass**: Uses `globalCompositeOperation = 'lighter'` to add colored glows around light sources.

### 2. Light Source Properties
- Lights MUST support `radius`, `intensity`, `color`, and an optional `pulse` effect.
- The `pulse` effect MUST be synchronized with the global `animationFrame`.

### 3. Interaction
- The `light` tool allows placing, selecting, and moving light sources directly on the map.
- Selecting a light source MUST populate the configuration UI for real-time editing.

## Dynamic Shadows & Ambient Occlusion (LOCKED)
The dynamic shadow and contact shadow systems are precision-calibrated to define the depth and "grounding" of the world.

### 1. Rendering Pipeline (Layer Order)
- **Shadows Layer**: MUST remain at index 0 of the layer stack. It renders TWO key components:
  1. **Contact Shadows (AO)**: Constant, static dark ellipses centered at the base of tiles with `hasShadow: true`.
  2. **Dynamic Shadows**: Projected silhouettes that point 180° AWAY from light sources.

### 2. Contact Shadow (AO) Logic
- MUST calculate the sprite's TRUE base coordinate by resolving technical sprite height (`imgH` and `offsetY`).
- Standardized as a horizontal ellipse: `size * 0.45` (width) x `size * 0.15` (height) with `blur(2px)`.
- Provides "grounding" so objects appear physically attached to the terrain.

### 3. Dynamic Shadow Projection (`drawDynamicShadow`)
- **Pivot**: MUST anchor exactly at the horizontal center and vertical bottom of the sprite's frame.
- **Orientation**: Vector projection MUST always point away from the light source.
- **Matrix Transformation**: Uses specific `rotate(90°)` and `scale(stretch, 0.6)` steps to project the vertical sprite onto the horizontal ground plane.
- **Variable Diffusion**: Blur amount MUST increase dynamically with the shadow's distance from the light.

### 4. Interactive Palette & Groups
- Both individual tiles and "Random Groups" support the `hasShadow` property.
- For groups, the property behaves as a global switch for any tile instance rendered as part of that group's distribution.
