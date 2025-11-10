# Cross-Platform Implementation Steps for Trivium

This document provides step-by-step instructions to implement the cross-platform features outlined in `CROSS_PLATFORM_GUIDE.md`.

## Quick Start: 5-Minute Setup

If you want to get cross-platform builds working immediately:

### 1. Install Required Plugin

```bash
npm install @tauri-apps/plugin-os
cd src-tauri
cargo add tauri-plugin-os --features "info"
cd ..
```

### 2. Register Plugin in Rust

Edit `src-tauri/src/lib.rs`:

```rust
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())  // Add this line
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        // ... rest of your plugins
        .invoke_handler(tauri::generate_handler![
            // your commands
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### 3. Test Platform Detection

```bash
npm run dev
```

Open the browser console and try:
```javascript
import { platform } from '@tauri-apps/plugin-os';
const os = await platform();
console.log(os); // 'macos', 'windows', or 'linux'
```

### 4. Push to GitHub and Enable Actions

```bash
git add .
git commit -m "Add cross-platform support with GitHub Actions CI/CD"
git push
```

Then:
1. Go to your GitHub repository
2. Navigate to **Settings** > **Actions** > **General**
3. Scroll to **Workflow permissions**
4. Select **"Read and write permissions"**
5. Click **Save**

Now the CI/CD workflows will run automatically on push!

---

## Detailed Implementation Guide

### Phase 1: Platform Detection and Path Handling

#### Step 1.1: Install Dependencies

```bash
# Install frontend plugin
npm install @tauri-apps/plugin-os

# Install Rust plugin
cd src-tauri
cargo add tauri-plugin-os --features "info"
cd ..
```

#### Step 1.2: Register Plugin

The platform utilities have been created at:
- **Frontend**: `/Users/why/repos/trivium/src/lib/utils/platform.ts` (already enhanced)
- **Backend**: `/Users/why/repos/trivium/src-tauri/src/platform.rs` (created)

Add the platform module to your Rust code:

**Edit `src-tauri/src/lib.rs`**:
```rust
// Add at the top
mod platform;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .setup(|app| {
            // Run platform-specific setup
            platform::platform_specific_setup();

            // Example: Get database path
            let db_path = platform::get_database_path(app.handle())?;
            println!("Database path: {:?}", db_path);

            Ok(())
        })
        // ... rest of your configuration
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

#### Step 1.3: Update Database Configuration

If you're using SQLx with a hardcoded path, update it to use the platform module:

**Find your database initialization code** (likely in `src-tauri/src/db/mod.rs` or `src-tauri/src/lib.rs`):

```rust
// OLD: Hardcoded path
let db_url = "sqlite:trivium_dev.db";

// NEW: Platform-aware path
use crate::platform;

let db_path = platform::get_database_path(app_handle)?;
let db_url = format!("sqlite:{}?mode=rwc", db_path.display());
```

#### Step 1.4: Test Platform Detection

Create a test Tauri command:

```rust
// In src-tauri/src/commands/mod.rs or create a new file
#[tauri::command]
async fn get_platform_info(app: tauri::AppHandle) -> Result<String, String> {
    let data_dir = crate::platform::get_data_dir(&app)?;
    let config_dir = crate::platform::get_config_dir(&app)?;
    let cache_dir = crate::platform::get_cache_dir(&app)?;

    Ok(format!(
        "Data: {:?}\nConfig: {:?}\nCache: {:?}",
        data_dir, config_dir, cache_dir
    ))
}
```

Register it:
```rust
.invoke_handler(tauri::generate_handler![
    get_platform_info,
    // ... your other commands
])
```

Call from frontend:
```typescript
import { invoke } from '@tauri-apps/api/core';

const info = await invoke('get_platform_info');
console.log(info);
```

### Phase 2: GitHub Actions CI/CD

The workflows have been created:
- **Test workflow**: `/Users/why/repos/trivium/.github/workflows/test.yml`
- **Release workflow**: `/Users/why/repos/trivium/.github/workflows/release.yml`

