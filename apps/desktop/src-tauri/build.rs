// Generates Tauri's build-time context: app configuration, capabilities
// (permission files under capabilities/), and icons.
fn main() {
    tauri_build::build()
}
