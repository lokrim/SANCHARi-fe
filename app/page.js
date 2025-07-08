'use client';

import TopBar from './components/TopBar';
import SideBarHome from './components/SideBarHome';
import PopupLogin from './components/PopupLogin';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MapViewWrapper from './components/Map/MapViewWrapper';

export default function Home() {
  const router = useRouter();
  const [showLogIn, setShowLogIn] = useState(false);
  const [geojson, setGeojson] = useState(null);
  const searchParams = useSearchParams();
  const unauthorized = searchParams.get("unauthorized");

  useEffect(() => {
    if (unauthorized) {
      setShowLogIn(true);
      router.replace("/", { scroll: false });
    }
  }, [unauthorized]);

  const handlePopup = () => {
    setShowLogIn(!showLogIn);
  };

  const onGeoJsonSearch = (district, taluk, village) => {
    if (!district || !taluk || !village) return;
    fetch(`/api/geojson/village?district=${district}&sub_dist=${taluk}&name=${village}`)
      .then(res => {
        if (!res.ok) throw new Error("GeoJSON fetch failed");
        return res.json();
      })
      .then(data => {
        setGeojson(data);
      })
      .catch(err => console.error('Error loading GeoJSON:', err));
  };

  return (
    <main>
      <div className="flex flex-col h-screen w-screen bg-white">
        <TopBar />
        <div className="relative flex h-screen">
          <SideBarHome onEditMapClick={handlePopup} onLocationSearch={onGeoJsonSearch} />
          <div className="absolute z-0 inset-0 flex-1 bg-blue-100">
            <MapViewWrapper geojson={geojson} page={"home"}/>
          </div>
        </div>
        {showLogIn && <PopupLogin onClose={handlePopup}/>}
      </div>
    </main>
  );
}
