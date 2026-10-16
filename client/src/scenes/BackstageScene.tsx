import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import {
  ContactShadows,
  Environment,
  Html,
  OrbitControls,
  SpotLight,
  useGLTF,
} from '@react-three/drei';
import * as THREE from 'three';
import {
  CAMERA_SHOT_IDS,
  CameraShotId,
  TargetId,
  WorldState,
} from '../../../shared/types';
import { useGameStore } from '../store/useGameStore';

interface HotspotMeta {
  id: TargetId;
  label: string;
  actionHint: string;
  position: [number, number, number];
  quickActionPrompt: string;
  completed?: boolean;
}

export const CAMERA_RIG_PRESETS: Record<
  CameraShotId,
  {
    pos: [number, number, number];
    target: [number, number, number];
    label: string;
    labelEn: string;
    labelKo: string;
  }
> = {
  WIDE_ESTABLISHING: {
    pos: [0.15, 2.35, 3.85],
    target: [-0.15, 1.15, -0.85],
    label: 'Full Backstage',
    labelEn: 'Full Backstage',
    labelKo: '전체 대기실',
  },
  HANA_CLOSEUP: {
    pos: [-0.75, 1.55, 0.45],
    target: [-1.75, 1.38, -0.65],
    label: 'Hana (Vocal)',
    labelEn: 'Hana (Vocal)',
    labelKo: '하나 (보컬)',
  },
  JIHO_BRIEFING: {
    pos: [0.55, 1.58, -0.65],
    target: [1.35, 1.45, -2.05],
    label: 'Jiho (Director)',
    labelEn: 'Jiho (Director)',
    labelKo: '지호 (감독)',
  },
  COFFEE_TABLE_CLUE: {
    pos: [0.25, 1.45, 1.45],
    target: [0.25, 0.45, 0.0],
    label: 'Cue Sheet Note',
    labelEn: 'Cue Sheet Note',
    labelKo: '진행표 메모',
  },
  VANITY_CARD_DISCOVERY: {
    pos: [-1.45, 1.42, -0.15],
    target: [-2.75, 0.95, -0.55],
    label: 'Vanity & Keycard',
    labelEn: 'Vanity & Keycard',
    labelKo: '화장대 & 카드키',
  },
  LOCKER_RFID_SCAN: {
    pos: [1.25, 1.48, -0.45],
    target: [2.65, 1.15, -1.65],
    label: 'Security Locker',
    labelEn: 'Security Locker',
    labelKo: '보안 장비함',
  },
  MICROPHONE_REVEAL: {
    pos: [1.65, 1.35, -0.85],
    target: [2.62, 1.08, -1.58],
    label: 'Custom Mic',
    labelEn: 'Custom Mic',
    labelKo: '전용 마이크',
  },
  LOUNGE_SOFA_IEM: {
    pos: [-0.45, 1.45, 2.25],
    target: [0.25, 0.65, 0.95],
    label: 'Lounge Sofa',
    labelEn: 'Lounge Sofa',
    labelKo: '휴식 소파',
  },
  ACOUSTIC_GUITAR_CORNER: {
    pos: [0.85, 1.25, 1.85],
    target: [1.85, 0.68, 0.85],
    label: 'Acoustic Guitar',
    labelEn: 'Acoustic Guitar',
    labelKo: '통기타',
  },
  STAGE_DOOR_OPENING: {
    pos: [0.0, 1.55, -0.65],
    target: [0.0, 1.35, -3.35],
    label: 'Main Stage Door',
    labelEn: 'Main Stage Door',
    labelKo: '메인 무대 출입문',
  },
  FINALE_STAGE_BEAMS: {
    pos: [-0.25, 1.85, 2.65],
    target: [0.0, 1.35, -2.5],
    label: 'Finale View',
    labelEn: 'Finale View',
    labelKo: '마지막 장면',
  },
};

