# AURA System Report - v12.0 (Stable Beta)

**Date:** 2026-02-11
**Version:** 12.0
**Status:** Live (Production)

## 1. Executive Summary
AURA is an advanced AI Co-Pilot for Dentists, designed to automate WhatsApp interactions, qualify leads, and assist secretaries in closing treatments. The system has evolved into a **Multi-Page Application (MPA)** with a dedicated Landing Page and a secure System Application.

## 2. Architecture Overview
The project uses a **Vite + React** architecture with a clear separation of concerns:

-   **Landing Page (Marketing):**
    -   **URL:** `https://modern-aura.pages.dev/`
    -   **Entry:** `/index.html` -> `src/landing.jsx`
    -   **Tech:** React, Plain CSS (Premium Corporate Theme), LocalStorage Handoff.
    -   **Goal:** Capture leads and store them in `aura_pending_lead`.

-   **System App (Product):**
    -   **URL:** `https://modern-aura.pages.dev/app/`
    -   **Entry:** `/app/index.html` -> `src/main.jsx`
    -   **Tech:** React (SPA), Zustand (State), OpenAI API, WhatsApp-Web.js.
    -   **Security:** Token-based Auth (Local), Route Guards.

## 3. Technology Stack
-   **Frontend:** React 19, Vite 7.
-   **State Management:** Zustand (Lightweight, High Performance).
-   **Styling:** Native CSS Variables (Theming), Lucide React (Icons).
-   **AI Core:** OpenAI GPT-4 (via Custom Hooks `useChatAI`, `useKnowledgeLoop`).
-   **Integrations:**
    -   **WhatsApp:** `whatsapp-web.js` (Simulated/Socket).
    -   **CRM:** Internal Kanban board with Drag-and-Drop.

## 4. Key Features (v12.0)
### 4.1. Intelligent Sales (Co-Pilot)
-   **Knowledge Loop:** AI detects when it lacks information and flags it (`[KNOWLEDGE_GAP]`).
-   **Hybrid Corrections:** Users can edit AI suggestions before sending.
-   **Briefing Protocol:** Sales context is injected dynamically into prompts.

### 4.2. Visual Identity
-   **Theme:** Corporate Premium (White / Dark Grey / Gold).
-   **Design System:** "Apple-like" minimalism for the App, High-Conversion layout for Landing.

### 4.3. Infrastructure
-   **Deploy:** Cloudflare Pages.
-   **Routing:** Custom `_redirects` configuration for SPA/MPA hybrid support.
-   **Failsafe:** Client-side redirection ensures users don't get stuck on the wrong page.

## 5. Directory Structure
```
/
├── app/                  # System App Entry HTML
├── public/               # Static Assets & Redirect Rules
├── src/
│   ├── components/       # UI Components (Sidebar, Chat, CRM)
│   ├── hooks/            # Logic (AI, Audio, WhatsApp)
│   ├── pages/            # Landing Page Components
│   ├── services/         # API Layers (OpenAI, WhatsApp)
│   ├── store/            # Global State (Zustand)
│   ├── App.jsx           # System App Router/Layout
│   └── main.jsx          # System App Entry Point
├── vite.config.js        # Build Configuration (MPA)
└── package.json          # Dependencies & Scripts
```

## 6. Known Issues & Roadmap
-   **Routing:** Cloudflare occasional caching issues with `/app/` (Mitigated via Failsafe).
-   **Next Steps:**
    -   Implement Real Payment Gateway (Stripe/Hotmart).
    -   Supabase/Firebase Backend Integration (currently LocalStorage/Mock).
    -   Mobile App Wrapper (React Native or PWA).
