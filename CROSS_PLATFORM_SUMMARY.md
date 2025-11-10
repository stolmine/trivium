# Cross-Platform Development - Quick Reference

## Documents Created

1. **CROSS_PLATFORM_GUIDE.md** (37KB) - Comprehensive reference guide
   - Detailed explanations of all cross-platform concepts
   - Best practices and pitfalls
   - Platform-specific considerations
   - Performance optimization strategies

2. **CROSS_PLATFORM_IMPLEMENTATION.md** (17KB) - Step-by-step implementation
   - Quick 5-minute setup guide
   - Detailed phase-by-phase implementation
   - Troubleshooting common issues
   - Verification checklist

3. **tauri.conf.examples.json** - Configuration examples
   - Copy-paste ready configurations
   - Platform-specific settings
   - Production-ready templates

## Files Created/Modified

### Created:
- `/Users/why/repos/trivium/.github/workflows/test.yml` - Automated testing on all platforms
- `/Users/why/repos/trivium/.github/workflows/release.yml` - Multi-platform release builds
- `/Users/why/repos/trivium/src-tauri/src/platform.rs` - Rust platform utilities

### Enhanced:
- `/Users/why/repos/trivium/src/lib/utils/platform.ts` - Frontend platform detection (enhanced with Tauri support)

## Quick Start (5 Minutes)

```bash
# 1. Install OS plugin
npm install @tauri-apps/plugin-os
cd src-tauri && cargo add tauri-plugin-os --features "info" && cd ..

# 2. Update src-tauri/src/lib.rs - add this line:
# .plugin(tauri_plugin_os::init())

# 3. Commit and push
git add .
git commit -m "Add cross-platform support and CI/CD"
git push

# 4. Enable GitHub Actions permissions:
# GitHub Settings > Actions > General > Workflow permissions > Read and write

# Done! CI/CD will now build for Windows, macOS, and Linux automatically
```

## Key Takeaways

### 1. No True Cross-Compilation
- Cannot build Windows apps on macOS/Linux (or vice versa)
- **Solution**: Use GitHub Actions with matrix builds
- Builds happen simultaneously on Windows, macOS, and Linux runners

### 2. Platform Differences Matter

**WebView Engines**:
- Windows: Edge WebView2 (Chromium)
- macOS: WebKit (Safari engine)
- Linux: WebKitGTK

**Impact**: CSS/JS may render differently. Test on all platforms.

**File Paths**:
- Windows: `C:\Users\Name\AppData\...`
- macOS: `/Users/Name/Library/Application Support/...`
- Linux: `/home/name/.config/...` or `.local/share/...`

**Solution**: Use Tauri's path APIs (`app_data_dir()`, `config_dir()`, etc.)

### 3. Code Signing

**Windows**:
- Optional but strongly recommended
- Avoids SmartScreen warnings
- Requires purchased certificate ($100-300/year)

**macOS**:
- **REQUIRED** for macOS Catalina and later
- Requires Apple Developer Program ($99/year)
- Must be notarized (free accounts cannot notarize)

**Linux**:
- No code signing required

### 4. Bundle Sizes (Typical)

| Platform | Installer | Installed |
|----------|-----------|-----------|
| Windows (NSIS) | 5-15 MB | 20-40 MB |
| macOS (DMG) | 5-15 MB | 20-40 MB |
| Linux (AppImage) | 70-150 MB | 70-150 MB |
| Linux (DEB) | 5-15 MB | 20-40 MB |

**Note**: AppImage is larger because it bundles all dependencies.

### 5. CI/CD Workflow

**Test Workflow** (runs on every push/PR):
- Runs tests on Windows, macOS, Linux
- Checks code formatting (cargo fmt)
- Runs linter (cargo clippy)

**Release Workflow** (manual or on release branch):
- Builds installers for all platforms:
  - Windows: x64 NSIS/MSI
  - macOS: Intel and Apple Silicon DMG
  - Linux: AppImage, DEB, RPM
- Creates GitHub Release (draft)
- Uploads all artifacts

### 6. Distribution Formats

**Windows**:
- **NSIS** (recommended): `.exe` installer, cross-platform build support
- **MSI**: `.msi` installer, requires Windows to build, enterprise-friendly

