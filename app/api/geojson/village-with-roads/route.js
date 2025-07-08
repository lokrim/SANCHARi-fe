import pool from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const district = searchParams.get("district");
  const sub_dist = searchParams.get("sub_dist");
  const name = searchParams.get("name");

  if (!district || !sub_dist || !name) {
    return NextResponse.json(
      { error: "Missing district, sub_dist, or name in query." },
      { status: 400 }
    );
  }

  try {
    // Fetch village geometry
    const villageQuery = `
      SELECT name, district, sub_dist, ST_AsGeoJSON(ST_Force2D(geom))::json AS geometry
      FROM kerala_districts
      WHERE district = $1 AND sub_dist = $2 AND name = $3
      LIMIT 1
    `;
    const villageRes = await pool.query(villageQuery, [district, sub_dist, name]);

    if (villageRes.rows.length === 0) {
      return NextResponse.json({ error: "Village not found." }, { status: 404 });
    }

    const villageFeature = {
      type: "Feature",
      properties: {
        name: villageRes.rows[0].name,
        district: villageRes.rows[0].district,
        sub_dist: villageRes.rows[0].sub_dist,
      },
      geometry: villageRes.rows[0].geometry,
    };

    // Fetch only the latest road versions (valid_to IS NULL)
    const roadsQuery = `
      SELECT
        id, roadid, roadname, surfacetyp, roadtype, width,
        ST_AsGeoJSON(ST_Force2D(geom))::json AS geometry
      FROM roads
      WHERE valid_to IS NULL
        AND ST_Intersects(geom, (
          SELECT geom FROM kerala_districts
          WHERE district = $1 AND sub_dist = $2 AND name = $3
          LIMIT 1
        ))
    `;

    const roadsRes = await pool.query(roadsQuery, [district, sub_dist, name]);

    const roadFeatures = roadsRes.rows.map((row) => ({
      type: "Feature",
      properties: {
        id: row.id,
        roadid: row.roadid,
        roadname: row.roadname,
        surfacetyp: row.surfacetyp,
        roadtype: row.roadtype,
        width: row.width,
      },
      geometry: row.geometry,
    }));

    return NextResponse.json({
      roads: {
        type: "FeatureCollection",
        features: roadFeatures,
      },
      village: villageFeature,
    });
  } catch (err) {
    console.error("DB error:", err);
    return NextResponse.json(
      { error: "Failed to fetch village and roads." },
      { status: 500 }
    );
  }
}
