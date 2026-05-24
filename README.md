# Tabre – Nepali Calendar & Converters New Tab Extension

**[Live Demo](https://tabre.netlify.app/)** | **[Chrome Web Store](https://chromewebstore.google.com/detail/tabre-nepali-calendar-new/aifbilibghomlchloeechmmoeiepgcbo)**

---

Transform your new tab into a powerful and aesthetically pleasing Nepali calendar dashboard. Tabre is an all-in-one Chrome extension that brings the Nepali date, time, tithi, and local events directly to your browser. Equipped with advanced date conversion tools, typing utilities, and an integrated task manager, Tabre keeps you organized and seamlessly connected to Nepali time.

---

## ✨ Key Features

### 📅 Calendar & Time Tracking

- **Live Nepali Date & Time:** Instantly view today’s date and time in Devanagari script, updated in real-time.
- **Interactive Full Calendar:** Browse the entire Nepali month seamlessly. The latest version features improved optimization and bug fixes for a smoother experience.
- **Enhanced Daily Details:** Click on any date to open a comprehensive modal displaying:
  - Sunrise and Sunset times
  - Nepal Samvat details
  - Panchanga and Tithi
  - Daily Events List
  - Auspicious Times & Muhurtas

### 🛠️ Utilities & Tools

- **Date Converter (AD ↔ BS):** Quickly and accurately convert dates between Bikram Sambat (BS) and Gregorian (AD).
- **Language & Typing Converters:**
  - Preeti to Nepali Unicode (and vice versa)
  - Smart Roman to Nepali Unicode converter featuring a custom keyboard interface.

### 🔔 Productivity & Task Management

- **Task Reminders:** Stay on top of your workflow with an integrated to-do list. Includes native browser push notifications and audio alerts so you never miss a beat—even if you are working in another tab.
- **Upcoming Events Tracker:** Create custom events. Tabre will automatically notify you when today's date matches your saved event.
- **Quick Restart:** Easily view recent reminders and restart them with a single click.

### 🎨 Customizable Aesthetic UI

- **Glassmorphism Design:** Experience a sleek, modern UI with our built-in glassmorphism effect. Prefer a classic look? Simply toggle it off in the settings menu.
- **Dynamic Backgrounds:** The dashboard background intelligently adapts to the current time of day (e.g., बिहान, मध्यान्ह). Beautiful, scenic wallpapers load instantly via optimized glob imports.

---

## 🔒 Privacy First

Your data belongs to you. Tabre is built with strict privacy standards:

- **100% Offline Capability:** All features, including notifications and background images, work entirely locally on your device.
- **Zero Tracking:** No data collection, tracking, telemetry, or third-party scripts.

---

## 🚀 Installation

### Option 1: Install via Chrome Web Store (Recommended)

1. Visit the [Tabre Extension Page](https://chromewebstore.google.com/detail/tabre-nepali-calendar-new/aifbilibghomlchloeechmmoeiepgcbo).
2. Click **Add to Chrome**.

### Option 2: Manual Installation

1. Clone or download this repository to your local machine.
2. Open your browser and navigate to `chrome://extensions/`.
3. Toggle **Developer Mode** on (usually located in the top right corner).
4. Click **Load unpacked** and select the project folder (or the `dist` folder if you have built it from source).

---

## 💻 Development Guide

Tabre is built for speed and simplicity using [Vite 6](https://vitejs.dev/), Vanilla JavaScript, HTML, and CSS. Our developer workflow is fully automated to compile calendar data on the fly.

### Getting Started

```bash
# 1. Install project dependencies
pnpm install

# 2. Start the local development server
# Note: This concurrently runs Vite and uses nodemon to watch/rebuild calendar JSON data
pnpm dev

# 3. Build the extension for production
# This runs the pre-build calendar compilation and Vite build
pnpm build
```
