import { NextResponse } from "next/server";
import { getVoiceProfile } from "@/lib/storage/voice-profile-store";
import { validateAudioPayload } from "@/lib/security/audio-upload";
export const runtime = "nodejs";
export async function GET(_request: Request, context: { params: Promise<{ profileId: string }> }) {
  try { const { referenceAudio } = await getVoiceProfile((await context.params).profileId); const bytes = validateAudioPayload(referenceAudio); return new NextResponse(bytes, { headers: { "Content-Type": referenceAudio.mimeType, "Cache-Control": "no-store", "Content-Length": String(bytes.length) } }); }
  catch { return NextResponse.json({ error: "Profile audio not found" }, { status: 404 }); }
}
