'use client'

import TopBar from "../components/TopBar";
import SideBarEditMap from "../components/SideBarEditMap";
import { useEffect, useState } from "react";
import { AvatarIcon, RoadIcon } from "../components/Icons";
import { useSearchParams } from "next/navigation";
import MapEditorWrapper from "../components/Map/MapEditorWrapper";
import RoadInfoBox from "../components/RoadInfoBox";
import { useMapTool } from "../context/MapToolContext";

export default function EditMapPageClient({ username }) {
    const searchParams = useSearchParams();
    const district = searchParams.get('district');
    const sub_dist = searchParams.get('sub_dist');
    const village = searchParams.get('village');
    const [roadGeojson, setRoadGeojson] = useState(null);
    const [villageFeature, setVillageFeature] = useState(null);
    const { showRoadInfo ,setShowRoadInfo, roadInfo } = useMapTool();

    useEffect(() => {
        const fetchData = async () => {
            const res = await fetch(
                `/api/geojson/village-with-roads?district=${district}&sub_dist=${sub_dist}&name=${village}`
            );
            const data = await res.json();
            setRoadGeojson(data.roads);
            setVillageFeature(data.village);
        };
        fetchData();
    }, []);

    return (
        <main>
            <div className="flex flex-col h-screen w-screen bg-white">
                <TopBar />
                <div className="relative flex h-screen">
                    <SideBarEditMap username={username} />
                    <div className="relative z-0 inset-0 flex-1 bg-blue-100">
                        <div className="absolute z-20 top-2 right-2 flex-col justify-items-end">
                            <div className="flex items-center p-3 bg-white rounded-2xl text-black min-w-[150] h-12 shadow-md">
                                <div className="mr-2 bg-[#E5E8EB] rounded-full size-7 flex items-center justify-center"><AvatarIcon /></div>
                                <label className="text-black">{username ?? "Guest"}</label>
                            </div>
                            {(showRoadInfo && roadInfo) && (
                                < RoadInfoBox
                                    roadid={roadInfo.roadid}
                                    roadName={roadInfo.roadname}
                                    roadLen={roadInfo.roadlength}
                                    munci={roadInfo.munci}
                                    panch={roadInfo.panch}
                                    block={roadInfo.block}
                                    width={roadInfo.width}
                                    surfaceType={roadInfo.surfacetyp}
                                    soilType={roadInfo.soiltype}
                                    onClick={() => {setShowRoadInfo(false)}}
                                />
                            )}
                            {(!showRoadInfo) && (
                                <button onClick={() => {setShowRoadInfo(true)}} className="mt-2 p-3 h-12 flex items-center justify-center bg-[#1E2E33] rounded-2xl text-white shadow-md w-12 cursor-pointer hover:scale-102 transition">
                                    <RoadIcon />
                                </button>
                            )}
                        </div>
                        <div className="absolute inset-0 z-10">
                            <MapEditorWrapper username={username}villageFeature={villageFeature}
                                roadGeojson={roadGeojson}
                                setRoadGeojson={setRoadGeojson}/>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
