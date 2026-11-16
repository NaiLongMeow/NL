# Security Policy

English | [简体中文](SECURITY.zh-CN.md)

## Supported versions

NL is in early development (0.x) and does not maintain older releases. Security fixes land on `main` and ship in the next release, so please check whether an issue still exists in the latest release or on `main` before reporting it.

## Reporting a vulnerability

**Do not report security vulnerabilities through public issues, discussions, or pull requests.**

Report them privately through GitHub instead: open the repository's **Security** tab and choose **Report a vulnerability**, or go directly to [the reporting form](https://github.com/NaiLongMeow/NL/security/advisories/new). Only you and the maintainers can see the report.

Please include as much of the following as you can:

- the affected component (for example the gateway, a node, the desktop app, or the ESP32 firmware) and the version or commit;
- what the vulnerability is and what an attacker could achieve with it;
- steps to reproduce it, or a proof of concept;
- a suggested fix, if you have one.

## What happens next

- A maintainer acknowledges the report, investigates it, and keeps you updated in the private advisory.
- If the report is confirmed, the fix is prepared in private and released, and then the advisory is published, with a CVE where appropriate. You are credited in the advisory unless you would rather not be.
- Please keep the details private until the advisory is published.

## Scope

This policy covers the code in this repository and the release artifacts built from it: installers, mobile apps, service binaries, container images, and firmware images. Areas where a flaw would do the most harm include:

- the gateway's login, API key storage, and relay, where a flaw could expose one user's keys or devices to another;
- the protocol and transport between nodes, including message parsing on the ESP32;
- asset pack handling, such as path traversal, oversized packs, or a runtime pack that does not match its pinned digest;
- the desktop app's webview isolation, including content security policy and Tauri permission bypasses;
- the release pipeline, such as artifacts that do not match their checksums or provenance attestations.

Vulnerabilities in third-party dependencies belong with their upstream projects. Tell us as well if NL is affected, so we can update or work around the dependency.
