'use client';

const { createContext, useState, useContext, useRef } = require("react");

const MapToolContext = createContext();

export function MapToolProvider({children}){
    const [tool, setTool] = useState('move');
    const [detectedRoads, setDetectedRoads] = useState(null); // Track detected roads
    const [isDetecting, setIsDetecting] = useState(false); // Track detection in progress
    const saveEditRef = useRef(null);
    const cancelEditRef = useRef(null);
    const checkValidSave = useRef(null);
    const logClickRef = useRef(null);
    const hideLogRef = useRef(null);

    return(
        <MapToolContext.Provider value={{ 
            tool, 
            setTool, 
            detectedRoads, 
            setDetectedRoads, 
            isDetecting, 
            setIsDetecting,
            saveEditRef, 
            checkValidSave, 
            cancelEditRef, 
            hideLogRef, 
            logClickRef
        }}>
            {children}
        </MapToolContext.Provider>
    );
}

export function useMapTool() {
    return useContext(MapToolContext);
}