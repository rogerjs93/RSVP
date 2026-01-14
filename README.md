# FastReader - RSVP Speed Reading PWA

A free, open-source Progressive Web App for speed reading using the RSVP (Rapid Serial Visual Presentation) technique. Read faster by displaying one word at a time with an optimal focal point.

![FastReader Screenshot](icons/icon-512.svg)

## Features

- **RSVP Speed Reading** - Words displayed one at a time with center focal point highlighting
- **Adjustable Speed** - 50-1500 WPM with real-time adjustment
- **Pause Profiles** - Three presets (Relaxed, Normal, Speed) with intelligent pauses at punctuation
- **PDF Support** - Extract and read text from PDF files with adaptive lazy-loading
- **Offline Support** - Full PWA with service worker caching - works offline
- **Cross-Platform** - Responsive design with touch gestures for mobile
- **Accessibility** - OpenDyslexic font option for users with dyslexia
- **Dark/Light Themes** - Eye-friendly themes for any lighting condition
- **Progress Tracking** - Word counter and progress bar
- **Recent Documents** - Quick access to previously read PDFs (cached in IndexedDB)

## Getting Started

### Online

Visit the hosted version at: `https://[your-username].github.io/fastreader/`

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/[your-username]/fastreader.git
   cd fastreader
   ```

2. Serve locally (any static server works):
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx serve
   
   # Using PHP
   php -S localhost:8000
   ```

3. Open `http://localhost:8000` in your browser

### Generate PWA Icons

1. Open `generate-icons.html` in a browser
2. Click the download links to save the PNG icons
3. Move the downloaded files to the `icons/` folder

## Usage

### Controls

| Control | Action |
|---------|--------|
| **Play/Pause** | Start or stop reading |
| **Reset** | Return to the beginning |
| **◀ / ▶** | Navigate word by word (when paused) |
| **Set Text** | Open modal to paste text or upload files |
| **WPM Slider** | Adjust reading speed |
| **Profile** | Select pause profile (Relaxed/Normal/Speed) |
| **Font** | Choose display font |
| **Loop** | Toggle continuous looping |
| **Theme** | Toggle dark/light mode |

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play/Pause |
| `←` / `→` | Navigate (when paused) |
| `R` | Reset to start |
| `T` | Toggle theme |
| `Escape` | Close modal |

### Touch Gestures (Mobile)

| Gesture | Action |
|---------|--------|
| **Tap** | Play/Pause |
| **Double-tap** | Reset |
| **Swipe left/right** | Navigate (when paused) |

## Pause Profiles

The app intelligently pauses longer at certain points for better comprehension:

| Profile | Sentence (. ! ?) | Comma (, ; :) | Paragraph | Long Words | Numbers |
|---------|------------------|---------------|-----------|------------|---------|
| **Relaxed** | 4.0x | 2.0x | 4.0x | 1.5x | 2.0x |
| **Normal** | 3.0x | 1.5x | 3.0x | 1.3x | 1.5x |
| **Speed** | 1.5x | 1.2x | 1.5x | 1.1x | 1.2x |

## PDF Loading

FastReader uses an adaptive lazy-loading system for PDFs:

- First page loads immediately
- Subsequent pages preload in the background
- Buffer size adjusts based on reading speed vs. loading time
- Extracted text is cached in IndexedDB for offline access

## Technical Stack

- **Vanilla JavaScript** - No frameworks, lightweight and fast
- **PDF.js** (Mozilla) - Apache 2.0 licensed PDF parser
- **Canvas API** - High-performance word rendering
- **IndexedDB** - Client-side document caching
- **Service Worker** - Offline support and caching
- **Web Fonts** - Self-hosted OpenDyslexic (SIL OFL)

## Browser Support

- Chrome/Edge 80+
- Firefox 75+
- Safari 13+
- Mobile browsers with PWA support

## Deployment

### GitHub Pages

1. Push to your GitHub repository
2. Go to Settings → Pages
3. Select "Deploy from a branch"
4. Choose `main` branch, `/ (root)` folder
5. Your app will be available at `https://[username].github.io/[repo-name]/`

### Other Hosting

Simply upload all files to any static hosting service:
- Netlify
- Vercel
- Cloudflare Pages
- Any web server

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

MIT License - see [LICENSE](LICENSE) file for details.

### Third-Party Licenses

- **PDF.js** - Apache 2.0 License (Mozilla)
- **OpenDyslexic** - SIL Open Font License

## Acknowledgments

- Inspired by traditional RSVP speed reading techniques
- PDF.js by Mozilla Foundation
- OpenDyslexic font by Abelardo Gonzalez
