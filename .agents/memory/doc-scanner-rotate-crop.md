---
name: doc-scanner rotate/crop pipeline
description: How CropCanvas handles image rotation and when it suggests auto-rotate, for the DocScan document scanner PWA.
---

`CropCanvas` owns rotation locally (`workingSrc` state) rather than the parent page. Rotating re-renders a new
data URL via an offscreen canvas (swap width/height, rotate 90°) and resets the crop corners to a default inset
rectangle — the previous quadrilateral does not map cleanly across a 90° rotation, so remapping old corners was
skipped in favor of a fresh default.

**Why:** Keeping rotation state inside `CropCanvas` avoids plumbing rotation state through every caller; the
crop-confirm callback signature was changed to `onApply(corners, rotatedImageSrc)` so callers (`Capture.tsx`,
`Editor.tsx`) always run the final perspective transform against the possibly-rotated image, not the original.

**Auto-rotate suggestion heuristic:** compare `naturalWidth > naturalHeight` (image orientation) against the
bounding-box orientation of the initially detected document corners. If they disagree (e.g. a portrait document
photographed in landscape camera mode), show a one-tap "looks sideways, tap to rotate" pill once per crop session.
This is a coarse heuristic (no EXIF/OCR skew detection) — good enough for the common sideways-capture case, not a
general orientation classifier.

**How to apply:** If extending crop/rotate behavior, keep the rotation transform and corner-reset logic inside
`CropCanvas`, and remember any caller of its `onApply` must accept the second `rotatedImageSrc` argument.
