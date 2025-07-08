import pool from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
  const { roadid } = await params;

  if (!roadid) {
    return NextResponse.json({ error: "Missing roadid" }, { status: 400 });
  }

  try {
    const result = await pool.query(`
        SELECT 
        roadid,
        roadname,
        roadlength,
        munci,
        panch,
        block,
        width,
        surfacetyp,
        soiltype
      FROM roads
      WHERE roadid = $1 AND valid_to IS NULL
        `, [roadid]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Road not found" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