#### Step 2.1: Enable GitHub Actions

1. Commit and push the workflow files:
```bash
git add .github/workflows/
git commit -m "Add GitHub Actions for cross-platform CI/CD"
git push
```

2. Enable workflow permissions:
   - Go to **GitHub Repository** > **Settings** > **Actions** > **General**
   - Under **Workflow permissions**, select **"Read and write permissions"**
   - Save changes

#### Step 2.2: Test the Test Workflow

The test workflow runs automatically on every push to `main` or `develop`, and on pull requests.

```bash
git checkout -b test-ci
git commit --allow-empty -m "Test CI workflow"
git push -u origin test-ci
```

Go to **GitHub** > **Actions** tab to watch the tests run on all platforms.

#### Step 2.3: Test the Release Workflow

The release workflow requires a `release` branch:

```bash
git checkout -b release
git push -u origin release
```

Or trigger manually:
1. Go to **GitHub** > **Actions** > **Release**
2. Click **Run workflow**
3. Select branch and click **Run workflow**

The workflow will create a **Draft Release** with installers for all platforms.

#### Step 2.4: Customize Release Workflow

**Optional customizations** in `.github/workflows/release.yml`:

**A. Change Release Branch**
```yaml
on:
  push:
    branches:
      - main  # Change from 'release' to 'main' or any branch
```

**B. Only Build Certain Platforms**
```yaml
matrix:
  include:
    - platform: 'macos-latest'
      args: '--target aarch64-apple-darwin'
    - platform: 'windows-latest'
      args: ''
    # Remove Linux if not needed
```

**C. Automatic Release (Not Draft)**
```yaml
with:
  releaseDraft: false  # Change from true to false
```

### Phase 3: Code Signing (Optional)

Code signing is optional but recommended for production releases.

#### Step 3.1: Windows Code Signing

**Prerequisites**:
1. Purchase a code signing certificate from DigiCert, Sectigo, etc.
2. Install certificate on your local machine or export as .pfx

**For CI/CD**:

1. Export certificate as .pfx with password
2. Add to GitHub Secrets:
   - `WINDOWS_CERTIFICATE`: Base64-encoded .pfx file
   - `WINDOWS_CERTIFICATE_PASSWORD`: Certificate password

```bash
# Encode certificate
base64 -i certificate.pfx | pbcopy  # macOS
base64 certificate.pfx | clip       # Windows
```

3. Update `tauri.conf.json`:
```json
{
  "bundle": {
    "windows": {
      "certificateThumbprint": null,
      "digestAlgorithm": "sha256",
      "timestampUrl": "http://timestamp.digicert.com"
    }
  }
}
```

4. Update workflow (uncomment in `.github/workflows/release.yml`):
```yaml
env:
  WINDOWS_CERTIFICATE: ${{ secrets.WINDOWS_CERTIFICATE }}
  WINDOWS_CERTIFICATE_PASSWORD: ${{ secrets.WINDOWS_CERTIFICATE_PASSWORD }}
```

#### Step 3.2: macOS Code Signing and Notarization

**Prerequisites**:
1. Apple Developer Program membership ($99/year)
2. Create certificates in Apple Developer portal

**Setup**:

1. Create **Developer ID Application** certificate in Apple Developer portal
2. Download and install in Keychain
3. Export as .p12 with password
4. Encode as base64:
```bash
base64 -i Certificates.p12 | pbcopy
```

5. Create App Store Connect API key (recommended) or use Apple ID

6. Add GitHub Secrets:
   - `APPLE_CERTIFICATE`: Base64 .p12 file
   - `APPLE_CERTIFICATE_PASSWORD`: .p12 password
   - `APPLE_SIGNING_IDENTITY`: Certificate name (e.g., "Developer ID Application: Your Name (TEAMID)")
   - `APPLE_API_ISSUER`: Issuer ID from App Store Connect
   - `APPLE_API_KEY`: Key ID
   - `APPLE_API_KEY_PATH`: Path to .p8 key file (or base64 content)

