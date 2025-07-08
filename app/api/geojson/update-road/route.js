import pool from "@/lib/db";
import { NextResponse } from "next/server";

export async function PUT(req) {
  try {
    const { updates, edited_by, edit_reason } = await req.json();

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      for (const { id, geometry } of updates) {
        await client.query(
          `INSERT INTO roads (
             roadid, geom, edited_by, edit_reason
           ) VALUES (
             $1, ST_SetSRID(ST_GeomFromGeoJSON($2), 4326), $3, $4
           )`,
          [id, JSON.stringify(geometry), edited_by, edit_reason]
        );
      }

      await client.query("COMMIT");
      return NextResponse.json({ success: true });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Transaction error:", err);
      return NextResponse.json(
        { error: "Failed to update one or more roads" },
        { status: 500 }
      );
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Request processing error:", error);
    return NextResponse.json(
      { error: "Invalid request format" },
      { status: 400 }
    );
  }
}
