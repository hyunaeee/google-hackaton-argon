import React, { useEffect, useState } from 'react';
import {
  X,
  Download,
  RefreshCw,
  BookOpen,
  Check,
  FileText,
  Eye,
  Globe,
} from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { CameraShotId, WebtoonStyleId } from '../../../shared/types';

export type ExtendedWebtoonStyleKey =
  | 'NAVER_ROMANCE_IDOL'
  | 'NAVER_KPOP_DEMON_HUNTERS'
  | 'NAVER_HIGHTEEN_POP'
  | 'NAVER_SHOWBIZ_DRAMA'
  | 'NAVER_YOUTH_DRAMA'
  | 'NAVER_RETRO_PURE'
  | 'NAVER_CLEAN_MINIMAL'
  | 'NAVER_ACTION_MANHWA'
  | 'NAVER_DYNAMIC_BRUSH'
  | 'NAVER_NOIR_STAGE'
  | 'ORIGINAL_3D';

interface StylePresetConfig {
  key: ExtendedWebtoonStyleKey;
  backendStyleId: WebtoonStyleId;
  nameKo: string;
  nameEn: string;
  refWorkKo: string;
  refWorkEn: string;
  descKo: string;
  descEn: string;
  previewUrl: string;
  canvasFilter: string;
  tintColor: string;
  tintAlpha: number;
  paperBg: string;
  headerBg: string;
  accentHex: string;
}

