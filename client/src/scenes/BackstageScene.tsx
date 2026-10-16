import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import {
  ContactShadows,
  Html,
  OrbitControls,
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
  floorPosition: [number, number, number];
  quickActionPrompt: string;
  completed?: boolean;
}

export const CAMERA_RIG_PRESETS: Record<
  CameraShotId,
  {
    pos: [number, number, number];
    target: [number, number, number];
    labelEn: string;
    labelKo: string;
  }
> = {
  // Average human eye-level (Y = 1.68m) stepped back (Z = 5.15m) for a clear, natural full-room perspective
  WIDE_ESTABLISHING: {
    pos: [0.0, 1.68, 5.15],
    target: [0.0, 1.25, -0.85],
    labelEn: 'Full Backstage',
    labelKo: '전체 대기실',
  },
  HANA_CLOSEUP: {
    pos: [-0.85, 1.60, 1.35],
    target: [-1.95, 1.42, -0.55],
    labelEn: 'Hana (Vocal)',
    labelKo: '하나 (보컬)',
  },
  JIHO_BRIEFING: {
    pos: [0.55, 1.64, 0.35],
    target: [1.55, 1.48, -1.85],
    labelEn: 'Jiho (Director)',
    labelKo: '지호 (감독)',
  },
  COFFEE_TABLE_CLUE: {
    pos: [0.15, 1.52, 1.85],
    target: [1.05, 0.45, 0.15],
    labelEn: 'Cue Sheet Table',
    labelKo: '진행표 탁자',
  },
  VANITY_CARD_DISCOVERY: {
    pos: [-1.85, 1.52, 0.65],
    target: [-3.65, 1.05, -0.55],
    labelEn: 'Vanity & Keycard',
    labelKo: '화장대 & 카드키',
  },
  LOCKER_RFID_SCAN: {
    pos: [1.55, 1.58, 0.45],
    target: [3.65, 1.18, -1.35],
    labelEn: 'Security Locker',
    labelKo: '보안 장비함',
  },
  MICROPHONE_REVEAL: {
    pos: [2.15, 1.42, -0.15],
    target: [3.62, 1.05, -1.33],
    labelEn: 'Custom Mic',
    labelKo: '전용 마이크',
  },
  LOUNGE_SOFA_IEM: {
    pos: [0.25, 1.58, 2.35],
    target: [2.25, 0.65, 0.45],
    labelEn: 'Lounge Sofa',
    labelKo: '휴식 소파',
  },
  ACOUSTIC_GUITAR_CORNER: {
    pos: [1.25, 1.48, 2.85],
    target: [2.95, 0.68, 1.25],
    labelEn: 'Acoustic Guitar',
    labelKo: '통기타',
  },
  STAGE_DOOR_OPENING: {
    pos: [0.0, 1.64, 0.85],
    target: [0.0, 1.35, -3.35],
    labelEn: 'Main Stage Door',
    labelKo: '메인 무대 출입문',
  },
  FINALE_STAGE_BEAMS: {
    pos: [0.0, 1.68, 3.85],
    target: [0.0, 1.35, -2.5],
    labelEn: 'Finale View',
    labelKo: '마지막 장면',
  },
};

