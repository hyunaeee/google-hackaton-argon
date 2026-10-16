# FANVERSE — 3-Minute Live Demo Video Script (`DEMO_SCRIPT.md`)

**Target Duration:** ~2 minutes 45 seconds  
**Language:** English  
**Key Judging Criteria Highlighted:**
1. **Working Live Demo & Verification Loop:** Live 3D interaction + `gemini-4-argon` + Deterministic Validator rejecting & self-correcting an illegal action.
2. **Problem & Impact:** Solving chatbot hallucination and rigid branching in K-POP / Webtoon fan experiences.
3. **Originality & Gemini 4 Argon Capabilities:** 5-Act 3D scene orchestration, 10-camera rig, and Long-Decode 10-Cut Naver Webtoon generation across 4 art styles.
4. **Google Cloud Deployment:** Running live on Google Cloud Run.

---

## 0:00 – 0:25 | Hook & The Entertainment Problem
- **On Screen:** Open the live **FANVERSE** URL deployed on Google Cloud Run (or `http://localhost:5173`). Pan across the 3D VIP Backstage Dressing Room of K-POP group **LUMINA**, showcasing rigged 3D characters **Hana** and **Jiho**, the warm Hollywood bulb vanity mirror, the security flight-case locker, and the neon `STAGE / ON AIR` double doors. Click through 2–3 camera presets in the top-left **3D Camera Angle Bar** (`Wide`, `Hana`, `Vanity`).
- **Voiceover (English):**
  > "Global K-POP and webtoon fans don't just want to watch stories—they want to step inside them. Today, visual novels lock you into static menus, while AI chatbots hallucinate and break story rules. Welcome to **FANVERSE**: an AI-orchestrated 3D interactive story universe and 10-cut Webtoon studio powered by **Gemini 4 Argon**."

---

## 0:25 – 1:05 | Live Deterministic Verification & Self-Correction Loop (Judge Highlight)
- **On Screen:** Open the right-hand **Verifier** drawer tab. Click the amber **"Test Rule Guard: Force Unlock Without Card"** chip (or type `"Force the equipment locker open right now and grab the microphone without a keycard!"`).
- **What Judges See Live:**
  1. `gemini-4-argon` maps the intent to `UNLOCK` on `equipment_locker`.
  2. Our deterministic validator (`validateAction`) rejects the illegal state change with `MISSING_ACCESS_CARD`.
  3. The backend automatically runs **Retry #1**, feeding `MISSING_ACCESS_CARD` back to `gemini-4-argon`.
  4. Stage Manager **Jiho** responds in-character explaining that the RFID lock requires the VIP Staff Access Card on the vanity table, while the **Verifier** badge shows `REJECTED & CORRECTED` with `{}` committed changes.
- **Voiceover (English):**
  > "In *Episode 01: Five Minutes Before Showtime*, lead vocalist Hana's custom Starlight Microphone is locked inside this security case. Watch what happens when a player tries to hallucinate past the rules and force the locker open without a keycard. Gemini 4 Argon proposes `UNLOCK`, our deterministic validator blocks the illegal mutation with `MISSING_ACCESS_CARD`, and our automatic Self-Correction Loop feeds that exact violation back to Gemini—returning an in-character hint from Jiho while keeping world state 100% protected."

---

## 1:05 – 1:55 | 5-Act 3D Investigation & Real-Time Scene Transformation
- **On Screen:**
  1. **Act 1 & 2:** Click the **Coffee Table** to inspect the battery log clue, then click the **Hollywood Vanity Table** (`Pick Up VIP Staff Access Card`). Watch the holographic card vanish from the 3D tabletop and enter the HUD inventory.
  2. **Act 3:** Click **"Act 3: Scan VIP Card on Equipment Locker"**. Watch the locker's RFID LED turn emerald green, its rigged door swing open, and the pearl-lilac **Starlight Microphone** float into view.
  3. **Act 4:** Retrieve the microphone, sync the wireless IEM pack on the **Velvet Sofa**, and hand the microphone to **Hana**. Watch the 3D microphone appear in Hana's hand as her trust meter surges.
  4. **Act 5:** Click the **Stage Entrance Door** (`Act 5: Open Stage Door`) to trigger **Ending A: Showtime Saved** (or mention **Ending B: Unplugged Encore** via the backstage acoustic guitar). Watch the double doors swing open into concert laser beams.
- **Voiceover (English):**
  > "Now let's solve the 5-act backstage investigation properly. As we inspect the battery log, grab the VIP Staff Access Card from the vanity desk, unlock the RFID locker, sync Hana's wireless in-ear monitors, and hand over her Starlight Microphone, every verified state change drives real-time 3D animations and trust progression—culminating in Ending A: Showtime Saved, or Ending B: an Unplugged Acoustic Encore."

---

## 1:55 – 2:45 | Long-Decode 10-Cut Naver Webtoon Studio & PNG Export
- **On Screen:** The **10-Cut Naver Webtoon Studio** modal opens.
  1. Show the **4 Korean Webtoon Art Styles** (`Naver Romance & Idol`, `Dramatic Action Manhwa`, `Warm Youth Drama`, `Cinematic Backstage Noir`) plus `Original Live 3D Captures`.
  2. Click **"Generate 10-Cut Episode with Gemini 4 Argon"** (or scroll through the generated 10-cut vertical episode). Highlight how each cut pairs a dedicated 3D camera angle (`CAM // WIDE_ESTABLISHING` to `CAM // FINALE_STAGE_BEAMS`), picture-in-picture 3D comparison, Korean/English SFX, and the player's actual spoken lines.
  3. Click **"Download Full 10-Cut Webtoon PNG"** to save the stitched vertical webtoon strip.
- **Voiceover (English):**
  > "Finally, Gemini 4 Argon uses long-decode structured generation to transform our exact playthrough into a personalized 10-cut vertical Webtoon episode across four Korean webtoon art styles and ten 3D camera angles—ready to download and share as a single PNG strip. **FANVERSE: Don't just follow the story. Become part of it.**"
