import { NextResponse } from "next/server";
import { touchActivity } from "@/lib/cloud/runtime";
export const runtime = "nodejs";
export async function POST() { await touchActivity(); return NextResponse.json({ ok: true }); }
