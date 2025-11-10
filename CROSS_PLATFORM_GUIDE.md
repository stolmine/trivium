# Tauri Cross-Platform Development Guide for Trivium

## Table of Contents
1. [Current Project Status](#current-project-status)
2. [Tauri Cross-Platform Support](#tauri-cross-platform-support)
3. [Build and CI/CD Strategies](#build-and-cicd-strategies)
4. [Common Cross-Platform Pitfalls](#common-cross-platform-pitfalls)
5. [Platform-Specific API Abstractions](#platform-specific-api-abstractions)
6. [Testing Strategies](#testing-strategies)
7. [Distribution and Update Mechanisms](#distribution-and-update-mechanisms)
8. [Performance Considerations](#performance-considerations)
9. [Implementation Checklist](#implementation-checklist)

---

## Current Project Status

Your Trivium project is using:
- **Tauri v2** (`@tauri-apps/api: ^2`, `@tauri-apps/cli: ^2`)
- **Bundle targets**: `"all"` (currently configured to build all platforms)
- **Frontend**: React 19 with Vite 7 and TypeScript
- **Backend**: Rust with SQLx (SQLite), Tokio async runtime
- **Current bundle icons**: Prepared for all platforms (32x32.png, 128x128.png, icon.icns, icon.ico)

**Configuration file**: `/Users/why/repos/trivium/src-tauri/tauri.conf.json`

---

## Tauri Cross-Platform Support

### Platform Support Matrix

| Platform | Architecture | Status | Build Environment |
|----------|-------------|--------|-------------------|
| **Windows** | x64 | Fully supported | Windows or CI |
| **Windows** | ARM64 | Supported (Tauri v2) | Windows or CI |
| **macOS** | Intel (x64) | Fully supported | macOS or CI |
| **macOS** | Apple Silicon (ARM64) | Fully supported | macOS or CI |
| **Linux** | x64 | Fully supported | Linux or CI |
| **Linux** | ARM64 | Supported via emulation | Linux ARM or CI |

### Key Limitation: No True Cross-Compilation

**Critical insight**: Tauri relies heavily on native libraries and toolchains, making meaningful cross-compilation impossible at this time. You cannot build a Windows app on macOS/Linux or vice versa.

**Recommended approach**: Use GitHub Actions or similar CI/CD pipelines to build for all platforms simultaneously.

---

## Build and CI/CD Strategies

### Recommended GitHub Actions Workflow

Create `.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    branches:
      - release
  workflow_dispatch:

jobs:
  publish-tauri:
    permissions:
      contents: write
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: 'macos-latest'
            args: '--target aarch64-apple-darwin'
          - platform: 'macos-latest'
            args: '--target x86_64-apple-darwin'
          - platform: 'ubuntu-22.04'
            args: ''
          - platform: 'ubuntu-22.04-arm'  # Only available for public repos
            args: ''
          - platform: 'windows-latest'
            args: ''

    runs-on: ${{ matrix.platform }}
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Install dependencies (ubuntu only)
        if: matrix.platform == 'ubuntu-22.04' || matrix.platform == 'ubuntu-22.04-arm'
        run: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: lts/*
          cache: 'npm'

      - name: Install Rust stable
        uses: dtolnay/rust-toolchain@stable
        with:
          # Required for macOS universal builds
          targets: ${{ matrix.platform == 'macos-latest' && 'aarch64-apple-darwin,x86_64-apple-darwin' || '' }}

      - name: Rust cache
        uses: swatinem/rust-cache@v2
        with:
          workspaces: './src-tauri -> target'

      - name: Install frontend dependencies
        run: npm ci

      - name: Build the app
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tagName: trivium-v__VERSION__
          releaseName: 'Trivium v__VERSION__'
          releaseBody: 'See the assets to download and install this version.'
          releaseDraft: true
          prerelease: false
          args: ${{ matrix.args }}
```

### Advanced Configuration Options

#### Custom Build Arguments

Add platform-specific features or optimizations:

```yaml
- platform: 'windows-latest'
  args: '--verbose --features windows-native'
```

#### Include Debug Builds

For testing purposes, enable debug artifacts:

```yaml
- name: Build the app
  uses: tauri-apps/tauri-action@v0
  with:
    includeDebug: true
    includeRelease: true
```

#### Custom Asset Naming

Control output file naming:

```yaml
- name: Build the app
  uses: tauri-apps/tauri-action@v0
  with:
    assetNamePattern: 'trivium-[version]-[platform]-[arch].[ext]'
```

#### Updater Configuration

Enable automatic update manifest generation:

```yaml
- name: Build the app
  uses: tauri-apps/tauri-action@v0
  with:
    includeUpdaterJson: true
    updaterJsonPreferNsis: true  # For Windows
    updaterJsonKeepUniversal: false  # For macOS
```

### GitHub Token Permissions

**Important**: By default, the GITHUB_TOKEN has read-only permissions. To create releases:

1. Go to repository **Settings** > **Actions** > **General**
2. Scroll to **Workflow permissions**
3. Select **"Read and write permissions"**
4. Save changes

### CI/CD Best Practices

1. **Use fail-fast: false**: Ensures all platform builds complete even if one fails
2. **Cache dependencies**: Use `actions/setup-node` and `rust-cache` to speed up builds
3. **Separate build and release**: Build on feature branches, release from a dedicated branch
4. **Test before release**: Run tests in a separate workflow before triggering releases
5. **Draft releases**: Set `releaseDraft: true` to review before publishing

### Alternative: Build Without GitHub Releases

For custom deployment strategies:

```yaml
- name: Build the app
  uses: tauri-apps/tauri-action@v0
  # Omit tagName, releaseName, releaseId to skip release creation
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

- name: Upload artifacts
  uses: actions/upload-artifact@v3
  with:
    name: trivium-${{ matrix.platform }}
    path: src-tauri/target/release/bundle/
```

---

## Common Cross-Platform Pitfalls

### 1. WebView Rendering Differences

**Problem**: Tauri uses platform-native WebView engines:
- **Windows**: Edge WebView2 (Chromium-based)
- **macOS**: WebKit
- **Linux**: WebKitGTK

**Impact**: CSS layout, JavaScript APIs, and rendering may differ between platforms.

**Solutions**:
- Use `normalize.css` or CSS reset for consistency
- Test on Safari when developing on non-macOS systems (Safari = WebKit)
- Avoid browser-specific CSS prefixes; use autoprefixer (already in your project)
- Test flexbox/grid layouts across all platforms
- Be cautious with newer CSS features; check WebKit support

**For your React/Tailwind project**:
```javascript
// Add to your main CSS file
import 'normalize.css';
```

### 2. File System Path Handling

**Problem**: Different path separators and conventions:
- Windows: `C:\Users\Name\AppData`
- macOS: `/Users/Name/Library/Application Support`
- Linux: `/home/name/.config` or `/home/name/.local/share`

**Solutions**:

**In Rust backend** (`src-tauri/src/`):
```rust
use std::path::{Path, PathBuf};
use tauri::api::path::{app_data_dir, config_dir};

// CORRECT: Cross-platform path joining
let db_path = app_data_dir(&config)
    .expect("Failed to resolve app data dir")
    .join("trivium_dev.db");

// WRONG: Hardcoded separators
let db_path = format!("{}/trivium_dev.db", data_dir); // Fails on Windows
```

**In JavaScript/TypeScript frontend**:
```typescript
import { join, appDataDir } from '@tauri-apps/api/path';

// CORRECT: Use Tauri's path API
const dbPath = await join(await appDataDir(), 'trivium_dev.db');

// WRONG: Manual path construction
const dbPath = `${await appDataDir()}/trivium_dev.db`; // Fails on Windows
```

### 3. Database File Location

**For your SQLite database** (`trivium_dev.db`):

```rust
// src-tauri/src/db/mod.rs
use tauri::api::path::app_data_dir;
use std::path::PathBuf;

pub fn get_database_path(config: &tauri::Config) -> PathBuf {
    let app_data = app_data_dir(config)
        .expect("Failed to get app data directory");

    // Create directory if it doesn't exist
    std::fs::create_dir_all(&app_data)
        .expect("Failed to create app data directory");

    app_data.join("trivium_dev.db")
}

// In your Tauri setup
let db_path = get_database_path(&app.config());
let db_url = format!("sqlite:{}?mode=rwc", db_path.display());
```

### 4. Linux Dependency Issues

**Problem**: Linux builds require system libraries that may not be installed.

**Solutions**:
- Target oldest supported Linux distribution (Ubuntu 18.04/20.04 recommended)
- Document required dependencies for local builds
- Use AppImage for dependency bundling (more portable)

**Your CI should install** (already in workflow example above):
```bash
libwebkit2gtk-4.1-dev
libappindicator3-dev
librsvg2-dev
patchelf
```

### 5. SQLx Compile-Time Verification

**Problem**: `sqlx::query!` macro requires database access at compile time.

**Solutions for CI/CD**:

**Option A: Pre-generate SQLx metadata**:
```bash
# Locally, generate offline mode data
cargo sqlx prepare --database-url sqlite:trivium_dev.db

# Commit .sqlx/ directory to git
# CI builds will use cached query data
```

**Option B: Use DATABASE_URL in CI**:
```yaml
# In GitHub Actions
env:
  DATABASE_URL: sqlite:trivium_dev.db
  SQLX_OFFLINE: true
```

Your project already has `.sqlx/` directory with 115 files, so you're using the offline mode correctly.

### 6. Icon Format Requirements

**Already correctly configured in your project**:
```json
"icon": [
  "icons/32x32.png",      // Windows tray icon
  "icons/128x128.png",    // General use
  "icons/128x128@2x.png", // macOS Retina
  "icons/icon.icns",      // macOS app bundle
  "icons/icon.ico"        // Windows executable
]
```

### 7. Window Behavior Differences

**Problem**: Window management varies by platform.

**Consider adding to `tauri.conf.json`**:
```json
{
  "app": {
    "windows": [
      {
        "title": "Trivium",
        "width": 800,
        "height": 600,
        "maximized": true,
        "resizable": true,
        "fullscreen": false,
        "decorations": true,
        "transparent": false,
        "center": true,
        "minWidth": 600,
        "minHeight": 400
      }
    ]
  }
}
```

### 8. Hotkey Platform Differences

**Per your CLAUDE.md requirements**: Display appropriate Ctrl (Windows/Linux) or Cmd (macOS) in tooltips.

**Implementation**:
```typescript
// src/utils/platform.ts
import { platform } from '@tauri-apps/plugin-os';

export const getModifierKey = (): string => {
  const os = platform();
  return os === 'macos' ? 'Cmd' : 'Ctrl';
};

export const formatHotkey = (key: string): string => {
  const modifier = getModifierKey();
  return `${modifier}+${key}`;
};

// Usage in components
<Tooltip>
  <TooltipContent>
    {formatHotkey('S')} - Save
  </TooltipContent>
</Tooltip>
```

---

## Platform-Specific API Abstractions

### Conditional Compilation in Rust

For platform-specific backend code:

```rust
// src-tauri/src/platform.rs

#[cfg(target_os = "windows")]
pub fn platform_specific_setup() {
    // Windows-specific code
    println!("Setting up Windows-specific features");
}

#[cfg(target_os = "macos")]
pub fn platform_specific_setup() {
    // macOS-specific code
    println!("Setting up macOS-specific features");
}

#[cfg(target_os = "linux")]
pub fn platform_specific_setup() {
    // Linux-specific code
    println!("Setting up Linux-specific features");
}

// Combined conditions
#[cfg(any(target_os = "linux", target_os = "macos"))]
pub fn unix_specific_code() {
    // Code for Unix-like systems
}

#[cfg(not(target_os = "windows"))]
pub fn non_windows_code() {
    // Everything except Windows
}
```

### Conditional Plugin Registration

```rust
// src-tauri/src/lib.rs
use tauri::Builder;

pub fn run() {
    let mut builder = Builder::default();

    // Register plugins conditionally
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        builder = builder
            .plugin(tauri_plugin_window_state::Builder::default().build())
            .plugin(tauri_plugin_dialog::init())
            .plugin(tauri_plugin_opener::init());
    }

    #[cfg(target_os = "windows")]
    {
        // Windows-specific plugins
    }

    builder
        .invoke_handler(tauri::generate_handler![
            // your commands
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### Cargo.toml Platform-Specific Dependencies

```toml
[target.'cfg(target_os = "windows")'.dependencies]
windows = "0.51"

[target.'cfg(target_os = "macos")'.dependencies]
cocoa = "0.25"

[target.'cfg(target_os = "linux")'.dependencies]
gtk = "0.18"
```

### Frontend Platform Detection

```typescript
// src/lib/platform.ts
import { platform } from '@tauri-apps/plugin-os';

export type Platform = 'windows' | 'macos' | 'linux' | 'unknown';

let cachedPlatform: Platform | null = null;

export async function getPlatform(): Promise<Platform> {
  if (cachedPlatform) return cachedPlatform;

  try {
    const os = await platform();
    cachedPlatform = os as Platform;
    return cachedPlatform;
  } catch {
    cachedPlatform = 'unknown';
    return 'unknown';
  }
}

export async function isWindows(): Promise<boolean> {
  return (await getPlatform()) === 'windows';
}

export async function isMacOS(): Promise<boolean> {
  return (await getPlatform()) === 'macos';
}

export async function isLinux(): Promise<boolean> {
  return (await getPlatform()) === 'linux';
}

// Usage in React components
import { getPlatform } from '@/lib/platform';
import { useEffect, useState } from 'react';

export function PlatformAwareComponent() {
  const [platform, setPlatform] = useState<Platform>('unknown');

  useEffect(() => {
    getPlatform().then(setPlatform);
  }, []);

  return (
    <div>
      {platform === 'macos' && <MacOSFeature />}
      {platform === 'windows' && <WindowsFeature />}
      {platform === 'linux' && <LinuxFeature />}
    </div>
  );
}
```

---

## Testing Strategies

### 1. Rust Backend Unit Tests

**Standard Rust testing**:
```rust
// src-tauri/src/commands/reading.rs

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_text_parsing() {
        let input = "Sample text";
        let result = parse_text(input);
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_async_command() {
        let result = fetch_data().await;
        assert!(result.is_ok());
    }
}
```

**Run tests**:
```bash
cd src-tauri
cargo test
```

### 2. Tauri Mock Runtime Tests

For testing Tauri commands without launching the full app:

```rust
// Enable in Cargo.toml
[dev-dependencies]
tauri = { version = "2", features = ["test"] }

// Test with mock runtime
#[cfg(test)]
mod tests {
    use tauri::test::*;

    #[test]
    fn test_tauri_command() {
        let app = tauri::test::mock_builder()
            .build(tauri::test::MockRuntime::default())
            .expect("Failed to build app");

        // Test commands without WebView
    }
}
```

### 3. Frontend Unit Tests (Vitest)

Your project already has Vitest configured. Add tests for platform-specific logic:

```typescript
// src/lib/utils/__tests__/platform.test.ts
import { describe, it, expect, vi } from 'vitest';
import { getPlatform, formatHotkey } from '../platform';

// Mock Tauri API
vi.mock('@tauri-apps/plugin-os', () => ({
  platform: vi.fn(() => Promise.resolve('macos'))
}));

describe('Platform utilities', () => {
  it('formats hotkeys correctly for macOS', async () => {
    const result = await formatHotkey('S');
    expect(result).toBe('Cmd+S');
  });
});
```

**Run frontend tests**:
```bash
npm run test  # Or vitest if configured
```

### 4. WebDriver Integration Tests

For end-to-end testing with real WebView:

**Install tauri-driver**:
```bash
cargo install tauri-driver
```

**WebDriverIO setup** (`wdio.conf.js`):
```javascript
export const config = {
  runner: 'local',
  specs: ['./test/specs/**/*.js'],
  capabilities: [{
    maxInstances: 1,
    'tauri:options': {
      application: './src-tauri/target/release/trivium'
    }
  }],
  services: ['tauri'],
};
```

**Example E2E test**:
```javascript
// test/specs/app.test.js
describe('Trivium Application', () => {
  it('should open the main window', async () => {
    const title = await browser.getTitle();
    expect(title).toBe('Trivium');
  });

  it('should handle user interactions', async () => {
    const button = await $('#save-button');
    await button.click();
    // Assert behavior
  });
});
```

### 5. Cross-Platform Testing Strategy

**Testing Matrix**:

| Test Type | Windows | macOS | Linux | Frequency |
|-----------|---------|-------|-------|-----------|
| Unit tests (Rust) | CI | CI | CI | Every commit |
| Unit tests (Frontend) | CI | CI | CI | Every commit |
| Integration tests | CI | CI | CI | Every commit |
| WebDriver E2E | CI | CI | CI | Pre-release |
| Manual testing | Local | Local | Local | Release candidates |

**GitHub Actions for Testing**:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    strategy:
      fail-fast: false
      matrix:
        platform: [ubuntu-22.04, macos-latest, windows-latest]
    runs-on: ${{ matrix.platform }}

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: lts/*

      - name: Install Rust
        uses: dtolnay/rust-toolchain@stable

      - name: Install dependencies (Ubuntu)
        if: matrix.platform == 'ubuntu-22.04'
        run: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.1-dev

      - name: Install frontend dependencies
        run: npm ci

      - name: Run frontend tests
        run: npm test

      - name: Run Rust tests
        run: cd src-tauri && cargo test
```

### 6. Manual Testing Checklist

Before each release, manually verify on each platform:

**All Platforms**:
- [ ] Application launches successfully
- [ ] Main window renders correctly
- [ ] Database operations work (read/write)
- [ ] All features from main workflow function
- [ ] Hotkeys work with correct modifier keys
- [ ] File dialogs open correctly
- [ ] Application quits cleanly

**Windows-Specific**:
- [ ] Installer runs without admin (if using currentUser mode)
- [ ] Windows Defender doesn't flag app (code signing helps)
- [ ] High DPI scaling works correctly
- [ ] Taskbar integration works

**macOS-Specific**:
- [ ] App launches on both Intel and Apple Silicon
- [ ] No "damaged" or "unverified developer" warnings (if signed)
- [ ] Retina displays render correctly
- [ ] Menu bar integration works

**Linux-Specific**:
- [ ] AppImage executes without dependencies
- [ ] .deb installs on Ubuntu/Debian
- [ ] .rpm installs on Fedora/RHEL
- [ ] System tray icon displays correctly

---

## Distribution and Update Mechanisms

### Windows Distribution

#### Installer Types

**NSIS (Recommended for cross-platform CI)**:
- Supports cross-compilation from macOS/Linux
- Executable installer: `trivium_0.1.0_x64-setup.exe`
- Configurable installation mode

**MSI (Windows-only builds)**:
- Requires Windows to build (uses WiX Toolset)
- Enterprise-friendly: `trivium_0.1.0_x64_en-US.msi`
- Group Policy deployment support

#### Configuration

Update `src-tauri/tauri.conf.json`:

```json
{
  "bundle": {
    "targets": ["nsis", "msi"],
    "windows": {
      "webviewInstallMode": {
        "type": "downloadBootstrapper"
      },
      "nsis": {
        "installMode": "currentUser",
        "displayLanguageSelector": false,
        "languages": ["en-US"]
      },
      "certificateThumbprint": null,
      "digestAlgorithm": "sha256",
      "timestampUrl": ""
    }
  }
}
```

#### WebView2 Distribution Options

| Method | Internet Required | Installer Size | Use Case |
|--------|------------------|----------------|----------|
| `downloadBootstrapper` | Yes | +0 MB | Default, smallest installer |
| `embedBootstrapper` | Yes | +1.8 MB | Slightly larger but faster |
| `offlineInstaller` | No | +127 MB | Enterprise/offline environments |
| `fixedVersion` | No | +180 MB | Specific version control |

**Recommendation**: Use `downloadBootstrapper` for public releases, `offlineInstaller` for enterprise.

#### Code Signing (Windows)

**Why sign?**
- Removes SmartScreen warnings
- Builds user trust
- Required for some enterprise deployments

**How to sign**:

1. **Obtain certificate**:
   - Purchase from DigiCert, Sectigo, or similar CA
   - Or use Extended Validation (EV) certificate for instant reputation

2. **Configure signing**:
```json
{
  "bundle": {
    "windows": {
      "certificateThumbprint": "YOUR_CERT_THUMBPRINT",
      "digestAlgorithm": "sha256",
      "timestampUrl": "http://timestamp.digicert.com"
    }
  }
}
```

3. **In CI/CD**, install certificate and configure environment:
```yaml
- name: Import certificate
  run: |
    # Import .pfx certificate
    Import-PfxCertificate -FilePath cert.pfx -Password ${{ secrets.CERT_PASSWORD }}
```

### macOS Distribution

#### Bundle Formats

- **.app**: Standard macOS application bundle
- **.dmg**: Disk image for drag-and-drop installation (recommended for distribution)
- **.tar.gz**: Compressed archive (used by updater)

#### Distribution Paths

**Option 1: Direct Distribution**
- Create DMG installer
- Requires code signing and notarization
- Users download from your website

**Option 2: Mac App Store**
- Requires Apple Developer Program membership ($99/year)
- Stricter sandboxing requirements
- Automatic updates via App Store

#### Code Signing and Notarization (Required)

**macOS Gatekeeper** (Catalina+) enforces code signing and notarization. Unsigned apps will not run.

**Prerequisites**:
1. Apple Developer Account
2. Developer ID Application certificate (for direct distribution) or Apple Distribution certificate (for App Store)

**Setup**:

1. **Create certificate in Apple Developer portal**
2. **Export certificate** from Keychain as .p12
3. **Configure environment variables**:

```bash
# For local builds (certificate in Keychain)
export APPLE_SIGNING_IDENTITY="Developer ID Application: Your Name (TEAM_ID)"

# For CI/CD
export APPLE_CERTIFICATE="<base64-encoded-p12>"
export APPLE_CERTIFICATE_PASSWORD="<password>"
```

4. **Notarization credentials** (choose one method):

**Method A: App Store Connect API** (recommended):
```bash
export APPLE_API_ISSUER="<issuer-id>"
export APPLE_API_KEY="<key-id>"
export APPLE_API_KEY_PATH="/path/to/AuthKey_<key-id>.p8"
```

**Method B: Apple ID**:
```bash
export APPLE_ID="your-email@example.com"
export APPLE_PASSWORD="<app-specific-password>"
export APPLE_TEAM_ID="<team-id>"
```

**GitHub Actions example**:
```yaml
- name: Build and sign macOS app
  uses: tauri-apps/tauri-action@v0
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    APPLE_CERTIFICATE: ${{ secrets.APPLE_CERTIFICATE }}
    APPLE_CERTIFICATE_PASSWORD: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
    APPLE_SIGNING_IDENTITY: ${{ secrets.APPLE_SIGNING_IDENTITY }}
    APPLE_API_ISSUER: ${{ secrets.APPLE_API_ISSUER }}
    APPLE_API_KEY: ${{ secrets.APPLE_API_KEY }}
    APPLE_API_KEY_PATH: ${{ secrets.APPLE_API_KEY_PATH }}
```

**Important notes**:
- Free Apple Developer accounts cannot notarize apps
- Notarization can take 5-30 minutes
- Failed notarization will fail the build

### Linux Distribution

#### Package Formats

**AppImage** (Recommended):
- Self-contained, no installation required
- Works across distributions
- Larger file size (bundles dependencies)
- Execute permission required: `chmod +x trivium_0.1.0_amd64.AppImage`

**DEB** (Debian/Ubuntu):
- Native package format for Debian-based distros
- Smaller file size (uses system libraries)
- Can only be built on Linux
- Install: `sudo dpkg -i trivium_0.1.0_amd64.deb`

**RPM** (Fedora/RHEL/CentOS):
- Native package format for Red Hat-based distros
- Can only be built on Linux
- Install: `sudo rpm -i trivium-0.1.0-1.x86_64.rpm`

#### Configuration

```json
{
  "bundle": {
    "targets": ["appimage", "deb", "rpm"],
    "linux": {
      "deb": {
        "depends": []
      },
      "rpm": {
        "depends": []
      }
    }
  }
}
```

#### Build Considerations

**CRITICAL**: Build on the **oldest** Linux version you want to support.

**Why?** Binaries compiled on newer systems (e.g., Ubuntu 22.04) require newer glibc versions and won't run on older systems (e.g., Ubuntu 18.04).

**Recommendations**:
- Use **Ubuntu 20.04** or **Ubuntu 22.04** as your CI runner
- For maximum compatibility, use Ubuntu 18.04 (but it's approaching EOL)
- AppImage bundles dependencies, so it's more portable

**GitHub Actions**:
```yaml
- platform: 'ubuntu-20.04'  # Good compatibility baseline
  args: ''
```

#### Distribution Channels

1. **Direct download**: Host on your website
2. **GitHub Releases**: Automatic with tauri-action
3. **Flatpak**: Requires separate configuration, broader reach
4. **Snap**: Requires separate configuration, Ubuntu Software store
5. **AUR (Arch User Repository)**: Community-maintained, Arch Linux users

### Automatic Updates

#### Setup

1. **Install updater plugin**:
```bash
cd src-tauri
cargo add tauri-plugin-updater --target 'cfg(any(target_os = "macos", windows, target_os = "linux"))'
```

2. **Register plugin**:
```rust
// src-tauri/src/lib.rs
fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        // ... other plugins
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

3. **Generate signing keys**:
```bash
npm run tauri signer generate
```

This outputs:
- **Private key**: Store securely (GitHub Secrets), NEVER commit
- **Public key**: Add to `tauri.conf.json`

4. **Configure updater** in `tauri.conf.json`:
```json
{
  "plugins": {
    "updater": {
      "active": true,
      "pubkey": "YOUR_PUBLIC_KEY_HERE",
      "endpoints": [
        "https://github.com/your-username/trivium/releases/latest/download/latest.json"
      ],
      "windows": {
        "installMode": "passive"
      }
    }
  }
}
```

5. **Enable updater JSON generation** in CI:
```yaml
- name: Build the app
  uses: tauri-apps/tauri-action@v0
  with:
    includeUpdaterJson: true
    updaterJsonPreferNsis: true  # Use NSIS on Windows
  env:
    TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
    TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}
```

#### Update Flow

**Automatic**: The tauri-action automatically generates:
- `latest.json`: Update manifest with version info and download URLs
- `.sig` files: Signatures for each installer

**Frontend implementation**:
```typescript
// src/lib/updater.ts
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export async function checkForUpdates() {
  try {
    const update = await check();

    if (update?.available) {
      console.log('Update available:', update.version);

      // Ask user to update
      const shouldUpdate = confirm(
        `Version ${update.version} is available. Install now?`
      );

      if (shouldUpdate) {
        await update.downloadAndInstall();

        // On Windows, app automatically quits and installs
        // On macOS/Linux, need to relaunch
        await relaunch();
      }
    } else {
      console.log('App is up to date');
    }
  } catch (error) {
    console.error('Update check failed:', error);
  }
}

// Check on app startup
checkForUpdates();

// Or provide a manual "Check for Updates" menu item
```

#### Platform-Specific Behavior

**Windows**:
- App automatically quits before installing update
- Uses MSI or NSIS installer
- Update installs silently (if `installMode: "passive"`)

**macOS**:
- Downloads .tar.gz archive
- Replaces app bundle
- Requires app relaunch

**Linux**:
- Updates AppImage in place
- .deb/.rpm updates not supported via updater (use system package manager)

#### Update Strategy

**Recommendation**:
1. Check for updates on app startup (non-blocking)
2. Notify user if update available
3. Allow user to postpone
4. Auto-install on next startup if user hasn't dismissed

**Advanced**: Implement staged rollouts:
- Release to 10% of users first
- Monitor for issues
- Gradually increase rollout percentage

---

## Performance Considerations

### Bundle Size Optimization

**Current considerations for Trivium**:

Your project uses:
- React 19 (modern, optimized)
- Vite 7 (fast, optimized bundling)
- Tailwind CSS (can be large without purging)
- Lexical editor (rich text editor - potentially large)

#### Frontend Optimization

**1. Code Splitting**

Enable automatic code splitting in Vite:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunking
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'editor': ['lexical', '@lexical/react'],
          'ui': ['@radix-ui/react-switch', 'lucide-react'],
          'charts': ['recharts'],
        }
      }
    },
    chunkSizeWarningLimit: 1000, // Adjust as needed
  }
});
```

**2. Lazy Loading Routes**

```typescript
// src/App.tsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

const Home = lazy(() => import('./pages/Home'));
const Reading = lazy(() => import('./pages/Reading'));
const Flashcards = lazy(() => import('./pages/Flashcards'));
const Statistics = lazy(() => import('./pages/Statistics'));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/reading" element={<Reading />} />
          <Route path="/flashcards" element={<Flashcards />} />
          <Route path="/statistics" element={<Statistics />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

**3. Lazy Load Heavy Components**

```typescript
// For large, infrequently-used components
const AdvancedStatistics = lazy(() => import('./components/AdvancedStatistics'));

<Suspense fallback={<Skeleton />}>
  {showAdvanced && <AdvancedStatistics />}
</Suspense>
```

**4. Analyze Bundle Size**

```bash
# Install rollup plugin
npm install --save-dev rollup-plugin-visualizer

# Add to vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
    })
  ]
});

# Build and view analysis
npm run build
```

**5. Tailwind CSS Optimization**

Tailwind 4 (which you're using) automatically purges unused styles. Verify configuration:

```typescript
// tailwind.config.ts
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // Ensures only used classes are included
};
```

#### Backend (Rust) Optimization

**1. Cargo Build Profile**

Add to `src-tauri/Cargo.toml`:

```toml
[profile.release]
opt-level = 'z'     # Optimize for size
lto = true          # Link-time optimization
codegen-units = 1   # Better optimization, slower compile
strip = true        # Remove debug symbols
panic = 'abort'     # Smaller binary, no unwinding
```

**For performance over size**:
```toml
[profile.release]
opt-level = 3       # Maximum performance
lto = true
codegen-units = 1
```

**2. Reduce Dependencies**

Audit your dependencies:
```bash
cd src-tauri
cargo tree  # View dependency tree
cargo bloat --release  # Identify large dependencies
```

**3. Feature Flags**

Only enable needed features:

```toml
# Your current Cargo.toml uses minimal features
tokio = { version = "1", features = ["full"] }  # Consider reducing

# Better (only what you need):
tokio = { version = "1", features = ["rt-multi-thread", "macros", "fs", "sync"] }
```

**4. SQLx Optimization**

Your project uses SQLx, which can increase binary size. Already using offline mode correctly (`.sqlx/` directory present).

**5. Strip Debug Info**

Already configured with `strip = true` in profile (add if missing).

### Runtime Performance

#### Database Optimization (SQLite)

```rust
// src-tauri/src/db/mod.rs
use sqlx::sqlite::SqlitePoolOptions;

pub async fn create_pool(database_url: &str) -> Result<SqlitePool, sqlx::Error> {
    SqlitePoolOptions::new()
        .max_connections(5)  // Adjust based on workload
        .connect_timeout(Duration::from_secs(3))
        .connect(database_url)
        .await
}

// Enable WAL mode for better concurrent performance
sqlx::query("PRAGMA journal_mode = WAL;")
    .execute(&pool)
    .await?;

// Increase cache size
sqlx::query("PRAGMA cache_size = -64000;")  // 64MB cache
    .execute(&pool)
    .await?;
```

#### Async Command Optimization

```rust
// CORRECT: Non-blocking async commands
#[tauri::command]
async fn load_large_data() -> Result<Vec<Data>, String> {
    // Async I/O doesn't block UI
    fetch_from_database().await
}

// WRONG: Blocking the async runtime
#[tauri::command]
async fn blocking_command() -> Result<(), String> {
    // Don't do this - blocks async executor
    std::thread::sleep(Duration::from_secs(5));
    Ok(())
}

// CORRECT: Spawn blocking operations
#[tauri::command]
async fn cpu_intensive_task() -> Result<String, String> {
    tokio::task::spawn_blocking(|| {
        // CPU-intensive work here
        expensive_computation()
    })
    .await
    .map_err(|e| e.to_string())
}
```

#### Frontend Performance

**1. Virtualization for Long Lists**

If displaying many items (flashcards, paragraphs):

```bash
npm install react-virtual
```

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualizedList({ items }: { items: Item[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50, // Estimated item height
  });

  return (
    <div ref={parentRef} style={{ height: '500px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {items[virtualItem.index].content}
          </div>
        ))}
      </div>
    </div>
  );
}
```

**2. Memoization**

```typescript
import { memo, useMemo, useCallback } from 'react';

// Memoize expensive components
const ExpensiveComponent = memo(({ data }: { data: Data }) => {
  // Expensive rendering
});

// Memoize expensive computations
function Component({ items }: { items: Item[] }) {
  const sortedItems = useMemo(
    () => items.sort((a, b) => a.priority - b.priority),
    [items]
  );

  const handleClick = useCallback(() => {
    // Handle click
  }, []);

  return <List items={sortedItems} onClick={handleClick} />;
}
```

**3. Debounce/Throttle Expensive Operations**

```typescript
import { useMemo } from 'react';

function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Usage
function SearchComponent() {
  const handleSearch = useMemo(
    () => debounce((query: string) => {
      // Expensive search operation
      performSearch(query);
    }, 300),
    []
  );

  return <input onChange={(e) => handleSearch(e.target.value)} />;
}
```

### Platform-Specific Performance

**Windows**:
- WebView2 is Chromium-based, generally fastest
- Consider high DPI scaling impact on rendering

**macOS**:
- WebKit may have different performance characteristics
- Test on both Intel and Apple Silicon (M1+ is significantly faster)

**Linux**:
- WebKitGTK may be slower than Windows/macOS
- More variability across different distributions
- AppImage may have slight startup overhead

### Monitoring Performance

**1. Rust Backend Profiling**

```bash
# Install flamegraph
cargo install flamegraph

# Generate flamegraph (Linux/macOS)
sudo cargo flamegraph --bin trivium

# View generated flamegraph.svg
```

**2. Frontend Profiling**

Use React DevTools Profiler:
1. Install React DevTools browser extension
2. Open in development mode
3. Use Profiler tab to identify slow renders

**3. Bundle Analysis**

```bash
npm run build
# Check dist/ folder size
du -sh dist/*
```

### Expected Bundle Sizes

**Reasonable targets for a Tauri app like Trivium**:

| Platform | Installer Size | Installed Size |
|----------|---------------|----------------|
| Windows (NSIS) | 5-15 MB | 20-40 MB |
| macOS (DMG) | 5-15 MB | 20-40 MB |
| Linux (AppImage) | 70-150 MB | 70-150 MB |
| Linux (DEB) | 5-15 MB | 20-40 MB |

**Note**: AppImage is larger because it bundles all dependencies.

**Your SQLite database** (`trivium_dev.db`) is currently 332 KB, which is negligible.

---

## Implementation Checklist

### Phase 1: Basic Cross-Platform Setup

- [ ] Review and update `src-tauri/tauri.conf.json` with platform-specific settings
- [ ] Implement cross-platform path handling in Rust backend
- [ ] Add platform detection utility to frontend (`src/lib/platform.ts`)
- [ ] Update hotkey displays to show Cmd/Ctrl appropriately
- [ ] Test local builds on your development machine

### Phase 2: CI/CD Pipeline

- [ ] Create `.github/workflows/test.yml` for automated testing
- [ ] Create `.github/workflows/release.yml` for multi-platform builds
- [ ] Configure GitHub repository settings (Actions permissions)
- [ ] Set up GitHub Secrets for signing credentials (if applicable)
- [ ] Test CI pipeline with a draft release

### Phase 3: Code Signing (Optional but Recommended)

**Windows**:
- [ ] Obtain code signing certificate
- [ ] Configure certificate in tauri.conf.json
- [ ] Add certificate to GitHub Secrets for CI
- [ ] Test signed build

**macOS**:
- [ ] Enroll in Apple Developer Program ($99/year)
- [ ] Create Developer ID Application certificate
- [ ] Export certificate as .p12 and encode as base64
- [ ] Set up notarization credentials (App Store Connect API recommended)
- [ ] Add credentials to GitHub Secrets
- [ ] Test signed and notarized build

**Linux**:
- [ ] No code signing required, but consider GPG signing for packages

### Phase 4: Distribution Setup

- [ ] Choose Windows installer type (NSIS recommended)
- [ ] Configure WebView2 installation mode
- [ ] Choose macOS distribution method (DMG recommended)
- [ ] Choose Linux package formats (AppImage + DEB + RPM recommended)
- [ ] Set up updater plugin (optional)
- [ ] Generate signing keys for updater
- [ ] Configure updater endpoints in tauri.conf.json

### Phase 5: Testing

- [ ] Write unit tests for platform-specific Rust code
- [ ] Write unit tests for platform-specific frontend code
- [ ] Set up WebDriver tests (optional, for E2E)
- [ ] Create manual testing checklist for each platform
- [ ] Perform manual testing on all platforms before release

### Phase 6: Performance Optimization

- [ ] Configure Cargo release profile for size or speed
- [ ] Implement code splitting in frontend
- [ ] Lazy load routes and heavy components
- [ ] Optimize SQLite database configuration
- [ ] Run bundle analysis and identify large dependencies
- [ ] Benchmark application performance

### Phase 7: Documentation

- [ ] Document build process for contributors
- [ ] Document platform-specific requirements
- [ ] Create user installation guides for each platform
- [ ] Document update process for users

### Phase 8: Release

- [ ] Create comprehensive release notes
- [ ] Build release artifacts via CI/CD
- [ ] Test installers on clean machines (each platform)
- [ ] Publish GitHub Release (or use draft → publish)
- [ ] Announce release to users
- [ ] Monitor for issues and user feedback

---

## Quick Reference: Essential Commands

### Local Development

```bash
# Run in development mode
npm run dev

# Build for current platform
npm run build
npm run tauri build

# Run tests
npm test                    # Frontend tests
cd src-tauri && cargo test  # Rust tests

# Check bundle size
npm run build && du -sh dist/*
```

### Cross-Platform Building (Local)

```bash
# macOS: Build for both architectures
npm run tauri build -- --target aarch64-apple-darwin
npm run tauri build -- --target x86_64-apple-darwin

# Windows: Build specific installer
npm run tauri build -- --bundles nsis
npm run tauri build -- --bundles msi

# Linux: Build specific format
npm run tauri build -- --bundles appimage
npm run tauri build -- --bundles deb
npm run tauri build -- --bundles rpm
```

### CI/CD

```bash
# Trigger release workflow manually
gh workflow run release.yml

# Check workflow status
gh run list

# Download artifacts from CI
gh run download <run-id>
```

### Signing and Security

```bash
# Generate updater signing keys
npm run tauri signer generate

# Check SQLx metadata
cd src-tauri && cargo sqlx prepare --check

# Generate fresh SQLx metadata
cd src-tauri && cargo sqlx prepare
```

---

## Additional Resources

### Official Documentation
- **Tauri v2 Docs**: https://v2.tauri.app/
- **Tauri v2 Guides**: https://v2.tauri.app/start/
- **Tauri GitHub**: https://github.com/tauri-apps/tauri
- **Tauri Discord**: https://discord.com/invite/tauri

### Platform-Specific
- **Windows**: https://v2.tauri.app/distribute/windows-installer/
- **macOS**: https://v2.tauri.app/distribute/sign/macos/
- **Linux**: https://v2.tauri.app/distribute/appimage/

### Plugins
- **Updater**: https://v2.tauri.app/plugin/updater/
- **Dialog**: https://v2.tauri.app/plugin/dialog/
- **File System**: https://v2.tauri.app/plugin/file-system/

### Community Resources
- **Awesome Tauri**: https://github.com/tauri-apps/awesome-tauri
- **Tauri Examples**: https://github.com/tauri-apps/tauri/tree/dev/examples

---

## Conclusion

This guide provides a comprehensive foundation for cross-platform Tauri development. Key takeaways:

1. **Use CI/CD for multi-platform builds** - Don't try to cross-compile
2. **Test thoroughly on all platforms** - WebView differences matter
3. **Handle paths correctly** - Use Tauri's path API
4. **Consider code signing** - Essential for macOS, recommended for Windows
5. **Optimize bundle size** - Use code splitting, lazy loading, and Cargo profiles
6. **Implement automatic updates** - Improves user experience

Start with Phase 1 of the checklist, and progressively implement additional phases as your project matures. The CI/CD pipeline (Phase 2) should be your early priority, as it will catch platform-specific issues quickly.

Good luck with your Trivium development!
