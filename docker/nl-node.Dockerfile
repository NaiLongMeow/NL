# syntax=docker/dockerfile:1
#
# Runtime image for nl-node. The binary is compiled natively outside Docker (by
# CI or the release workflow) and only copied in, so multi-architecture images
# build in seconds without emulating a Rust compile under QEMU.
#
# Expected build context layout: dist/linux-<arch>/nl-node, where <arch> is
# Docker's TARGETARCH (amd64, arm64).

# distroless/cc ships glibc and libgcc but no shell or package manager, which
# keeps the image small and leaves little to exploit. "nonroot" runs as an
# unprivileged user. Debian 12's glibc is newer than the Ubuntu 22.04 one the
# binaries are linked against, so they run unchanged.
FROM gcr.io/distroless/cc-debian12:nonroot

ARG TARGETARCH
# upload-artifact drops the executable bit, so set it while copying.
COPY --chmod=755 dist/linux-${TARGETARCH}/nl-node /usr/local/bin/nl-node

# Inside a container the service must listen on all interfaces to be reachable.
ENV NL_NODE_LISTEN=0.0.0.0:7870
EXPOSE 7870
ENTRYPOINT ["/usr/local/bin/nl-node"]