7. Uncomment in `.github/workflows/release.yml`:
```yaml
env:
  APPLE_CERTIFICATE: ${{ secrets.APPLE_CERTIFICATE }}
  APPLE_CERTIFICATE_PASSWORD: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
  APPLE_SIGNING_IDENTITY: ${{ secrets.APPLE_SIGNING_IDENTITY }}
  APPLE_API_ISSUER: ${{ secrets.APPLE_API_ISSUER }}
  APPLE_API_KEY: ${{ secrets.APPLE_API_KEY }}
```

### Phase 4: Automatic Updates (Optional)

#### Step 4.1: Generate Signing Keys

```bash
npm run tauri signer generate
```

Output:
```
Private key: <long-key>
Public key: <long-key>

IMPORTANT: Save your private key securely!
```

**Save private key** to GitHub Secrets:
- `TAURI_SIGNING_PRIVATE_KEY`: The private key
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: Password (if you set one)

**Add public key** to `tauri.conf.json`:
```json
{
  "plugins": {
    "updater": {
      "active": true,
      "pubkey": "YOUR_PUBLIC_KEY_HERE",
      "endpoints": [
        "https://github.com/your-username/trivium/releases/latest/download/latest.json"
      ]
    }
  }
}
```

#### Step 4.2: Install Updater Plugin

```bash
cd src-tauri
cargo add tauri-plugin-updater
cd ..
```

#### Step 4.3: Register Plugin

```rust
// In src-tauri/src/lib.rs
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        // ... other plugins
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

#### Step 4.4: Implement Update Check in Frontend

Create `src/lib/updater.ts`:

```typescript
import { check } from '@tauri-apps/plugin-updater';
import { ask } from '@tauri-apps/plugin-dialog';
import { relaunch } from '@tauri-apps/plugin-process';

export async function checkForUpdates() {
  try {
    const update = await check();

    if (update?.available) {
      const yes = await ask(
        `Update to version ${update.version} is available. Install now?`,
        {
          title: 'Update Available',
          kind: 'info',
        }
      );

      if (yes) {
        await update.downloadAndInstall();
        await relaunch();
      }
    }
  } catch (error) {
    console.error('Failed to check for updates:', error);
  }
}
```

#### Step 4.5: Call Update Check on Startup

```typescript
// In your main App.tsx or index.tsx
import { checkForUpdates } from './lib/updater';

useEffect(() => {
  // Check for updates 5 seconds after app starts
  setTimeout(() => {
    checkForUpdates();
  }, 5000);
}, []);
```

#### Step 4.6: Enable Updater in CI

Uncomment in `.github/workflows/release.yml`:
```yaml
with:
  includeUpdaterJson: true
  updaterJsonPreferNsis: true
env:
  TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
  TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}
```

### Phase 5: Bundle Optimization

#### Step 5.1: Optimize Vite Build

Create or update `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'editor': ['lexical', '@lexical/react'],
          'ui': ['@radix-ui/react-switch', 'lucide-react'],
          'charts': ['recharts'],
        }
      }
    },
    chunkSizeWarningLimit: 1000,
  }
});
```

#### Step 5.2: Optimize Cargo Build

Edit `src-tauri/Cargo.toml`:

```toml
[profile.release]
opt-level = 'z'     # Optimize for size (or '3' for speed)
lto = true          # Link-time optimization
codegen-units = 1   # Better optimization
strip = true        # Remove debug symbols
panic = 'abort'     # Smaller binary
```

#### Step 5.3: Reduce Tokio Features

Edit `src-tauri/Cargo.toml`:

```toml
# Before
tokio = { version = "1", features = ["full"] }

# After (only what you need)
tokio = { version = "1", features = ["rt-multi-thread", "macros", "fs", "sync"] }
```

### Phase 6: Testing

#### Step 6.1: Run Local Tests

```bash
# Frontend tests
npm test

# Rust tests
cd src-tauri
cargo test
cd ..

