use std::path::{Path, PathBuf};

/// Steam app id for Tyr. Its Proton prefix lives at steamapps/compatdata/<id>.
const TYR_STEAM_APP_ID: &str = "2445260";

/// Where Steam lists the disks it keeps games on, relative to the home folder.
const STEAM_LIBRARY_FILES: [&str; 3] = [
    ".steam/steam/steamapps/libraryfolders.vdf",
    ".local/share/Steam/steamapps/libraryfolders.vdf",
    ".var/app/com.valvesoftware.Steam/data/Steam/steamapps/libraryfolders.vdf",
];

/// Inside a Proton prefix, this is what Windows calls %LOCALAPPDATA%.
const PROTON_LOCAL_APPDATA: &str = "pfx/drive_c/users/steamuser/AppData/Local";

/// Pulls the "path" entries out of Steam's libraryfolders.vdf, which look like:
/// `    "path"    "/mnt/games/SteamLibrary"`
fn library_roots(vdf: &str) -> Vec<String> {
    vdf.lines()
        .filter_map(|line| {
            let mut quoted = line.split('"').skip(1);
            match (quoted.next(), quoted.next(), quoted.next()) {
                (Some("path"), _, Some(path)) => Some(path.to_string()),
                _ => None,
            }
        })
        .collect()
}

/// Finds the folder Tyr writes replays to.
///
/// On Linux the game runs under Proton, so its %LOCALAPPDATA% is a folder inside
/// the Wine prefix rather than anywhere in the real home directory. The result is
/// canonicalized because the home directory is a symlink farm on ostree systems
/// (`/home` -> `/var/home`), and the fs plugin's scope check compares resolved paths.
#[tauri::command]
fn tyr_demos_folder() -> Option<String> {
    let home = PathBuf::from(std::env::var("HOME").ok()?);

    for library_file in STEAM_LIBRARY_FILES {
        let Ok(vdf) = std::fs::read_to_string(home.join(library_file)) else {
            continue;
        };

        for root in library_roots(&vdf) {
            let prefix = Path::new(&root)
                .join("steamapps/compatdata")
                .join(TYR_STEAM_APP_ID);
            if !prefix.exists() {
                continue;
            }

            let prefix = prefix.canonicalize().unwrap_or(prefix);
            // Returned even when Demos/ is missing: Tyr creates it on the first replay.
            let demos = prefix.join(PROTON_LOCAL_APPDATA).join("Tyr/Saved/Demos");
            return Some(demos.to_string_lossy().into_owned());
        }
    }

    None
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![tyr_demos_folder])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::library_roots;

    #[test]
    fn reads_path_entries_from_libraryfolders_vdf() {
        let vdf = r#"
"libraryfolders"
{
	"0"
	{
		"path"		"/home/user/.local/share/Steam"
		"label"		""
	}
	"1"
	{
		"path"		"/mnt/games/SteamLibrary"
	}
}
"#;
        assert_eq!(
            library_roots(vdf),
            vec![
                "/home/user/.local/share/Steam".to_string(),
                "/mnt/games/SteamLibrary".to_string()
            ]
        );
    }

    #[test]
    fn ignores_unrelated_vdf_keys() {
        let vdf = "\t\"label\"\t\t\"Games\"\n\t\"contentid\"\t\t\"123\"\n";
        assert!(library_roots(vdf).is_empty());
    }
}
