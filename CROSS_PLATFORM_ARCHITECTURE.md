# Trivium Cross-Platform Architecture

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Trivium Application                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────┐      ┌─────────────────────────┐   │
│  │   Frontend (React)     │      │   Backend (Rust)        │   │
│  │                        │      │                         │   │
│  │  - React 19            │◄────►│  - Tauri Core           │   │
│  │  - TypeScript          │ IPC  │  - SQLx (SQLite)        │   │
│  │  - Vite Build          │      │  - Tokio Async          │   │
│  │  - Tailwind CSS        │      │  - Platform Module      │   │
│  │  - Platform Utils      │      │  - Commands             │   │
│  └────────────────────────┘      └─────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Platform Abstraction Layer                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Windows    │  │    macOS     │  │    Linux     │         │
│  │              │  │              │  │              │         │
│  │  WebView2    │  │   WebKit     │  │  WebKitGTK   │         │
│  │  (Chromium)  │  │   (Safari)   │  │  (WebKit)    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Build and Release Pipeline

```
┌──────────────────────────────────────────────────────────────────┐
│                         Source Code                              │
│                    (Trivium Repository)                          │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         │ git push
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│                       GitHub Actions                             │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  On Push/PR: test.yml                                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Windows   │  │    macOS    │  │    Linux    │            │
│  │   Runner    │  │    Runner   │  │    Runner   │            │
│  │             │  │             │  │             │            │
│  │  npm test   │  │  npm test   │  │  npm test   │            │
│  │  cargo test │  │  cargo test │  │  cargo test │            │
│  │  clippy     │  │  clippy     │  │  clippy     │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                   │
│  On Release: release.yml                                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Windows   │  │    macOS    │  │    Linux    │            │
│  │   Runner    │  │    Runner   │  │    Runner   │            │
│  │             │  │             │  │             │            │
│  │  Build:     │  │  Build:     │  │  Build:     │            │
│  │  - NSIS     │  │  - ARM64    │  │  - AppImage │            │
│  │  - MSI      │  │  - x64      │  │  - DEB      │            │
│  │             │  │  - DMG      │  │  - RPM      │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│         │                │                │                      │
│         └────────────────┴────────────────┘                      │
│                          │                                       │
└──────────────────────────┼───────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                      GitHub Release                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Trivium-v0.1.0/                                                │
│  ├── Windows/                                                    │
│  │   ├── Trivium_0.1.0_x64-setup.exe        (NSIS installer)   │
│  │   ├── Trivium_0.1.0_x64_en-US.msi        (MSI installer)    │
│  │   └── *.sig                               (Signatures)       │
│  ├── macOS/                                                      │
│  │   ├── Trivium_0.1.0_aarch64.dmg          (Apple Silicon)    │
│  │   ├── Trivium_0.1.0_x64.dmg              (Intel)            │
│  │   └── *.tar.gz + *.sig                   (For updater)      │
│  ├── Linux/                                                      │
│  │   ├── trivium_0.1.0_amd64.AppImage       (Universal)        │
│  │   ├── trivium_0.1.0_amd64.deb            (Debian/Ubuntu)    │
│  │   ├── trivium-0.1.0-1.x86_64.rpm         (Fedora/RHEL)      │
│  │   └── *.sig                               (Signatures)       │
│  └── latest.json                             (Update manifest)  │
│                                                                   │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         │ Download & Install
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│                         End Users                                │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Windows Users          macOS Users          Linux Users         │
│  - Run .exe             - Open .dmg          - Run .AppImage     │
│  - Install              - Drag to Apps       - Or install .deb   │
│  - Auto-updates         - Auto-updates       - Auto-updates      │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

## Data Flow Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                       User Interface (React)                     │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Components:                                                     │
│  ┌─────────┐  ┌─────────┐  ┌──────────┐  ┌──────────┐         │
│  │ Library │  │ Reading │  │Flashcards│  │Statistics│         │
│  └────┬────┘  └────┬────┘  └────┬─────┘  └────┬─────┘         │
│       │            │            │             │                 │
│       └────────────┴────────────┴─────────────┘                 │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────┐          │
│  │          Tauri IPC (invoke commands)             │          │
│  └──────────────────────────────────────────────────┘          │
│                         │                                        │
└─────────────────────────┼────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Backend (Rust Commands)                       │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Commands Module:                                                │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                │
│  │  reading   │  │ flashcards │  │ statistics │                │
│  │  folder    │  │   review   │  │  wikipedia │                │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘                │
│        │                │                │                       │
│        └────────────────┴────────────────┘                       │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────┐          │
│  │      Platform Module (Cross-Platform Paths)      │          │
│  └──────────────────────────────────────────────────┘          │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────┐          │
│  │    Database Layer (SQLx + SQLite)                │          │
│  │                                                   │          │
│  │  Platform-aware database location:               │          │
│  │  - Windows: C:\Users\...\AppData\...             │          │
│  │  - macOS: ~/Library/Application Support/...      │          │
│  │  - Linux: ~/.local/share/...                     │          │
│  └──────────────────────────────────────────────────┘          │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

## Platform-Specific Module Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     Platform Detection                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Frontend (TypeScript)          Backend (Rust)                  │
│  ┌────────────────────┐         ┌────────────────────┐         │
│  │ platform.ts        │         │ platform.rs        │         │
│  │                    │         │                    │         │
│  │ - getPlatform()    │         │ #[cfg(target_os)]  │         │
│  │ - isWindows()      │         │                    │         │
│  │ - isMacOS()        │         │ - get_data_dir()   │         │
│  │ - isLinux()        │         │ - get_config_dir() │         │
│  │ - formatHotkey()   │         │ - get_db_path()    │         │
│  │ - usePlatform()    │         │ - ensure_dir()     │         │
│  └────────────────────┘         └────────────────────┘         │
│           │                              │                       │
│           ▼                              ▼                       │
│  ┌────────────────────┐         ┌────────────────────┐         │
│  │ UI Components      │         │ File Operations    │         │
│  │                    │         │                    │         │
│  │ - Cmd vs Ctrl      │         │ - Database Path    │         │
│  │ - Tooltips         │         │ - Config Files     │         │
│  │ - Hotkey Help      │         │ - Cache Location   │         │
│  └────────────────────┘         └────────────────────┘         │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

## Update Mechanism Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                      Application Launch                          │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         │ After 5 seconds
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│              Check for Updates (Tauri Updater)                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. Fetch latest.json from GitHub Releases                      │
│  2. Compare version with current version                         │
│  3. Verify signature with public key                            │
│                                                                   │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
                    ┌────────┐
                    │ Update? │
                    └────┬───┘
                         │
          ┌──────────────┴──────────────┐
          │                             │
          ▼ No Update                   ▼ Update Available
    ┌──────────┐                  ┌──────────────┐
    │ Continue │                  │ Prompt User  │
    └──────────┘                  └──────┬───────┘
                                         │
                              ┌──────────┴──────────┐
                              │                     │
                              ▼ Decline             ▼ Accept
                        ┌──────────┐         ┌──────────────┐
                        │ Continue │         │   Download   │
                        └──────────┘         │   Install    │
                                             │   Relaunch   │
                                             └──────────────┘
```