const TEN_NAVER_STYLES: StylePresetConfig[] = [
  {
    key: 'NAVER_ROMANCE_IDOL',
    backendStyleId: 'NAVER_ROMANCE_IDOL',
    nameKo: '1. 로맨스 아이돌 순정체',
    nameEn: '1. Romance Idol Manhwa',
    refWorkKo: '여신강림 · 데뷔 못 하면 죽는 병 걸림 풍',
    refWorkEn: 'Ref: True Beauty · Debut or Die',
    descKo: '화사한 피부톤과 정교한 이목구비, 따뜻한 조명 보정',
    descEn: 'Warm luminous skin tones, expressive idol eyes & soft studio bloom',
    previewUrl: '/webtoon/style_romance_idol.png',
    canvasFilter: 'contrast(1.06) saturate(1.12) brightness(1.03)',
    tintColor: '#f59e0b',
    tintAlpha: 0.04,
    paperBg: '#181614',
    headerBg: '#221f1c',
    accentHex: '#fbbf24',
  },
  {
    key: 'NAVER_KPOP_DEMON_HUNTERS',
    backendStyleId: 'NAVER_ROMANCE_IDOL',
    nameKo: '2. 케이팝 데몬 헌터스 3D체',
    nameEn: '2. K-Pop Demon Hunters 3D',
    refWorkKo: '소니 애니메이션 케이팝 데몬 헌터스 풍',
    refWorkEn: 'Ref: K-Pop Demon Hunters Stylized 3D',
    descKo: '세련된 V라인 3D 아이돌 조형과 입체적인 셀 셰이딩 질감',
    descEn: 'Stylized 3D K-Pop idol proportions with painterly studio shading',
    previewUrl: '/webtoon/style_kpop_demon_hunters.png',
    canvasFilter: 'contrast(1.14) saturate(1.18) brightness(1.02)',
    tintColor: '#d97706',
    tintAlpha: 0.05,
    paperBg: '#161412',
    headerBg: '#1f1c19',
    accentHex: '#f59e0b',
  },
  {
    key: 'NAVER_HIGHTEEN_POP',
    backendStyleId: 'NAVER_ROMANCE_IDOL',
    nameKo: '3. 하이틴 팝 로맨스체',
    nameEn: '3. High-Teen Pop Romance',
    refWorkKo: '작전명 순정 · 소녀의 세계 풍',
    refWorkEn: 'Ref: Operation: True Love',
    descKo: '선명한 최신 트렌드 펜선과 산뜻한 코랄·샴페인 색감',
    descEn: 'Crisp modern line art with warm coral & champagne highlights',
    previewUrl: '/webtoon/style_highteen_pop.png',
    canvasFilter: 'contrast(1.08) saturate(1.16) brightness(1.04)',
    tintColor: '#fb923c',
    tintAlpha: 0.05,
    paperBg: '#191615',
    headerBg: '#241f1d',
    accentHex: '#fdba74',
  },
  {
    key: 'NAVER_SHOWBIZ_DRAMA',
    backendStyleId: 'NAVER_ROMANCE_IDOL',
    nameKo: '4. 쇼비즈니스 오피스 드라마체',
    nameEn: '4. Showbiz Office Drama',
    refWorkKo: '내 남편과 결혼해줘 · 사내맞선 풍',
    refWorkEn: 'Ref: Marry My Husband · Business Proposal',
    descKo: '깔끔한 수트핏과 화려한 무대 의상이 돋보이는 성숙한 작화',
    descEn: 'Sharp tailored silhouettes and glamorous backstage studio lighting',
    previewUrl: '/webtoon/style_showbiz_drama.png',
    canvasFilter: 'contrast(1.10) saturate(1.08) brightness(1.02)',
    tintColor: '#eab308',
    tintAlpha: 0.04,
    paperBg: '#171513',
    headerBg: '#211e1b',
    accentHex: '#fde047',
  },
  {
    key: 'NAVER_YOUTH_DRAMA',
    backendStyleId: 'NAVER_YOUTH_DRAMA',
    nameKo: '5. 감성 청춘 드라마체',
    nameEn: '5. Warm Youth Webdrama',
    refWorkKo: '청춘 블라썸 · 연애혁명 풍',
    refWorkEn: 'Ref: Seasons of Blossom',
    descKo: '부드러운 수채화풍 음영과 포근한 백스테이지 채광',
    descEn: 'Soft watercolor cel-shading and warm golden-hour emotional tones',
    previewUrl: '/webtoon/style_youth_drama.png',
    canvasFilter: 'contrast(1.02) saturate(1.05) sepia(0.08) brightness(1.04)',
    tintColor: '#f59e0b',
    tintAlpha: 0.06,
    paperBg: '#1a1714',
    headerBg: '#24201c',
    accentHex: '#fcd34d',
  },
  {
    key: 'NAVER_RETRO_PURE',
    backendStyleId: 'NAVER_YOUTH_DRAMA',
    nameKo: '6. 레트로 순정 만화체',
    nameEn: '6. Retro Pure Manhwa',
    refWorkKo: '세기말 풋사과 보습학원 · 치즈인더트랩 풍',
    refWorkEn: 'Ref: After School Lessons for Unripe Apples',
    descKo: '섬세한 펜선과 따뜻한 크림·피치 파스텔 톤의 아날로그 감성',
    descEn: 'Delicate fine ink linework with nostalgic warm cream & peach tones',
    previewUrl: '/webtoon/style_retro_pure.png',
    canvasFilter: 'contrast(1.01) saturate(0.96) sepia(0.12) brightness(1.05)',
    tintColor: '#fde68a',
    tintAlpha: 0.07,
    paperBg: '#1b1815',
    headerBg: '#26221e',
    accentHex: '#fde68a',
  },
  {
    key: 'NAVER_CLEAN_MINIMAL',
    backendStyleId: 'NAVER_YOUTH_DRAMA',
    nameKo: '7. 모던 미니멀 일상체',
    nameEn: '7. Clean Minimal Webtoon',
    refWorkKo: '유미의 세포들 · 간 떨어지는 동거 풍',
    refWorkEn: 'Ref: Yumi’s Cells',
    descKo: '깔끔하고 정돈된 외곽선과 담백한 플랫 스튜디오 컬러링',
    descEn: 'Clean modern outlines with balanced warm studio flat shading',
    previewUrl: '/webtoon/style_clean_minimal.png',
    canvasFilter: 'contrast(1.05) saturate(1.04) brightness(1.04)',
    tintColor: '#fafaf9',
    tintAlpha: 0.03,
    paperBg: '#181615',
    headerBg: '#221f1d',
    accentHex: '#e7e5e4',
  },
  {
    key: 'NAVER_ACTION_MANHWA',
    backendStyleId: 'NAVER_ACTION_MANHWA',
    nameKo: '8. 시네마틱 액션 극화체',
    nameEn: '8. Cinematic Action Manhwa',
    refWorkKo: '나 혼자만 레벨업 · 전지적 독자 시점 풍',
    refWorkEn: 'Ref: Solo Leveling · Omniscient Reader',
    descKo: '강렬한 명암 대비와 긴박한 쇼타임 직전 카메라 연출',
    descEn: 'High-contrast ink shadows and tense pre-showtime camera dynamics',
    previewUrl: '/webtoon/style_action_manhwa.png',
    canvasFilter: 'contrast(1.22) saturate(1.10) brightness(0.98)',
    tintColor: '#ea580c',
    tintAlpha: 0.05,
    paperBg: '#131110',
    headerBg: '#1c1917',
    accentHex: '#fb923c',
  },
  {
    key: 'NAVER_DYNAMIC_BRUSH',
    backendStyleId: 'NAVER_ACTION_MANHWA',
    nameKo: '9. 다이나믹 브러시 펜선체',
    nameEn: '9. Dynamic Brush-Ink Manhwa',
    refWorkKo: '화산귀환 · 일렉시드 풍',
    refWorkEn: 'Ref: Return of the Mount Hua Sect',
    descKo: '생동감 넘치는 붓펜 터치와 골드 스포트라이트 하이라이트',
    descEn: 'Expressive brush-ink strokes with warm gold spotlight highlights',
    previewUrl: '/webtoon/style_dynamic_brush.png',
    canvasFilter: 'contrast(1.18) saturate(1.14) sepia(0.05)',
    tintColor: '#d97706',
    tintAlpha: 0.06,
    paperBg: '#151311',
    headerBg: '#201c19',
    accentHex: '#fbbf24',
  },
  {
    key: 'NAVER_NOIR_STAGE',
    backendStyleId: 'NAVER_NOIR_STAGE',
    nameKo: '10. 시네마틱 스릴러 드라마체',
    nameEn: '10. Noir Stage Drama',
    refWorkKo: '외모지상주의 · 내가 죽기로 결심한 것은 풍',
    refWorkEn: 'Ref: Lookism · Muse on Fame',
    descKo: '묵직한 백스테이지 그림자와 영화적인 필름 톤 연출',
    descEn: 'Deep backstage shadows, filmic grain & dramatic spotlight contrast',
    previewUrl: '/webtoon/style_noir_stage.png',
    canvasFilter: 'contrast(1.26) saturate(0.86) sepia(0.10) brightness(0.96)',
    tintColor: '#78716c',
    tintAlpha: 0.07,
    paperBg: '#11100f',
    headerBg: '#1a1816',
    accentHex: '#d6d3d1',
  },
  {
    key: 'ORIGINAL_3D',
    backendStyleId: 'ORIGINAL_3D',
    nameKo: '원본 3D 플레이 캡처 모드',
    nameEn: 'Original 3D Scene Captures',
    refWorkKo: '실시간 3D 대기실 멀티 앵글 캡처',
    refWorkEn: 'Real-time 3D Multi-Angle Captures',
    descKo: '플레이한 3D 화면 그대로 말풍선과 자막을 합성한 2K 세로 웹툰',
    descEn: 'Your actual 3D backstage camera captures stitched at 2K resolution',
    previewUrl: '/webtoon/cut_01.png',
    canvasFilter: 'contrast(1.04) saturate(1.04)',
    tintColor: '#d97706',
    tintAlpha: 0.0,
    paperBg: '#161412',
    headerBg: '#211e1b',
    accentHex: '#fcd34d',
  },
];