# Lint checks
cd src-tauri
cargo fmt --check
cargo clippy
cd ..
```

#### Step 6.2: CI Testing

Tests run automatically on every push via `.github/workflows/test.yml`.

View results at: **GitHub** > **Actions** > **Tests**

### Phase 7: Create Your First Release

#### Step 7.1: Update Version

Edit `package.json` and `src-tauri/Cargo.toml`:

```json
// package.json
{
  "version": "0.1.0"  // Update this
}
```

```toml
# src-tauri/Cargo.toml
[package]
version = "0.1.0"  # Update this
```

#### Step 7.2: Commit and Tag

```bash
git add .
git commit -m "Release v0.1.0"
git tag v0.1.0
git push origin main --tags
```

#### Step 7.3: Trigger Release Build

```bash
# Push to release branch
git checkout release
git merge main
git push origin release
```

Or trigger manually via GitHub Actions UI.

#### Step 7.4: Review and Publish

1. Go to **GitHub** > **Releases**
2. Find the draft release created by CI
3. Review the release notes
4. Edit if needed
5. Click **Publish release**

---

## Troubleshooting

### Common Issues

#### Issue 1: "Resource not accessible by integration"

**Cause**: GitHub token lacks write permissions.

**Fix**:
1. Go to **Settings** > **Actions** > **General**
2. Enable **"Read and write permissions"**

#### Issue 2: Platform plugin not found

**Error**: `Cannot find module '@tauri-apps/plugin-os'`

**Fix**:
```bash
npm install @tauri-apps/plugin-os
cd src-tauri
cargo add tauri-plugin-os --features "info"
```

#### Issue 3: SQLx compilation error in CI

**Error**: `error: no database URL specified`

**Fix**: Ensure `.sqlx/` directory is committed to git:
```bash
git add .sqlx/
git commit -m "Add SQLx offline mode data"
```

#### Issue 4: macOS notarization fails

**Cause**: Invalid credentials or free Apple account.

**Fix**:
- Ensure you have a paid Apple Developer account
- Verify API keys are correct
- Check logs in GitHub Actions for specific error

#### Issue 5: Windows SmartScreen warning

**Cause**: Unsigned executable.

**Fix**:
- Sign your executable (see Phase 3.1)
- Or: Users must click "More info" > "Run anyway"

### Getting Help

- **Tauri Discord**: https://discord.com/invite/tauri
- **GitHub Issues**: https://github.com/tauri-apps/tauri/issues
- **Documentation**: https://v2.tauri.app/

---

## Verification Checklist

Use this checklist to verify your cross-platform implementation:

### Basic Setup
- [ ] `@tauri-apps/plugin-os` installed in package.json
- [ ] `tauri-plugin-os` added to Cargo.toml
- [ ] Plugin registered in src-tauri/src/lib.rs
- [ ] Platform utilities work (test with `getPlatform()`)

### CI/CD
- [ ] `.github/workflows/test.yml` exists
- [ ] `.github/workflows/release.yml` exists
- [ ] GitHub Actions permissions set to read/write
- [ ] Test workflow runs successfully on push

### Platform Handling
- [ ] Database path uses platform-aware detection
- [ ] Hotkeys display Cmd/Ctrl correctly
- [ ] No hardcoded path separators in code

### Optional Features
- [ ] Code signing configured (Windows/macOS)
- [ ] Updater plugin installed and configured
- [ ] Bundle optimization applied

### Testing
- [ ] All tests pass locally
- [ ] CI tests pass on all platforms
- [ ] Manual testing performed on target platforms

### Release
- [ ] Version numbers updated in package.json and Cargo.toml
- [ ] Release workflow creates installers for all platforms
- [ ] Installers tested on clean machines

---

## Next Steps

After completing this implementation:

1. **Test thoroughly**: Install on Windows, macOS, and Linux
2. **Monitor feedback**: Watch for platform-specific issues from users
3. **Iterate**: Improve based on real-world usage
4. **Document**: Update README with installation instructions
5. **Automate**: Consider adding automated E2E tests with WebDriver

Good luck with your cross-platform Trivium development!