## Testing Strategy

```
┌──────────────────────────────────────────────────────────────────┐
│                        Testing Pyramid                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│                          ▲                                        │
│                         ╱ ╲                                       │
│                        ╱   ╲                                      │
│                       ╱ E2E ╲                                     │
│                      ╱ Tests ╲                                    │
│                     ╱─────────╲                                   │
│                    ╱           ╲                                  │
│                   ╱ Integration ╲                                 │
│                  ╱     Tests     ╲                                │
│                 ╱─────────────────╲                               │
│                ╱                   ╲                               │
│               ╱    Unit Tests      ╲                              │
│              ╱   (Rust + Frontend)  ╲                             │
│             ╱───────────────────────╲                            │
│                                                                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Unit Tests:                                                     │
│  - Rust: cargo test (all platforms via CI)                      │
│  - Frontend: npm test (Vitest)                                  │
│  - Coverage: Platform utils, commands, components               │
│                                                                   │
│  Integration Tests:                                              │
│  - Tauri mock runtime tests                                     │
│  - Database operations                                           │
│  - IPC communication                                             │
│                                                                   │
│  E2E Tests (Optional):                                           │
│  - WebDriver with tauri-driver                                  │
│  - Full user workflows                                           │
│  - Platform-specific behavior                                    │
│                                                                   │
│  Manual Testing:                                                 │
│  - Pre-release checklist                                         │
│  - Platform-specific features                                    │
│  - Installer testing on clean machines                          │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

## Security Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      Security Layers                             │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Layer 1: Code Signing                                           │
│  ┌────────────────────────────────────────────────────┐         │
│  │  Windows: Authenticode (DigiCert, etc.)            │         │
│  │  macOS: Apple Developer ID + Notarization          │         │
│  │  Linux: GPG signatures (optional)                  │         │
│  └────────────────────────────────────────────────────┘         │
│                                                                   │
│  Layer 2: Update Verification                                   │
│  ┌────────────────────────────────────────────────────┐         │
│  │  - RSA signature verification                      │         │
│  │  - Public/private key pair                         │         │
│  │  - Signature files (.sig)                          │         │
│  └────────────────────────────────────────────────────┘         │
│                                                                   │
│  Layer 3: IPC Security                                           │
│  ┌────────────────────────────────────────────────────┐         │
│  │  - Tauri command allowlist                         │         │
│  │  - No eval() or unsafe code                        │         │
│  │  - CSP (Content Security Policy)                   │         │
│  └────────────────────────────────────────────────────┘         │
│                                                                   │
│  Layer 4: Data Security                                          │
│  ┌────────────────────────────────────────────────────┐         │
│  │  - Local SQLite database                           │         │
│  │  - Platform-specific secure storage                │         │
│  │  - No cloud dependencies                           │         │
│  └────────────────────────────────────────────────────┘         │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

## Deployment Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    Distribution Channels                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Primary Channel:                                                │
│  ┌──────────────────────────────────────────────────┐           │
│  │         GitHub Releases (Recommended)            │           │
│  │  - Automatic via CI/CD                           │           │
│  │  - Free hosting                                  │           │
│  │  - Built-in update mechanism                     │           │
│  │  - Release notes and changelog                   │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                   │
│  Optional Channels:                                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐               │
│  │   macOS    │  │  Microsoft │  │   Linux    │               │
│  │ App Store  │  │   Store    │  │   Repos    │               │
│  │            │  │            │  │            │               │
│  │ (Requires  │  │ (Requires  │  │ (AUR, PPA, │               │
│  │  review)   │  │  review)   │  │  Flatpak)  │               │
│  └────────────┘  └────────────┘  └────────────┘               │
│                                                                   │
│  Direct Distribution:                                            │
│  ┌──────────────────────────────────────────────────┐           │
│  │            Website Download                      │           │
│  │  - Host installers on your server                │           │
│  │  - Full control over distribution                │           │
│  │  - Custom analytics                              │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

## File Structure

```
trivium/
├── src/                              # Frontend source
│   ├── components/                   # React components
│   ├── lib/
│   │   └── utils/
│   │       └── platform.ts           # ✨ Enhanced platform utils
│   └── App.tsx
│
├── src-tauri/                        # Backend source
│   ├── src/
│   │   ├── platform.rs               # ✨ NEW: Platform module
│   │   ├── commands/                 # Tauri commands
│   │   │   ├── reading.rs
│   │   │   ├── flashcards.rs
│   │   │   └── ...
│   │   ├── db/                       # Database layer
│   │   ├── models/                   # Data models
│   │   ├── lib.rs                    # Main library
│   │   └── main.rs                   # Entry point
│   ├── Cargo.toml                    # Rust dependencies
│   ├── tauri.conf.json               # Tauri configuration
│   └── .sqlx/                        # SQLx offline mode data
│
├── .github/
│   └── workflows/
│       ├── test.yml                  # ✨ NEW: CI testing
│       └── release.yml               # ✨ NEW: Multi-platform builds
│
├── CROSS_PLATFORM_GUIDE.md           # ✨ Comprehensive guide
├── CROSS_PLATFORM_IMPLEMENTATION.md  # ✨ Step-by-step instructions
├── CROSS_PLATFORM_SUMMARY.md         # ✨ Quick reference
├── CROSS_PLATFORM_ARCHITECTURE.md    # ✨ This file
├── tauri.conf.examples.json          # ✨ Configuration examples
│
└── package.json                      # Node dependencies
```

## Key Technologies

```
┌──────────────────────────────────────────────────────────────────┐
│                       Technology Stack                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Frontend:                     Backend:                          │
│  ┌─────────────────┐          ┌─────────────────┐              │
│  │ React 19        │          │ Rust 2021       │              │
│  │ TypeScript      │          │ Tauri v2        │              │
│  │ Vite 7          │          │ SQLx + SQLite   │              │
│  │ Tailwind 4      │          │ Tokio           │              │
│  │ Lexical         │          │ Serde           │              │
│  │ Zustand         │          │ Reqwest         │              │
│  └─────────────────┘          └─────────────────┘              │
│                                                                   │
│  Build Tools:                  Testing:                          │
│  ┌─────────────────┐          ┌─────────────────┐              │
│  │ GitHub Actions  │          │ Vitest          │              │
│  │ tauri-action    │          │ Cargo Test      │              │
│  │ Rust Cargo      │          │ WebDriver       │              │
│  │ npm/Node.js     │          │                 │              │
│  └─────────────────┘          └─────────────────┘              │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