// 8 Distinct Single-Panel NanoBanana Pro Cuts (Never repeated across the 8 cuts!)
const DISTINCT_CUT_URLS: string[] = [
  '/webtoon/cut_01.png',
  '/webtoon/cut_02.png',
  '/webtoon/cut_03.png',
  '/webtoon/cut_04.png',
  '/webtoon/cut_05.png',
  '/webtoon/cut_06.png',
  '/webtoon/cut_07.png',
  '/webtoon/cut_08.png',
];

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [text];
}

export const WebtoonModal: React.FC = () => {
  const {
    lang,
    setLang,
    isWebtoonModalOpen,
    setIsWebtoonModalOpen,
    worldState,
    multiAngle3DFrames,
    generatedEpisode,
    generatingWebtoon,
    generateWebtoonEpisode,
  } = useGameStore();

  const isKo = lang === 'ko';

  const [selectedPresetKey, setSelectedPresetKey] =
    useState<ExtendedWebtoonStyleKey>('NAVER_ROMANCE_IDOL');
  const [showPromptDetails, setShowPromptDetails] = useState(false);
  const [stitched2KDataUrl, setStitched2KDataUrl] = useState<string | null>(
    null
  );
  const [stitchingCanvas, setStitchingCanvas] = useState(false);

  const activePreset =
    TEN_NAVER_STYLES.find((s) => s.key === selectedPresetKey) ??
    TEN_NAVER_STYLES[0];

  // Trigger episode generation when opened or when language changes
  useEffect(() => {
    if (isWebtoonModalOpen && !generatedEpisode && !generatingWebtoon) {
      generateWebtoonEpisode(activePreset.backendStyleId, lang);
    }
  }, [
    isWebtoonModalOpen,
    generatedEpisode,
    generatingWebtoon,
    activePreset.backendStyleId,
    lang,
    generateWebtoonEpisode,
  ]);

  const handleSelectPreset = async (preset: StylePresetConfig) => {
    setSelectedPresetKey(preset.key);
    await generateWebtoonEpisode(preset.backendStyleId, lang);
  };

  const handleToggleLanguage = async (nextLang: 'en' | 'ko') => {
    setLang(nextLang);
    await generateWebtoonEpisode(activePreset.backendStyleId, nextLang);
  };

  // Build 2K (2048px wide) single continuous vertical webtoon canvas with speech bubbles inside
  useEffect(() => {
    if (!isWebtoonModalOpen || !generatedEpisode) return;

    let cancelled = false;
    const render2KVerticalWebtoon = async () => {
      setStitchingCanvas(true);
      try {
        const cuts = generatedEpisode.cuts;
        const W = 2048; // True 2K horizontal resolution
        const PAD_X = 120;
        const PANEL_W = W - PAD_X * 2; // 1808px panel width
        const PANEL_H = 1280;
        const GUTTER_H = 150;
        const HEADER_H = 440;
        const STYLE_BANNER_H = 540;
        const FOOTER_H = 260;

        const totalHeight =
          HEADER_H +
          (activePreset.key !== 'ORIGINAL_3D' ? STYLE_BANNER_H : 0) +
          cuts.length * (PANEL_H + GUTTER_H) +
          FOOTER_H;

        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = totalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // 1. Warm Studio Charcoal Background (No Cyberpunk Colors!)
        ctx.fillStyle = activePreset.paperBg;
        ctx.fillRect(0, 0, W, totalHeight);

        // 2. Editorial Header Banner
        ctx.fillStyle = activePreset.headerBg;
        ctx.fillRect(0, 0, W, HEADER_H - 40);
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(PAD_X, HEADER_H - 40);
        ctx.lineTo(W - PAD_X, HEADER_H - 40);
        ctx.stroke();

        // Top badge
        ctx.fillStyle = activePreset.accentHex;
        ctx.font = 'bold 30px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
        ctx.fillText(
          isKo
            ? `FANVERSE 2K 오리지널 웹툰  ·  ${activePreset.nameKo} (${activePreset.refWorkKo})`
            : `FANVERSE 2K ORIGINAL WEBTOON  ·  ${activePreset.nameEn} (${activePreset.refWorkEn})`,
          PAD_X,
          120
        );

        // Main Title
        ctx.fillStyle = '#fafaf9';
        ctx.font = '800 68px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
        ctx.fillText(generatedEpisode.episodeTitle, PAD_X, 220);

        // Subtitle
        ctx.fillStyle = '#a8a29e';
        ctx.font = '500 34px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
        ctx.fillText(
          `${generatedEpisode.subtitle}   |   2048px 2K Ultra HD Vertical Strip`,
          PAD_X,
          295
        );

        let cursorY = HEADER_H;

        // 3. Optional Style Hero Showcase Strip at top of webtoon
        if (activePreset.key !== 'ORIGINAL_3D') {
          try {
            const styleHeroImg = await loadImage(activePreset.previewUrl);
            ctx.save();
            drawRoundedRect(
              ctx,
              PAD_X,
              cursorY,
              PANEL_W,
              STYLE_BANNER_H - 70,
              28
            );
            ctx.clip();
            const scale = Math.max(
              PANEL_W / styleHeroImg.width,
              (STYLE_BANNER_H - 70) / styleHeroImg.height
            );
            const dw = styleHeroImg.width * scale;
            const dh = styleHeroImg.height * scale;
            ctx.drawImage(
              styleHeroImg,
              PAD_X + (PANEL_W - dw) / 2,
              cursorY + (STYLE_BANNER_H - 70 - dh) / 2,
              dw,
              dh
            );
            // Warm studio gradient overlay
            const grad = ctx.createLinearGradient(
              0,
              cursorY + STYLE_BANNER_H - 260,
              0,
              cursorY + STYLE_BANNER_H - 70
            );
            grad.addColorStop(0, 'rgba(20,18,16,0)');
            grad.addColorStop(1, 'rgba(20,18,16,0.92)');
            ctx.fillStyle = grad;
            ctx.fillRect(PAD_X, cursorY, PANEL_W, STYLE_BANNER_H - 70);

            ctx.fillStyle = activePreset.accentHex;
            ctx.font =
              'bold 28px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
            ctx.fillText(
              isKo
                ? `선택한 그림체 프리뷰: ${activePreset.nameKo}`
                : `Selected Art Style: ${activePreset.nameEn}`,
              PAD_X + 44,
              cursorY + STYLE_BANNER_H - 155
            );
            ctx.fillStyle = '#f5f5f4';
            ctx.font =
              '500 32px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
            ctx.fillText(
              isKo ? activePreset.descKo : activePreset.descEn,
              PAD_X + 44,
              cursorY + STYLE_BANNER_H - 105
            );
            ctx.restore();

            ctx.strokeStyle = 'rgba(255,255,255,0.18)';
            ctx.lineWidth = 4;
            drawRoundedRect(
              ctx,
              PAD_X,
              cursorY,
              PANEL_W,
              STYLE_BANNER_H - 70,
              28
            );
            ctx.stroke();
          } catch {
            // ignore preview load failure
          }
          cursorY += STYLE_BANNER_H;
        }

        // 4. Render each of the 8 sequential cuts with distinct artwork + embedded speech bubbles
        for (let i = 0; i < cuts.length; i++) {
          const cut = cuts[i];
          const panelX = PAD_X;
          const panelY = cursorY;

          // Determine source image: Original 3D capture or distinct NanoBanana Pro cut_01..cut_08
          const shot3D =
            multiAngle3DFrames[cut.cameraShotId as CameraShotId] ?? null;
          const distinctCutUrl =
            DISTINCT_CUT_URLS[i % DISTINCT_CUT_URLS.length];
          const primarySrc =
            activePreset.key === 'ORIGINAL_3D' && shot3D
              ? shot3D
              : distinctCutUrl;

          let img: HTMLImageElement | null = null;
          try {
            img = await loadImage(primarySrc);
          } catch {
            try {
              img = await loadImage(distinctCutUrl);
            } catch {
              img = null;
            }
          }

          // Panel frame & artwork
          ctx.save();
          drawRoundedRect(ctx, panelX, panelY, PANEL_W, PANEL_H, 24);
          ctx.clip();

          if (img) {
            ctx.filter = activePreset.canvasFilter;
            const scale = Math.max(PANEL_W / img.width, PANEL_H / img.height);
            const dw = img.width * scale;
            const dh = img.height * scale;
            const dx = panelX + (PANEL_W - dw) / 2;
            const dy = panelY + (PANEL_H - dh) / 2;
            ctx.drawImage(img, dx, dy, dw, dh);
            ctx.filter = 'none';
          } else {
            ctx.fillStyle = '#292524';
            ctx.fillRect(panelX, panelY, PANEL_W, PANEL_H);
          }

          // Subtle style color wash
          if (activePreset.tintAlpha > 0) {
            ctx.fillStyle = activePreset.tintColor;
            ctx.globalAlpha = activePreset.tintAlpha;
            ctx.fillRect(panelX, panelY, PANEL_W, PANEL_H);
            ctx.globalAlpha = 1.0;
          }

          // Top & bottom soft vignette for readability of narration/speech bubbles
          const topGrad = ctx.createLinearGradient(
            0,
            panelY,
            0,
            panelY + 260
          );
          topGrad.addColorStop(0, 'rgba(15,13,12,0.72)');
          topGrad.addColorStop(1, 'rgba(15,13,12,0)');
          ctx.fillStyle = topGrad;
          ctx.fillRect(panelX, panelY, PANEL_W, 260);

          const botGrad = ctx.createLinearGradient(
            0,
            panelY + PANEL_H - 380,
            0,
            panelY + PANEL_H
          );
          botGrad.addColorStop(0, 'rgba(15,13,12,0)');
          botGrad.addColorStop(1, 'rgba(15,13,12,0.78)');
          ctx.fillStyle = botGrad;
          ctx.fillRect(panelX, panelY + PANEL_H - 380, PANEL_W, 380);

          // Top-left Cut Number & Timestamp Caption Box (Rectangular Webtoon Narration Box)
          ctx.font =
            '500 30px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
          const narrationLines = wrapLines(ctx, cut.narration, PANEL_W - 220);
          const narBoxW = Math.min(PANEL_W - 100, 1460);
          const narBoxH = 86 + narrationLines.length * 44;
          const narX = panelX + 48;
          const narY = panelY + 42;

          ctx.fillStyle = 'rgba(24, 22, 20, 0.90)';
          drawRoundedRect(ctx, narX, narY, narBoxW, narBoxH, 16);
          ctx.fill();
          ctx.lineWidth = 3;
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.45)';
          ctx.stroke();

          ctx.fillStyle = activePreset.accentHex;
          ctx.font =
            'bold 24px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
          ctx.fillText(
            `CUT 0${cut.cutNumber}  ·  ${cut.timestampBadge}  ·  ${cut.sceneTitle}`,
            narX + 32,
            narY + 42
          );

          ctx.fillStyle = '#f5f5f4';
          ctx.font =
            '500 30px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
          narrationLines.forEach((line, idx) => {
            ctx.fillText(line, narX + 32, narY + 88 + idx * 42);
          });

          // Authentic Webtoon Speech Bubble (말풍선) with Tail inside the panel
          if (cut.dialogue && cut.dialogue.trim().length > 0) {
            ctx.font =
              '700 36px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
            const maxBubbleTextW = 1140;
            const dlgLines = wrapLines(ctx, cut.dialogue, maxBubbleTextW);
            const longestLineW = dlgLines.reduce(
              (max, l) => Math.max(max, ctx.measureText(l).width),
              360
            );
            const bubbleW = Math.min(PANEL_W - 140, longestLineW + 130);
            const bubbleH = 95 + dlgLines.length * 50;

            const isRightSide = i % 2 === 1;
            const bubbleX = isRightSide
              ? panelX + PANEL_W - bubbleW - 64
              : panelX + 64;
            const bubbleY = panelY + PANEL_H - bubbleH - 64;

            // Drop shadow
            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
            ctx.shadowBlur = 28;
            ctx.shadowOffsetY = 10;

            // Speech bubble body + pointer tail
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#1c1917';
            ctx.lineWidth = 5;

            drawRoundedRect(ctx, bubbleX, bubbleY, bubbleW, bubbleH, 42);
            ctx.fill();
            ctx.stroke();

            // Comic pointer tail pointing up toward the character
            const tailBaseX = isRightSide
              ? bubbleX + bubbleW * 0.72
              : bubbleX + bubbleW * 0.28;
            ctx.beginPath();
            ctx.moveTo(tailBaseX - 24, bubbleY + 3);
            ctx.lineTo(tailBaseX + (isRightSide ? 18 : -18), bubbleY - 42);
            ctx.lineTo(tailBaseX + 24, bubbleY + 3);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();

            // Cover seam inside bubble
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(tailBaseX - 21, bubbleY, 42, 8);

            // Speaker Pill Badge on top edge of speech bubble
            const speakerText =
              cut.speaker === 'HANA'
                ? isKo
                  ? '하나 (HANA)'
                  : 'HANA'
                : cut.speaker === 'JIHO'
                  ? isKo
                    ? '지호 (JIHO)'
                    : 'JIHO'
                  : cut.speaker === 'PROTAGONIST'
                    ? isKo
                      ? '주인공 매니저'
                      : 'MANAGER (YOU)'
                    : cut.speaker;

            ctx.font =
              'bold 24px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
            const spkW = ctx.measureText(speakerText).width + 48;
            const spkX = bubbleX + 42;
            const spkY = bubbleY - 22;

            ctx.fillStyle = '#1c1917';
            drawRoundedRect(ctx, spkX, spkY, spkW, 44, 22);
            ctx.fill();
            ctx.strokeStyle = activePreset.accentHex;
            ctx.lineWidth = 3;
            ctx.stroke();

            ctx.fillStyle = activePreset.accentHex;
            ctx.fillText(speakerText, spkX + 24, spkY + 30);

            // Dialogue text inside bubble
            ctx.fillStyle = '#1c1917';
            ctx.font =
              '700 36px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
            dlgLines.forEach((line, idx) => {
              ctx.fillText(line, bubbleX + 56, bubbleY + 76 + idx * 50);
            });
          }

          ctx.restore();

          // Crisp panel border
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
          ctx.lineWidth = 4;
          drawRoundedRect(ctx, panelX, panelY, PANEL_W, PANEL_H, 24);
          ctx.stroke();

          cursorY += PANEL_H + GUTTER_H;
        }

        // 5. Footer Credits
        ctx.fillStyle = '#a8a29e';
        ctx.font =
          '600 30px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
          generatedEpisode.endingBanner,
          W / 2,
          cursorY + 70
        );
        ctx.fillStyle = '#78716c';
        ctx.font =
          '500 24px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
        ctx.fillText(
          'FANVERSE · Gemini 4 Argon Verified State Engine + NanoBanana Pro 2K Webtoon Pipeline',
          W / 2,
          cursorY + 125
        );
        ctx.textAlign = 'left';

        if (!cancelled) {
          setStitched2KDataUrl(canvas.toDataURL('image/png'));
          setStitchingCanvas(false);
        }
      } catch {
        if (!cancelled) setStitchingCanvas(false);
      }
    };

    render2KVerticalWebtoon();
    return () => {
      cancelled = true;
    };
  }, [
    isWebtoonModalOpen,
    generatedEpisode,
    activePreset,
    multiAngle3DFrames,
    isKo,
  ]);

  if (!isWebtoonModalOpen) return null;

  const handleDownload2KImage = () => {
    if (!stitched2KDataUrl) return;
    const link = document.createElement('a');
    link.href = stitched2KDataUrl;
    link.download = `fanverse-ep01-2K-${activePreset.key.toLowerCase()}-${lang}.png`;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none">
      {/* Main Modal Container — Warm Charcoal & Ivory Tone matching main screen */}
      <div className="w-full max-w-6xl h-[92vh] rounded-2xl bg-[#141210] border border-white/12 shadow-2xl flex flex-col overflow-hidden text-stone-100">
        {/* Top Modal Header */}
        <div className="px-5 py-3.5 bg-stone-950 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-stone-900 border border-amber-300/30 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-stone-100">
                  {isKo
                    ? '개인화 웹툰 1화 생성기 (2K 초고화질 · 10종 네이버 웹툰체)'
                    : 'Episode 01 Personalized 2K Webtoon Studio (10 Naver Webtoon Styles)'}
                </h2>
                <span className="px-2 py-0.5 rounded bg-amber-300/15 border border-amber-300/40 text-amber-200 text-[10px] font-mono font-bold">
                  2048px 2K CANVAS
                </span>
              </div>
              <p className="text-xs text-stone-400">
                {isKo
                  ? '나노바나나 프로 개별 8컷 원화와 대사 말풍선이 하나의 길쭉한 2K 웹툰 이미지로 합성됩니다'
                  : '8 distinct NanoBanana Pro panels & comic speech bubbles stitched into one continuous 2K vertical webtoon image'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Selector inside Webtoon Modal */}
            <div className="inline-flex items-center rounded-lg bg-stone-900 border border-white/15 p-0.5 text-xs font-bold">
              <Globe className="w-3.5 h-3.5 text-stone-400 ml-2 mr-1" />
              <button
                onClick={() => handleToggleLanguage('en')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  lang === 'en'
                    ? 'bg-amber-300 text-stone-950'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                🇺🇸 EN
              </button>
              <button
                onClick={() => handleToggleLanguage('ko')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  lang === 'ko'
                    ? 'bg-amber-300 text-stone-950'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                🇰🇷 한국어
              </button>
            </div>

            <button
              onClick={() => setShowPromptDetails(!showPromptDetails)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                showPromptDetails
                  ? 'bg-stone-800 border-amber-300/50 text-amber-200'
                  : 'bg-stone-900 border-white/10 text-stone-300 hover:bg-stone-800'
              }`}
            >
              {showPromptDetails ? (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  <span>{isKo ? '웹툰 이미지 보기' : 'View 2K Webtoon'}</span>
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5" />
                  <span>{isKo ? '8컷 프롬프트 명세' : '8-Cut Prompts'}</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownload2KImage}
              disabled={!stitched2KDataUrl || stitchingCanvas}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-300 hover:bg-amber-200 disabled:opacity-50 text-stone-950 text-xs font-bold shadow transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>
                {isKo ? '2K 통짜 웹툰 PNG 저장' : 'Download 2K Webtoon PNG'}
              </span>
            </button>

            <button
              onClick={() => setIsWebtoonModalOpen(false)}
              className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-white/10 text-stone-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body: Left Style Selector (10 Naver Webtoon Styles + Original 3D) | Right 2K Vertical Scroll Viewer */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left Sidebar: 10 Naver Webtoon Art Styles + Original 3D */}
          <div className="w-full lg:w-[340px] bg-stone-950/70 border-b lg:border-b-0 lg:border-r border-white/10 p-3.5 overflow-y-auto shrink-0 space-y-2">
            <div className="flex items-center justify-between px-1 pb-1">
              <span className="text-xs font-bold text-stone-300">
                {isKo
                  ? '네이버 웹툰 그림체 10종 + 원본 3D'
                  : '10 Naver Webtoon Styles + Original 3D'}
              </span>
              <button
                onClick={() =>
                  generateWebtoonEpisode(activePreset.backendStyleId, lang)
                }
                disabled={generatingWebtoon}
                className="inline-flex items-center gap-1 text-[11px] text-amber-200 hover:text-amber-100 cursor-pointer"
              >
                <RefreshCw
                  className={`w-3 h-3 ${generatingWebtoon ? 'animate-spin' : ''}`}
                />
                <span>{isKo ? '재생성' : 'Regenerate'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
              {TEN_NAVER_STYLES.map((preset) => {
                const isSelected = preset.key === selectedPresetKey;
                return (
                  <button
                    key={preset.key}
                    onClick={() => handleSelectPreset(preset)}
                    disabled={generatingWebtoon}
                    className={`w-full text-left p-2 rounded-xl border transition flex items-center gap-2.5 cursor-pointer ${
                      isSelected
                        ? 'bg-stone-800/95 border-amber-300/70 shadow-md'
                        : 'bg-stone-900/70 hover:bg-stone-900 border-white/10'
                    }`}
                  >
                    <img
                      src={preset.previewUrl}
                      alt={isKo ? preset.nameKo : preset.nameEn}
                      className="w-12 h-12 rounded-lg object-cover border border-white/15 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-stone-100 truncate">
                          {isKo ? preset.nameKo : preset.nameEn}
                        </span>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                        )}
                      </div>
                      <div className="text-[10px] text-amber-200/90 truncate">
                        {isKo ? preset.refWorkKo : preset.refWorkEn}
                      </div>
                      <div className="text-[10px] text-stone-400 truncate mt-0.5">
                        {isKo ? preset.descKo : preset.descEn}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Main Viewport: Continuous 2K Stitched Vertical Webtoon Image */}
          <div className="flex-1 overflow-y-auto bg-[#0f0e0d] p-4 sm:p-6 flex flex-col items-center">
            {generatingWebtoon || stitchingCanvas ? (
              <div className="my-auto flex flex-col items-center gap-3 py-16 text-center">
                <RefreshCw className="w-8 h-8 text-amber-300 animate-spin" />
                <div className="text-sm font-bold text-stone-100">
                  {isKo
                    ? '2K (2048px) 초고화질 통짜 세로 웹툰 및 말풍선 합성 중...'
                    : 'Compositing 2K (2048px) continuous vertical webtoon & speech bubbles...'}
                </div>
                <div className="text-xs text-stone-400">
                  {isKo
                    ? `${activePreset.nameKo} 스타일 및 플레이 기록 반영 중`
                    : `Applying ${activePreset.nameEn} grading & verified story log`}
                </div>
              </div>
            ) : showPromptDetails && generatedEpisode ? (
              <div className="w-full max-w-3xl space-y-3">
                <div className="p-4 rounded-xl bg-stone-900 border border-white/10">
                  <h3 className="text-sm font-bold text-amber-200">
                    {isKo
                      ? '나노바나나 프로 8컷 개별 이미지 프롬프트 & 대사 명세'
                      : 'NanoBanana Pro 8-Cut Distinct Image Prompts & Script'}
                  </h3>
                  <p className="text-xs text-stone-400 mt-1">
                    {generatedEpisode.styleDescription}
                  </p>
                </div>
                {generatedEpisode.cuts.map((cut, idx) => (
                  <div
                    key={cut.cutNumber}
                    className="p-4 rounded-xl bg-stone-900/90 border border-white/10 flex gap-4 items-start"
                  >
                    <img
                      src={DISTINCT_CUT_URLS[idx % DISTINCT_CUT_URLS.length]}
                      alt={`Cut ${cut.cutNumber}`}
                      className="w-28 h-20 rounded-lg object-cover border border-white/15 shrink-0"
                    />
                    <div className="space-y-1 text-xs min-w-0 flex-1">
                      <div className="font-bold text-stone-100">
                        CUT 0{cut.cutNumber} · {cut.sceneTitle} (
                        {cut.timestampBadge})
                      </div>
                      <div className="text-stone-300">{cut.narration}</div>
                      <div className="text-amber-200 font-medium">
                        {cut.speaker}: &ldquo;{cut.dialogue}&rdquo;
                      </div>
                      <div className="text-[11px] text-stone-500 font-mono break-all pt-1">
                        Prompt: {cut.imagePrompt}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : stitched2KDataUrl ? (
              <div className="w-full max-w-[780px] flex flex-col items-center">
                <div className="w-full mb-3 px-4 py-2 rounded-xl bg-stone-900/90 border border-white/10 flex items-center justify-between text-xs text-stone-300">
                  <span>
                    {isKo
                      ? '하나로 이어진 2K (2048px) 통짜 웹툰 이미지입니다. 스크롤하여 감상하거나 우클릭/다운로드할 수 있습니다.'
                      : 'Single continuous 2K (2048px) stitched webtoon image with embedded speech bubbles.'}
                  </span>
                  <span className="font-mono text-amber-200 font-bold shrink-0 ml-2">
                    {worldState?.endingReached !== 'NONE'
                      ? worldState?.endingReached
                      : 'LIVE EP.01'}
                  </span>
                </div>

                {/* Single Continuous Stitched 2K Webtoon Image */}
                <img
                  src={stitched2KDataUrl}
                  alt="FANVERSE 2K Continuous Vertical Webtoon"
                  className="w-full h-auto rounded-2xl shadow-2xl border border-white/15 select-auto"
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
