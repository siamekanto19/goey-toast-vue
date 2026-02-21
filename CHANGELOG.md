# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-02

### Added

- Organic blob morph animation (pill to blob and back)
- Five toast types: default, success, error, warning, info
- Description body with string or VNodeChild support
- Action button with optional success label morph-back
- Promise toasts with loading to success/error transitions
- Configurable timing: expand delay, morph duration, collapse, display
- Position support: top-left, top-right, bottom-left, bottom-right
- Right-side positions auto-mirror the blob horizontally
- Pre-dismiss collapse animation (blob shrinks to pill before exit)
- Custom fill color, border color, and border width
- CSS class overrides via classNames prop
- Built on vue-sonner and Motion
