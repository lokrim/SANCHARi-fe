"use client";

import {
  MapContainer,
  TileLayer,
  useMap,
  Marker,
  Popup,
  WMSTileLayer,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";

const MapUpdater = ({ userPosition }) => {
  const map = useMap();

  useEffect(() => {
    if (userPosition) {
      map.flyTo(userPosition, 13);
    }
  }, [userPosition]);

  return null;
};

const ZoomWatcher = ({ setZoom }) => {
  const map = useMapEvents({
    zoomend: () => {
      setZoom(map.getZoom());
    },
  });

  useEffect(() => {
    setZoom(map.getZoom());
  }, [map]);

  return null;
};

const GeoJSONViewer = ({ geojson }) => {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (!geojson) return;

    if (layerRef.current) {
      map.removeLayer(layerRef.current);
    }

    const layer = L.geoJSON(geojson, {
      style: (feature) => {
        if (feature.geometry.type === "MultiPolygon") {
          return {
            color: "blue",
            weight: 2,
            dashArray: "4",
            fillOpacity: 0.1,
          };
        } else {
          return {
            color: "red",
            weight: 2,
            opacity: 0.7,
          };
        }
      },
    });

    layer.addTo(map);
    const bounds = layer.getBounds();
    if (bounds.isValid()) {
      map.flyToBounds(bounds, {
        duration: 1.5,
        easeLinearity: 0.25,
      });
    }

    layerRef.current = layer;
  }, [geojson, map]);

  return null;
};

export default function MapView({ userPosition, geojson }) {
  const defaultPosition = [10.8505, 76.2711];
  const mapRef = useRef(null);
  const [zoom, setZoom] = useState(7);

  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "/leaflet/marker-icon-2x.png",
    iconUrl: "/leaflet/marker-icon.png",
    shadowUrl: "/leaflet/marker-shadow.png",
  });

  return (
    <div className="flex-1">
      <MapContainer
        center={defaultPosition}
        zoom={7}
        style={{ height: "100%", width: "100%" }}
        whenCreated={(map) => {
          mapRef.current = map;
        }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
          attribution="© OpenStreetMap contributors"
        />

        {zoom >= 10 && (
          <WMSTileLayer
            url="http://localhost:8080/geoserver/sanchari/wms"
            layers="sanchari:roads_latest"
            format="image/png"
            transparent={true}
            version="1.1.0"
            attribution="© GeoServer"
          />
        )}

        <ZoomWatcher setZoom={setZoom} />

        <MapUpdater userPosition={userPosition} />

        {userPosition && (
          <Marker position={userPosition}>
            <Popup>You are here</Popup>
          </Marker>
        )}

        {geojson && <GeoJSONViewer geojson={geojson} />}
      </MapContainer>
    </div>
  );
}
