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
  ArrowLeft,
  Sparkles,
  Compass,
  RotateCcw,
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
    backendStyleId: 'NAVER_KPOP_DEMON_HUNTERS',
    nameKo: '2. 케이팝 데몬 헌터스 입체풍',
    nameEn: '2. K-Pop Demon Hunters 3D',
    refWorkKo: '소니 애니메이션 케이팝 데몬 헌터스 풍',
    refWorkEn: 'Ref: K-Pop Demon Hunters Stylized 3D',
    descKo: '세련된 입체 아이돌 조형과 선명한 음영 질감',
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
    backendStyleId: 'NAVER_HIGHTEEN_POP',
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
    backendStyleId: 'NAVER_SHOWBIZ_DRAMA',
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
    backendStyleId: 'NAVER_RETRO_PURE',
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
    backendStyleId: 'NAVER_CLEAN_MINIMAL',
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
    backendStyleId: 'NAVER_DYNAMIC_BRUSH',
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
    nameKo: '원본 입체 대기실 포착 방식',
    nameEn: 'Original 3D Scene Captures',
    refWorkKo: '실시간 입체 대기실 다각도 포착',
    refWorkEn: 'Real-time 3D Multi-Angle Captures',
    descKo: '진행한 입체 화면 그대로 말풍선과 자막을 합성한 초고화질 세로 웹툰',
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
  text: string | undefined | null,
  maxWidth: number
): string[] {
  const safeText = (text ?? '').trim();
  if (!safeText) return [''];
  const words = safeText.split(/\s+/);
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
  return lines.length > 0 ? lines : [safeText];
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
    setSelectedTarget,
    submitPlayerAction,
    resetEpisode,
  } = useGameStore();

  const isKo = lang === 'ko';

  const [selectedPresetKey, setSelectedPresetKey] =
    useState<ExtendedWebtoonStyleKey>('NAVER_ROMANCE_IDOL');
  const [showPromptDetails, setShowPromptDetails] = useState(false);
  const [readyToRenderCanvas, setReadyToRenderCanvas] = useState(false);
  const [stitched2KDataUrl, setStitched2KDataUrl] = useState<string | null>(
    null
  );
  const [stitchingCanvas, setStitchingCanvas] = useState(false);

  const activePreset =
    TEN_NAVER_STYLES.find((s) => s.key === selectedPresetKey) ??
    TEN_NAVER_STYLES[0];

  // Selecting any style in the left sidebar immediately shows the Blank Webtoon Canvas with the big centered Generate button
  const handleSelectPreset = (preset: StylePresetConfig) => {
    setSelectedPresetKey(preset.key);
    setReadyToRenderCanvas(false);
    setStitched2KDataUrl(null);
    setShowPromptDetails(false);
  };

  const handleGenerateWithSelectedTheme = async (
    presetOverride?: StylePresetConfig
  ) => {
    const targetPreset = presetOverride ?? activePreset;
    if (presetOverride) {
      setSelectedPresetKey(presetOverride.key);
    }
    setReadyToRenderCanvas(true);
    setStitched2KDataUrl(null);
    await generateWebtoonEpisode(targetPreset.backendStyleId, lang);
  };

  const handleToggleLanguage = async (nextLang: 'en' | 'ko') => {
    setLang(nextLang);
    // Only re-generate automatically if the user has already generated the current canvas
    if (readyToRenderCanvas && generatedEpisode) {
      setStitched2KDataUrl(null);
      await generateWebtoonEpisode(activePreset.backendStyleId, nextLang);
    }
  };

  // Build 2K (2048px wide) single continuous vertical webtoon canvas with speech bubbles inside
  useEffect(() => {
    if (
      !isWebtoonModalOpen ||
      !generatedEpisode ||
      !readyToRenderCanvas ||
      generatingWebtoon
    )
      return;

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
            ? `FANVERSE 초고화질 오리지널 웹툰  ·  ${activePreset.nameKo} (${activePreset.refWorkKo})`
            : `FANVERSE 2K ORIGINAL WEBTOON  ·  ${activePreset.nameEn} (${activePreset.refWorkEn})`,
          PAD_X,
          120
        );

        // Main Title
        ctx.fillStyle = '#fafaf9';
        ctx.font = '800 64px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
        ctx.fillText(
          generatedEpisode.episodeSubtitle ||
            (isKo
              ? '제1화 — 공연 10분 전, 사라진 메인 마이크'
              : 'EP.01 — 10 Minutes to Showtime: The Missing Mic'),
          PAD_X,
          220
        );

        // Subtitle
        ctx.fillStyle = '#a8a29e';
        ctx.font = '500 32px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
        ctx.fillText(
          isKo
            ? `${activePreset.descKo}   |   초고화질 세로 스크롤 웹툰`
            : `${activePreset.descEn}   |   2048px 2K Ultra HD Vertical Strip`,
          PAD_X,
          295
        );

        let cursorY = HEADER_H;

        // 3. Optional Style Hero Showcase Strip at top of webtoon
        if (activePreset.key !== 'ORIGINAL_3D') {
          try {
            const heroBannerSrc =
              cuts[0]?.imageUrl || activePreset.previewUrl;
            const styleHeroImg = await loadImage(heroBannerSrc);
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
                ? `AI 실시간 생성 그림체: ${activePreset.nameKo}`
                : `AI Generated Art Style: ${activePreset.nameEn}`,
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

        // 4. Render each sequential cut with AI-generated style artwork (or 3D capture) + embedded speech bubbles
        for (let i = 0; i < cuts.length; i++) {
          const cut = cuts[i];
          const panelX = PAD_X;
          const panelY = cursorY;

          // Determine source image: Original 3D capture, Gemini AI generated cut imageUrl, or fallback cut_01..cut_08
          const shot3D =
            multiAngle3DFrames[cut.cameraShotId as CameraShotId] ?? null;
          const distinctCutUrl =
            DISTINCT_CUT_URLS[i % DISTINCT_CUT_URLS.length];
          const hasAiGeneratedCut =
            activePreset.key !== 'ORIGINAL_3D' && Boolean(cut.imageUrl);
          const primarySrc =
            activePreset.key === 'ORIGINAL_3D' && shot3D
              ? shot3D
              : cut.imageUrl || distinctCutUrl;

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
            ctx.filter = hasAiGeneratedCut ? 'none' : activePreset.canvasFilter;
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

          // Subtle style color wash only when using fallback static image
          if (!hasAiGeneratedCut && activePreset.tintAlpha > 0) {
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
          const narrationLines = wrapLines(
            ctx,
            cut.narratorCaption,
            PANEL_W - 220
          );
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
            isKo
              ? `제${cut.cutNumber}컷  ·  ${cut.actLabel}  ·  ${cut.sceneTitle}`
              : `CUT 0${cut.cutNumber}  ·  ${cut.actLabel}  ·  ${cut.sceneTitle}`,
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
                  ? '하나'
                  : 'HANA'
                : cut.speaker === 'JIHO'
                  ? isKo
                    ? '지호'
                    : 'JIHO'
                  : cut.speaker === 'FAN'
                    ? isKo
                      ? '주인공 매니저'
                      : 'MANAGER (YOU)'
                    : isKo
                      ? '내레이션'
                      : 'NARRATOR';

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
          generatedEpisode.authorComment ||
            (isKo
              ? '다음 화에 계속 — FANVERSE 제1화 완결'
              : 'To Be Continued — End of FANVERSE Episode 01'),
          W / 2,
          cursorY + 70
        );
        ctx.fillStyle = '#78716c';
        ctx.font =
          '500 24px -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
        ctx.fillText(
          isKo
            ? 'FANVERSE · 제미나이 4 아르곤 상태 검증 엔진 + 나노바나나 프로 초고화질 웹툰 제작소'
            : 'FANVERSE · Gemini 4 Argon Verified State Engine + NanoBanana Pro 2K Webtoon Pipeline',
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
    readyToRenderCanvas,
    generatingWebtoon,
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

  const handleReturnTo3DGame = () => {
    setIsWebtoonModalOpen(false);
  };

  const handleContinueNextRouteIn3D = async () => {
    setIsWebtoonModalOpen(false);
    // Automatically guide & trigger the next or alternative route in the 3D backstage
    if (!worldState?.acousticBackupApproved) {
      setSelectedTarget('acoustic_guitar');
      await submitPlayerAction(
        isKo
          ? '어쿠스틱 기타 스탠드를 점검하고 지호와 함께 언플러그드 라이브 백업 무대를 준비한다'
          : 'Inspect and tune the acoustic guitar on the stand to prepare the Unplugged Acoustic Encore Stage with Jiho',
        'acoustic_guitar'
      );
    } else if (!worldState?.hanaHasMicrophone) {
      const nextTarget = !worldState?.hasAccessCard
        ? 'access_card'
        : !worldState?.lockerUnlocked
          ? 'equipment_locker'
          : 'microphone';
      setSelectedTarget(nextTarget);
      await submitPlayerAction(
        isKo
          ? '스타라이트 커스텀 마이크 복구 루트를 진행해 완전체 메인 스테이지 엔딩에 도전한다'
          : 'Proceed with the Starlight Custom Mic recovery route to unlock the Full Comeback Stage ending',
        nextTarget
      );
    } else {
      setSelectedTarget('npc_hana');
      await submitPlayerAction(
        isKo
          ? '하나와 지호에게 다가가 백스테이지 에필로그 대화를 나눈다'
          : 'Talk with Hana and Jiho in the 3D backstage for the post-show encore conversation',
        'npc_hana'
      );
    }
  };

  const handleStartNewEpisode = async () => {
    setIsWebtoonModalOpen(false);
    await resetEpisode();
  };

  const speakerLabelForCut = (speaker: string) => {
    if (speaker === 'HANA') return isKo ? '하나' : 'HANA';
    if (speaker === 'JIHO') return isKo ? '지호' : 'JIHO';
    if (speaker === 'FAN') return isKo ? '매니저' : 'MANAGER';
    return isKo ? '내레이션' : 'NARRATOR';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none">
      {/* Main Modal Container — Warm Charcoal & Ivory Tone matching main screen */}
      <div className="w-full max-w-6xl h-[92vh] rounded-2xl bg-[#141210] border border-white/12 shadow-2xl flex flex-col overflow-hidden text-stone-100">
        {/* Top Modal Header */}
        <div className="px-5 py-3.5 bg-stone-950 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={handleReturnTo3DGame}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-amber-300/40 text-amber-200 text-xs font-bold transition cursor-pointer shadow-sm"
              title={isKo ? '원래 3D 게임 화면으로 돌아가기' : 'Return to 3D Backstage Game'}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{isKo ? '3D 대기실로 돌아가기' : 'Back to 3D Stage'}</span>
            </button>
            <div className="w-9 h-9 rounded-xl bg-stone-900 border border-amber-300/30 hidden sm:flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-stone-100">
                  {isKo
                    ? '개인화 웹툰 제1화 제작소 (테마 선택 후 초고화질 생성)'
                    : 'Episode 01 Personalized 2K Webtoon Studio (Select Theme & Generate)'}
                </h2>
                <span className="px-2 py-0.5 rounded bg-amber-300/15 border border-amber-300/40 text-amber-200 text-[10px] font-mono font-bold">
                  {isKo ? '초고화질 캔버스' : '2048px 2K CANVAS'}
                </span>
              </div>
              <p className="text-xs text-stone-400">
                {isKo
                  ? '원하는 네이버 웹툰 그림체 테마(10종)와 언어(국문/영문)를 먼저 선택한 뒤 웹툰을 생성하세요'
                  : 'First choose your preferred Naver Webtoon art style (10 themes) and language (EN/KO), then generate your 2K webtoon'}
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
                {isKo ? '영어' : 'EN'}
              </button>
              <button
                onClick={() => handleToggleLanguage('ko')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  lang === 'ko'
                    ? 'bg-amber-300 text-stone-950'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                {isKo ? '한국어' : 'KO'}
              </button>
            </div>

            {generatedEpisode && (
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
                    <span>{isKo ? '8컷 연출 명세' : '8-Cut Prompts'}</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={() => handleGenerateWithSelectedTheme()}
              disabled={generatingWebtoon || stitchingCanvas}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-300 hover:bg-amber-200 disabled:opacity-50 text-stone-950 text-xs font-bold shadow transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {stitched2KDataUrl
                  ? isKo
                    ? '선택 테마로 다시 생성'
                    : 'Generate with Selected Theme'
                  : isKo
                    ? '선택 테마로 웹툰 생성'
                    : 'Generate 2K Webtoon'}
              </span>
            </button>

            {stitched2KDataUrl && (
              <button
                onClick={handleDownload2KImage}
                disabled={!stitched2KDataUrl || stitchingCanvas}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 border border-amber-300/40 text-amber-200 text-xs font-bold shadow transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>
                  {isKo ? '초고화질 PNG 저장' : 'Download 2K PNG'}
                </span>
              </button>
            )}

            <button
              onClick={handleReturnTo3DGame}
              className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-white/10 text-stone-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body: Left Style Selector (10 Naver Webtoon Styles + Original 3D) | Right 2K Vertical Scroll Viewer */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left Sidebar: 10 Naver Webtoon Art Styles + Original 3D */}
          <div className="w-full lg:w-[340px] bg-stone-950/70 border-b lg:border-b-0 lg:border-r border-white/10 p-3.5 overflow-y-auto shrink-0 space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-stone-200">
                {isKo
                  ? '1단계 · 웹툰 그림체 테마 선택 (11종)'
                  : 'Step 1 · Select Webtoon Theme (11 Styles)'}
              </span>
              <span className="text-[10px] font-mono text-amber-300">
                {isKo ? '클릭하여 선택' : 'Click to select'}
              </span>
            </div>

            {/* Primary Generate CTA inside Left Sidebar after selecting a theme */}
            <button
              onClick={() => handleGenerateWithSelectedTheme()}
              disabled={generatingWebtoon || stitchingCanvas}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-300 via-amber-200 to-amber-300 hover:from-amber-200 hover:to-amber-100 disabled:opacity-50 text-stone-950 text-xs font-extrabold shadow-lg flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span className="truncate">
                {isKo
                  ? `✨ '${activePreset.nameKo}' 테마로 생성하기`
                  : `✨ Generate with '${activePreset.nameEn}'`}
              </span>
            </button>

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
                        ? 'bg-stone-800/95 border-amber-300/80 shadow-md ring-1 ring-amber-300/30'
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
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-300/20 text-amber-200 text-[9px] font-bold shrink-0">
                            <Check className="w-2.5 h-2.5" />
                            {isKo ? '선택됨' : 'Selected'}
                          </span>
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

          {/* Right Main Viewport: Theme Selector Launcher (before generation) OR 2K Stitched Vertical Webtoon Image */}
          <div className="flex-1 overflow-y-auto bg-[#0f0e0d] p-4 sm:p-6 flex flex-col items-center">
            {generatingWebtoon || stitchingCanvas ? (
              <div className="my-auto flex flex-col items-center gap-3 py-16 text-center">
                <RefreshCw className="w-8 h-8 text-amber-300 animate-spin" />
                <div className="text-sm font-bold text-stone-100">
                  {isKo
                    ? `'${activePreset.nameKo}' 그림체로 Gemini 이미지 생성 API가 새 웹툰 작화 및 대사를 실시간 생성 중...`
                    : `Generating real AI webtoon cut illustrations in '${activePreset.nameEn}' style via Gemini Image API...`}
                </div>
                <div className="text-xs text-stone-400">
                  {isKo
                    ? `${activePreset.refWorkKo} 작화 프롬프트로 컷별 새 일러스트 생성 및 플레이 기록 반영 중 (약 6~10초 소요)`
                    : `Generating new per-cut artwork with ${activePreset.refWorkEn} style prompts & verified story log (~6-10s)`}
                </div>
              </div>
            ) : !stitched2KDataUrl ? (
              /* Blank Webtoon Canvas with Big Centered "Generate Webtoon" Button */
              <div className="w-full max-w-[560px] min-h-[520px] my-auto rounded-2xl border-2 border-dashed border-amber-300/45 bg-gradient-to-b from-stone-900/95 via-stone-950/95 to-stone-900/95 shadow-2xl p-6 sm:p-10 flex flex-col items-center justify-center text-center gap-6 relative overflow-hidden">
                {/* Subtle blank webtoon panel guide lines */}
                <div className="pointer-events-none absolute inset-5 rounded-xl border border-white/5 flex flex-col justify-between opacity-35">
                  <div className="h-24 border-b border-dashed border-white/10" />
                  <div className="h-24 border-t border-dashed border-white/10" />
                </div>

                {/* Selected Style Badge */}
                <div className="relative z-10 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-300/15 border border-amber-300/40 text-amber-200 text-xs font-mono font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {isKo
                      ? '선택된 웹툰 스타일 · 빈 웹툰 캔버스'
                      : 'SELECTED WEBTOON STYLE · BLANK CANVAS'}
                  </span>
                </div>

                {/* Selected Style Thumbnail & Info */}
                <div className="relative z-10 flex flex-col items-center gap-3 max-w-md">
                  <img
                    src={activePreset.previewUrl}
                    alt={isKo ? activePreset.nameKo : activePreset.nameEn}
                    className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl object-cover border-2 border-amber-300/60 shadow-xl"
                  />
                  <div className="space-y-1">
                    <h3 className="text-lg sm:text-xl font-extrabold text-stone-100">
                      {isKo ? activePreset.nameKo : activePreset.nameEn}
                    </h3>
                    <div className="text-xs font-semibold text-amber-200/90">
                      {isKo ? activePreset.refWorkKo : activePreset.refWorkEn}
                    </div>
                    <p className="text-xs text-stone-300 leading-relaxed pt-1">
                      {isKo ? activePreset.descKo : activePreset.descEn}
                    </p>
                  </div>
                </div>

                {/* Huge Unmistakable Centered "Generate Webtoon" CTA Button */}
                <div className="relative z-10 w-full max-w-sm pt-1 flex flex-col items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleGenerateWithSelectedTheme()}
                    className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-300 via-amber-200 to-amber-300 hover:from-amber-200 hover:to-amber-100 text-stone-950 text-sm sm:text-base font-extrabold shadow-[0_0_35px_rgba(252,211,77,0.4)] hover:shadow-[0_0_45px_rgba(252,211,77,0.65)] hover:scale-[1.02] active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 cursor-pointer"
                  >
                    <Sparkles className="w-5 h-5 shrink-0" />
                    <span>
                      {isKo
                        ? `✨ 웹툰 생성하기 (${lang === 'ko' ? '국문' : '영문'})`
                        : `✨ Generate 2K Webtoon (${lang.toUpperCase()})`}
                    </span>
                  </button>
                  <span className="text-[11px] text-stone-400">
                    {isKo
                      ? '좌측 목록에서 다른 웹툰 그림체를 선택한 뒤 이 버튼을 눌러 실제 새 작화로 생성할 수 있습니다'
                      : 'Pick any style on the left, then click this button to generate new AI cut artwork in that style'}
                  </span>
                </div>
              </div>
            ) : showPromptDetails && generatedEpisode ? (
              <div className="w-full max-w-3xl space-y-3">
                <div className="p-4 rounded-xl bg-stone-900 border border-white/10">
                  <h3 className="text-sm font-bold text-amber-200">
                    {isKo
                      ? `Gemini 이미지 API 실시간 생성 컷별 작화 및 대사 명세 (${activePreset.nameKo})`
                      : `Gemini Image API Per-Cut Generated Artwork & Script (${activePreset.nameEn})`}
                  </h3>
                  <p className="text-xs text-stone-400 mt-1">
                    {generatedEpisode.authorComment}
                  </p>
                </div>
                {generatedEpisode.cuts.map((cut, idx) => (
                  <div
                    key={cut.cutNumber}
                    className="p-4 rounded-xl bg-stone-900/90 border border-white/10 flex gap-4 items-start"
                  >
                    <img
                      src={
                        cut.imageUrl ||
                        DISTINCT_CUT_URLS[idx % DISTINCT_CUT_URLS.length]
                      }
                      alt={isKo ? `제${cut.cutNumber}컷` : `Cut ${cut.cutNumber}`}
                      className="w-28 h-20 rounded-lg object-cover border border-white/15 shrink-0"
                    />
                    <div className="space-y-1 text-xs min-w-0 flex-1">
                      <div className="font-bold text-stone-100">
                        {isKo
                          ? `제${cut.cutNumber}컷 · ${cut.sceneTitle} (${cut.actLabel})`
                          : `CUT 0${cut.cutNumber} · ${cut.sceneTitle} (${cut.actLabel})`}
                      </div>
                      <div className="text-stone-300">{cut.narratorCaption}</div>
                      <div className="text-amber-200 font-medium">
                        {speakerLabelForCut(cut.speaker)}: &ldquo;{cut.dialogue}&rdquo;
                      </div>
                      <div className="text-[11px] text-stone-500 font-mono break-all pt-1">
                        {isKo
                          ? `효과음: ${cut.sfxText} (${cut.sfxSub}) · 속마음: ${cut.innerMonologue}`
                          : `Shot: ${cut.cameraShotId} · SFX: ${cut.sfxText} (${cut.sfxSub}) · Inner: ${cut.innerMonologue}`}
                      </div>
                      {cut.imagePrompt && (
                        <div className="text-[10px] text-amber-300/75 font-mono break-all pt-1">
                          Prompt: {cut.imagePrompt}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : stitched2KDataUrl ? (
              <div className="w-full max-w-[780px] flex flex-col items-center">
                <div className="w-full mb-3 px-4 py-2.5 rounded-xl bg-stone-900/90 border border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-300">
                  <span>
                    {isKo
                      ? `현재 테마: ${activePreset.nameKo} · 다른 테마를 선택한 뒤 [선택 테마로 다시 생성]을 누르면 새 그림체로 합성됩니다.`
                      : `Active Style: ${activePreset.nameEn} · Select any style on the left and click [Generate with Selected Theme] to switch.`}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setStitched2KDataUrl(null)}
                      className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 border border-amber-300/35 text-amber-200 text-[11px] font-bold cursor-pointer"
                    >
                      {isKo ? '테마 선택 화면으로' : 'Change Theme'}
                    </button>
                    <span className="font-mono text-amber-200 font-bold">
                      {worldState?.endingReached === 'SHOWTIME_SAVED'
                        ? isKo
                          ? '완전체 무대 결말'
                          : 'ENDING A: FULL STAGE'
                        : worldState?.endingReached === 'UNPLUGGED_ENCORE'
                          ? isKo
                            ? '어쿠스틱 무대 결말'
                            : 'ENDING B: ACOUSTIC STAGE'
                          : isKo
                            ? '실시간 제1화'
                            : 'LIVE EP.01'}
                    </span>
                  </div>
                </div>

                {/* Single Continuous Stitched 2K Webtoon Image */}
                <img
                  src={stitched2KDataUrl}
                  alt="FANVERSE Webtoon"
                  className="w-full h-auto rounded-2xl shadow-2xl border border-white/15 select-auto"
                />

                {/* Post-Webtoon Next Steps Card: Return to 3D Stage, Continue Alternative Route, or New Episode */}
                <div className="w-full mt-6 p-5 rounded-2xl bg-gradient-to-br from-stone-900 via-stone-900/95 to-stone-950 border border-amber-300/35 shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-amber-300 font-bold">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>
                          {isKo
                            ? '웹툰 감상 이후 스토리 이어하기'
                            : 'WHAT HAPPENS NEXT IN 3D BACKSTAGE?'}
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-stone-100 mt-1">
                        {isKo
                          ? '원래 3D 게임으로 돌아가 다른 선택지나 멀티 엔딩 루트를 이어서 플레이해보세요!'
                          : 'Return to the 3D Backstage to continue your story or unlock the alternate ending route!'}
                      </h3>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-amber-300/15 border border-amber-300/30 text-[11px] text-amber-200 font-mono shrink-0">
                      {worldState?.endingReached &&
                      worldState.endingReached !== 'NONE'
                        ? isKo
                          ? '멀티 엔딩 달성 완료 · 추가 루트 개방'
                          : 'ENDING UNLOCKED · BRANCH OPEN'
                        : isKo
                          ? '스토리 진행 중 · 이어하기 가능'
                          : 'LIVE STORY IN PROGRESS'}
                    </span>
                  </div>

                  <p className="text-xs text-stone-300 leading-relaxed">
                    {isKo
                      ? '현재까지의 대화와 호감도·신뢰도, 단서 상태가 3D 대기실에 그대로 보존되어 있습니다. 바로 3D 대기실로 복귀해 자유롭게 탐색하거나, 아직 경험하지 않은 다른 엔딩 루트(스타라이트 커스텀 마이크 복구 vs 언플러그드 어쿠스틱 라이브)로 이야기를 이어갈 수 있습니다.'
                      : 'Your current dialogue history, affinity/trust meters, and discovered clues are preserved in the 3D backstage. Jump right back into the 3D room, branch immediately into the alternate stage route (Starlight Mic Recovery vs. Unplugged Acoustic Encore), or start a fresh Episode 01 run.'}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    <button
                      onClick={handleReturnTo3DGame}
                      className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-300 hover:bg-amber-200 text-stone-950 text-xs font-bold shadow-md transition cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4 shrink-0" />
                      <span>
                        {isKo
                          ? '원래 3D 게임으로 돌아가기'
                          : 'Return to 3D Game (Keep Playing)'}
                      </span>
                    </button>

                    <button
                      onClick={handleContinueNextRouteIn3D}
                      className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-stone-800 hover:bg-stone-700 border border-amber-300/40 text-amber-200 text-xs font-bold transition cursor-pointer"
                    >
                      <Compass className="w-4 h-4 shrink-0 text-amber-300" />
                      <span>
                        {!worldState?.acousticBackupApproved
                          ? isKo
                            ? '언플러그드 기타 루트 이어하기'
                            : 'Continue: Unplugged Guitar Route'
                          : !worldState?.hanaHasMicrophone
                            ? isKo
                              ? '스타라이트 마이크 루트 이어하기'
                              : 'Continue: Starlight Mic Route'
                            : isKo
                              ? '3D 백스테이지 앙코르 대화 이어하기'
                              : 'Continue: Backstage Encore Chat'}
                      </span>
                    </button>

                    <button
                      onClick={handleStartNewEpisode}
                      className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 border border-white/15 text-stone-300 hover:text-white text-xs font-semibold transition cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {isKo
                          ? '새로운 제1화 처음부터 시작'
                          : 'Start Fresh Episode 01'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Persistent Bottom Footer inside Webtoon Modal so the user can always return or continue */}
        <div className="px-5 py-3 bg-stone-950 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-stone-400">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>
              {isKo
                ? '웹툰 생성 후에도 언제든 원래 3D 백스테이지로 돌아가 다음 행동과 다른 루트를 이어서 진행할 수 있습니다.'
                : 'You can return to the 3D Backstage anytime to continue your investigation or explore another ending route.'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleContinueNextRouteIn3D}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 border border-amber-300/35 text-amber-200 text-xs font-bold transition cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>
                {!worldState?.acousticBackupApproved
                  ? isKo
                    ? '다른 루트(어쿠스틱 무대)로 이어하기'
                    : 'Branch to Unplugged Route'
                  : !worldState?.hanaHasMicrophone
                    ? isKo
                      ? '다른 루트(스타라이트 마이크)로 이어하기'
                      : 'Branch to Starlight Mic Route'
                    : isKo
                      ? '백스테이지 에필로그 이어하기'
                      : 'Continue Backstage Epilogue'}
              </span>
            </button>
            <button
              onClick={handleReturnTo3DGame}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-amber-300 hover:bg-amber-200 text-stone-950 text-xs font-bold shadow transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>
                {isKo ? '원래 3D 게임으로 돌아가기' : 'Back to 3D Game'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

