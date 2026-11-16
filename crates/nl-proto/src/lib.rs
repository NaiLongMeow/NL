//! NL wire protocol.
//!
//! Every NL end (ESP32 firmware, mobile, desktop, cloud nodes, gateway) talks in
//! the messages defined under `proto/` at the repository root. This crate is the
//! Rust view of that schema. It is `no_std` (it only needs `alloc`) so that the
//! firmware and the full nodes share one implementation and one set of tests.
//!
//! Messages are versioned by protobuf package: `nl.v1` lives in [`v1`].

#![no_std]

extern crate alloc;

/// Messages of protocol package `nl.v1`.
pub mod v1 {
    include!(concat!(env!("OUT_DIR"), "/nl.v1.rs"));

    /// Protocol revision implemented by this build. Sent in [`Hello`] so peers
    /// can refuse sessions they cannot understand.
    pub const PROTOCOL_VERSION: u32 = 1;
}

pub use prost::Message;

#[cfg(test)]
mod tests {
    use super::Message;
    use super::v1::{Capability, Envelope, Hello, PROTOCOL_VERSION, envelope::Body};
    use alloc::string::ToString;
    use alloc::vec;

    fn sample_envelope() -> Envelope {
        Envelope {
            message_id: "m-1".to_string(),
            body: Some(Body::Hello(Hello {
                node_id: "node-a".to_string(),
                protocol_version: PROTOCOL_VERSION,
                capabilities: vec![Capability::AudioIo as i32, Capability::Storage as i32],
            })),
        }
    }

    #[test]
    fn envelope_round_trips_through_bytes() {
        let original = sample_envelope();
        let bytes = original.encode_to_vec();
        let decoded = Envelope::decode(bytes.as_slice()).expect("valid encoding decodes");
        assert_eq!(decoded, original);
    }

    #[test]
    fn capabilities_decode_to_known_variants() {
        let Some(Body::Hello(hello)) = sample_envelope().body else {
            panic!("sample envelope carries a Hello");
        };
        let caps: alloc::vec::Vec<Capability> = hello.capabilities().collect();
        assert_eq!(caps, vec![Capability::AudioIo, Capability::Storage]);
    }

    #[test]
    fn truncated_input_is_rejected() {
        let bytes = sample_envelope().encode_to_vec();
        assert!(Envelope::decode(&bytes[..bytes.len() - 1]).is_err());
    }
}
