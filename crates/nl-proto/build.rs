//! Generates Rust types from the shared `.proto` files at build time.
//!
//! The schema lives at the repository root (`proto/`) because it is shared with
//! non-Rust ends; this script compiles it with protox (no `protoc` required) and
//! hands the resulting descriptors to prost-build for code generation.

use std::path::PathBuf;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let proto_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../proto");
    let files = [proto_root.join("nl/v1/node.proto")];

    // Rebuild whenever any schema file changes, not only the ones listed above.
    println!("cargo:rerun-if-changed={}", proto_root.display());

    let descriptors = protox::compile(&files, [&proto_root])?;
    prost_build::Config::new().compile_fds(descriptors)?;
    Ok(())
}
