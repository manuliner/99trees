# Client media utils

**Purpose:** Browser-side validation and ffmpeg.wasm transcode before turn submission.

- **validate.ts** — size, MIME, and allowed kind checks against `#shared/media-limits`
- **video-transcode.ts** — trim/encode passes for large videos
- **prepare.ts** — orchestrates compress/transcode pipeline
- **index.ts** — public exports for `MediaTaskUpload`