**macOS**:
- **DMG**: Disk image for distribution (recommended)
- **APP**: Application bundle (included in DMG)

**Linux**:
- **AppImage** (recommended): Self-contained, works everywhere
- **DEB**: Debian/Ubuntu packages
- **RPM**: Fedora/RHEL/CentOS packages

### 7. Automatic Updates (Optional)

**Setup**:
1. Generate signing keys: `npm run tauri signer generate`
2. Add public key to `tauri.conf.json`
3. Add private key to GitHub Secrets
4. Enable in CI: `includeUpdaterJson: true`

**Benefits**:
- Users get updates automatically
- Seamless update experience
- Security through signed updates

## Next Steps

### Immediate (Required for CI/CD):
1. Install `@tauri-apps/plugin-os` plugin
2. Register plugin in `src-tauri/src/lib.rs`
3. Enable GitHub Actions permissions
4. Push to trigger CI/CD

### Short-term (Recommended):
1. Test CI/CD workflows
2. Update database path handling to use platform utilities
3. Review and customize `tauri.conf.json`
4. Set up code signing (Windows/macOS)

### Medium-term (For Production):
1. Implement automatic updates
2. Optimize bundle size
3. Add E2E tests
4. Create user installation guides

### Long-term (Ongoing):
1. Monitor platform-specific issues
2. Test on all target platforms
3. Gather user feedback
4. Iterate and improve

## Common Commands

```bash
# Development
npm run dev                      # Run in dev mode
npm run build                    # Build frontend
npm run tauri build              # Build for current platform

# Testing
npm test                         # Frontend tests
cd src-tauri && cargo test       # Rust tests

# Platform-specific builds (local)
npm run tauri build -- --target aarch64-apple-darwin  # macOS ARM
npm run tauri build -- --target x86_64-apple-darwin   # macOS Intel
npm run tauri build -- --bundles nsis                 # Windows NSIS
npm run tauri build -- --bundles appimage             # Linux AppImage

# CI/CD
gh workflow run release.yml      # Trigger release
gh run list                      # List workflow runs
gh run download <run-id>         # Download artifacts

# Updates
npm run tauri signer generate    # Generate updater keys
```

## Resources

**Documentation**:
- [Tauri v2 Docs](https://v2.tauri.app/)
- [GitHub Actions Guide](https://v2.tauri.app/distribute/pipelines/github/)
- [Code Signing Guide](https://v2.tauri.app/distribute/sign/macos/)

**Community**:
- [Tauri Discord](https://discord.com/invite/tauri)
- [GitHub Discussions](https://github.com/tauri-apps/tauri/discussions)
- [Awesome Tauri](https://github.com/tauri-apps/awesome-tauri)

**Tools**:
- [tauri-action](https://github.com/tauri-apps/tauri-action) - GitHub Action for building
- [tauri-driver](https://crates.io/crates/tauri-driver) - WebDriver for E2E tests

## Support Matrix

| Feature | Windows | macOS | Linux |
|---------|---------|-------|-------|
| Build on platform | ✅ | ✅ | ✅ |
| Cross-compile from | ❌ | ❌ | ❌ |
| CI/CD support | ✅ | ✅ | ✅ |
| Code signing | Optional | Required | Not needed |
| Auto-updates | ✅ | ✅ | ✅ (AppImage) |
| WebDriver tests | ✅ | ✅ | ✅ |

## Troubleshooting

**Issue**: "Resource not accessible by integration"
**Fix**: Enable write permissions in GitHub Actions settings

**Issue**: Platform plugin not found
**Fix**: `npm install @tauri-apps/plugin-os`

**Issue**: SQLx compilation error
**Fix**: Ensure `.sqlx/` is committed to git

**Issue**: macOS notarization fails
**Fix**: Requires paid Apple Developer account ($99/year)

**Issue**: Windows SmartScreen warning
**Fix**: Code sign your executable

## Contact

For issues specific to Trivium, open a GitHub issue.
For Tauri questions, use the [Tauri Discord](https://discord.com/invite/tauri).

---

**Ready to get started?** Follow the 5-minute setup above, then refer to CROSS_PLATFORM_IMPLEMENTATION.md for detailed steps.
