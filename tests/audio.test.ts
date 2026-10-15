import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { encodePcm24Wav, validatePcm24MasterBuffer, mergeWavFiles, pcm24DurationSeconds, getPunctuationAwarePauseMilliseconds } from "../src/lib/audio-utils";
import { splitScriptIntoChunks } from "../src/lib/script-chunker";

test("original PCM pipeline preserves 48kHz mono 24-bit master and punctuation pauses", async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "thalika-audio-"));
  try {
    const samples = Float32Array.from({ length: 4800 }, (_, i) => Math.sin(i / 48000 * 440 * Math.PI * 2) * .1);
    const wav = encodePcm24Wav([samples], 48000); validatePcm24MasterBuffer(wav);
    assert.equal(wav.toString("ascii", 0, 4), "RIFF"); assert.equal(wav.toString("ascii", 8, 12), "WAVE");
    assert.equal(wav.readUInt16LE(22), 1); assert.equal(wav.readUInt32LE(24), 48000); assert.equal(wav.readUInt16LE(34), 24);
    await fs.writeFile(path.join(temp,"a.wav"),wav); await fs.writeFile(path.join(temp,"b.wav"),wav);
    await mergeWavFiles([path.join(temp,"a.wav"),path.join(temp,"b.wav")],path.join(temp,"out.wav"),[260]);
    const merged = await fs.readFile(path.join(temp,"out.wav")); validatePcm24MasterBuffer(merged);
    assert.ok(pcm24DurationSeconds(merged) >= .2);
    assert.equal(getPunctuationAwarePauseMilliseconds("မြန်မာစာ။"),260);
    assert.equal(getPunctuationAwarePauseMilliseconds("မြန်မာစာ၊"),160);
    assert.ok(splitScriptIntoChunks("မြန်မာစာကို ဖတ်ကြည့်ပါ။ ".repeat(40),180).length > 1);
  } finally { await fs.rm(temp,{recursive:true,force:true}); }
});