export function getNextQuestGuide(
  worldState: WorldState | null | undefined,
  lang: 'en' | 'ko'
): {
  targetId: TargetId;
  stepBadge: string;
  instruction: string;
  prompt: string;
} | null {
  if (!worldState || worldState.stageDoorOpen || worldState.endingReached !== 'NONE') {
    return null;
  }
  const isKo = lang === 'ko';
  if (worldState.hanaHasMicrophone || worldState.acousticBackupApproved) {
    return {
      targetId: 'stage_door',
      stepBadge: isKo ? '마지막 단계 · 무대 출발' : 'FINAL STEP · STAGE READY',
      instruction: isKo
        ? '반짝이는 중앙 메인 무대 출입문을 눌러 복귀 무대를 시작하세요!'
        : 'Click the glowing Center Stage Door to launch the comeback showcase!',
      prompt: isKo
        ? '메인 무대 출입문을 활짝 열고 복귀 공연을 시작한다!'
        : 'Open the stage door and start the comeback performance!',
    };
  }
  if (worldState.hasMicrophone && !worldState.hanaHasMicrophone) {
    return {
      targetId: 'npc_hana',
      stepBadge: isKo ? '5단계 · 마이크 전달' : 'STEP 5 · HAND OVER MIC',
      instruction: isKo
        ? '하나에게 되찾은 전용 별빛 마이크를 건네주세요!'
        : 'Hand the recovered custom Starlight Microphone to Hana!',
      prompt: isKo
        ? '하나에게 전용 무선 마이크를 건네주고 귀걸이 수신기를 동기화한다.'
        : 'Give the wireless microphone to Hana and sync her in-ear monitor.',
    };
  }
  if (
    worldState.lockerUnlocked &&
    !worldState.hasMicrophone &&
    !worldState.hanaHasMicrophone
  ) {
    return {
      targetId: 'equipment_locker',
      stepBadge: isKo ? '4단계 · 마이크 회수' : 'STEP 4 · RECOVER MIC',
      instruction: isKo
        ? '열린 우측 보안 장비함 안에서 전용 무선 마이크를 꺼내세요!'
        : 'Pick up the custom wireless microphone from inside the unlocked locker!',
      prompt: isKo
        ? '열린 보안 장비함 안에서 전용 무선 마이크를 꺼낸다.'
        : 'Take the custom wireless microphone from inside the unlocked equipment locker.',
    };
  }
  if (worldState.hasAccessCard && !worldState.lockerUnlocked) {
    return {
      targetId: 'equipment_locker',
      stepBadge: isKo ? '3단계 · 장비함 잠금 해제' : 'STEP 3 · UNLOCK LOCKER',
      instruction: isKo
        ? '우측 벽의 보안 장비함에 특별 스태프 카드키를 접촉해 문을 여세요!'
        : 'Scan the VIP Access Card on the right-wall Security Equipment Locker!',
      prompt: isKo
        ? '특별 스태프 출입 카드키를 사용해 보안 장비함 잠금을 해제한다.'
        : 'Use the VIP Access Card to unlock the security equipment locker.',
    };
  }
  if (worldState.hanaTalked && !worldState.jihoTalked && !worldState.hasAccessCard) {
    return {
      targetId: 'npc_jiho',
      stepBadge: isKo ? '2단계 · 감독 상황 확인' : 'STEP 2 · ASK DIRECTOR JIHO',
      instruction: isKo
        ? '무대 감독 지호에게 마이크 보관 위치와 카드키 단서를 물어보세요!'
        : 'Ask Stage Director Jiho where the microphone and VIP keycard were placed!',
      prompt: isKo
        ? '무대 감독 지호에게 예비 마이크나 특별 출입 카드키가 어디 있는지 물어본다.'
        : 'Ask Stage Director Jiho where the spare microphone or VIP access card is.',
    };
  }
  if (!worldState.hasAccessCard && (worldState.hanaTalked || worldState.jihoTalked)) {
    return {
      targetId: 'access_card',
      stepBadge: isKo ? '2단계 · 특별 카드키 획득' : 'STEP 2 · PICK UP VIP KEYCARD',
      instruction: isKo
        ? '좌측 조명 화장대 위에서 반짝이는 특별 스태프 카드키를 주우세요!'
        : 'Pick up the glowing VIP Staff Access Card on the left vanity table!',
      prompt: isKo
        ? '화장대 거울을 살피고 화장대 탁자 위의 특별 스태프 출입 카드키를 줍는다.'
        : 'Inspect the vanity mirror and pick up the VIP Staff Access Card on the vanity table.',
    };
  }
  return {
    targetId: 'npc_hana',
    stepBadge: isKo ? '1단계 · 상황 파악' : 'STEP 1 · CHECK ON HANA',
    instruction: isKo
      ? '좌측 화장대 앞에 서 있는 메인 보컬 하나를 눌러 대화를 시작하세요!'
      : 'Click Lead Vocalist Hana near the left vanity mirror to start!',
    prompt: isKo
      ? '공연 시작 전 하나에게 말을 걸어 진정시킨다.'
      : 'Talk to Hana and calm her down before the show starts.',
  };
}

