# Hermes

<div align="center">
  <img src="./resources/icon.png" alt="Hermes Logo" width="200">
  <br>
  <h3>Modern Electron-based Application Launcher with Custom UI</h3>

  ![Version](https://img.shields.io/badge/version-0.1.0-blue)
  ![License](https://img.shields.io/badge/license-MIT-green)
  ![Electron](https://img.shields.io/badge/electron-35.1.5-teal)
  ![Platform](https://img.shields.io/badge/platform-Windows%20|%20macOS%20|%20Linux-lightgrey)
</div>

## 📋 Overview

Hermes is a versatile Electron-based application launcher that provides a customizable interface with configurable quick links, appearance settings, and Chrome integration. The app features a sleek modern UI built with React, TypeScript, and Tailwind CSS.

## ✨ Features

- **Custom Quick Links**: Create and manage buttons with custom images, labels, and URLs
- **Configurable Appearance**: Customize background images and window dimensions
- **Chrome Integration**: Launch URLs in Chrome with custom flags and arguments
- **Auto-Updates**: Built-in update system that automatically checks for and installs new versions
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **Fullscreen Mode**: Option to run in fullscreen or windowed mode
- **Config Hotkey**: Quick access to configuration with keyboard shortcut (Ctrl/Cmd + I)

## 📷 Screenshots

<div align="center">
  <i>Main interface with quick links (placeholder image)</i>
  <br><br>
  <img src="https://via.placeholder.com/800x450.png?text=Hermes+Main+Interface" alt="Main Interface Screenshot" width="800">
  <br><br>
  <i>Configuration page</i>
  <br><br>
  <img src="https://via.placeholder.com/800x450.png?text=Hermes+Configuration+Page" alt="Configuration Page Screenshot" width="800">
</div>

## 🚀 Installation

### Prebuilt Binaries

Download the latest release for your platform from the [Releases](https://github.com/fullgreengn/hermes/releases) page.

### Build from Source

```bash
# Clone the repository
git clone https://github.com/fullgreengn/hermes.git
cd hermes

# Install dependencies
npm install

# Development mode
npm run dev

# Build for production
npm run build

# Build for specific platforms
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

## ⚙️ Configuration

Hermes offers several configuration options:

- **Quick Links**: Add, edit, or remove custom buttons with images and URLs
- **Background Image**: Set a custom background image
- **Window Size**: Configure the width and height of the application window
- **Fullscreen Mode**: Toggle fullscreen mode
- **Chrome Path**: Set the path to your Chrome executable
- **Chrome Arguments**: Configure custom command-line arguments for Chrome

Access the configuration page by pressing `Ctrl+I` (or `Cmd+I` on macOS) from anywhere in the application.

## 🔄 Auto Updates

Hermes automatically checks for updates when launched. When a new version is available:

1. The update is downloaded in the background
2. A notification appears when the update is ready
3. The update is installed when the application is closed

## 🧩 Tech Stack

- **Electron**: Cross-platform desktop framework
- **React**: UI library
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: UI component library
- **Vite**: Build tool
- **electron-builder**: Application packaging and distribution
- **electron-updater**: Automatic update functionality

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👨‍💻 Authors

**FullGreenGN** - [GitHub](https://github.com/fullgreengn)
**polarisdev.fr** - [GitHub](https://github.com/polarisdev-fr)

---

<div align="center">
  <sub>Made with ❤️ by <a href="https://polarisdev.fr">polarisdev.fr</a></sub>
</div>