## Development Workflow

```
Developer                                 CI/CD
    │                                       │
    │ 1. Write code                         │
    │ 2. Test locally                       │
    │    ├─ npm run dev                     │
    │    ├─ npm test                        │
    │    └─ cargo test                      │
    │                                       │
    │ 3. git commit                         │
    │ 4. git push                           │
    │────────────────────────────────────►  │
    │                                       │
    │                          5. Run Tests │
    │                             on all    │
    │                             platforms │
    │                                   │   │
    │  ◄────────────────────────────────┘   │
    │  6. Test results                      │
    │     (pass/fail)                       │
    │                                       │
    │ 7. Merge to main                      │
    │                                       │
    │ 8. Tag version                        │
    │    git tag v0.1.0                     │
    │                                       │
    │ 9. Push to release                    │
    │    branch                             │
    │────────────────────────────────────►  │
    │                                       │
    │                      10. Build for    │
    │                          Windows      │
    │                          macOS        │
    │                          Linux        │
    │                                       │
    │                      11. Create       │
    │                          GitHub       │
    │                          Release      │
    │                          (draft)      │
    │  ◄────────────────────────────────────┘
    │  12. Review release                   │
    │                                       │
    │ 13. Publish release                   │
    │────────────────────────────────────►  │
    │                                       │
    │                      14. Users can    │
    │                          download     │
    │                                       │
    ▼                                       ▼
```

## Summary

This architecture provides:

1. **Cross-Platform Compatibility**: Single codebase, multiple platforms
2. **Automated CI/CD**: GitHub Actions for testing and building
3. **Platform Abstraction**: Consistent API across different OSes
4. **Security**: Code signing, update verification, secure IPC
5. **Scalability**: Modular architecture, easy to extend
6. **Maintainability**: Clear separation of concerns, comprehensive testing

**Next Steps**: Follow the 5-minute setup in CROSS_PLATFORM_SUMMARY.md to get started!
