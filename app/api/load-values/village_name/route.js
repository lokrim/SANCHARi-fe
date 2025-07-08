import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const district = searchParams.get('district');
  const sub_dist = searchParams.get('sub_dist');

  if (!district || !sub_dist) {
    return NextResponse.json({ error: 'Missing query parameters' }, { status: 400 });
  }

  try {
    const result = await pool.query(
      'SELECT DISTINCT name FROM kerala_districts WHERE district = $1 AND sub_dist = $2 ORDER BY NAME;',
      [district, sub_dist]
    );
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error("Error fetching villages:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
