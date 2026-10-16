# FANVERSE — Project Description (Hackathon Submission)

## Title
**FANVERSE — Your Story. Your Universe.**  
*Episode 01: Five Minutes Before Showtime (Track 1: Gemini 4 Argon in Entertainment)*

## Tagline
**"Don't just follow the story. Become part of it."**

## Live Google Cloud Run Deployment
- **Production URL (Seoul `asia-northeast3`):** [https://fanverse-dj3pyhgn3q-du.a.run.app](https://fanverse-dj3pyhgn3q-du.a.run.app)
- **Health & Model Verification Endpoint:** [https://fanverse-dj3pyhgn3q-du.a.run.app/api/health](https://fanverse-dj3pyhgn3q-du.a.run.app/api/health)

---

## 1. Problem & Impact (Why FANVERSE Matters)
Seoul and Korea lead global entertainment across K-POP, K-dramas, and Naver Webtoons. Millions of fans want to step inside their favorite fictional universes, yet existing experiences force a broken trade-off:
1. **Rigid branching visual novels**, where fans can only click predetermined menu options with zero creative agency.
2. **Unbounded AI character chatbots**, which lack a physical 3D world and constantly hallucinate—allowing impossible actions (such as unlocking an RFID equipment locker without a keycard or starting a concert before resolving a backstage crisis) that destroy narrative canon.

**FANVERSE** solves this by uniting **free-form Gemini 4 Argon reasoning**, an **authoritative 3D interactive backstage environment**, a **Deterministic World Verification & Self-Correction Loop**, and a **Long-Decode 10-Cut Naver Webtoon Episode Generator** into a single web platform ready for K-POP labels, webtoon studios, and global fandoms.

---

## 2. Our Solution & Key Features

### A. 5-Act Interactive 3D K-POP Backstage World
Players step into the VIP dressing room of fictional K-POP girl group **LUMINA** at the Starlight Arena five minutes before their comeback stage (`05:00` countdown). Lead vocalist **Hana**’s custom pearl-lilac Starlight wireless microphone has vanished:
- **Act 1 (Backstage Crisis & Clue Discovery):** Talk to **Hana** (`npc_hana`) and Stage Manager **Jiho** (`npc_jiho`), and inspect the battery inspection cue sheet on the glass **Coffee Table** (`coffee_table`).
- **Act 2 (Vanity Search & Keycard Acquisition):** Inspect the warm-lit **Hollywood Bulb Mirror** (`vanity_mirror`) and **Vanity Table** (`vanity_table`) to discover and collect the holographic **VIP Staff Access Card** (`access_card`).
- **Act 3 (RFID Locker Breach or Acoustic Pivot):** Scan the VIP Access Card on the **Equipment Locker** (`equipment_locker`) to unlock its pivoted door (`RIG_equipment_locker_door`) and recover the **Custom Starlight Microphone** (`microphone`), OR tune the backstage **Acoustic Guitar** (`acoustic_guitar`) to prepare an unplugged stage.
- **Act 4 (Wireless IEM Sync & Trust Handoff):** Calibrate the 648.55 MHz wireless in-ear monitor pack on the **Velvet Lounge Sofa** (`lounge_sofa`) and hand the Starlight Microphone to **Hana** (or finalize the acoustic backup plan with **Jiho**).
- **Act 5 (Two Canon Stage Endings):** Open the double-leaf **Stage Entrance Door** (`RIG_stage_door_L` / `RIG_stage_door_R`) to trigger either **Ending A: Showtime Saved** (full concert laser beams & synth fanfare) or **Ending B: Unplugged Encore** (golden spotlight acoustic performance).

### B. Gemini 4 Argon Story Director + Deterministic Verification & Correction Loop
- **Structured World Orchestration (`gemini-4-argon`):** Uses `@google/genai` (`ai.interactions.create`) with strict JSON Schema output (`AIActionProposalSchema`) to translate free-form player dialogue and 3D interactions into discrete, verifiable actions (`INSPECT`, `TALK`, `PICK_UP`, `UNLOCK`, `HAND_OVER`, `SYNC_IEM`, `TUNE_GUITAR`, `PROPOSE_BACKUP`, `ENTER_STAGE`, `NO_OP`).
- **Deterministic Rule Validator (`validateAction`):** Every proposal from `gemini-4-argon` is verified against canonical world preconditions before any state mutation occurs.
- **2-Step Automatic Self-Correction Loop:** If Gemini proposes an invalid action (e.g., unlocking `equipment_locker` without `access_card`, grabbing `microphone` while locked, or opening `stage_door` before resolving the crisis), the validator blocks the state mutation and feeds the exact rejection code (`MISSING_ACCESS_CARD`, `MICROPHONE_INACCESSIBLE_LOCKER_LOCKED`, `CRISIS_UNRESOLVED_CANNOT_ENTER_STAGE`) back into `gemini-4-argon` (up to 2 automatic retries) to generate an in-character explanation while keeping `WorldState` 100% uncorrupted.
- **Live Verification Inspector:** Judges can inspect every AI proposal, deterministic rule check, retry payload, and committed state diff in real time via the built-in **Verifier** drawer.

### C. Multimodal Orchestration: 10-Cut Naver Webtoon Generator + 10-Camera 3D Rig + Adaptive Audio
- **Long-Decode 10-Cut Webtoon Storyboard (`generateFullWebtoonEpisode`):** In a single structured long-decode call, `gemini-4-argon` synthesizes the player's entire verified playthrough log, trust scores, and exact spoken quotes into a **10-cut vertical-scroll Naver Webtoon episode** complete with act headers, camera shot directives, SFX typography, narrator captions, character speech bubbles, and inner monologues.
- **4 Signature Korean Webtoon Art Styles + Live 3D Multi-Camera Captures:** Players can switch between **Naver Romance & Idol**, **Dramatic Action Manhwa**, **Warm Youth & Acoustic Drama**, **Cinematic Backstage Noir**, or **Original Live 3D WebGL Captures** powered by 10 dedicated 3D camera rig presets (`CAMERA_RIG_PRESETS`), with one-click full-episode PNG export.
- **Adaptive K-POP Soundscape & Voice:** Real-time Web Audio synthesis for RFID scans, 648.55 MHz IEM sync tones, 6-string acoustic guitar strums, and ending concert fanfares, paired with Web Speech character TTS and microphone voice input.

---

## 3. Why Only Gemini 4 Argon Makes FANVERSE Possible
1. **Unified Context & State-Grounded Reasoning:** Simultaneously holds canonical lore, 14-object 3D spatial state, multi-turn history, relationship trust metrics, and deterministic validator feedback without losing character voice.
2. **Low-Latency Structured Self-Correction:** Rapidly executes schema-constrained proposal + deterministic verification + retry correction within interactive game loop budgets.
3. **Long-Decode Multimodal Storyboarding:** Generates a cohesive 10-cut comic script with camera rig bindings (`WIDE_ESTABLISHING` through `FINALE_STAGE_BEAMS`) and bilingual webtoon typography in a single pass.
4. **High-Craft 3D & Character Pipeline:** Built with Blender Python/MCP (`RIG_<name>` interactive pivot rigs, PBR materials, and rigged 3D characters for Hana and Jiho) exported to `backstage_room.glb` for 60 FPS React Three Fiber rendering and deployed on **Google Cloud Run**.
