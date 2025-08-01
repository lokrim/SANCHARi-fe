'use client';

const { createContext, useState, useContext, useRef } = require("react");
import { io } from "socket.io-client";

const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL);

const MapToolContext = createContext();

export function MapToolProvider({ children }) {
    const [tool, setTool] = useState('move');
    const saveEditRef = useRef(null);
    const cancelEditRef = useRef(null);
    const checkValidSave = useRef(null);
    const logClickRef = useRef(null);
    const hideLogRef = useRef(null);
    const [lockedRoads, setLockedRoads] = useState({});
    const beforeSaveRef = useRef(new Map());
    const [detectedRoads, setDetectedRoads] = useState(null);
    const [isDetecting, setIsDetecting] = useState(false);

    // Move these states to context for centralized management
    const [selectedFeatureId, setSelectedFeatureId] = useState(null);
    const [selectedRoadId, setSelectedRoadId] = useState(null);
    const [showRoadInfo, setShowRoadInfo] = useState(false);
    const [roadInfo, setRoadInfo] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);

    const lockRoad = (roadid, username) => {
        socket.emit("road-lock", { roadid, username });
        setLockedRoads(prev => ({ ...prev, [roadid]: username }));
    };

    const unlockRoad = (roadid) => {
        socket.emit("road-unlock", { roadid });
        setLockedRoads(prev => {
            const copy = { ...prev };
            delete copy[roadid];
            return copy;
        });
        beforeSaveRef.current.delete(roadid);

        if (selectedFeatureId === roadid) {
            setSelectedFeatureId(null);
            setSelectedRoadId(null);
            setShowRoadInfo(false);
            setRoadInfo(null);
        }
    };

    const unlockAllMyRoads = () => {
        if (!currentUser) return;

        const myRoads = Object.keys(lockedRoads).filter(roadid => lockedRoads[roadid] === currentUser);
        myRoads.forEach(roadid => unlockRoad(roadid));
    };

    // Helper function to check if current user owns a road
    const isMyRoad = (roadid) => lockedRoads[roadid] === currentUser;

    // New rollback function to revert road to original state
    const rollbackRoad = (roadid) => {
        const originalFeature = beforeSaveRef.current.get(roadid);
        if (!originalFeature) {
            console.warn(`No original state found for road ${roadid}`);
            return;
        }
        if (applyFeatureChangeRef.current) {
            applyFeatureChangeRef.current(originalFeature);
        }
        beforeSaveRef.current.delete(roadid);
    };

    const selectRoad = async (roadid) => {
        if (roadid) {
            await fetch(`api/roads/${roadid}/info/`)
                .then(res => res.json())
                .then(res => setRoadInfo(res));
        }
        setSelectedFeatureId(roadid);
        setShowRoadInfo(true);
    }

    const applyFeatureChangeRef = useRef(null);

    return (
        <MapToolContext.Provider value={{
            tool, setTool, saveEditRef, checkValidSave, cancelEditRef, hideLogRef, logClickRef,
            lockedRoads, setLockedRoads, beforeSaveRef,
            selectedFeatureId, setSelectedFeatureId,
            selectedRoadId, setSelectedRoadId,
            showRoadInfo, setShowRoadInfo,
            roadInfo, setRoadInfo,
            currentUser, setCurrentUser,
            lockRoad, unlockRoad, unlockAllMyRoads, isMyRoad,
            selectRoad, rollbackRoad, applyFeatureChangeRef,
            detectedRoads, setDetectedRoads,
            isDetecting, setIsDetecting,
            socket
        }}>
            {children}
        </MapToolContext.Provider>
    );
}

export function useMapTool() {
    return useContext(MapToolContext);
}