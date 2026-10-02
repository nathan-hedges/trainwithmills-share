// Shared upload limits - safe to import in both client and server (no deps).
// The cap applies to the (already compressed) file the browser uploads to R2.
export const MAX_UPLOAD_BYTES = 200 * 1024 * 1024; // 200 MB
export const MAX_UPLOAD_MB = 200;

// Browsers transcode bigger source files in-app; above this the in-browser
// ffmpeg can run out of memory, so we ask for a shorter clip instead.
export const MAX_SOURCE_BYTES = 800 * 1024 * 1024; // 800 MB
export const MAX_SOURCE_MB = 800;
