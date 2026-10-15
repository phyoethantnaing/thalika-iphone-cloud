import { NextResponse } from "next/server";
import { storageUsage } from "@/lib/cloud/storage";
export const runtime = "nodejs";
export async function GET() { return NextResponse.json(await storageUsage()); }