function QuestGuideBeacon3D({
  position,
  floorPosition,
}: {
  position: [number, number, number];
  floorPosition: [number, number, number];
}) {
  const arrowGroupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const outerRingRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (arrowGroupRef.current) {
      // Smooth vertical bounce + rotation so the golden 3D arrow sparkles and draws attention
      arrowGroupRef.current.position.y =
        position[1] + 0.34 + Math.sin(t * 3.8) * 0.09;
      arrowGroupRef.current.rotation.y = t * 2.2;
    }
    if (ringRef.current) {
      const pulse = 1.0 + Math.sin(t * 3.8) * 0.12;
      ringRef.current.scale.set(pulse, pulse, 1);
    }
    if (outerRingRef.current) {
      const wave = ((t * 0.85) % 1.0);
      const s = 0.85 + wave * 0.75;
      outerRingRef.current.scale.set(s, s, 1);
      const mat = outerRingRef.current.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = (1.0 - wave) * 0.55;
      }
    }
  });

  return (
    <group>
      {/* 3D Bouncing Golden Pointer Arrow above the target */}
      <group
        ref={arrowGroupRef}
        position={[position[0], position[1] + 0.34, position[2]]}
      >
        {/* Downward pointing cone tip */}
        <mesh position={[0, -0.08, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.11, 0.22, 4]} />
          <meshStandardMaterial
            color="#fcd34d"
            emissive="#f59e0b"
            emissiveIntensity={2.4}
            roughness={0.15}
            metalness={0.8}
          />
        </mesh>
        {/* Glowing diamond crystal crown above cone */}
        <mesh position={[0, 0.11, 0]}>
          <octahedronGeometry args={[0.075, 0]} />
          <meshStandardMaterial
            color="#fef3c7"
            emissive="#fbbf24"
            emissiveIntensity={3.2}
            roughness={0.1}
            metalness={0.9}
          />
        </mesh>
        <pointLight color="#fbbf24" intensity={1.4} distance={2.2} />
      </group>

      {/* Sparkling Floor Ring Beacon at target base */}
      <mesh
        ref={ringRef}
        position={[floorPosition[0], 0.022, floorPosition[2]]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.34, 0.42, 36]} />
        <meshBasicMaterial
          color="#fbbf24"
          transparent
          opacity={0.75}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh
        ref={outerRingRef}
        position={[floorPosition[0], 0.018, floorPosition[2]]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.40, 0.46, 36]} />
        <meshBasicMaterial
          color="#fde68a"
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

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
  const lang = useGameStore((s) => s.lang);
  const selectedTarget = useGameStore((s) => s.selectedTarget);
  const hoveredTarget = useGameStore((s) => s.hoveredTarget);
  const setSelectedTarget = useGameStore((s) => s.setSelectedTarget);
  const setHoveredTarget = useGameStore((s) => s.setHoveredTarget);
  const submitPlayerAction = useGameStore((s) => s.submitPlayerAction);
  const submittingAction = useGameStore((s) => s.submittingAction);

  const clonedScene = useMemo(() => {
    // Use `scene` directly rather than `scene.clone(true)` so rigged THREE.SkinnedMesh
    // characters (Hana, Jiho, Protagonist) preserve their exact bone/skeleton bindings.
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const n = mesh.name;
      if (
        !mesh.userData.__wallMatCloned &&
        (n.startsWith('Wall') ||
          n.startsWith('Ceiling') ||
          n.startsWith('OakSlat') ||
          n.startsWith('Baseboard'))
      ) {
        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map((m) => m.clone());
        } else if (mesh.material) {
          mesh.material = mesh.material.clone();
        }
        mesh.userData.__wallMatCloned = true;
      }
    });
    return scene;
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

  // Collect all rigged pivot nodes (`RIG_*`) for smooth real-time animation in useFrame
  const rigNodes = useMemo(() => {
    const map: Record<string, THREE.Object3D> = {};
    clonedScene.traverse((obj) => {
      if (obj.name.startsWith('RIG_')) {
        map[obj.name] = obj;
      }
    });
    return map;
  }, [clonedScene]);

  // Synchronize visibility of pickable GLB props with authoritative WorldState
  useEffect(() => {
    clonedScene.traverse((obj) => {
      if (obj.name === 'access_card') {
        obj.visible = !worldState.hasAccessCard;
      }
      if (obj.name === 'microphone') {
        obj.visible =
          !worldState.hasMicrophone && !worldState.hanaHasMicrophone;
      }
    });
  }, [
    clonedScene,
    worldState.hasAccessCard,
    worldState.hasMicrophone,
    worldState.hanaHasMicrophone,
  ]);

  // Dynamic See-Through Wall Occlusion + Smooth Rigged Furniture Animation in useFrame
  useFrame(({ camera }) => {
    // 1. Animate all rigged doors & drawers smoothly (`RIG_*`)
    const vanityActive =
      hoveredTarget === 'vanity_table' ||
      hoveredTarget === 'access_card' ||
      hoveredTarget === 'vanity_mirror' ||
      selectedTarget === 'vanity_table' ||
      selectedTarget === 'access_card' ||
      selectedTarget === 'vanity_mirror' ||
      worldState.mirrorInspected;

    const lockerHover =
      hoveredTarget === 'equipment_locker' ||
      hoveredTarget === 'microphone' ||
      selectedTarget === 'equipment_locker' ||
      selectedTarget === 'microphone';

    const stageHover =
      hoveredTarget === 'stage_door' || selectedTarget === 'stage_door';

    const audioHover =
      hoveredTarget === 'npc_jiho' || selectedTarget === 'npc_jiho';

    if (rigNodes.RIG_locker_door) {
      const targetRotY = worldState.lockerUnlocked
        ? -1.42
        : lockerHover
          ? -0.52
          : -0.15;
      rigNodes.RIG_locker_door.rotation.y = THREE.MathUtils.lerp(
        rigNodes.RIG_locker_door.rotation.y,
        targetRotY,
        0.12
      );
    }

    if (rigNodes.RIG_stage_door) {
      const targetRotL = worldState.stageDoorOpen
        ? 1.38
        : stageHover
          ? 0.28
          : 0.0;
      rigNodes.RIG_stage_door.rotation.y = THREE.MathUtils.lerp(
        rigNodes.RIG_stage_door.rotation.y,
        targetRotL,
        0.1
      );
    }
    if (rigNodes.RIG_stage_door_R) {
      const targetRotR = worldState.stageDoorOpen
        ? -1.38
        : stageHover
          ? -0.28
          : 0.0;
      rigNodes.RIG_stage_door_R.rotation.y = THREE.MathUtils.lerp(
        rigNodes.RIG_stage_door_R.rotation.y,
        targetRotR,
        0.1
      );
    }

    if (rigNodes.RIG_vanity_drawer) {
      // In glTF (+Y Up), local +Y in Blender maps to local -Z in Three.js
      const targetZ = vanityActive ? -0.54 : -0.33;
      rigNodes.RIG_vanity_drawer.position.z = THREE.MathUtils.lerp(
        rigNodes.RIG_vanity_drawer.position.z,
        targetZ,
        0.12
      );
    }
    if (rigNodes.RIG_vanity_door_L) {
      const targetRot = vanityActive ? -0.85 : 0.0;
      rigNodes.RIG_vanity_door_L.rotation.y = THREE.MathUtils.lerp(
        rigNodes.RIG_vanity_door_L.rotation.y,
        targetRot,
        0.12
      );
    }
    if (rigNodes.RIG_vanity_door_R) {
      const targetRot = vanityActive ? 0.85 : 0.0;
      rigNodes.RIG_vanity_door_R.rotation.y = THREE.MathUtils.lerp(
        rigNodes.RIG_vanity_door_R.rotation.y,
        targetRot,
        0.12
      );
    }

    if (rigNodes.RIG_audio_rack_door_L) {
      const targetRot = audioHover ? -0.75 : 0.0;
      rigNodes.RIG_audio_rack_door_L.rotation.y = THREE.MathUtils.lerp(
        rigNodes.RIG_audio_rack_door_L.rotation.y,
        targetRot,
        0.12
      );
    }
    if (rigNodes.RIG_audio_rack_door_R) {
      const targetRot = audioHover ? 0.75 : 0.0;
      rigNodes.RIG_audio_rack_door_R.rotation.y = THREE.MathUtils.lerp(
        rigNodes.RIG_audio_rack_door_R.rotation.y,
        targetRot,
        0.12
      );
    }

    // 2. Dynamic See-Through Wall Occlusion
    const camPos = camera.position;
    const focusPoint = controlsRef.current?.target
      ? (controlsRef.current.target as THREE.Vector3)
      : new THREE.Vector3(0, 1.25, -0.85);

    const checkTargets = [
      focusPoint,
      new THREE.Vector3(-1.95, 1.35, -0.55), // Hana
      new THREE.Vector3(1.55, 1.35, -1.85), // Jiho
      new THREE.Vector3(-0.65, 1.35, 0.65), // Protagonist
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
    if (n.includes('jiho') || n.includes('audio') || n.includes('mixer'))
      return 'npc_jiho';
    if (n.includes('access_card') || n.includes('vip')) return 'access_card';
    if (n.includes('mirror') || n.includes('bulb')) return 'vanity_mirror';
    if (n.includes('vanity') || n.includes('drawer') || n.includes('perfume'))
      return 'vanity_table';
    if (n.includes('microphone') || n.includes('starlightmic'))
      return 'microphone';
    if (n.includes('locker') || n.includes('rfid')) return 'equipment_locker';
    if (n.includes('guitar') || n.includes('ukulele')) return 'acoustic_guitar';
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

  const nextQuest = useMemo(
    () => getNextQuestGuide(worldState, lang),
    [worldState, lang]
  );

  // Clean, non-overlapping interactive hotspots matched 1:1 with the new GLB coordinates
  const hotspots = useMemo<HotspotMeta[]>(() => {
    const isKo = lang === 'ko';
    const list: HotspotMeta[] = [
      {
        id: 'npc_hana',
        label: isKo ? '하나 (메인 보컬)' : 'Hana (Lead Vocal)',
        actionHint: worldState.hasMicrophone
          ? isKo
            ? '마이크 건네주기'
            : 'Hand Over Mic'
          : isKo
            ? '대화하기'
            : 'Talk to Hana',
        position: [-1.95, 1.92, -0.55],
        floorPosition: [-1.95, 0.0, -0.55],
        quickActionPrompt: worldState.hasMicrophone
          ? isKo
            ? '하나에게 전용 별빛 마이크를 건네주어 무대에 오를 수 있게 한다!'
            : 'Hand the custom starlight microphone over to Hana so she can perform!'
          : isKo
            ? '하나에게 말을 걸어 진정시키고 전용 별빛 마이크에 무슨 일이 있었는지 묻는다.'
            : 'Talk to Hana to comfort her and ask what happened to her custom starlight microphone.',
        completed: worldState.hanaTalked && !worldState.hasMicrophone,
      },
      {
        id: 'npc_jiho',
        label: isKo ? '지호 (무대 감독)' : 'Jiho (Stage Director)',
        actionHint: !worldState.jihoTalked
          ? isKo
            ? '장비함 위치 묻기'
            : 'Ask About Locker'
          : isKo
            ? '무대 준비 확인'
            : 'Check Stage Prep',
        position: [1.55, 1.98, -1.85],
        floorPosition: [1.55, 0.0, -1.85],
        quickActionPrompt: !worldState.jihoTalked
          ? isKo
            ? '지호에게 전용 마이크가 어디로 옮겨졌는지, 보안 장비함을 어떻게 여는지 물어본다.'
            : 'Ask Jiho where the custom microphone was moved and how to unlock the equipment locker.'
          : isKo
            ? '지호에게 대기실 통기타를 활용한 통기타 편곡 대체 무대를 제안한다.'
            : 'Talk to Jiho and propose organizing an alternative unplugged acoustic performance using the backstage acoustic guitar.',
        completed: worldState.jihoTalked,
      },
      {
        id: 'access_card',
        label: worldState.hasAccessCard
          ? isKo
            ? '조명 화장대'
            : 'Hollywood Vanity'
          : isKo
            ? '특별 스태프 카드키'
            : 'VIP Staff Keycard',
        actionHint: !worldState.hasAccessCard
          ? isKo
            ? '카드키 줍기'
            : 'Pick Up Keycard'
          : isKo
            ? '화장대 서랍 조사'
            : 'Inspect Vanity',
        position: [-3.58, 1.32, -0.35],
        floorPosition: [-3.45, 0.0, -0.55],
        quickActionPrompt: !worldState.hasAccessCard
          ? isKo
            ? '화장대 탁자를 조사하고 반짝이는 특별 스태프 출입 카드키를 줍는다.'
            : 'Inspect the vanity table and pick up the holographic VIP Staff Access Card.'
          : isKo
            ? '화장대 조명 거울을 살펴보고 화장대 서랍을 열어본다.'
            : 'Inspect the Hollywood vanity mirror bulbs and open the vanity drawer.',
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
              ? '전용 마이크 꺼내기'
              : 'Take Custom Mic'
            : isKo
              ? '장비함 조사'
              : 'Inspect Locker',
        position: [3.65, 1.98, -1.35],
        floorPosition: [3.35, 0.0, -1.35],
        quickActionPrompt: !worldState.lockerUnlocked
          ? worldState.hasAccessCard
            ? isKo
              ? '특별 스태프 출입 카드키를 사용하여 보안 장비함을 연다.'
              : 'Use the VIP Staff Access Card to unlock the equipment locker.'
            : isKo
              ? '출입 카드키 없이 보안 장비함을 열려고 시도해 본다.'
              : 'Try to unlock the equipment locker without the access card.'
          : !worldState.hasMicrophone && !worldState.hanaHasMicrophone
            ? isKo
              ? '열린 보안 장비함 안에서 하나의 진주빛 보라색 전용 마이크를 꺼낸다.'
              : 'Pick up Hana’s custom pearl-lilac microphone from the unlocked equipment locker.'
            : isKo
              ? '열려 있는 보안 장비함 내부를 살펴본다.'
              : 'Inspect the unlocked equipment locker.',
        completed:
          worldState.lockerUnlocked &&
          (worldState.hasMicrophone || worldState.hanaHasMicrophone),
      },
      {
        id: 'acoustic_guitar',
        label: isKo ? '통기타' : 'Acoustic Guitar',
        actionHint: !worldState.guitarTuned
          ? isKo
            ? '기타 조율하기'
            : 'Tune Guitar'
          : isKo
            ? '통기타 무대 제안'
            : 'Propose Acoustic Stage',
        position: [2.95, 1.32, 1.25],
        floorPosition: [2.95, 0.0, 1.25],
        quickActionPrompt: !worldState.guitarTuned
          ? isKo
            ? '거치대에 놓인 대기실 통기타의 줄을 조율하고 울림 상태를 점검한다.'
            : 'Tune the backstage acoustic guitar on its stand and check its pickup resonance.'
          : isKo
            ? '조율된 통기타를 사용해 지호, 하나와 함께 통기타 특별 무대를 꾸미자고 제안한다.'
            : 'Propose organizing an alternative unplugged acoustic performance using this tuned guitar with Jiho and Hana.',
        completed: worldState.guitarTuned || worldState.acousticBackupApproved,
      },
      {
        id: 'stage_door',
        label: isKo ? '메인 무대 출입문' : 'Main Stage Door',
        actionHint:
          worldState.hanaHasMicrophone || worldState.acousticBackupApproved
            ? isKo
              ? '무대 문 열기 (마지막 막)'
              : 'Open Stage Door (Finale)'
            : isKo
              ? '출입문 상태 확인'
              : 'Check Stage Door',
        position: [0.0, 2.38, -3.25],
        floorPosition: [0.0, 0.0, -2.85],
        quickActionPrompt: worldState.hanaHasMicrophone
          ? isKo
            ? '무대 출입문을 활짝 열고 되찾은 하나의 전용 마이크로 루미나의 복귀 무대를 시작한다!'
            : 'Open the stage entrance door and launch LUMINA’s comeback performance with Hana’s recovered microphone!'
          : worldState.acousticBackupApproved
            ? isKo
              ? '무대 출입문을 열고 통기타 특별 공연 무대를 시작한다!'
              : 'Open the stage entrance door and start the Unplugged Acoustic Encore performance!'
            : isKo
              ? '지금 바로 무대 출입문을 열고 공연을 시작하려고 시도한다.'
              : 'Try to open the stage entrance door and start the concert right now.',
        completed: worldState.stageDoorOpen,
      },
    ];
    return list;
  }, [worldState, lang]);

  const activeQuestHotspot = useMemo(
    () =>
      nextQuest
        ? hotspots.find((h) => h.id === nextQuest.targetId) ?? null
        : null,
    [nextQuest, hotspots]
  );

  return (
    <group>
      <primitive
        object={clonedScene}
        onPointerDown={handlePointerDown}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      />

      {/* 3D Sparkling Golden Arrow & Floor Beacon on the Next Recommended Target */}
      {activeQuestHotspot && (
        <QuestGuideBeacon3D
          position={activeQuestHotspot.position}
          floorPosition={activeQuestHotspot.floorPosition}
        />
      )}

      {/* Translucent See-Through In-World Nameplates + Sparkling Quest Arrow Indicator */}
      {tagOpacityMode !== 'hidden' &&
        hotspots.map((h) => {
          const isSelected = selectedTarget === h.id;
          const isHovered = hoveredTarget === h.id;
          const isNextQuest = nextQuest?.targetId === h.id;
          const anyActive = Boolean(selectedTarget || hoveredTarget);
          const isReadyStage =
            h.id === 'stage_door' &&
            (worldState.hanaHasMicrophone || worldState.acousticBackupApproved);

          const pillOpacity =
            isSelected || isHovered || isNextQuest
              ? 'opacity-95 scale-105'
              : anyActive
                ? 'opacity-30 hover:opacity-90 scale-90'
                : 'opacity-60 hover:opacity-95 scale-95';

          return (
            <Html
              key={h.id}
              position={h.position}
              center
              distanceFactor={7.2}
              zIndexRange={[10, 0]}
              style={{ pointerEvents: 'none' }}
            >
              <div
                style={{ pointerEvents: 'auto' }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isSelected || isNextQuest) {
                    setSelectedTarget(h.id);
                    submitPlayerAction(h.quickActionPrompt, h.id);
                  } else {
                    setSelectedTarget(h.id);
                  }
                }}
                className={`group flex flex-col items-center cursor-pointer select-none transition-all duration-200 ${pillOpacity}`}
              >
                {/* Sparkling Bouncing Arrow Indicator for the Next Step ("다음 진행 위치 화살표 반짝임 안내") */}
                {isNextQuest && (
                  <div className="mb-1 flex flex-col items-center animate-bounce pointer-events-none">
                    <div className="px-2 py-0.5 rounded-full bg-amber-300 text-stone-950 text-[9px] font-extrabold uppercase tracking-wider shadow-[0_0_16px_rgba(251,191,36,0.9)] border border-amber-100 whitespace-nowrap">
                      ✨ {nextQuest?.stepBadge}
                    </div>
                    <div className="text-amber-300 text-sm leading-none drop-shadow-[0_0_10px_rgba(251,191,36,0.95)]">
                      ▼
                    </div>
                  </div>
                )}

                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-[3px] border transition-all ${
                    isNextQuest || isReadyStage
                      ? 'bg-amber-950/80 border-amber-300 text-amber-100 shadow-[0_0_18px_rgba(251,191,36,0.45)]'
                      : isSelected
                        ? 'bg-stone-900/80 border-amber-300/80 text-stone-100 shadow-md'
                        : h.completed
                          ? 'bg-stone-900/40 border-emerald-400/45 text-stone-200'
                          : 'bg-stone-950/45 border-white/20 text-stone-100 hover:border-amber-200/60'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isNextQuest || isReadyStage
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
                  {(isSelected || isHovered || isNextQuest) && (
                    <span className="text-[10px] font-semibold text-amber-200 pl-1 border-l border-white/20 whitespace-nowrap">
                      {submittingAction
                        ? lang === 'ko'
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

function RoomLoadingFallback({ lang }: { lang: 'en' | 'ko' }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[8.4, 6.8]} />
        <meshStandardMaterial color="#2b2622" roughness={0.65} />
      </mesh>
      <Html center position={[0, 1.35, 0]}>
        <div className="px-4 py-2 rounded-full bg-stone-950/85 border border-amber-300/40 text-amber-200 text-xs font-medium whitespace-nowrap shadow-xl backdrop-blur-md">
          {lang === 'ko'
            ? '✨ 3D 백스테이지 대기실 모델을 불러오는 중...'
            : '✨ Loading 3D Backstage Dressing Room...'}
        </div>
      </Html>
    </group>
  );
}

class SceneErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export const BackstageScene: React.FC = () => {
  const worldState = useGameStore((s) => s.worldState);
  const lang = useGameStore((s) => s.lang);
  const [activeCameraPreset, setActiveCameraPreset] =
    useState<CameraShotId | null>('WIDE_ESTABLISHING');
  const [tagOpacityMode, setTagOpacityMode] = useState<
    'translucent' | 'hidden'
  >('translucent');
  const controlsRef = useRef<any>(null);

  if (!worldState) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#181614] text-stone-300 text-sm">
        {lang === 'ko'
          ? '대기실 입체 공간을 불러오는 중입니다...'
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
                {lang === 'ko' ? preset.labelKo : preset.labelEn}
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
            lang === 'ko'
              ? '말풍선 이름표 반투명 표시 / 숨기기'
              : 'Toggle translucent 3D labels / hide'
          }
        >
          {tagOpacityMode === 'translucent'
            ? lang === 'ko'
              ? '이름표: 반투명 투과'
              : 'Labels: See-Through'
            : lang === 'ko'
              ? '이름표: 숨김'
              : 'Labels: Hidden'}
        </button>
      </div>

      <Canvas
        shadows
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        camera={{ position: [0.0, 1.68, 5.15], fov: 40 }}
      >
        <CanvasScreenshotBridge
          activeCameraPreset={activeCameraPreset}
          controlsRef={controlsRef}
        />

        <color attach="background" args={['#181614']} />
        <fog attach="fog" args={['#181614', 10, 26]} />

        {/* Warm Architectural Interior Studio Lighting (No Cyberpunk, Zero External HDR Dependency) */}
        <ambientLight intensity={1.15} color="#fff8f0" />
        <hemisphereLight args={['#fffaf2', '#3d352e', 1.1]} />
        <directionalLight
          position={[1.5, 4.2, 3.5]}
          intensity={1.65}
          color="#fff4e6"
          castShadow
        />

        <spotLight
          position={[-2.2, 2.95, 1.6]}
          angle={0.85}
          penumbra={0.9}
          intensity={3.2}
          color="#ffe8cc"
          castShadow
        />
        <spotLight
          position={[2.2, 2.95, 1.6]}
          angle={0.85}
          penumbra={0.9}
          intensity={3.0}
          color="#fff3e0"
          castShadow
        />
        <pointLight
          position={[-3.2, 1.5, -0.55]}
          intensity={1.9}
          distance={4.5}
          color="#ffdfa8"
        />
        <pointLight
          position={[0, 2.6, -2.2]}
          intensity={worldState.stageDoorOpen ? 4.8 : 2.2}
          distance={7.5}
          color="#ffe4b5"
        />

        <SceneErrorBoundary fallback={<RoomLoadingFallback lang={lang} />}>
          <React.Suspense fallback={<RoomLoadingFallback lang={lang} />}>
            <BackstageRoomModel
              worldState={worldState}
              controlsRef={controlsRef}
              tagOpacityMode={tagOpacityMode}
            />
          </React.Suspense>
        </SceneErrorBoundary>

        <ContactShadows
          position={[0, 0.005, 0]}
          opacity={0.42}
          scale={12}
          blur={2.0}
          far={4.0}
        />

        <OrbitControls
          ref={controlsRef}
          makeDefault
          target={[0.0, 1.25, -0.85]}
          minPolarAngle={Math.PI / 5.5}
          maxPolarAngle={Math.PI / 1.98}
          minDistance={1.2}
          maxDistance={9.0}
          enablePan={true}
        />
      </Canvas>
    </div>
  );
};

useGLTF.preload('/models/backstage_room.glb');
