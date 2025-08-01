'use client'

import dynamic from "next/dynamic";
import { useState } from "react";

const MapEditor = dynamic(() => import("./MapEditor"), {
  ssr: false,
  loading: () => <div className="text-center p-4">Loading map...</div>
});

export default function MapEditorWrapper({ username, villageFeature,
  roadGeojson,
  setRoadGeojson}) {

  return (
    <div className="flex h-full">
      <MapEditor user={username} villageFeature={villageFeature}
        roadGeojson={roadGeojson}
        setRoadGeojson={setRoadGeojson}/>
    </div>
  );
};
