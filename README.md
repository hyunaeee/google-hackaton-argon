# FANVERSE — Your Story. Your Universe.

> **"Don't just follow the story. Become part of it."**
>
> An AI-orchestrated 3D interactive K-POP story universe & 10-cut Naver Webtoon studio powered by **Gemini 4 Argon (`gemini-4-argon`)**, **Blender 3D / MCP**, **React Three Fiber**, and a **Deterministic World Verification & Self-Correction Loop**. Deployed on **Google Cloud Run**.
>
> 🌐 **Live Google Cloud Run Demo:** [https://fanverse-dj3pyhgn3q-du.a.run.app](https://fanverse-dj3pyhgn3q-du.a.run.app)
> 📦 **Public GitHub Repository:** [https://github.com/hyunaeee/google-hackaton-argon](https://github.com/hyunaeee/google-hackaton-argon)

---

## 1. Overview & Problem Statement

Global K-POP fans, K-drama viewers, and webtoon readers want to step inside their favorite fictional universes. Yet current formats trap users between **static branching menus** (no freedom) and **unbounded LLM chatbots** (which hallucinate, ignore object preconditions, and lack a physical 3D world).

**FANVERSE** solves this by combining:
1. **A 5-Act Interactive 3D K-POP Backstage World** (`backstage_room.glb` rendered in React Three Fiber with 10 cinematic camera presets and interactive `RIG_<name>` pivots).
2. **Gemini 4 Argon Story Director (`gemini-4-argon`)** using the `@google/genai` Interactions API (`ai.interactions.create`) with strict JSON Schema output, adaptive `thinking_level` (`low` → `medium`), and `previous_interaction_id` chaining.
3. **A Deterministic Verification & 2-Step Self-Correction Loop** (`validateAction()`) that blocks illegal state mutations and feeds exact rule violations back to `gemini-4-argon` so characters respond in-world without corrupting canonical state.
4. **A Long-Decode 10-Cut Naver Webtoon Generator** (`thinking_level: 'medium'`, `max_output_tokens: 16384`) that transforms the player's verified playthrough and exact quotes into a downloadable vertical-scroll comic strip across **4 Korean Webtoon art styles** + **10-angle live 3D camera captures**.

---

## 2. Playable Episode: *Episode 01 — Five Minutes Before Showtime*

- **Setting:** VIP Backstage Dressing Room at the comeback concert of **LUMINA** (fictional K-POP girl group).
- **The Crisis (`05:00` to `00:00 — ON AIR`):** Five minutes before opening cue, lead vocalist **Hana**’s custom pearl-lilac Starlight wireless microphone is locked away after an emergency battery check.
- **5-Act Interactive Investigation & Two Canon Endings:**
  - **Act 1 — Backstage Briefing & Clue Log:** Speak with **Hana** (`npc_hana`) and Stage Manager **Jiho** (`npc_jiho`), and inspect the battery inspection cue sheet on the **Coffee Table** (`coffee_table`).
  - **Act 2 — Vanity Search & VIP Access Card:** Inspect the **Hollywood Bulb Mirror** (`vanity_mirror`) and **Vanity Table** (`vanity_table`) to discover and collect the holographic **VIP Staff Access Card** (`access_card`).
  - **Act 3 — Locker Breach or Acoustic Pivot:** Scan the VIP Access Card on the **Equipment Locker** (`equipment_locker`) to unlock its door and recover the **Custom Starlight Microphone** (`microphone`), OR tune the **Acoustic Guitar** (`acoustic_guitar`) in the lounge corner.
  - **Act 4 — Wireless IEM Sync & Handoff:** Sync the 648.55 MHz in-ear monitor pack on the **Velvet Lounge Sofa** (`lounge_sofa`) and hand the microphone to **Hana** (or approve the unplugged arrangement with **Jiho**).
  - **Act 5 — Grand Finale (`stage_door`):**
    - **Ending A (`SHOWTIME_SAVED`):** Hana takes the stage with her recovered Starlight Microphone under magenta/cyan concert lasers.
    - **Ending B (`UNPLUGGED_ENCORE`):** LUMINA performs an intimate, golden-lit acoustic encore with the tuned backstage guitar.

---

## 3. Architecture: Gemini 4 Argon + Deterministic Verification & Correction Loop

```text
Player Input (3D Object Click, Voice Input, or Free-Form Text)
   │
   ▼
Gemini 4 Argon Story Director (`gemini-4-argon` via `@google/genai` Interactions API)
   │  • 1st Pass: `thinking_level: 'low'` for snappy interactive gameplay
   │  • Proposes structured JSON (`AIActionProposalSchema`):
   │    { actionType, targetId, proposedStateChanges, speaker, npcResponse, narration, requestedEnding }
   ▼
Deterministic World Validator (`validateAction()`)
   │  Enforces canonical preconditions & blocks side-channel mutations:
   │  • Cannot UNLOCK `equipment_locker` without `access_card` (`MISSING_ACCESS_CARD`)
   │  • Cannot PICK_UP `microphone` while `lockerUnlocked === false` (`MICROPHONE_INACCESSIBLE_LOCKER_LOCKED`)
   │  • Cannot HAND_OVER `microphone` without holding it (`MISSING_MICROPHONE_TO_HAND_OVER`)
   │  • Cannot ENTER_STAGE (`stage_door`) before resolving the crisis (`CRISIS_UNRESOLVED_CANNOT_ENTER_STAGE`)
   ├──► [VALID] ──► Commit State Changes ──► Trigger 3D Scene Animation, Audio SFX & Act Progression
   │
   └──► [INVALID] ──► Automatic Self-Correction Loop (Up to 2 Retries)
                       │  • Escalates `thinking_level: 'low' -> 'medium'`
                       │  • Chains `previous_interaction_id` for stateful multi-turn reasoning
                       │  • Feeds exact deterministic rejection codes back to `gemini-4-argon`
                       ▼
                     Grounded In-Character Explanation Returned (Authoritative WorldState Unchanged)
```

Judges can inspect every proposal, rule evaluation, `thinking_level` escalation, `previous_interaction_id` chain, and an interactive **5-Step Architecture & Pipeline Walkthrough** live in the right-hand **Verifier (Verification Inspector)** drawer.

---

## 4. Local Setup & Verification

### Prerequisites
- **Node.js** `>= 20.x`
- **Google Gemini API Key** with access to `gemini-4-argon`

### 1) Install Dependencies
```bash
npm install
```

### 2) Configure Environment Variables
```bash
cp .env.example .env
```
Set your API key in `.env`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-4-argon
PORT=3001
```

### 3) Run in Development Mode
```bash
npm run dev
```
- **Frontend (Vite + React Three Fiber):** `http://localhost:5173`
- **Backend (Express + Gemini 4 Argon Engine):** `http://localhost:3001`

### 4) Run Automated Verification & Self-Correction Loop Tests
```bash
npm test
```
Executes all 8 Vitest unit and integration tests in `tests/verificationLoop.test.ts` covering precondition rejections, valid state progressions, both canon endings, 2-step retry self-correction, malformed JSON safety, and recoverable API error handling.

---

## 5. Deploying to Google Cloud Run

FANVERSE includes a production multi-stage `Dockerfile` and `deploy-cloudrun.sh` that builds the React Three Fiber client into `dist/client` and serves both the 3D web app and `/api/*` story engine from a single Cloud Run container on port `8080`.

### One-Command Cloud Run Deploy
```bash
chmod +x deploy-cloudrun.sh
./deploy-cloudrun.sh
```
Or directly via `gcloud`:
```bash
gcloud run deploy fanverse \
  --source . \
  --region asia-northeast3 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --set-env-vars "GEMINI_API_KEY=${GEMINI_API_KEY},GEMINI_MODEL=gemini-4-argon"
```

---

## 6. Repository Structure

```text
├── Dockerfile                            # Production container for Google Cloud Run
├── deploy-cloudrun.sh                    # One-command Google Cloud Run deploy script
├── PROJECT_DESCRIPTION.md                # English Hackathon Project Description
├── DEMO_SCRIPT.md                        # 3-Minute English Pitch & Live Demo Script
├── assets/
│   ├── build_backstage_scene.py          # Blender 3D scene generator & GLB exporter
│   ├── models/backstage_room.glb         # Exported 3D backstage dressing room & characters
│   └── references/                       # Concept reference sheets
├── client/
│   ├── public/
│   │   ├── models/backstage_room.glb     # Runtime 3D scene asset
│   │   └── webtoon/                      # 4 Korean Naver Webtoon style reference sheets
│   └── src/
│       ├── components/
│       │   ├── VerificationInspector.tsx # Real-time judge verification & retry trace inspector
│       │   └── WebtoonModal.tsx          # 10-Cut Naver Webtoon studio, style switcher & PNG exporter
│       ├── scenes/
│       │   └── BackstageScene.tsx        # React Three Fiber 3D scene, 10-camera rig & animations
│       ├── store/
│       │   └── useGameStore.ts           # Zustand store & 10-angle WebGL screenshot capture
│       ├── utils/
│       │   └── soundEngine.ts            # Web Audio SFX synthesizer & Web Speech TTS/Voice engine
│       └── App.tsx                       # Main 5-Act interactive console & HUD
├── server/
│   └── src/
│       ├── agents/storyAgent.ts          # Gemini 4 Argon Story Director, 2-retry loop & 10-cut webtoon generator
│       ├── validators/validateAction.ts  # Deterministic canonical world rule validator
│       ├── world/canonicalFacts.ts       # Immutable lore, props, and initial world state
│       └── index.ts                      # Express API + Cloud Run static SPA server
├── shared/
│   └── types.ts                          # Shared Zod schemas & TypeScript contracts
└── tests/
    └── verificationLoop.test.ts          # 8 automated tests for validation, correction & resilience
```
