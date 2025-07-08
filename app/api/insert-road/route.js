export async function POST(request) {
  try {
    // Build your WFS-T XML payload
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<wfs:Transaction service="WFS" version="1.1.0"
  xmlns:wfs="http://www.opengis.net/wfs"
  xmlns:gml="http://www.opengis.net/gml"
  xmlns:ne="https://www.naturalearthdata.com">
  <wfs:Insert>
    <ne:road_new>
      <ne:geom>
        <gml:LineString srsName="EPSG:4326">
          <gml:coordinates>
            77.1,12.9 77.2,12.95 77.3,12.97
          </gml:coordinates>
        </gml:LineString>
      </ne:geom>
      <ne:updated_at>2025-06-27T12:00:00Z</ne:updated_at>
    </ne:road_new>
  </wfs:Insert>
</wfs:Transaction>`;

    // Send request to GeoServer
    const geoRes = await fetch('http://localhost:8080/geoserver/wfs', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml',
        'Authorization': 'Basic ' + Buffer.from('admin:geoserver').toString('base64'),
      },
      body: xml,
    });

    const text = await geoRes.text();

    // Return the response
    if (geoRes.ok) {
      return new Response(JSON.stringify({
        success: true,
        response: text,
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } else {
      return new Response(JSON.stringify({
        success: false,
        error: text,
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
