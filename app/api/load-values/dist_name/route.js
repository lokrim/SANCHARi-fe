import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const result = await pool.query('SELECT DISTINCT district FROM kerala_districts ORDER BY district;');
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching districts:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}