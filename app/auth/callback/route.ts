import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  // DEBUG: Supabase/Google sent an error instead of a code
  const providerError = searchParams.get("error_description") ?? searchParams.get("error");
  if (providerError) {
    console.error("AUTH CALLBACK provider error:", providerError);
    return NextResponse.redirect(`${origin}/login?error=auth&reason=${encodeURIComponent(providerError)}`);
  }

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${safeNext}`);
    console.error("AUTH CALLBACK exchange error:", error.message);
    return NextResponse.redirect(`${origin}/login?error=auth&reason=${encodeURIComponent(error.message)}`);
  }

  console.error("AUTH CALLBACK: no code in URL:", request.url);
  return NextResponse.redirect(`${origin}/login?error=auth&reason=no_code`);
}