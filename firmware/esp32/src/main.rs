//! NL firmware for ESP32-S3.
//!
//! The device is a lightweight node: it captures and plays audio and drives
//! sensors and actuators, while language models, speech recognition and
//! synthesis, storage, and sub-agents run on stronger nodes (see
//! docs/architecture.md, "物联网端"). This entry point currently only boots and
//! prepares the Hello it will send once networking is in place.

use nl_proto::Message;
use nl_proto::v1::{Capability, Hello, PROTOCOL_VERSION};

fn main() {
    // Required once at startup so esp-idf-sys's runtime patches get linked in;
    // see https://github.com/esp-rs/esp-idf-template/issues/71.
    esp_idf_svc::sys::link_patches();

    // Route the `log` crate to ESP-IDF's logger (visible on the serial monitor).
    esp_idf_svc::log::EspLogger::initialize_default();

    let hello = Hello {
        node_id: "esp32s3-dev".into(),
        protocol_version: PROTOCOL_VERSION,
        capabilities: vec![Capability::AudioIo as i32],
    };
    log::info!(
        "NL firmware booted; Hello encodes to {} bytes",
        hello.encoded_len()
    );
}