function CanvasScreenshotBridge({
  activeCameraPreset,
  controlsRef,
}: {
  activeCameraPreset: CameraShotId | null;
  controlsRef: React.RefObject<any>;
}) {
  const { gl, scene, camera } = useThree();
  const setCanvasCaptureFn = useGameStore((s) => s.setCanvasCaptureFn);
  const setCaptureAllCameraShotsFn = useGameStore(
    (s) => s.setCaptureAllCameraShotsFn
  );

  useEffect(() => {
    if (!activeCameraPreset) return;
    const preset = CAMERA_RIG_PRESETS[activeCameraPreset];
    if (!preset) return;
    camera.position.set(...preset.pos);
    if (controlsRef.current) {
      controlsRef.current.target.set(...preset.target);
      controlsRef.current.update();
    } else {
      camera.lookAt(...preset.target);
    }
  }, [activeCameraPreset, camera, controlsRef]);

  useEffect(() => {
    setCanvasCaptureFn(() => {
      try {
        gl.render(scene, camera);
        return gl.domElement.toDataURL('image/png');
      } catch {
        return null;
      }
    });

    setCaptureAllCameraShotsFn(async () => {
      const results: Partial<Record<CameraShotId, string>> = {};
      try {
        const rigCam = camera.clone() as THREE.PerspectiveCamera;
        for (const shotId of CAMERA_SHOT_IDS) {
          const preset = CAMERA_RIG_PRESETS[shotId];
          rigCam.position.set(...preset.pos);
          rigCam.lookAt(...preset.target);
          rigCam.updateMatrixWorld(true);
          gl.render(scene, rigCam);
          results[shotId] = gl.domElement.toDataURL('image/jpeg', 0.92);
        }
        gl.render(scene, camera);
      } catch {
        // Ignore capture errors
      }
      return results;
    });

    return () => {
      setCanvasCaptureFn(null);
      setCaptureAllCameraShotsFn(null);
    };
  }, [gl, scene, camera, setCanvasCaptureFn, setCaptureAllCameraShotsFn]);

  return null;
}

