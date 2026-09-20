# Errands App

A modern, full-stack errand management and coordination platform designed to streamline task delegation, location tracking, and real-time updates.

---

## Features

* **Real-time Task Tracking:** Monitor errand progress dynamically using Firebase Firestore and PostgreSQL.
* **Interactive Mapping:** Built-in spatial awareness and routing powered by Google Maps API and Leaflet.
* **Smart Analytics:** Visual dashboards for task metrics and status tracking rendered with Recharts.
* **Secure Authentication:** User signup, sign-in, and session handling backed by Firebase Auth.
* **AI Integration:** AI-assisted insights and automation powered by the Google GenAI (Gemini) SDK.

---

## Tech Stack

### Frontend
* **Core:** React 18, TypeScript
* **Build Tool:** Vite
* **Styling:** Tailwind CSS
* **Animations & Icons:** Framer Motion, Lucide React
* **Maps & Visualizations:** Google Maps API, Leaflet, Recharts

### Backend
* **Server Framework:** Express.js running on Node.js
* **Compilation:** `tsx` (Dev) / `esbuild` CommonJS (Production)
* **Database & Persistence:** Firebase Firestore + PostgreSQL / Supabase hybrid
* **Authentication:** Firebase Auth
* **AI:** Google GenAI SDK (`@google/genai` / Gemini API)

---

## Getting Started

### Prerequisites
* Node.js (v18 or higher)
* npm, yarn, or pnpm

### Installation

