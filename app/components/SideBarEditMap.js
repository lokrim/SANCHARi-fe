'use client'

import { useEffect, useState } from "react";
import { ExitIcon, LogIcon, MapIcon, SettingsIcon } from "./Icons";
import EditMapTab from "./EditMapTab";
import LogCard from "./LogCard";
import { useRouter } from "next/navigation";
import { useMapTool } from "../context/MapToolContext";

export default function SideBarEditMap({ selectedRoadId, username }) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("map");
    const [versionHistory, setVersionHistory] = useState([]);
    const [activeLog, setActiveLog] = useState('');
    const {logClickRef, hideLogRef} = useMapTool();

    async function onTabClick(tab) {
        if (tab == "exit") {
            await fetch('/api/logout', { method: 'POST' });
            router.back();
        }
        setActiveTab(tab);
    }

    const log = [
        {
            id: 1,
            timestamp: "28-06-2025 12:00",
            name: "Admin1",
            desc: "Test Text"
        },
        {
            id: 2,
            timestamp: "28-06-2025 12:00",
            name: "Admin1",
            desc: "Test Text"
        },
        {
            id: 3,
            timestamp: "28-06-2025 12:00",
            name: "Admin1",
            desc: "Test Text"
        },
        {
            id: 4,
            timestamp: "28-06-2025 12:00",
            name: "Admin1",
            desc: "Test Text"
        },
    ];

    useEffect(() => {
        if (activeTab === "log" && selectedRoadId) {
            fetch(`/api/roads/${selectedRoadId}/versions`)
                .then((res) => res.json())
                .then((data) => setVersionHistory(data));
        }
        if (!selectedRoadId) {
            setVersionHistory([]);
        }
    }, [activeTab, selectedRoadId]);


    return (
        <div className="flex absolute z-30 top-0 bottom-0 left-0 w-90 bg-white rounded-r-2xl">
            <div className="flex flex-col bg-[#F0F2F5] w-auto">
                <button onClick={() => { onTabClick("map") }} className={`m-2 p-2 hover:bg-white rounded-2xl ${activeTab == "map" ? "bg-white" : ""}`}>
                    < MapIcon />
                </button>
                <button onClick={() => { onTabClick("log") }} className={`m-2 p-2 hover:bg-white rounded-2xl ${activeTab == "log" ? "bg-white" : ""}`}>
                    < LogIcon
                        times
                    />
                </button>
                <button onClick={() => { onTabClick("settings") }} className={`m-2 p-2 hover:bg-white rounded-2xl ${activeTab == "settings" ? "bg-white" : ""}`}>
                    < SettingsIcon />
                </button>
                <button onClick={() => { onTabClick("exit") }} className={`m-2 p-2 hover:bg-white rounded-2xl ${activeTab == "exit" ? "bg-white" : ""}`}>
                    < ExitIcon />
                </button>
            </div>
            {(activeTab == "map") && <EditMapTab roadId={selectedRoadId} username={username} />}
            {(activeTab == "log") && (
                <div className="flex-1 overflow-y-auto p-2">
                    <label className="mb-2 text-black text-xl">Change Log</label>
                    <hr className="border-gray-400 border-1 my-2" />
                    {versionHistory.length === 0 ? (
                        <p className="mt-2 text-center text-gray-400">No versions available</p>
                    ) : (
                        <div>
                            <label className="text-black text-sm">Road id: {selectedRoadId}</label>
                            {versionHistory.map((v, i) => (
                                <LogCard
                                    key={i}
                                    active={activeLog}
                                    timestamp={v.valid_from}
                                    name={v.edited_by || "Unknown"}
                                    desc={v.edit_reason || "Edited"}
                                    onClick={() => {
                                        setActiveLog(v.valid_from)
                                        logClickRef.current?.(v.roadid, v.valid_from)
                                    }}
                                    onHide={() => {
                                        setActiveLog(null);
                                        hideLogRef.current?.()
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

        </div>
    );
}