function BackstageRoomModel({
  worldState,
  controlsRef,
  tagOpacityMode,
}: {
  worldState: WorldState;
  controlsRef: React.RefObject<any>;
  tagOpacityMode: 'translucent' | 'hidden';
}) {
  const { scene } = useGLTF('/models/backstage_room.glb');
  const selectedTarget = useGameStore((s) => s.selectedTarget);
  const hoveredTarget = useGameStore((s) => s.hoveredTarget);
  const setSelectedTarget = useGameStore((s) => s.setSelectedTarget);
  const setHoveredTarget = useGameStore((s) => s.setHoveredTarget);
  const submitPlayerAction = useGameStore((s) => s.submitPlayerAction);
  const submittingAction = useGameStore((s) => s.submittingAction);
  const lang = useGameStore((s) => s.lang);
  const isKo = lang === 'ko';

  const clonedScene = useMemo(() => {
    const root = scene.clone(true);
    // Clone materials on architectural walls/ceiling/slats so we can smoothly fade them when occluding camera
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const n = mesh.name;
      if (
        n.startsWith('Wall') ||
        n.startsWith('Ceiling') ||
        n.startsWith('OakSlat') ||
        n.startsWith('Baseboard')
      ) {
        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map((m) => m.clone());
        } else if (mesh.material) {
          mesh.material = mesh.material.clone();
        }
      }
    });
    return root;
  }, [scene]);

  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const wallMeshes = useMemo(() => {
    const list: THREE.Mesh[] = [];
    clonedScene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const n = mesh.name;
      if (
        n.startsWith('Wall') ||
        n.startsWith('Ceiling') ||
        n.startsWith('OakSlat') ||
        n.startsWith('Baseboard')
      ) {
        list.push(mesh);
      }
    });
    return list;
  }, [clonedScene]);

  // Synchronize GLB props & rigged doors with authoritative WorldState
  useEffect(() => {
    clonedScene.traverse((obj) => {
      if (obj.name === 'access_card') {
        obj.visible = !worldState.hasAccessCard;
      }
      if (obj.name === 'microphone') {
        obj.visible =
          !worldState.hasMicrophone && !worldState.hanaHasMicrophone;
      }
      if (obj.name === 'RIG_locker_door') {
        obj.rotation.y = worldState.lockerUnlocked ? -1.35 : -0.25;
      }
      if (obj.name === 'RIG_stage_door' || obj.name === 'stage_door') {
        if (obj.name === 'RIG_stage_door') {
          obj.rotation.y = worldState.stageDoorOpen ? 1.35 : 0.0;
        }
      }
      if (obj.name === 'RIG_vanity_drawer') {
        obj.position.z = worldState.mirrorInspected ? 0.48 : 0.33;
      }
    });
  }, [
    clonedScene,
    worldState.hasAccessCard,
    worldState.hasMicrophone,
    worldState.hanaHasMicrophone,
    worldState.lockerUnlocked,
    worldState.stageDoorOpen,
    worldState.mirrorInspected,
  ]);

  // Dynamic See-Through Wall Occlusion in useFrame
  useFrame(({ camera }) => {
    const camPos = camera.position;
    const focusPoint = controlsRef.current?.target
      ? (controlsRef.current.target as THREE.Vector3)
      : new THREE.Vector3(0, 1.2, -0.6);

    // Raycast from camera to focus point & key character positions to detect blocking walls
    const checkTargets = [
      focusPoint,
      new THREE.Vector3(-1.75, 1.3, -0.65), // Hana
      new THREE.Vector3(1.35, 1.3, -2.05), // Jiho
      new THREE.Vector3(-0.45, 1.3, 0.35), // Protagonist
    ];

    const occludedSet = new Set<THREE.Object3D>();
    for (const pt of checkTargets) {
      const dir = pt.clone().sub(camPos);
      const dist = dir.length();
      if (dist > 0.1) {
        raycaster.set(camPos, dir.normalize());
        raycaster.far = dist - 0.15;
        const hits = raycaster.intersectObjects(wallMeshes, false);
        for (const h of hits) {
          occludedSet.add(h.object);
        }
      }
    }

    for (const mesh of wallMeshes) {
      const n = mesh.name;
      let shouldFade = occludedSet.has(mesh);

      // Positional boundary cutaway rules so walls behind the camera automatically become see-through
      if (n.startsWith('Ceiling') && camPos.y > 1.85) {
        shouldFade = true;
      }
      if (
        (n.includes('Left') || n.startsWith('OakSlatBL')) &&
        camPos.x < -1.95
      ) {
        shouldFade = true;
      }
      if (
        (n.includes('Right') || n.startsWith('OakSlatBR')) &&
        camPos.x > 1.95
      ) {
        shouldFade = true;
      }
      if ((n.includes('Back') || n.startsWith('OakSlat')) && camPos.z < -1.45) {
        shouldFade = true;
      }

      const targetOpacity = shouldFade ? 0.12 : 1.0;
      const mats = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      for (const m of mats) {
        const std = m as THREE.MeshStandardMaterial;
        if (!std) continue;
        const nextOp = THREE.MathUtils.lerp(
          std.opacity ?? 1.0,
          targetOpacity,
          0.18
        );
        std.opacity = nextOp;
        std.transparent = nextOp < 0.98;
        std.depthWrite = nextOp >= 0.85;
      }
    }
  });

  const resolveTargetId = (rawName: string): TargetId | null => {
    const n = rawName.toLowerCase();
    if (n.includes('hana')) return 'npc_hana';
    if (n.includes('jiho')) return 'npc_jiho';
    if (n.includes('access_card') || n.includes('vip')) return 'access_card';
    if (n.includes('mirror') || n.includes('bulb')) return 'vanity_mirror';
    if (n.includes('vanity') || n.includes('drawer') || n.includes('perfume'))
      return 'vanity_table';
    if (n.includes('microphone') || n.includes('starlightmic'))
      return 'microphone';
    if (n.includes('locker') || n.includes('rfid')) return 'equipment_locker';
    if (n.includes('guitar')) return 'acoustic_guitar';
    if (n.includes('stage_door') || n.includes('stagedoor') || n.includes('onair'))
      return 'stage_door';
    if (n.includes('sofa')) return 'lounge_sofa';
    if (n.includes('coffeetable') || n.includes('book') || n.includes('vase'))
      return 'coffee_table';
    return null;
  };

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    let curr: THREE.Object3D | null = e.object;
    while (curr) {
      const tid = resolveTargetId(curr.name);
      if (tid) {
        e.stopPropagation();
        setSelectedTarget(tid);
        return;
      }
      curr = curr.parent;
    }
  };

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    let curr: THREE.Object3D | null = e.object;
    while (curr) {
      const tid = resolveTargetId(curr.name);
      if (tid) {
        e.stopPropagation();
        setHoveredTarget(tid);
        document.body.style.cursor = 'pointer';
        return;
      }
      curr = curr.parent;
    }
  };

  const handlePointerOut = () => {
    setHoveredTarget(null);
    document.body.style.cursor = 'auto';
  };

  // Clean, non-overlapping interactive hotspots placed slightly above/beside targets so faces are never covered
  const lang = useGameStore((s) => s.lang);
  const isKo = lang === 'ko';

  const hotspots = useMemo<HotspotMeta[]>(() => {
    const list: HotspotMeta[] = [
      {
        id: 'npc_hana',
        label: isKo ? '하나 (리드 보컬)' : 'Hana (Lead Vocal)',
        actionHint: worldState.hasMicrophone
          ? isKo
            ? '마이크 건네주기'
            : 'Hand Mic to Hana'
          : isKo
            ? '대화하기'
            : 'Talk to Hana',
        position: [-1.75, 1.92, -0.65],
        quickActionPrompt: worldState.hasMicrophone
          ? 'Hand the custom starlight microphone over to Hana so she can perform!'
          : 'Talk to Hana to comfort her and ask what happened to her custom starlight microphone.',
        completed: worldState.hanaTalked || worldState.hanaHasMicrophone,
      },
      {
        id: 'npc_jiho',
        label: isKo ? '지호 (무대 디렉터)' : 'Jiho (Stage Director)',
        actionHint: !worldState.jihoTalked
          ? isKo
            ? '장비함 위치 묻기'
            : 'Ask About Locker'
          : isKo
            ? '무대 준비 확인'
            : 'Propose Unplugged',
        position: [1.35, 1.98, -2.05],
        quickActionPrompt: !worldState.jihoTalked
          ? 'Ask Jiho where the custom microphone was moved and how to unlock the equipment locker.'
          : 'Talk to Jiho and propose organizing an alternative unplugged acoustic performance using the backstage acoustic guitar.',
        completed: worldState.jihoTalked,
      },
      {
        id: 'access_card',
        label: worldState.hasAccessCard
          ? isKo
            ? '화장대 테이블'
            : 'Vanity Table'
          : isKo
            ? 'VIP 스태프 카드키'
            : 'VIP Staff Keycard',
        actionHint: !worldState.hasAccessCard
          ? isKo
            ? '카드키 줍기'
            : 'Pick Up Keycard'
          : isKo
            ? '화장대 조사'
            : 'Inspect Vanity',
        position: [-2.72, 1.32, -0.32],
        quickActionPrompt: !worldState.hasAccessCard
          ? 'Inspect the vanity table and pick up the holographic VIP Staff Access Card.'
          : 'Inspect the Hollywood vanity mirror bulbs and acrylic makeup organizers closely.',
        completed: worldState.hasAccessCard,
      },
      {
        id: 'equipment_locker',
        label: worldState.lockerUnlocked
          ? isKo
            ? '보안 장비함 (열림)'
            : 'Security Locker (Open)'
          : isKo
            ? '보안 장비함 (잠김)'
            : 'Security Locker (Locked)',
        actionHint: !worldState.lockerUnlocked
          ? worldState.hasAccessCard
            ? isKo
              ? '카드키로 열기'
              : 'Unlock with Keycard'
            : isKo
              ? '잠금장치 확인'
              : 'Check RFID Lock'
          : !worldState.hasMicrophone && !worldState.hanaHasMicrophone
            ? isKo
              ? '커스텀 마이크 꺼내기'
              : 'Take Custom Mic'
            : isKo
              ? '장비함 조사'
              : 'Inspect Locker',
        position: [2.65, 1.95, -1.65],
        quickActionPrompt: !worldState.lockerUnlocked
          ? worldState.hasAccessCard
            ? 'Use the VIP Staff Access Card to unlock the equipment locker.'
            : 'Try to unlock the equipment locker without the access card.'
          : !worldState.hasMicrophone && !worldState.hanaHasMicrophone
            ? 'Pick up Hana’s custom pearl-lilac microphone from the unlocked equipment locker.'
            : 'Inspect the unlocked equipment locker.',
        completed:
          worldState.lockerUnlocked &&
          (worldState.hasMicrophone || worldState.hanaHasMicrophone),
      },
      {
        id: 'acoustic_guitar',
        label: isKo ? '어쿠스틱 기타' : 'Acoustic Guitar',
        actionHint: !worldState.guitarTuned
          ? isKo
            ? '기타 조율하기'
            : 'Tune Guitar'
          : isKo
            ? '언플러그드 무대 제안'
            : 'Propose Unplugged',
        position: [1.85, 1.25, 0.85],
        quickActionPrompt: !worldState.guitarTuned
          ? 'Tune the backstage acoustic guitar on its stand and check its pickup resonance.'
          : 'Propose organizing an alternative unplugged acoustic performance using this tuned guitar with Jiho and Hana.',
        completed: worldState.guitarTuned || worldState.acousticBackupApproved,
      },
      {
        id: 'stage_door',
        label: isKo ? '메인 무대 출입문' : 'Main Stage Door',
        actionHint:
          worldState.hanaHasMicrophone || worldState.acousticBackupApproved
            ? isKo
              ? '무대 문 열기 (피날레)'
              : 'Open Stage Door (Finale)'
            : isKo
              ? '출입문 상태 확인'
              : 'Check Stage Door',
        position: [0.0, 2.38, -3.25],
        quickActionPrompt: worldState.hanaHasMicrophone
          ? 'Open the stage entrance door and launch LUMINA’s comeback performance with Hana’s recovered microphone!'
          : worldState.acousticBackupApproved
            ? 'Open the stage entrance door and start the Unplugged Acoustic Encore performance!'
            : 'Try to open the stage entrance door and start the concert right now.',
        completed: worldState.stageDoorOpen,
      },
    ];
    return list;
  }, [worldState, isKo]);

  return (
    <group>
      <primitive
        object={clonedScene}
        onPointerDown={handlePointerDown}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      />

      {/* Translucent See-Through In-World Nameplates (말풍선 이름표 반투명 투과) */}
      {tagOpacityMode !== 'hidden' &&
        hotspots.map((h) => {
          const isSelected = selectedTarget === h.id;
          const isHovered = hoveredTarget === h.id;
          const anyActive = Boolean(selectedTarget || hoveredTarget);
          const isReadyStage =
            h.id === 'stage_door' &&
            (worldState.hanaHasMicrophone || worldState.acousticBackupApproved);

          // See-through opacity logic: 0.45 default, fades to 0.22 when another object is focused, 0.90 when hovered/selected
          const pillOpacity =
            isSelected || isHovered
              ? 'opacity-90 scale-105'
              : anyActive
                ? 'opacity-25 hover:opacity-85 scale-90'
                : 'opacity-50 hover:opacity-90 scale-95';

          return (
            <Html
              key={h.id}
              position={h.position}
              center
              distanceFactor={7}
              zIndexRange={[10, 0]}
              style={{ pointerEvents: 'none' }}
            >
              <div
                style={{ pointerEvents: 'auto' }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isSelected) {
                    submitPlayerAction(h.quickActionPrompt, h.id);
                  } else {
                    setSelectedTarget(h.id);
                  }
                }}
                className={`group cursor-pointer select-none transition-all duration-200 ${pillOpacity}`}
              >
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-[3px] border transition-all ${
                    isReadyStage
                      ? 'bg-amber-950/60 border-amber-300/70 text-amber-100'
                      : isSelected
                        ? 'bg-stone-900/75 border-amber-300/80 text-stone-100 shadow-md'
                        : h.completed
                          ? 'bg-stone-900/35 border-emerald-400/40 text-stone-200'
                          : 'bg-stone-950/38 border-white/20 text-stone-100 hover:border-amber-200/60'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isReadyStage
                        ? 'bg-amber-300 animate-ping'
                        : h.completed
                          ? 'bg-emerald-400'
                          : isSelected
                            ? 'bg-amber-300'
                            : 'bg-stone-300'
                    }`}
                  />
                  <span className="text-[11px] font-medium tracking-tight whitespace-nowrap drop-shadow">
                    {h.label}
                  </span>
                  {(isSelected || isHovered) && (
                    <span className="text-[10px] font-semibold text-amber-200 pl-1 border-l border-white/20 whitespace-nowrap">
                      {submittingAction
                        ? isKo
                          ? '진행 중...'
                          : 'Acting...'
                        : h.actionHint}{' '}
                      →
                    </span>
                  )}
                </div>
              </div>
            </Html>
          );
        })}
    </group>
  );
}

export const BackstageScene: React.FC = () => {
  const worldState = useGameStore((s) => s.worldState);
  const lang = useGameStore((s) => s.lang);
  const isKo = lang === 'ko';
  const [activeCameraPreset, setActiveCameraPreset] =
    useState<CameraShotId | null>('WIDE_ESTABLISHING');
  const [tagOpacityMode, setTagOpacityMode] = useState<
    'translucent' | 'hidden'
  >('translucent');
  const controlsRef = useRef<any>(null);

  if (!worldState) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#181614] text-stone-300 text-sm">
        {isKo
          ? '백스테이지 3D 대기실을 불러오는 중입니다...'
          : 'Loading 3D Backstage Green Room...'}
      </div>
    );
  }

  const cameraButtons: CameraShotId[] = [
    'WIDE_ESTABLISHING',
    'HANA_CLOSEUP',
    'JIHO_BRIEFING',
    'VANITY_CARD_DISCOVERY',
    'LOCKER_RFID_SCAN',
    'ACOUSTIC_GUITAR_CORNER',
    'STAGE_DOOR_OPENING',
  ];

  return (
    <div className="w-full h-full relative">
      {/* Minimal Camera Viewpoint & See-Through Tag Control Bar */}
      <div className="absolute top-3 left-4 right-4 z-10 flex items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pointer-events-auto bg-stone-950/55 backdrop-blur-md border border-white/10 rounded-full px-2 py-1">
          {cameraButtons.map((shotId) => {
            const preset = CAMERA_RIG_PRESETS[shotId];
            const active = activeCameraPreset === shotId;
            return (
              <button
                key={shotId}
                onClick={() => setActiveCameraPreset(shotId)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium shrink-0 transition cursor-pointer ${
                  active
                    ? 'bg-stone-100 text-stone-900 font-semibold shadow-sm'
                    : 'text-stone-300 hover:text-white hover:bg-white/10'
                }`}
              >
                {isKo ? preset.labelKo : preset.labelEn}
              </button>
            );
          })}
        </div>

        <button
          onClick={() =>
            setTagOpacityMode((m) =>
              m === 'translucent' ? 'hidden' : 'translucent'
            )
          }
          className="pointer-events-auto px-3 py-1.5 rounded-full bg-stone-950/55 backdrop-blur-md border border-white/10 text-[11px] text-stone-300 hover:text-white transition cursor-pointer shrink-0"
          title={
            isKo
              ? '말풍선 이름표 반투명 표시 / 숨기기'
              : 'Toggle 3D translucent nameplates'
          }
        >
          {tagOpacityMode === 'translucent'
            ? isKo
              ? '이름표: 반투명 투과'
              : 'Tags: See-Through'
            : isKo
              ? '이름표: 숨김'
              : 'Tags: Hidden'}
        </button>
      </div>

      <Canvas
        shadows
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        camera={{ position: [0.15, 2.35, 3.85], fov: 42 }}
      >
        <CanvasScreenshotBridge
          activeCameraPreset={activeCameraPreset}
          controlsRef={controlsRef}
        />

        <color attach="background" args={['#181614']} />
        <fog attach="fog" args={['#181614', 9, 24]} />

        {/* Warm Architectural Interior Studio Lighting (No Cyberpunk) */}
        <ambientLight intensity={0.75} color="#fff8f0" />

        <SpotLight
          position={[-2.2, 2.95, 1.2]}
          angle={0.85}
          penumbra={0.9}
          intensity={3.2}
          color="#ffe8cc"
          castShadow
        />
        <SpotLight
          position={[2.2, 2.95, 1.2]}
          angle={0.85}
          penumbra={0.9}
          intensity={3.0}
          color="#fff3e0"
          castShadow
        />
        <pointLight
          position={[-2.6, 1.5, -0.75]}
          intensity={1.8}
          distance={4.5}
          color="#ffdfa8"
        />
        <pointLight
          position={[0, 2.6, -2.2]}
          intensity={worldState.stageDoorOpen ? 4.8 : 2.0}
          distance={7.0}
          color="#ffe4b5"
        />

        <BackstageRoomModel
          worldState={worldState}
          controlsRef={controlsRef}
          tagOpacityMode={tagOpacityMode}
        />

        <ContactShadows
          position={[0, 0.005, 0]}
          opacity={0.42}
          scale={12}
          blur={2.0}
          far={4.0}
        />
        <Environment preset="apartment" />

        <OrbitControls
          ref={controlsRef}
          makeDefault
          target={[-0.15, 1.15, -0.85]}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.02}
          minDistance={1.2}
          maxDistance={7.5}
          enablePan={true}
        />
      </Canvas>
    </div>
  );
};

useGLTF.preload('/models/backstage_room.glb');
