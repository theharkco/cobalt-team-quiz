import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, useAnimations, useGLTF } from '@react-three/drei';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { Box3, Group, Vector3 } from 'three';
import maleA from '@/assets/characters/character-male-a.asset.json';
import femaleB from '@/assets/characters/character-female-b.asset.json';
import maleC from '@/assets/characters/character-male-c.asset.json';
import femaleD from '@/assets/characters/character-female-d.asset.json';

export type ContestantStatus = 'drawing' | 'artist' | 'correct' | 'guessing';
export interface StageCharacter { id: string; status: ContestantStatus; reaction?: string }
const models = [maleA.url, femaleB.url, maleC.url, femaleD.url];

function Character({ player, index, position, reduced }: { player: StageCharacter; index: number; position: [number, number, number]; reduced: boolean }) {
  const variant = index % models.length;
  const { scene, animations } = useGLTF(models[variant]);
  const object = useMemo(() => {
    const copy = clone(scene);
    const box = new Box3().setFromObject(copy);
    copy.scale.setScalar(2.3 / (box.getSize(new Vector3()).y || 1));
    const bounds = new Box3().setFromObject(copy);
    const center = bounds.getCenter(new Vector3());
    copy.position.set(-center.x, -bounds.min.y, -center.z);
    return copy;
  }, [scene]);
  const rig = useRef<Group>(null);
  const { actions } = useAnimations(animations, object);
  const elapsed = useRef(index * 0.7);
  const [hovered, setHovered] = useState(false);
  const clip = reduced ? 'static' : player.status === 'correct' ? 'jump' : player.status === 'drawing' ? 'interact-right' : player.reaction ? 'emote-no' : player.status === 'artist' ? 'emote-yes' : 'idle';
  useEffect(() => {
    const action = actions[clip];
    action?.reset().fadeIn(0.15).play();
    return () => { action?.fadeOut(0.15); };
  }, [actions, clip, player.reaction]);
  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    elapsed.current += dt;
    if (!rig.current) return;
    const target = hovered ? -0.25 : player.status === 'drawing' && !reduced ? Math.sin(elapsed.current * 2) * 0.12 : 0.08;
    rig.current.rotation.y += (target - rig.current.rotation.y) * (1 - Math.exp(-8 * dt));
  });
  return <group position={position} ref={rig} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}><primitive object={object} /></group>;
}

function Framing({ columns }: { columns: number }) {
  const { camera, size } = useThree();
  useEffect(() => {
    if ('zoom' in camera) {
      camera.zoom = size.width / (columns * 3.1);
      camera.updateProjectionMatrix();
    }
  }, [camera, size.width, columns]);
  return null;
}

export default function CharacterStage({ players, columns, reduced }: { players: StageCharacter[]; columns: number; reduced: boolean }) {
  const rows = Math.ceil(players.length / columns);
  return (
    <Canvas orthographic camera={{ position: [0, 0, 20], zoom: 40 }} dpr={[1, 1.5]} gl={{ alpha: true, antialias: true }} aria-hidden="true">
      <Framing columns={columns} />
      <ambientLight intensity={1.1} />
      <directionalLight position={[3, 8, 6]} intensity={2.5} />
      <Environment resolution={64}>
        <Lightformer intensity={2} position={[0, 5, 3]} scale={[10, 10, 1]} />
        <Lightformer intensity={1} position={[-5, 2, 1]} rotation-y={Math.PI / 2} scale={[10, 10, 1]} />
      </Environment>
      <Suspense fallback={null}>
        {players.map((player, i) => <Character key={player.id} player={player} index={i} reduced={reduced}
          position={[(i % columns - (columns - 1) / 2) * 3.1, (rows / 2 - Math.floor(i / columns)) * 4.8 - 3.55, 0]} />)}
      </Suspense>
    </Canvas>
  );
}