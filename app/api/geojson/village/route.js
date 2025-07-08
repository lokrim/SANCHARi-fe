import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const district = searchParams.get('district');
  const sub_dist = searchParams.get('sub_dist');
  const name = searchParams.get('name');

  if (!district || !sub_dist || !name) {
    return NextResponse.json({error: 'Missing query parameters'}, {status: 400});
  }

  try {
    const result = await pool.query(
      `SELECT jsonb_build_object(
         'type', 'FeatureCollection',
         'features', jsonb_agg(
           jsonb_build_object(
             'type', 'Feature',
             'geometry', ST_AsGeoJSON(geom)::jsonb,
             'properties', jsonb_build_object(
               'name', name,
               'district', district,
               'sub_dist', sub_dist
             )
           )
         )
       ) AS geojson
       FROM kerala_districts
       WHERE name = $1 AND sub_dist = $2 AND district = $3;`,
      [name, sub_dist, district]
    );

    if (!result.rows[0].geojson) {
      return NextResponse.json({error: 'Feature not found'}, {status: 404});
    }

    return NextResponse.json(result.rows[0].geojson);
  } catch (err) {
    console.error('Error fetching GeoJSON:', err);
    return NextResponse.json({error: 'Internal Server Error'}, {status: 500});
  }
}
