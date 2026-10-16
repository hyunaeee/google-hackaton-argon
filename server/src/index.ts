import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import {
  CANONICAL_WORLD_FACTS,
  createInitialWorldState,
} from './world/canonicalFacts.js';
import {
  executeStoryTurn,
  generateFullWebtoonEpisode,
  StoryAgentError,
} from './agents/storyAgent.js';
import { WEBTOON_STYLE_IDS, WorldState } from '../../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '5mb' }));

  const sessionStates = new Map<string, WorldState>();
  sessionStates.set('default', createInitialWorldState());

  const getSessionId = (req: express.Request): string => {
    const headerId = req.headers['x-session-id'];
    if (typeof headerId === 'string' && headerId.trim().length > 0) {
      return headerId.trim().slice(0, 64);
    }
    return 'default';
  };

  const getRequestLang = (
    req: express.Request,
    bodyLang?: 'en' | 'ko'
  ): 'en' | 'ko' => {
    if (bodyLang === 'ko' || bodyLang === 'en') {
      return bodyLang;
    }
    const queryLang = req.query?.lang;
    if (queryLang === 'ko' || queryLang === 'en') {
      return queryLang;
    }
    const headerLang = req.headers['x-lang'];
    if (headerLang === 'ko') {
      return 'ko';
    }
    return 'en';
  };

  const localizeInitialStateTurn = (
    state: WorldState,
    lang: 'en' | 'ko'
  ): WorldState => {
    const template = createInitialWorldState(lang);
    state.episodeTitle = template.episodeTitle;
    if (state.history.length > 0 && state.history[0].id === 'evt-init-0') {
      state.history[0] = {
        ...state.history[0],
        playerInput: template.history[0].playerInput,
        npcResponse: template.history[0].npcResponse,
        narration: template.history[0].narration,
      };
    }
    return state;
  };

  const getWorldState = (
    req: express.Request,
    langOverride?: 'en' | 'ko'
  ): WorldState => {
    const sid = getSessionId(req);
    const lang = getRequestLang(req, langOverride);
    let state = sessionStates.get(sid);
    if (!state) {
      state = createInitialWorldState(lang);
      sessionStates.set(sid, state);
    } else {
      localizeInitialStateTurn(state, lang);
    }
    return state;
  };

  const setWorldState = (req: express.Request, nextState: WorldState): void => {
    const sid = getSessionId(req);
    sessionStates.set(sid, nextState);
  };

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'fanverse-story-engine',
      model: process.env.GEMINI_MODEL || 'gemini-4-argon',
      apiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  app.get('/api/state', (req, res) => {
    res.json({
      ok: true,
      worldState: getWorldState(req),
      canonicalFacts: CANONICAL_WORLD_FACTS,
    });
  });

  app.post('/api/reset', (req, res) => {
    const bodyLang =
      req.body && (req.body.lang === 'ko' || req.body.lang === 'en')
        ? req.body.lang
        : undefined;
    const lang = getRequestLang(req, bodyLang);
    const freshState = createInitialWorldState(lang);
    setWorldState(req, freshState);
    res.json({
      ok: true,
      worldState: freshState,
    });
  });

  const ActionRequestSchema = z.object({
    playerInput: z.string().trim().min(1).max(600),
    targetHint: z.string().optional(),
    lang: z.enum(['en', 'ko']).optional(),
  });

  const WebtoonGenerateSchema = z.object({
    styleId: z.enum(WEBTOON_STYLE_IDS).default('NAVER_ROMANCE_IDOL'),
    lang: z.enum(['en', 'ko']).optional(),
  });

  app.post('/api/webtoon/generate', async (req, res) => {
    const parsed = WebtoonGenerateSchema.safeParse(req.body || {});
    const styleId = parsed.success
      ? parsed.data.styleId
      : 'NAVER_ROMANCE_IDOL';
    const lang = getRequestLang(req, parsed.success ? parsed.data.lang : undefined);
    const currentState = getWorldState(req, lang);

    try {
      const episode = await generateFullWebtoonEpisode(
        currentState,
        styleId,
        lang
      );
      res.json({
        ok: true,
        episode,
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : lang === 'ko'
            ? '웹툰 단행본 생성에 실패했습니다.'
            : 'Failed to generate webtoon episode';
      res.status(500).json({
        ok: false,
        message,
      });
    }
  });

  app.post('/api/action', async (req, res) => {
    const parsed = ActionRequestSchema.safeParse(req.body);
    const lang = getRequestLang(
      req,
      parsed.success ? parsed.data.lang : undefined
    );
    const currentState = getWorldState(req, lang);
    if (!parsed.success) {
      res.status(400).json({
        ok: false,
        errorCode: 'INVALID_INPUT',
        recoverable: true,
        message:
          lang === 'ko'
            ? '올바른 행동이나 대사를 입력해 주세요.'
            : 'Please enter a valid action or dialogue message.',
        worldState: currentState,
      });
      return;
    }

    try {
      const outcome = await executeStoryTurn(
        currentState,
        parsed.data.playerInput,
        {
          targetHint: parsed.data.targetHint,
          lang,
        }
      );

      setWorldState(req, outcome.worldState);
      res.json(outcome);
    } catch (err) {
      if (err instanceof StoryAgentError) {
        res.status(502).json({
          ok: false,
          errorCode: err.code,
          recoverable: err.recoverable,
          message: err.message,
          worldState: currentState,
        });
        return;
      }

      const message =
        err instanceof Error
          ? err.message
          : lang === 'ko'
            ? '예기치 않은 서버 오류가 발생했습니다.'
            : 'Unexpected server error';
      res.status(500).json({
        ok: false,
        errorCode: 'INTERNAL_ERROR',
        recoverable: true,
        message,
        worldState: currentState,
      });
    }
  });

  // Serve built Vite client (`dist/client`) in production / Google Cloud Run
  const clientDistPath = path.resolve(__dirname, '../../dist/client');
  const clientIndexHtml = path.join(clientDistPath, 'index.html');
  if (fs.existsSync(clientIndexHtml)) {
    app.use(express.static(clientDistPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        next();
        return;
      }
      res.sendFile(clientIndexHtml);
    });
  }

  return app;
}

const isDirectRun =
  process.argv[1] && process.argv[1].endsWith('server/src/index.ts');

if (isDirectRun) {
  const port = Number(process.env.PORT || 3001);
  const app = createApp();
  app.listen(port, '0.0.0.0', () => {
    console.log(
      `[FANVERSE] Story Director Server running on http://0.0.0.0:${port} (model: ${process.env.GEMINI_MODEL || 'gemini-4-argon'})`
    );
  });
}
