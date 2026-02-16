import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function requireUserId() {
  const { userId } = await auth();

  if (!userId) {
    return {
      userId: null,
      unauthorized: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { userId, unauthorized: null };
}
