import React, { useEffect, useMemo, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  Download,
  Film,
  Layers,
  Palette,
  RefreshCw,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react';
import {
  CameraShotId,
  GeneratedWebtoonEpisode,
  WebtoonCut,
  WebtoonStyleId,
} from '../../../shared/types';
import { useGameStore } from '../store/useGameStore';

interface StyleOptionMeta {
  id: WebtoonStyleId;
  nameKo: string;
  nameEn: string;
  referenceWorks: string;
  description: string;
  badge: string;
  previewImg: string;
  accentBorder: string;
  accentText: string;
  cssFilter: string;
}

export const WEBTOON_STYLE_OPTIONS: StyleOptionMeta[] = [
  {
    id: 'NAVER_ROMANCE_IDOL',
    nameKo: '네이버 로맨스·아이돌 웹툰체',
    nameEn: 'Naver Romance & Idol Webtoon',
    referenceWorks: '레퍼런스: 〈여신강림〉 · 〈데뷔 못 하면 죽는 병 걸림〉',
    description:
      '반짝이는 보석 같은 눈망울, 유려한 선화, 화사한 마젠타·바이올렛 블룸 라이팅이 돋보이는 정통 아이돌 로맨스 웹툰 작화',
    badge: '인기 1위 · 아이돌 순정',
    previewImg: '/webtoon/style_romance_idol.png',
    accentBorder: 'border-pink-400',
    accentText: 'text-pink-300',
    cssFilter: 'contrast(1.06) saturate(1.18)',
  },
  {
    id: 'NAVER_ACTION_MANHWA',
    nameKo: '네이버 드라마틱 서스펜스·액션체',
    nameEn: 'Dramatic Action & Suspense Manhwa',
    referenceWorks: '레퍼런스: 〈나 혼자만 레벨업〉 · 〈전지적 독자 시점〉',
    description:
      '날카로운 펜선, 강렬한 시안·퍼플 림라이트, 긴박한 카운트다운 연출에 최적화된 고대비 웹툰 작화',
    badge: '고몰입 · 서스펜스',
    previewImg: '/webtoon/style_action_manhwa.png',
    accentBorder: 'border-cyan-400',
    accentText: 'text-cyan-300',
    cssFilter: 'contrast(1.18) saturate(1.22)',
  },
  {
    id: 'NAVER_YOUTH_DRAMA',
    nameKo: '네이버 감성 청춘·어쿠스틱 드라마체',
    nameEn: 'Warm Youth & Acoustic Webdrama',
    referenceWorks: '레퍼런스: 〈청춘 블라썸〉 · 〈스피릿 핑거스〉',
    description:
      '따뜻한 수채화풍 셀 채색과 부드러운 골드·파스텔 톤으로 어쿠스틱 앙코르의 감동을 극대화하는 청춘 웹드라마 작화',
    badge: '감성 힐링 · 어쿠스틱',
    previewImg: '/webtoon/style_youth_drama.png',
    accentBorder: 'border-amber-400',
    accentText: 'text-amber-300',
    cssFilter: 'contrast(1.03) saturate(1.08) sepia(0.08)',
  },
  {
    id: 'NAVER_NOIR_STAGE',
    nameKo: '네이버 시네마틱 느와르·스릴러체',
    nameEn: 'Cinematic Backstage Noir Manhwa',
    referenceWorks: '레퍼런스: 〈내가 죽기로 결심한 것은〉 · 〈외모지상주의〉',
    description:
      '깊고 묵직한 명암 대비와 시네마틱 스포트라이트, 인물 내면의 긴장감을 세밀하게 포착하는 드라마틱 작화',
    badge: '시네마틱 · 느와르',
    previewImg: '/webtoon/style_noir_stage.png',
    accentBorder: 'border-violet-400',
    accentText: 'text-violet-300',
    cssFilter: 'contrast(1.22) brightness(0.96)',
  },
  {
    id: 'ORIGINAL_3D',
    nameKo: '원래 3D 체험 화면 그대로',
    nameEn: 'Original Live 3D WebGL Captures',
    referenceWorks: '10개 멀티 카메라 앵글 실시간 3D 렌더링',
    description:
      '플레이어가 직접 체험한 3D 백스테이지 공간과 오브젝트 상태 변화를 10개의 시네마틱 카메라 앵글로 그대로 기록',
    badge: '원본 3D · 리얼타임 캡처',
    previewImg: '/references/backstage_room_concept.png',
    accentBorder: 'border-emerald-400',
    accentText: 'text-emerald-300',
    cssFilter: 'none',
  },
];

// Quadrant crop coordinates (sx, sy, sw, sh normalized 0..1) + slight cinematic variation per cut
const CUT_QUADRANT_CROPS: Record<
  number,
  { q: number; ox: number; oy: number; scale: number }
> = {
  1: { q: 0, ox: 0.0, oy: 0.0, scale: 1.0 },
  2: { q: 0, ox: 0.06, oy: 0.04, scale: 0.88 },
  3: { q: 1, ox: 0.0, oy: 0.0, scale: 1.0 },
  4: { q: 1, ox: 0.05, oy: 0.08, scale: 0.86 },
  5: { q: 1, ox: 0.02, oy: 0.02, scale: 0.92 },
  6: { q: 2, ox: 0.0, oy: 0.0, scale: 1.0 },
  7: { q: 2, ox: 0.05, oy: 0.05, scale: 0.88 },
  8: { q: 2, ox: 0.02, oy: 0.08, scale: 0.9 },
  9: { q: 3, ox: 0.0, oy: 0.0, scale: 1.0 },
  10: { q: 3, ox: 0.03, oy: 0.02, scale: 0.92 },
};

function buildClientFallbackEpisode(
  worldState: NonNullable<ReturnType<typeof useGameStore.getState>['worldState']>,
  styleId: WebtoonStyleId
): GeneratedWebtoonEpisode {
  const isAcoustic =
    worldState.endingReached === 'UNPLUGGED_ENCORE' ||
    (worldState.acousticBackupApproved && !worldState.hanaHasMicrophone);
  const acceptedTurns = worldState.history.filter(
    (h) => h.accepted && h.turnNumber > 0
  );
  const firstPlayerLine =
    acceptedTurns[0]?.playerInput ||
    'Hana, Jiho—tell me what happened to the Starlight Microphone!';
  const midPlayerLine =
    acceptedTurns[Math.floor(acceptedTurns.length / 2)]?.playerInput ||
    (isAcoustic
      ? "Let's rearrange the comeback as a live Unplugged Acoustic Encore!"
      : 'I found the VIP Staff Access Card on the vanity desk—unlocking the locker now!');

  return {
    episodeSubtitle: isAcoustic
      ? 'EP.01 — Five Minutes Before Showtime: Unplugged Heartbeat (완전판 10컷)'
      : 'EP.01 — Five Minutes Before Showtime: Starlight Miracle (완전판 10컷)',
    styleId,
    endingType: worldState.endingReached,
    authorComment: `작가의 말: 총 ${worldState.turnCount}번의 선택과 하나 신뢰도 ${worldState.relationships.hanaTrust}%·지호 신뢰도 ${worldState.relationships.jihoTrust}%로 완성된 당신만의 네이버 웹툰 1화 정식 연재본입니다!`,
    cuts: [
      {
        cutNumber: 1,
        actLabel: 'ACT 1 · OPENING CRISIS',
        sceneTitle: '05:00 — 정적에 휩싸인 백스테이지',
        cameraShotId: 'WIDE_ESTABLISHING',
        quadrantIndex: 0,
        sfxText: '두근—! 두근—!',
        sfxSub: 'THUMP! THUMP!',
        narratorCaption:
          '컴백 쇼케이스 시작 5분 전. 화려한 네온 조명이 흐르는 LUMINA VIP 대기실에 긴박한 침묵이 내려앉았다.',
        speaker: 'NARRATOR',
        dialogue:
          '스타라이트 아레나 2만 석의 함성이 문밖에서 파도처럼 밀려오는데... 메인 보컬 하나의 손이 비어 있다.',
        innerMonologue:
          '‘이대로 무대가 취소될 순 없어. 내가 도울 방법이 분명히 있을 거야.’',
        moodColor: 'violet',
      },
      {
        cutNumber: 2,
        actLabel: 'ACT 1 · HANA IN DISTRESS',
        sceneTitle: '사라진 커스텀 스타라이트 마이크',
        cameraShotId: 'HANA_CLOSEUP',
        quadrantIndex: 0,
        sfxText: '파르르...',
        sfxSub: 'TREMBLE...',
        narratorCaption:
          '무대 의상을 입은 하나가 초조하게 두 손을 꼭 쥔 채 거울 앞을 서성인다.',
        speaker: 'HANA',
        dialogue:
          '“어떡하죠...? 제 커스텀 스타라이트 마이크가 감쪽같이 사라졌어요. 그 마이크 없이는 오프닝 고음을 절대 소화할 수 없는데!”',
        innerMonologue: `플레이어의 첫 마디: "${firstPlayerLine}"`,
        moodColor: 'magenta',
      },
      {
        cutNumber: 3,
        actLabel: 'ACT 2 · BACKSTAGE BRIEFING',
        sceneTitle: '스테이지 매니저 지호의 단서',
        cameraShotId: 'JIHO_BRIEFING',
        quadrantIndex: 0,
        sfxText: '치지직—!',
        sfxSub: 'BZZT—! RADIO CALL',
        narratorCaption:
          '인이어 헤드셋을 붙잡은 지호가 땀이 맺힌 이마를 짚으며 큐시트를 확인한다.',
        speaker: 'JIHO',
        dialogue:
          '“방금 음향팀 무전을 받았습니다! 배터리 긴급 점검 때문에 마이크를 보안 장비 락커에 넣어뒀다는데, 마스터 스태프 카드가 보이지 않아요!”',
        innerMonologue:
          '‘보안 락커를 열려면 VIP 스태프 출입 카드가 필요해... 아니면 전혀 다른 플랜 B를 세워야 한다!’',
        moodColor: 'cyan',
      },
      {
        cutNumber: 4,
        actLabel: 'ACT 2 · CLUE TABLE',
        sceneTitle: '라운지 테이블 위의 배터리 점검 일지',
        cameraShotId: 'COFFEE_TABLE_CLUE',
        quadrantIndex: 1,
        sfxText: '펄럭—!',
        sfxSub: 'RUSTLE!',
        narratorCaption:
          '커피 테이블 위 음향팀 점검 로그를 확인하자, 마지막 스태프 동선이 할리우드 조명 화장대 쪽으로 이어져 있었다.',
        speaker: 'FAN',
        dialogue:
          '“잠깐만요! 여기 장비 점검 기록을 보세요. 마지막으로 스태프가 머문 곳은 바로 저 화장대 쪽이에요!”',
        innerMonologue: '‘단서가 하나로 이어지고 있어. 서두르자!’',
        moodColor: 'cyan',
      },
      {
        cutNumber: 5,
        actLabel: 'ACT 2 · VANITY MIRROR SEARCH',
        sceneTitle: '할리우드 벌브 미러의 반사광',
        cameraShotId: 'VANITY_CARD_DISCOVERY',
        quadrantIndex: 1,
        sfxText: '반짝—✦',
        sfxSub: 'GLINT—✦',
        narratorCaption:
          '따뜻한 웜화이트 벌브 조명이 켜진 화장대 거울 아래, 아크릴 오거나이저 틈새로 홀로그램 빛이 반짝인다.',
        speaker: 'HANA',
        dialogue:
          '“앗, 저기 향수병 옆에 반짝이는 거... 음향팀 마스터 VIP 스태프 카드 맞죠?!”',
        innerMonologue: '‘찾았다! [VIP Staff Access Card] 획득!’',
        moodColor: 'magenta',
      },
      {
        cutNumber: 6,
        actLabel: isAcoustic ? 'ACT 3 · ACOUSTIC PIVOT' : 'ACT 3 · LOCKER BREACH',
        sceneTitle: isAcoustic
          ? '과감한 결단: 언플러그드 어쿠스틱 편곡'
          : 'RFID 보안 락커 해제 순간',
        cameraShotId: isAcoustic
          ? 'ACOUSTIC_GUITAR_CORNER'
          : 'LOCKER_RFID_SCAN',
        quadrantIndex: isAcoustic ? 1 : 2,
        sfxText: isAcoustic ? '쩌렁—♪' : '삐빅— 철컥!',
        sfxSub: isAcoustic ? 'STRUM—♪' : 'BEEP— CLICK!',
        narratorCaption: isAcoustic
          ? '잠긴 락커 대신 대기실 구석의 어쿠스틱 기타에 시선이 멈췄다. 위기를 전설적인 라이브 무대로 바꿀 순간이다.'
          : 'RFID 리더기에 VIP 스태프 카드를 태그하자, 붉은 경고등이 에메랄드빛 녹색으로 바뀌며 육중한 철문이 열렸다.',
        speaker: 'FAN',
        dialogue: `“${midPlayerLine}”`,
        innerMonologue: isAcoustic
          ? '‘화려한 MR 대신 하나의 진짜 목소리를 들려주자!’'
          : '‘열렸다! 락커 안쪽 폼 크래들에 마이크가 빛나고 있어!’',
        moodColor: isAcoustic ? 'gold' : 'emerald',
      },
      {
        cutNumber: 7,
        actLabel: 'ACT 3 · TREASURE RECOVERED',
        sceneTitle: isAcoustic
          ? '6현의 울림, 완벽한 어쿠스틱 튜닝'
          : '진주빛 스타라이트 마이크의 귀환',
        cameraShotId: isAcoustic
          ? 'ACOUSTIC_GUITAR_CORNER'
          : 'MICROPHONE_REVEAL',
        quadrantIndex: 2,
        sfxText: isAcoustic ? '띠링—♬' : '화아아—✦',
        sfxSub: isAcoustic ? 'HARMONIC—♬' : 'SHIMMER—✦',
        narratorCaption: isAcoustic
          ? '섬세하게 조율된 어쿠스틱 기타 줄이 따뜻한 골드빛 공명을 일으키며 대기실을 감싼다.'
          : '펄 라일락 바디와 로즈골드 링이 빛나는 LUMINA 커스텀 스타라이트 마이크를 손에 쥐었다.',
        speaker: 'JIHO',
        dialogue: isAcoustic
          ? '“기타 튜닝 완벽합니다! 무대 위 핀스폿 조명과 어쿠스틱 픽업 라인까지 즉시 연결 완료했습니다!”'
          : '“배터리 잔량 100%, 주파수 간섭 제로! 지금 바로 하나에게 전달해 주세요!”',
        innerMonologue: '‘이제 마지막 무대 준비만 남았다!’',
        moodColor: isAcoustic ? 'gold' : 'violet',
      },
      {
        cutNumber: 8,
        actLabel: 'ACT 4 · SOUNDCHECK & HANDOFF',
        sceneTitle: '인이어 모니터 싱크 & 진심의 교감',
        cameraShotId: 'LOUNGE_SOFA_IEM',
        quadrantIndex: 2,
        sfxText: '징— 온에어!',
        sfxSub: 'SYNC COMPLETE!',
        narratorCaption:
          '벨벳 소파 위의 무선 인이어 모니터(IEM) 팩까지 완벽히 동기화되자, 하나의 눈빛에 흔들림 없는 확신이 차오른다.',
        speaker: 'HANA',
        dialogue: isAcoustic
          ? '“당신이 용기를 주지 않았다면 전 무대 위에서 얼어붙었을 거예요. 우리만의 특별한 어쿠스틱 무대, 함께 만들어요!”'
          : '“마이크가 제 손에 돌아왔어요...! 정말 고마워요. 오늘 첫 소절은 오직 당신을 위해 부를게요!”',
        innerMonologue: `하나 신뢰도 ${worldState.relationships.hanaTrust}% · 지호 신뢰도 ${worldState.relationships.jihoTrust}% 달성!`,
        moodColor: 'magenta',
      },
      {
        cutNumber: 9,
        actLabel: 'ACT 5 · STAGE ENTRANCE',
        sceneTitle: '01:00 — 열리는 STAGE / ON AIR 도어',
        cameraShotId: 'STAGE_DOOR_OPENING',
        quadrantIndex: 3,
        sfxText: '쿠구구궁—!!',
        sfxSub: 'ROOOAAAR—!!',
        narratorCaption:
          '네온 사인이 빛나는 방음 무대 문이 활짝 열리고, 그 너머로 보랏빛과 시안빛 레이저 빔이 폭포처럼 쏟아져 들어온다.',
        speaker: 'JIHO',
        dialogue:
          '“스탠바이 완료! 큐 사인 떨어집니다— LUMINA, 지금 무대로 입장합니다!!”',
        innerMonologue: '‘심장이 터질 것 같아. 드디어 쇼타임이다!’',
        moodColor: 'cyan',
      },
      {
        cutNumber: 10,
        actLabel: 'ACT 5 · GRAND FINALE',
        sceneTitle: isAcoustic
          ? 'ENDING B — Unplugged Encore (전설이 된 어쿠스틱 앙코르)'
          : 'ENDING A — Showtime Saved (별빛으로 물든 컴백 피날레)',
        cameraShotId: 'FINALE_STAGE_BEAMS',
        quadrantIndex: 3,
        sfxText: '와아아아아—!! ✦',
        sfxSub: 'CHEERS & CONFETTI!!',
        narratorCaption: isAcoustic
          ? '따뜻한 황금빛 스포트라이트 아래, 어쿠스틱 기타 선율과 하나의 투명한 보컬이 아레나 전체를 울린다.'
          : '스타라이트 마이크를 높이 든 하나의 하이노트가 터져 나오자, 보랏빛 컨페티가 밤하늘의 은하수처럼 쏟아진다.',
        speaker: 'HANA',
        dialogue: isAcoustic
          ? '“오늘 밤 이 어쿠스틱 기적을 만들어 준 단 한 사람에게, 이 노래를 바칩니다!”'
          : '“기다려 주셔서 감사합니다! 지금까지 LUMINA였습니다— 오늘 밤, 우리의 우주가 시작됩니다!”',
        innerMonologue: '— FANVERSE EP.01 [5분 전의 기적] END —',
        moodColor: isAcoustic ? 'gold' : 'violet',
      },
    ],
  };
}

/**
 * Renders a single cut's visual artwork:
 * - If styleId === 'ORIGINAL_3D': displays the dedicated 3D camera angle capture for that cut.
 * - If styleId is one of the 4 Naver Webtoon styles:
 *   - Uses the high-res 4-quadrant Naver Webtoon illustration sheet cropped to that cut's scene quadrant,
 *     with an optional "3D 카메라 PIP 비교 보기" badge or hybrid toggle.
 */
const WebtoonCutArtwork: React.FC<{
  cut: WebtoonCut;
  styleMeta: StyleOptionMeta;
  frame3D?: string;
  showHybrid3DInset: boolean;
}> = ({ cut, styleMeta, frame3D, showHybrid3DInset }) => {
  const isOriginal3D = styleMeta.id === 'ORIGINAL_3D';
  const cropSpec = CUT_QUADRANT_CROPS[cut.cutNumber] || {
    q: cut.quadrantIndex,
    ox: 0,
    oy: 0,
    scale: 1,
  };

  // Quadrant background position for 2x2 grid sheet
  const col = cropSpec.q % 2; // 0 = left, 1 = right
  const row = Math.floor(cropSpec.q / 2); // 0 = top, 1 = bottom
  const bgPosX = col === 0 ? `${8 + cropSpec.ox * 100}%` : `${92 - cropSpec.ox * 100}%`;
  const bgPosY = row === 0 ? `${8 + cropSpec.oy * 100}%` : `${92 - cropSpec.oy * 100}%`;
  const bgSize = `${Math.round(205 / cropSpec.scale)}%`;

  const fallback3D =
    cut.cutNumber % 2 === 0
      ? '/references/interactive_props_sheet.png'
      : '/references/backstage_room_concept.png';

  return (
    <div className="relative w-full h-[380px] sm:h-[430px] bg-[#080411] overflow-hidden select-none">
      {isOriginal3D ? (
        <img
          src={frame3D || fallback3D}
          alt={cut.sceneTitle}
          className="w-full h-full object-cover"
        />
      ) : (
        <div
          className="w-full h-full bg-no-repeat transition-transform duration-500 hover:scale-[1.02]"
          style={{
            backgroundImage: `url(${styleMeta.previewImg})`,
            backgroundSize: bgSize,
            backgroundPosition: `${bgPosX} ${bgPosY}`,
            filter: styleMeta.cssFilter,
          }}
        />
      )}

      {/* Subtle Webtoon Screentone & Vignette Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#090514] via-transparent to-black/35 pointer-events-none" />

      {/* Top-Left Cut Number & Act Badge */}
      <div className="absolute top-3.5 left-3.5 flex items-center gap-2">
        <span className="px-2.5 py-1 rounded-md bg-black/85 border border-fuchsia-500/60 text-xs font-black tracking-wider text-fuchsia-300 shadow-lg">
          CUT {String(cut.cutNumber).padStart(2, '0')} / 10
        </span>
        <span className="px-2.5 py-1 rounded-md bg-black/75 border border-purple-500/40 text-[11px] font-bold text-purple-200 backdrop-blur-md">
          {cut.actLabel}
        </span>
      </div>

      {/* Top-Right Camera Angle Tag */}
      <div className="absolute top-3.5 right-3.5 px-2.5 py-1 rounded-md bg-black/75 border border-cyan-500/40 text-[10px] font-mono text-cyan-300 backdrop-blur-md">
        CAM // {cut.cameraShotId}
      </div>

      {/* Floating Korean/English Manhwa SFX Typography */}
      <div className="absolute bottom-4 left-4 pointer-events-none">
        <div className="text-2xl sm:text-3xl font-black italic tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-fuchsia-200 to-pink-400 drop-shadow-[0_4px_12px_rgba(217,70,239,0.85)]">
          {cut.sfxText}
        </div>
        <div className="text-[10px] font-black tracking-widest uppercase text-fuchsia-300/90 drop-shadow">
          {cut.sfxSub}
        </div>
      </div>

      {/* Optional 3D Scene PIP Inset when viewing in Naver Webtoon 2D Style */}
      {!isOriginal3D && showHybrid3DInset && frame3D && (
        <div className="absolute bottom-3.5 right-3.5 w-36 h-22 rounded-lg overflow-hidden border-2 border-cyan-400/80 shadow-xl bg-black/90">
          <img
            src={frame3D}
            alt="3D Camera Source"
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-0 inset-x-0 bg-black/80 text-[9px] font-bold text-center text-cyan-200 py-0.5">
            원본 3D 앵글 #{cut.cutNumber}
          </div>
        </div>
      )}
    </div>
  );
};

export const WebtoonModal: React.FC = () => {
  const isOpen = useGameStore((s) => s.isWebtoonModalOpen);
  const setIsOpen = useGameStore((s) => s.setIsWebtoonModalOpen);
  const worldState = useGameStore((s) => s.worldState);
  const selectedStyle = useGameStore((s) => s.selectedWebtoonStyle);
  const setSelectedStyle = useGameStore((s) => s.setSelectedWebtoonStyle);
  const generatedEpisode = useGameStore((s) => s.generatedEpisode);
  const generatingWebtoon = useGameStore((s) => s.generatingWebtoon);
  const generateWebtoonEpisode = useGameStore((s) => s.generateWebtoonEpisode);
  const multiAngle3DFrames = useGameStore((s) => s.multiAngle3DFrames);
  const captureAll3DCameraAngles = useGameStore(
    (s) => s.captureAll3DCameraAngles
  );

  // Two-step UX: 'STYLE_PICKER' before generation, 'EPISODE_READER' once chosen
  const [viewMode, setViewMode] = useState<'STYLE_PICKER' | 'EPISODE_READER'>(
    'STYLE_PICKER'
  );
  const [showHybrid3DInset, setShowHybrid3DInset] = useState(true);
  const [downloading, setDownloading] = useState(false);

  // Capture all 10 3D camera angles when modal opens so previews & cuts have live 3D shots ready
  useEffect(() => {
    if (isOpen) {
      captureAll3DCameraAngles();
    }
  }, [isOpen, captureAll3DCameraAngles]);

  const activeStyleMeta = useMemo(
    () =>
      WEBTOON_STYLE_OPTIONS.find((s) => s.id === selectedStyle) ??
      WEBTOON_STYLE_OPTIONS[0],
    [selectedStyle]
  );

  const episodeToRender = useMemo<GeneratedWebtoonEpisode | null>(() => {
    if (!worldState) return null;
    if (generatedEpisode && generatedEpisode.styleId === selectedStyle) {
      return generatedEpisode;
    }
    return buildClientFallbackEpisode(worldState, selectedStyle);
  }, [worldState, generatedEpisode, selectedStyle]);

  if (!isOpen || !worldState || !episodeToRender) return null;

  const handleStartEpisodeGeneration = async (styleId: WebtoonStyleId) => {
    setSelectedStyle(styleId);
    setViewMode('EPISODE_READER');
    await generateWebtoonEpisode(styleId);
  };

  const handleDownloadFullEpisodePng = async () => {
    setDownloading(true);
    try {
      const cuts = episodeToRender.cuts;
      const canvas = document.createElement('canvas');
      const width = 920;
      const cutBlockHeight = 670;
      const headerHeight = 190;
      const footerHeight = 130;
      canvas.width = width;
      canvas.height = headerHeight + cuts.length * cutBlockHeight + footerHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Vertical Webtoon Dark Canvas Background
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, '#06030d');
      grad.addColorStop(0.5, '#110722');
      grad.addColorStop(1, '#06030d');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, canvas.height);

      // Header Banner
      ctx.fillStyle = '#d946ef';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(
        `FANVERSE WEBTOON // ${activeStyleMeta.nameKo} (${cuts.length} CUTS FULL EPISODE)`,
        48,
        54
      );

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 34px sans-serif';
      ctx.fillText(episodeToRender.episodeSubtitle.slice(0, 52), 48, 102);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(
        `Ending: ${worldState.endingReached}  •  Turns: ${worldState.turnCount}  •  Hana Trust: ${worldState.relationships.hanaTrust}%  •  Jiho Trust: ${worldState.relationships.jihoTrust}%`,
        48,
        142
      );

      const loadImage = (src: string): Promise<HTMLImageElement> =>
        new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = src;
        });

      const styleSheetImg =
        selectedStyle !== 'ORIGINAL_3D'
          ? await loadImage(activeStyleMeta.previewImg).catch(() => null)
          : null;

      for (let i = 0; i < cuts.length; i++) {
        const cut = cuts[i];
        const yTop = headerHeight + i * cutBlockHeight;

        // Cut Outer Card
        ctx.fillStyle = '#0d071b';
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 2;
        ctx.fillRect(44, yTop + 10, width - 88, cutBlockHeight - 24);
        ctx.strokeRect(44, yTop + 10, width - 88, cutBlockHeight - 24);

        const imgX = 52;
        const imgY = yTop + 18;
        const imgW = width - 104;
        const imgH = 400;

        if (selectedStyle === 'ORIGINAL_3D' || !styleSheetImg) {
          const shotSrc =
            multiAngle3DFrames[cut.cameraShotId as CameraShotId] ||
            '/references/backstage_room_concept.png';
          try {
            const shotImg = await loadImage(shotSrc);
            ctx.drawImage(shotImg, imgX, imgY, imgW, imgH);
          } catch {
            ctx.fillStyle = '#1b0f30';
            ctx.fillRect(imgX, imgY, imgW, imgH);
          }
        } else {
          // Crop quadrant from the 2x2 Naver Webtoon Style Sheet
          const crop = CUT_QUADRANT_CROPS[cut.cutNumber] || {
            q: cut.quadrantIndex,
            ox: 0,
            oy: 0,
            scale: 1,
          };
          const col = crop.q % 2;
          const row = Math.floor(crop.q / 2);
          const halfW = styleSheetImg.width / 2;
          const halfH = styleSheetImg.height / 2;
          const sx = col * halfW + crop.ox * halfW * 0.4;
          const sy = row * halfH + crop.oy * halfH * 0.4;
          const sw = halfW * crop.scale;
          const sh = halfH * crop.scale;
          ctx.drawImage(styleSheetImg, sx, sy, sw, sh, imgX, imgY, imgW, imgH);
        }

        // Cut Header Pill
        ctx.fillStyle = 'rgba(9, 5, 20, 0.88)';
        ctx.fillRect(68, imgY + 14, 480, 38);
        ctx.fillStyle = '#f0abfc';
        ctx.font = 'bold 17px sans-serif';
        ctx.fillText(
          `CUT ${String(cut.cutNumber).padStart(2, '0')} // ${cut.sceneTitle}`,
          82,
          imgY + 39
        );

        // SFX Text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold italic 28px sans-serif';
        ctx.fillText(cut.sfxText, 72, imgY + imgH - 22);

        // Narrator Box
        ctx.fillStyle = '#cbd5e1';
        ctx.font = 'italic 16px sans-serif';
        ctx.fillText(cut.narratorCaption.slice(0, 68), 64, yTop + 448);

        // Speech Bubble
        ctx.fillStyle = '#170c2e';
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 2;
        ctx.fillRect(64, yTop + 468, width - 128, 108);
        ctx.strokeRect(64, yTop + 468, width - 128, 108);

        ctx.fillStyle = '#f472b6';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText(`${cut.speaker}`, 84, yTop + 496);

        ctx.fillStyle = '#ffffff';
        ctx.font = '18px sans-serif';
        ctx.fillText(cut.dialogue.slice(0, 62), 84, yTop + 526);
        if (cut.dialogue.length > 62) {
          ctx.fillText(cut.dialogue.slice(62, 124), 84, yTop + 552);
        }

        // Inner Monologue
        ctx.fillStyle = '#a78bfa';
        ctx.font = '15px sans-serif';
        ctx.fillText(cut.innerMonologue.slice(0, 72), 64, yTop + 610);
      }

      const yFooter = headerHeight + cuts.length * cutBlockHeight + 48;
      ctx.fillStyle = '#f0abfc';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(episodeToRender.authorComment.slice(0, 80), 48, yFooter);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.fillText(
        'Generated by FANVERSE — Gemini 4 Argon Story Director & Multi-Camera 3D Webtoon Engine',
        48,
        yFooter + 32
      );

      const pngUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = `fanverse-ep01-${selectedStyle.toLowerCase()}-10cuts.png`;
      a.click();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-3 sm:p-5">
      <div className="relative w-full max-w-5xl max-h-[94vh] flex flex-col rounded-2xl bg-[#090514] border border-fuchsia-500/50 shadow-2xl overflow-hidden">
        {/* Top Studio Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-gradient-to-r from-fuchsia-950/85 via-purple-950/85 to-indigo-950/85 border-b border-fuchsia-500/30">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-fuchsia-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                FANVERSE WEBTOON STUDIO // 일반 웹툰 1화 분량 (10컷 완전판)
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white mt-0.5">
              {episodeToRender.episodeSubtitle}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Switch between Pre-Generation Style Picker and 10-Cut Episode Reader */}
            <button
              onClick={() =>
                setViewMode(
                  viewMode === 'STYLE_PICKER'
                    ? 'EPISODE_READER'
                    : 'STYLE_PICKER'
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-900/60 hover:bg-purple-800/80 text-xs font-bold text-purple-100 border border-purple-400/40 cursor-pointer transition"
            >
              <Palette className="w-3.5 h-3.5 text-fuchsia-300" />
              <span>
                {viewMode === 'STYLE_PICKER'
                  ? '10컷 웹툰 본편 보기'
                  : '그림체 / 3D 원본 다시 선택'}
              </span>
            </button>

            {viewMode === 'EPISODE_READER' && (
              <>
                <button
                  onClick={() => generateWebtoonEpisode(selectedStyle)}
                  disabled={generatingWebtoon}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xs font-semibold text-cyan-200 border border-cyan-500/30 cursor-pointer"
                  title="Gemini 4 Argon으로 내 플레이 대사를 반영해 10컷 스크립트를 새로 생성합니다"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 text-cyan-400 ${
                      generatingWebtoon ? 'animate-spin' : ''
                    }`}
                  />
                  <span>
                    {generatingWebtoon
                      ? 'Gemini 4 Argon 생성 중...'
                      : 'AI 대사 재연출'}
                  </span>
                </button>

                <button
                  onClick={handleDownloadFullEpisodePng}
                  disabled={downloading}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500 text-xs font-bold text-white shadow-lg shadow-fuchsia-600/30 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>
                    {downloading
                      ? '10컷 전체 저장 중...'
                      : '1화 전체 이미지 저장 (PNG)'}
                  </span>
                </button>
              </>
            )}

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODE 1: PRE-GENERATION ART STYLE SELECTOR (Choose Naver Webtoon Styles vs. Original 3D) */}
        {viewMode === 'STYLE_PICKER' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#070410]">
            <div className="p-5 rounded-2xl bg-gradient-to-r from-fuchsia-950/50 via-purple-950/50 to-indigo-950/50 border border-fuchsia-500/35 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-fuchsia-300 mb-1">
                  <Wand2 className="w-4 h-4" />
                  <span>STEP 1 — 웹툰 생성 전 그림체 선택 (Art Style Selection)</span>
                </div>
                <h3 className="text-lg font-extrabold text-white">
                  네이버 웹툰 인기 작화 4종 또는 원래 3D 체험 화면 그대로 중 원하는 스타일을 선택하세요!
                </h3>
                <p className="text-xs text-purple-200/85 mt-1">
                  선택 즉시 플레이어의 5막(Act 1~5) 백스테이지 선택 기록과 10개의 3D 카메라 앵글이 결합된{' '}
                  <strong className="text-white">정식 1화 분량(10컷 세로 스크롤 웹툰)</strong>이 생성됩니다.
                </p>
              </div>
              <button
                onClick={() => handleStartEpisodeGeneration(selectedStyle)}
                className="shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500 text-sm font-extrabold text-white shadow-xl shadow-fuchsia-600/30 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>선택한 스타일로 1화(10컷) 생성하기</span>
              </button>
            </div>

            {/* 5 Art Style Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {WEBTOON_STYLE_OPTIONS.map((opt) => {
                const isSelected = selectedStyle === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => setSelectedStyle(opt.id)}
                    className={`group rounded-2xl overflow-hidden border-2 transition-all cursor-pointer flex flex-col bg-[#0e081d] ${
                      isSelected
                        ? `${opt.accentBorder} shadow-2xl shadow-fuchsia-500/20 scale-[1.01]`
                        : 'border-purple-500/25 hover:border-purple-400/60'
                    }`}
                  >
                    <div className="relative h-48 w-full bg-black overflow-hidden">
                      <img
                        src={opt.previewImg}
                        alt={opt.nameKo}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0e081d] via-transparent to-black/30" />
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/80 border border-white/15 text-[10px] font-extrabold text-fuchsia-300">
                        {opt.badge}
                      </span>
                      {isSelected && (
                        <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-fuchsia-600 text-white text-[10px] font-extrabold shadow">
                          <CheckCircle2 className="w-3 h-3" />
                          선택됨
                        </span>
                      )}
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <div className={`text-sm font-extrabold ${opt.accentText}`}>
                          {opt.nameKo}
                        </div>
                        <div className="text-[11px] font-semibold text-purple-300/90 mt-0.5">
                          {opt.referenceWorks}
                        </div>
                        <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                          {opt.description}
                        </p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEpisodeGeneration(opt.id);
                        }}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                          isSelected
                            ? 'bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white shadow-md'
                            : 'bg-purple-950/60 hover:bg-purple-900 text-purple-200 border border-purple-500/30'
                        }`}
                      >
                        이 그림체로 1화(10컷) 바로 열기 →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* MODE 2: FULL 10-CUT VERTICAL SCROLL WEBTOON EPISODE READER */}
        {viewMode === 'EPISODE_READER' && (
          <div className="flex-1 overflow-y-auto bg-[#05030a]">
            {/* Sticky Quick Style Switcher Bar */}
            <div className="sticky top-0 z-20 px-4 py-2.5 bg-[#0b061a]/95 backdrop-blur-md border-b border-purple-500/30 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                <span className="text-[11px] font-bold text-purple-300 mr-1 shrink-0">
                  그림체 즉시 전환:
                </span>
                {WEBTOON_STYLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedStyle(opt.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition cursor-pointer border ${
                      selectedStyle === opt.id
                        ? 'bg-fuchsia-600 border-fuchsia-300 text-white shadow'
                        : 'bg-purple-950/50 border-purple-500/30 text-purple-200 hover:text-white'
                    }`}
                  >
                    {opt.id === 'ORIGINAL_3D'
                      ? '원래 3D 그대로'
                      : opt.nameKo.replace('네이버 ', '')}
                  </button>
                ))}
              </div>

              {selectedStyle !== 'ORIGINAL_3D' && (
                <button
                  onClick={() => setShowHybrid3DInset((v) => !v)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                    showHybrid3DInset
                      ? 'bg-cyan-950/80 border-cyan-400/60 text-cyan-200'
                      : 'bg-slate-900 border-slate-700 text-slate-400'
                  }`}
                >
                  <Layers className="w-3 h-3" />
                  <span>
                    {showHybrid3DInset
                      ? '원본 3D 앵글 PIP 표시 중'
                      : '원본 3D 앵글 PIP 숨김'}
                  </span>
                </button>
              )}
            </div>

            {/* Vertical Manhwa Reader Column (Max Width 680px like Naver Webtoon Mobile/PC Viewer) */}
            <div className="max-w-2xl mx-auto py-8 px-4 space-y-12">
              {/* Episode Title Card */}
              <div className="text-center space-y-2 py-6 px-4 rounded-2xl bg-gradient-to-b from-purple-950/60 to-[#090514] border border-fuchsia-500/30">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-fuchsia-500/20 border border-fuchsia-400/40 text-[11px] font-extrabold text-fuchsia-300">
                  <Film className="w-3.5 h-3.5" />
                  <span>{activeStyleMeta.nameKo} · 정식 1화 (총 10컷)</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {episodeToRender.episodeSubtitle}
                </h1>
                <p className="text-xs text-purple-200/80">
                  {activeStyleMeta.referenceWorks} · 플레이 턴 {worldState.turnCount}회 ·
                  하나 신뢰도 {worldState.relationships.hanaTrust}% · 지호 신뢰도{' '}
                  {worldState.relationships.jihoTrust}%
                </p>
              </div>

              {/* 10 Vertical Scroll Cuts */}
              {episodeToRender.cuts.map((cut) => {
                const frame3D =
                  multiAngle3DFrames[cut.cameraShotId as CameraShotId];
                return (
                  <article
                    key={cut.cutNumber}
                    className="rounded-2xl overflow-hidden bg-[#0e071c] border-2 border-purple-500/35 shadow-[0_20px_50px_rgba(0,0,0,0.85)]"
                  >
                    {/* Narrator Top Square Box (Classic Naver Webtoon Narration Box) */}
                    <div className="px-5 py-3.5 bg-[#140a29] border-b border-purple-500/30 flex items-start justify-between gap-3">
                      <p className="text-xs sm:text-sm text-purple-100/95 font-medium leading-relaxed">
                        {cut.narratorCaption}
                      </p>
                      <span className="text-[11px] font-mono text-fuchsia-400 font-bold shrink-0">
                        #{String(cut.cutNumber).padStart(2, '0')}
                      </span>
                    </div>

                    {/* Visual Cut Artwork (Naver Webtoon Style or Original 3D Camera Angle) */}
                    <WebtoonCutArtwork
                      cut={cut}
                      styleMeta={activeStyleMeta}
                      frame3D={frame3D}
                      showHybrid3DInset={showHybrid3DInset}
                    />

                    {/* Dialogue Speech Bubble & Inner Monologue */}
                    <div className="p-5 space-y-3.5 bg-gradient-to-b from-[#120924] to-[#0b0517]">
                      <div className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                        {cut.sceneTitle}
                      </div>

                      {/* Speech Bubble */}
                      <div className="relative p-4 rounded-2xl bg-white text-slate-900 shadow-xl border-2 border-fuchsia-400">
                        <div className="inline-block px-2 py-0.5 rounded bg-fuchsia-600 text-white text-[10px] font-black uppercase tracking-wider mb-1.5">
                          {cut.speaker === 'FAN'
                            ? 'YOU (VIP FAN)'
                            : cut.speaker}
                        </div>
                        <p className="text-sm sm:text-base font-bold leading-relaxed text-slate-900">
                          {cut.dialogue}
                        </p>
                      </div>

                      {/* Character Inner Monologue */}
                      <div className="px-4 py-2.5 rounded-xl bg-purple-950/40 border border-purple-500/25 text-xs italic text-purple-200/90">
                        {cut.innerMonologue}
                      </div>
                    </div>
                  </article>
                );
              })}

              {/* Creator's Note / Episode End Card */}
              <div className="p-6 rounded-2xl bg-gradient-to-r from-fuchsia-950/60 via-purple-950/60 to-indigo-950/60 border border-fuchsia-500/40 space-y-3 text-center">
                <div className="text-xs font-extrabold uppercase tracking-widest text-fuchsia-300">
                  TO BE CONTINUED IN EPISODE 02
                </div>
                <p className="text-sm text-white font-semibold leading-relaxed">
                  {episodeToRender.authorComment}
                </p>
                <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={() => setViewMode('STYLE_PICKER')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-900/70 hover:bg-purple-800 text-xs font-bold text-purple-100 border border-purple-400/40 cursor-pointer"
                  >
                    <Palette className="w-3.5 h-3.5" />
                    <span>다른 네이버 웹툰 그림체나 원본 3D로 비교하기</span>
                  </button>
                  <button
                    onClick={handleDownloadFullEpisodePng}
                    disabled={downloading}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500 text-xs font-bold text-white shadow-lg cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>1화 10컷 전체 웹툰 저장하기 (PNG)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

