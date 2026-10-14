import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Html, Lightformer, useAnimations, useGLTF } from '@react-three/drei';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Pencil } from 'lucide-react';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { Box3, CanvasTexture, Group, Mesh, SRGBColorSpace, Vector3 } from 'three';
import maleA from '@/assets/characters/character-male-a.asset.json';
import femaleB from '@/assets/characters/character-female-b.asset.json';
import maleC from '@/assets/characters/character-male-c.asset.json';
import femaleD from '@/assets/characters/character-female-d.asset.json';
import { worldDestination, type WorldContestant } from './contestantWorld';

const models = [maleA.url, femaleB.url, maleC.url, femaleD.url];
type Palette = Record<'ground' | 'grass' | 'tile' | 'edge' | 'zone' | 'zoneLight' | 'deck' | 'ink', string>;

function useWorldPalette() {
  const [palette, setPalette] = useState<Palette | null>(null);
  useEffect(() => {
    const css = getComputedStyle(document.documentElement);
    const token = (name: string) => `hsl(${css.getPropertyValue(`--world-${name}`).trim()})`;
    setPalette({ ground: token('ground'), grass: token('grass'), tile: token('tile'), edge: token('edge'), zone: token('zone'), zoneLight: token('zone-light'), deck: token('deck'), ink: token('ink') });
  }, []);
  return palette;
}

function Ground({ palette }: { palette: Palette }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 900; canvas.height = 700;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = palette.ground; ctx.fillRect(0, 0, 900, 700);
      for (let x = 0; x < 900; x += 30) for (let y = 0; y < 700; y += 30) {
        ctx.fillStyle = (x + y) % 60 === 0 ? palette.grass : palette.ground;
        ctx.fillRect(x + 1, y + 1, 28, 28);
      }
      ctx.fillStyle = palette.tile; ctx.fillRect(90, 310, 720, 80);
      ctx.fillStyle = palette.deck; ctx.fillRect(65, 245, 160, 210);
      ctx.strokeStyle = palette.ink; ctx.lineWidth = 2;
      for (let y = 255; y < 450; y += 20) { ctx.beginPath(); ctx.moveTo(70, y); ctx.lineTo(220, y); ctx.stroke(); }
      ctx.fillStyle = palette.zone; ctx.beginPath(); ctx.roundRect(650, 70, 210, 560, 34); ctx.fill();
      ctx.strokeStyle = palette.zoneLight; ctx.lineWidth = 5; ctx.setLineDash([12, 9]); ctx.stroke(); ctx.setLineDash([]);
      ctx.globalAlpha = 0.3; ctx.fillStyle = palette.zoneLight;
      for (let x = 675; x < 840; x += 35) for (let y = 100; y < 620; y += 35) ctx.fillRect(x, y, 3, 3);
      ctx.globalAlpha = 1;
      for (let i = 0; i < 2200; i++) {
        const x = (Math.sin(i * 127.1) * 43758.5453 % 1 + 1) % 1 * 900;
        const y = (Math.sin(i * 311.7) * 17453.321 % 1 + 1) % 1 * 700;
        ctx.fillStyle = palette.tile; ctx.globalAlpha = 0.09; ctx.fillRect(x, y, 2, 2);
      }
    }
    const map = new CanvasTexture(canvas); map.colorSpace = SRGBColorSpace; return map;
  }, [palette]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <>
    <mesh position={[0, -0.26, 0]} receiveShadow><boxGeometry args={[18, 0.5, 14]} /><meshStandardMaterial color={palette.edge} roughness={0.9} /></mesh>
    <mesh rotation-x={-Math.PI / 2} position-y={0.005} receiveShadow><planeGeometry args={[18, 14]} /><meshStandardMaterial map={texture} roughness={0.95} /></mesh>
    {[-7.9, -5.7, -3.5, -1.3, 0.9, 3.1, 5.3, 7.5].flatMap((x, i) => [-6.5, 6.5].map((z) => <mesh key={`${x}-${z}`} position={[x, 0.2, z]} rotation-y={i * 0.4} castShadow><dodecahedronGeometry args={[0.42, 0]} /><meshStandardMaterial color={i % 2 ? palette.grass : palette.zone} roughness={0.85} flatShading /></mesh>))}
    <Html position={[5.8, 0.1, -5.8]} center zIndexRange={[5, 0]}><span className="world-zone-label"><Check size={12} /> GREEN ZONE</span></Html>
    <Html position={[-6.1, 0.1, -2.7]} center zIndexRange={[5, 0]}><span className="world-deck-label"><Pencil size={11} /> ARTIST</span></Html>
  </>;
}

