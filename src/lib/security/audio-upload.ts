import type { ReferenceAudioPayload } from "../types";
export const maxAudioBytes = 10 * 1024 * 1024;
export function validateAudioPayload(audio: ReferenceAudioPayload) {
  const match = /^data:(audio\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/]*={0,2})$/.exec(audio.dataUrl);
  if (!match || match[2].length > Math.ceil(maxAudioBytes / 3) * 4) throw new Error("Invalid audio upload");
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > maxAudioBytes || bytes.length !== audio.size || match[1] !== audio.mimeType) throw new Error("Audio upload size or MIME mismatch");
  const wav = bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WAVE";
  const mp3 = bytes.toString("ascii", 0, 3) === "ID3" || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0);
  const mp4 = bytes.toString("ascii", 4, 8) === "ftyp";
  const flac = bytes.toString("ascii", 0, 4) === "fLaC";
  const ogg = bytes.toString("ascii", 0, 4) === "OggS";
  const allowed = wav ? ["audio/wav", "audio/x-wav", "audio/wave"] : mp4 ? ["audio/mp4", "audio/m4a", "audio/x-m4a"] : flac ? ["audio/flac", "audio/x-flac"] : ogg ? ["audio/ogg", "audio/opus"] : mp3 ? ["audio/mpeg", "audio/mp3"] : [];
  if (!allowed.includes(audio.mimeType)) throw new Error("Audio MIME does not match its contents. Export a WAV or M4A clip.");
  if (!wav && !mp3 && !mp4 && !flac && !ogg) throw new Error("Unsupported audio bytes. Use WAV, MP3, M4A, FLAC, or Ogg.");
  return bytes;
}

export function audioExtension(bytes: Buffer) {
  if (bytes.toString("ascii", 0, 4) === "RIFF") return ".wav";
  if (bytes.toString("ascii", 4, 8) === "ftyp") return ".m4a";
  if (bytes.toString("ascii", 0, 4) === "fLaC") return ".flac";
  if (bytes.toString("ascii", 0, 4) === "OggS") return ".ogg";
  return ".mp3";
}
