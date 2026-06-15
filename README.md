# Interactive 3D Digestive System Simulation

An interactive 3D web-based anatomy learning application designed for Class 10 Biology education. This simulation features a real-time interactive Three.js 3D viewport, comprehensive Class 10 biology curriculum alignment, real-time Tamil localization, and interactive gamified assessments.

## Core Features

* **Real-time 3D Viewport**: Full interaction (orbit, pan, zoom) with a detailed human digestive tract model powered by Three.js, OrbitControls, and GLTFLoader. Click to isolate or focus camera views on specific organs.
* **Dual-Language Narration System**: An integrated hybrid audio narration engine supporting both English and Tamil. The player prioritizes local high-quality audio files (.wav for English, .mp3 for Tamil) before falling back to browser-level speech synthesis or translation proxies.
* **Bi-directional Tamil Localization**: Instantly translates all UI components, sidebar text, quiz questions, interactive labels, and narration between English and Tamil (Class 10 Biology Tamil Nadu State Board Curriculum standards).
* **Interactive Anatomy Quiz**: Real-time evaluation of structural recall with target selection validators, question counters, score tracking feeds, and dynamic scorecard summaries.
* **Spatial Labeling Game**: Interactive anatomy labeling drag-and-drop gameplay, featuring precise bounding box collision detection and snapping logic.
* **X-Ray / Transparency View**: Toggle opacity layers on overlapping structural meshes (such as Liver and Stomach) to observe interior gastrointestinal structures.

---

## Tamil Curriculum Localization Matrix

All translations conform strictly to the Class 10 Biology curriculum standards:

| English Organ | Tamil Translation | Description / Facts (தமிழ் விளக்கம்) |
| :--- | :--- | :--- |
| **Digestive System** | செரிமான மண்டலம் | - |
| **Esophagus / Food Pipe** | உணவுப் பாதை / உமிழ்நீர் உறிஞ்சி | தொண்டையிலிருந்து உணவை அலைவியக்கத்தின் மூலம் இரைப்பைக்கு நகர்த்துகிறது. |
| **Stomach** | இரைப்பை | தசைச்சுவர் உணவைக் கடைந்து கூழாக்குகிறது. புரதங்களைச் செரிக்க ஹைட்ரோகுளோரிக் அமிலம், பெப்சின், மற்றும் கோழை கொண்ட இரைப்பைச் சாற்றைச் சுரக்கிறது. |
| **Liver** | கல்லீரல் | மிகப்பெரிய சுரப்பி. கொழுப்பைச் செரிக்க பித்தநீரைச் சுரக்கிறது. |
| **Gallbladder** | பித்தப்பை | பித்தநீரைத் தற்காலிகமாகச் சேமித்து வைக்கிறது. |
| **Pancreas** | கணையம் | கார்போஹைட்ரேட்டுகள், புரதங்கள் மற்றும் கொழுப்புகளை முழுமையாகச் செரிப்பதற்கான என்சைம்கள் கொண்ட கணையச் சாற்றைச் சுரக்கிறது. |
| **Small Intestine** | சிறுகுடல் | உணவு முழுமையாகச் செரிக்கும் இடம். குடலுறிஞ்சிகள் இரத்தத்தில் ஊட்டச்சத்துக்கள் அதிகபட்சமாக உறிஞ்சப்படுவதற்கான மேற்பரப்பை அதிகரிக்கின்றன. |
| **Large Intestine** | பெருங்குடல் | செரிக்காத உணவிலிருந்து அதிகப்படியான நீரையும் தாதுக்களையும் உறிஞ்சி, திடக்கழிவை உருவாக்குகிறது. |

---

## Architecture of the Audio Player

The Tamil and English narration system is built with a five-layer fallback pipeline to ensure cross-device compatibility and quality:

1. **Local Assets**: Resolves static audio files from the `/assets/audio` directory (e.g. `./assets/audio/stomach_ta.mp3` or `./assets/audio/liver.wav`).
2. **Native Speech Synthesis**: Detects local speech synthesis voice profiles in the client browser, selecting native Tamil/Indian English female voices.
3. **Google Translate TTS Engine**: Dynamically queries Google's translation TTS engine over the network to generate human-like female pronunciations.
4. **ResponsiveVoice API**: Interfaces with cloud-based ResponsiveVoice SDK using the 'Tamil Female' voice map.
5. **Phonetic Speech Synthesis**: Fallback translation utilizing Romanized phonetic transcripts read through native Indian English voices.

---

## Technology Stack

- **Graphics & Rendering**: Three.js, OrbitControls, GLTFLoader.
- **Audio System**: HTML5 Web Audio API, Web Speech Synthesis API.
- **Styling & Layout**: CSS Grid, Flexbox, Glassmorphic effects, CSS Transitions.
- **Local Dev Server**: Node.js HTTP custom server module.
- **Headless Edge CDP E2E Testing**: Node.js spawn wrapper driving Edge DevTools remote debugging protocol (Remote Debugger CDP).

---

## Installation & Running Locally

Follow these steps to serve the simulation locally and bypass browser CORS restrictions:

1. Ensure Node.js is installed on your system.
2. Clone this repository and navigate to the project directory.
3. Start the custom web server:
   ```bash
   node dev-server.mjs
   ```
4. Open the link displayed in your terminal (usually `http://127.0.0.1:5173/`) in Google Chrome or Microsoft Edge.

---

## Running Automated End-to-End Tests

The repository contains an automated Edge remote-debugging script verifying layout viewport responsiveness, labeling game drag snapping, quiz scorecards, and language states:

```bash
node verify-render.mjs http://127.0.0.1:5173/
```

---

*Made with ❤️ for premium interactive educational experiences.*