function Character({ player, index, slot, count, reduced, palette }: { player: WorldContestant; index: number; slot: number; count: number; reduced: boolean; palette: Palette }) {
  const { scene, animations } = useGLTF(models[index % models.length]);
  const object = useMemo(() => {
    const copy = clone(scene);
    const box = new Box3().setFromObject(copy);
    copy.scale.setScalar(1.55 / (box.getSize(new Vector3()).y || 1));
    const bounds = new Box3().setFromObject(copy); const center = bounds.getCenter(new Vector3());
    copy.position.set(-center.x, -bounds.min.y, -center.z);
    copy.traverse((node) => { if (node instanceof Mesh) { node.castShadow = true; node.receiveShadow = true; } });
    return copy;
  }, [scene]);
  const root = useRef<Group>(null); const rig = useRef<Group>(null);
  const { actions } = useAnimations(animations, object);
  const elapsed = useRef(index * 1.4);
  const [moving, setMoving] = useState(false); const movingRef = useRef(false);
  const initial = useMemo(() => worldDestination(player.status, slot, count, 0), []);
  const clip = reduced ? 'static' : moving ? 'sprint' : player.status === 'correct' ? 'emote-yes' : player.status === 'drawing' ? 'interact-right' : 'idle';
  useEffect(() => { const action = actions[clip]; action?.reset().fadeIn(0.2).play(); return () => { action?.fadeOut(0.2); }; }, [actions, clip]);
  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05); elapsed.current += dt;
    const group = root.current; const body = rig.current; if (!group || !body) return;
    const target = worldDestination(player.status, slot, count, reduced ? 0 : elapsed.current);
    const dx = target[0] - group.position.x, dz = target[2] - group.position.z;
    const distance = Math.hypot(dx, dz); const isMoving = !reduced && distance > 0.05;
    if (movingRef.current !== isMoving) { movingRef.current = isMoving; setMoving(isMoving); }
    if (reduced) group.position.set(...target);
    else if (isMoving) {
      const step = Math.min(distance, (player.status === 'correct' ? 4.4 : 1.5) * dt);
      group.position.x += dx / distance * step; group.position.z += dz / distance * step;
      const angle = Math.atan2(dx, dz); const diff = Math.atan2(Math.sin(angle - body.rotation.y), Math.cos(angle - body.rotation.y));
      body.rotation.y += diff * (1 - Math.exp(-10 * dt));
    }
    if (group.userData.label) group.userData.label.dataset.zone = player.status === 'correct' && distance < 0.12 ? 'green' : 'plaza';
  });
  return <group ref={root} position={initial}>
    <mesh rotation-x={-Math.PI / 2} position-y={0.025}><ringGeometry args={[0.34, 0.43, 32]} /><meshBasicMaterial color={player.status === 'correct' ? palette.zoneLight : player.status === 'drawing' ? palette.deck : palette.tile} transparent opacity={0.85} /></mesh>
    <group ref={rig}><primitive object={object} /></group>
    <Html position={[0, 2.1, 0]} center zIndexRange={[12, 6]}>
      <div ref={(el) => { if (root.current) root.current.userData.label = el; }} data-player={player.id} data-status={player.status} className="world-nameplate">
        <AnimatePresence mode="wait">
          {player.status === 'correct' ? <motion.span key="solved" initial={{ scale: 0, y: 8 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', bounce: 0.55 }} className="world-bubble world-bubble-correct" aria-label={`${player.name} guessed correctly`}><Check size={18} strokeWidth={3} /></motion.span>
            : player.bubble ? <motion.span key={player.bubble.id} initial={{ scale: 0.3, y: 8, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }} className="world-bubble">{player.bubble.text}</motion.span>
            : player.status === 'drawing' ? <span className="world-bubble world-bubble-drawing"><Pencil size={15} /></span> : null}
        </AnimatePresence>
        <span className={`world-player-name${player.isMe ? ' world-player-me' : ''}`}>{player.isMe ? 'You' : player.name}{player.status === 'artist' ? ' · done' : ''}</span>
      </div>
    </Html>
  </group>;
}

function Framing() {
  const { camera, size } = useThree();
  useEffect(() => { camera.position.set(0, 24, 16); camera.lookAt(0, 0, 0); if ('zoom' in camera) camera.zoom = Math.min(size.width / 20.5, size.height / 15.5); camera.updateProjectionMatrix(); }, [camera, size.width, size.height]);
  return null;
}

export default function CharacterStage({ players, reduced }: { players: WorldContestant[]; reduced: boolean }) {
  const palette = useWorldPalette(); if (!palette) return null;
  const unsolved = players.filter((p) => p.status !== 'correct' && p.status !== 'drawing');
  const solved = players.filter((p) => p.status === 'correct');
  return <Canvas orthographic shadows camera={{ position: [0, 24, 16], zoom: 25 }} dpr={[1, 1.5]} gl={{ alpha: true, antialias: true }}>
    <Framing /><ambientLight intensity={0.85} /><directionalLight position={[-6, 15, 8]} intensity={2.2} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-camera-left={-11} shadow-camera-right={11} shadow-camera-top={10} shadow-camera-bottom={-10} shadow-normalBias={0.04} />
    <Environment resolution={32}><Lightformer intensity={1.5} position={[0, 8, 0]} rotation-x={-Math.PI / 2} scale={[20, 20, 1]} /></Environment>
    <Ground palette={palette} />
    <Suspense fallback={<Html center><span className="world-player-name">Getting the team ready…</span></Html>}>
      {players.map((player, index) => { const pool = player.status === 'correct' ? solved : unsolved; return <Character key={player.id} player={player} index={index} slot={Math.max(0, pool.findIndex((p) => p.id === player.id))} count={pool.length} reduced={reduced} palette={palette} />; })}
    </Suspense>
  </Canvas>;
}
