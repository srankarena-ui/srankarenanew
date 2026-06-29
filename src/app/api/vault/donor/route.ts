import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/core/supabase/server"

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { asset_id, username } = await req.json() as { asset_id: string; username: string | null }

  let donorId: string | null = null
  if (username?.trim()) {
    const { data: donor } = await supabase
      .from("profiles").select("id").eq("username", username.trim()).maybeSingle()
    if (!donor) return NextResponse.json({ error: `No existe el usuario "${username.trim()}"` }, { status: 404 })
    donorId = donor.id
  }

  const { error } = await supabase
    .from("vault_items").update({ donor_profile_id: donorId }).eq("asset_id", asset_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
