import pool from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
  const { roadid } = await params;

  try {
    const result = await pool.query(
      `SELECT 
        roadid, 
        to_char(valid_from, 'YYYY-MM-DD"T"HH24:MI:SS') as valid_from,
        edited_by, 
        edit_reason 
      FROM roads 
      WHERE roadid = $1 
      ORDER BY valid_from DESC
`,
      [roadid]
    );

    return NextResponse.json(result.rows);
  } catch (err) {
    console.error("Error fetching road version history:", err);
    return NextResponse.json(
      { error: "Failed to fetch version history" },
      { status: 500 }
    );
  }
}
