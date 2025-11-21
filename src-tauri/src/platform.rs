/**
 * Platform-specific utilities for Trivium
 * Handles platform-specific behavior in the Rust backend
 */

use std::path::PathBuf;

/// Platform-specific initialization
/// Called during app startup to configure platform-specific features
#[cfg(target_os = "windows")]
pub fn platform_specific_setup() {
    println!("Initializing Windows-specific features");
    // Windows-specific setup here
    // Example: Configure Windows-specific window decorations
}

#[cfg(target_os = "macos")]
pub fn platform_specific_setup() {
    println!("Initializing macOS-specific features");
    // macOS-specific setup here
    // Example: Configure macOS menu bar
}

#[cfg(target_os = "linux")]
pub fn platform_specific_setup() {
    println!("Initializing Linux-specific features");
    // Linux-specific setup here
    // Example: Configure system tray icon
}

/// Get platform-specific data directory
/// This is where the SQLite database should be stored
pub fn get_data_dir(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))
}

/// Get platform-specific config directory
pub fn get_config_dir(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    app_handle
        .path()
        .app_config_dir()
        .map_err(|e| format!("Failed to get app config directory: {}", e))
}

/// Get platform-specific cache directory
pub fn get_cache_dir(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    app_handle
        .path()
        .app_cache_dir()
        .map_err(|e| format!("Failed to get app cache directory: {}", e))
}

/// Cross-platform path joining
/// Use this instead of manual path construction
pub fn join_path(base: &PathBuf, segments: &[&str]) -> PathBuf {
    let mut path = base.clone();
    for segment in segments {
        path.push(segment);
    }
    path
}

/// Ensure a directory exists, creating it if necessary
pub fn ensure_dir_exists(path: &PathBuf) -> Result<(), String> {
    if !path.exists() {
        std::fs::create_dir_all(path)
            .map_err(|e| format!("Failed to create directory {:?}: {}", path, e))?;
    }
    Ok(())
}

/// Get the database path for the current platform
pub fn get_database_path(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    let data_dir = get_data_dir(app_handle)?;
    ensure_dir_exists(&data_dir)?;

    let db_path = join_path(&data_dir, &["trivium.db"]);
    Ok(db_path)
}

/// Platform-specific file operations
#[cfg(target_os = "windows")]
pub fn open_file_manager(path: &PathBuf) -> Result<(), String> {
    use std::process::Command;

    Command::new("explorer")
        .arg(path)
        .spawn()
        .map_err(|e| format!("Failed to open file manager: {}", e))?;

    Ok(())
}

#[cfg(target_os = "macos")]
pub fn open_file_manager(path: &PathBuf) -> Result<(), String> {
    use std::process::Command;

    Command::new("open")
        .arg(path)
        .spawn()
        .map_err(|e| format!("Failed to open file manager: {}", e))?;

    Ok(())
}

#[cfg(target_os = "linux")]
pub fn open_file_manager(path: &PathBuf) -> Result<(), String> {
    use std::process::Command;

    // Try xdg-open first (most compatible)
    let result = Command::new("xdg-open")
        .arg(path)
        .spawn();

    if result.is_ok() {
        return Ok(());
    }

    // Fallback to common file managers
    let file_managers = ["nautilus", "dolphin", "thunar", "nemo", "caja"];

    for fm in &file_managers {
        if let Ok(_) = Command::new(fm).arg(path).spawn() {
            return Ok(());
        }
    }

    Err("No file manager found".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_join_path() {
        let base = PathBuf::from("/tmp");
        let result = join_path(&base, &["foo", "bar", "baz.txt"]);

        #[cfg(target_os = "windows")]
        assert_eq!(result, PathBuf::from("\\tmp\\foo\\bar\\baz.txt"));

        #[cfg(not(target_os = "windows"))]
        assert_eq!(result, PathBuf::from("/tmp/foo/bar/baz.txt"));
    }
}
