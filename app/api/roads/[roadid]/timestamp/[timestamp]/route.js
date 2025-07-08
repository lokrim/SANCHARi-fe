import pool from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req, context) {
    const { roadid, timestamp } = await context.params;

    if (!roadid) {
        return NextResponse.json({ error: "Missing roadid" }, { status: 400 });
    }

    if (!timestamp) {
        return NextResponse.json({ error: "Missing timestamp" }, { status: 400 });
    }

    try {
        const result = await pool.query(
            `SELECT json_build_object(
        'type', 'Feature',
        'geometry', ST_AsGeoJSON(geom)::json,
        'properties', json_build_object(
          'roadid', roadid,
          'edited_by', edited_by,
          'edit_reason', edit_reason,
          'valid_from', valid_from
        )
      ) AS feature
      FROM roads
      WHERE roadid = $1 AND date_trunc('second', valid_from) = $2::timestamp`,
            [roadid, timestamp]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: "Version not found" }, { status: 404 });
        }

        return NextResponse.json(result.rows[0].feature);
    } catch (error) {
        console.error("Error fetching versioned road:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
