import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const district = searchParams.get('district');

    if (!district) {
        return NextResponse.json({ error: 'Missing "district" query parameter' }, { status: 400 });
    }

    try {
        const result = await pool.query(
            'SELECT DISTINCT SUB_DIST FROM kerala_districts WHERE district = $1 ORDER BY SUB_DIST;',
            [district]
        );
        return NextResponse.json(result.rows);
    } catch (err) {
        console.error("Error fetching taluks:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}