// Exposes the ESP-IDF build environment (linker args, cfgs) that esp-idf-sys
// computed, so this crate links against the same ESP-IDF build.
fn main() {
    embuild::espidf::sysenv::output();
}
