'use client';

import { AddNodeIcon, AttributeIcon, CancelIcon, DeleteNodeIcon, DetectIcon, ExitIcon, HandDrawIcon, LogIcon, MapIcon, MergeNodeIcon, MoveNodeIcon, PolygonIcon, RedoIcon, RemoveIcon, SaveIcon, SelectIcon, SettingsIcon, ShootIcon, SpanIcon, UndoIcon, ZoomInIcon, ZoomOutIcon } from "./Icons";
import EditMapBtn from "./EditMapBtn";
import toast from "react-hot-toast";
import { useMapTool } from "../context/MapToolContext";
import { confirmWithInput } from "./confirmWithInputPromise";
import LockedRoadList from "./LockedRoadList";
import { useState } from "react";

export default function EditMapTab() {
    const { 
        tool, 
        setTool, 
        saveEditRef, 
        checkValidSave, 
        cancelEditRef, 
        selectedFeatureId,
        detectedRoads,
        setDetectedRoads,
        isDetecting,
        setIsDetecting
    } = useMapTool();
    
    // State for detection parameters
    const [detectThreshold, setDetectThreshold] = useState(5);

    const handleSave = async () => {
        const msg = await confirmWithInput();
        if (msg !== null) {
            saveEditRef.current?.(msg);
        }
    };

    const handleDiscard = async () => {
        const confirmed = window.confirm('Are you sure you want to discard the changes?\nThis cannot be undone');
        if (confirmed) {
            cancelEditRef.current?.();
        }
    };

    const onSave = async () => {
        if ((!selectedFeatureId && !detectedRoads) || !checkValidSave.current?.()) {
            toast.error('No Changes made');
            return;
        } else {
            await handleSave();
        }
    }
    
    const handleDetectionToggle = () => {
        if (tool === 'detect-roads') {
            // Cancel detection
            setTool('move');
            if (isDetecting) {
                setIsDetecting(false);
            }
        } else {
            // Start detection
            setTool('detect-roads');
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-y-auto">
            <div className="p-2 space-y-3">
                {/* Detection section with more detailed UI */}
                <div className="rounded-lg bg-[#f0f4f8] p-3 border border-[#d0d7de]">
                    <h3 className="text-sm font-medium mb-2 text-gray-700">Automatic Road Detection</h3>
                    
                    <div className="flex items-center mb-2">
                        <label className="text-xs text-gray-600 mr-2">Sensitivity:</label>
                        <input 
                            type="range" 
                            min="1" 
                            max="10" 
                            value={detectThreshold} 
                            onChange={(e) => setDetectThreshold(parseInt(e.target.value))}
                            className="flex-1"
                            disabled={isDetecting || tool === 'detect-roads'}
                        />
                        <span className="text-xs ml-2 w-6 text-center">{detectThreshold}</span>
                    </div>
                    
                    <button 
                        className={`p-2 flex w-full text-white ${
                            isDetecting ? 'bg-orange-500' : 
                            tool === 'detect-roads' ? 'bg-[#1e506b]' : 'bg-[#1E2E33]'
                        } rounded-lg transition-colors duration-200`}
                        onClick={handleDetectionToggle}
                        disabled={isDetecting}
                    >
                        <DetectIcon />
                        <span className="mx-auto">
                            {isDetecting ? 'Detecting...' : 
                             tool === 'detect-roads' ? 'Cancel Detection' : 'Detect Roads'}
                        </span>
                    </button>

                    {detectedRoads && (
                        <div className="mt-2 space-y-2">
                            <div className="text-xs text-gray-600">
                                <span className="font-medium">{detectedRoads.features?.length || 0}</span> roads detected
                            </div>
                            <div className="flex space-x-2">
                                <button 
                                    className="p-2 flex-1 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors duration-200"
                                    onClick={() => setDetectedRoads(null)}
                                >
                                    <span className="mx-auto">Discard</span>
                                </button>
                                <button 
                                    className="p-2 flex-1 text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors duration-200"
                                    onClick={onSave}
                                >
                                    <span className="mx-auto">Save</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            <div className="px-2 py-1 flex text-black text-sm bg-[#E5E8EB]">
                Navigation Tools
            </div>
            <div className="p-2 grid grid-cols-6 gap-2">
                <EditMapBtn
                    id="move"
                    icon={<SpanIcon />}
                    onClick={(name) => setTool("move")}
                    tool={tool}
                />
                <EditMapBtn
                    id="zoom-out"
                    icon={<ZoomOutIcon />}
                    onClick={(name) => setTool("zoom-out")}
                    tool={tool}
                />
                <EditMapBtn
                    id="zoom-in"
                    icon={<ZoomInIcon />}
                    onClick={(name) => setTool("zoom-in")}
                    tool={tool}
                />
            </div>
            <div className="px-2 py-1 flex text-black text-sm bg-[#E5E8EB]">
                Edit Tools
            </div>
            <div className="p-2 grid grid-cols-6 gap-2">
                <EditMapBtn
                    id="select"
                    icon={<SelectIcon />}
                    onClick={(name) => setTool("select")}
                    tool={tool}
                />
                <EditMapBtn
                    id="polygon"
                    icon={<PolygonIcon />}
                    onClick={(name) => setTool("polygon")}
                    tool={tool}
                />
                <EditMapBtn
                    id="free-hand"
                    icon={<HandDrawIcon />}
                    onClick={(name) => setTool("free-hand")}
                    tool={tool}
                />
                <EditMapBtn
                    id="remove"
                    icon={<RemoveIcon />}
                    onClick={(name) => setTool("remove")}
                    bg="bg-[#FFD2D2]"
                    tool={tool}
                />
                <EditMapBtn
                    id="undo"
                    icon={<UndoIcon />}
                    onClick={(name) => setTool("undo")}
                    tool={tool}
                />
                <EditMapBtn
                    id="redo"
                    icon={<RedoIcon />}
                    onClick={(name) => setTool("redo")}
                    tool={tool}
                />
                <EditMapBtn
                    id="attribute"
                    icon={<AttributeIcon />}
                    onClick={(name) => setTool("attribute")}
                    tool={tool}
                />
            </div>
            <div className="px-2 py-1 flex text-black text-sm bg-[#E5E8EB]">
                Node Tools
            </div>
            <div className="p-2 grid grid-cols-6 gap-2">
                <EditMapBtn
                    id="add-node"
                    icon={<AddNodeIcon />}
                    onClick={(name) => setTool("add-node")}
                    tool={tool}
                />
                <EditMapBtn
                    id="delete-node"
                    icon={<DeleteNodeIcon />}
                    onClick={(name) => setTool("delete-node")}
                    bg="bg-[#FFD2D2]"
                    tool={tool}
                />
                <EditMapBtn
                    id="move-node"
                    icon={<MoveNodeIcon />}
                    onClick={(name) => setTool("move-node")}
                    tool={tool}
                />
                <EditMapBtn
                    id="merge-node"
                    icon={<MergeNodeIcon />}
                    onClick={(name) => setTool("merge-node")}
                    tool={tool}
                />
            </div>
            <div className="px-2 py-1 flex text-black text-sm bg-[#E5E8EB]">
                Overshoot/Undershoot
            </div>
            <div className="p-2 flex items-center justify-center">
                <input
                    className="mr-2 p-2 w-full border-1 border-[#7B7B7B] rounded-lg text-black placeholder-[#7B7B7B]"
                    placeholder="Threshold"
                />
                <button className="p-2 flex w-full text-black bg-[#E8F3FF] rounded-lg">
                    <ShootIcon />
                    <label className="ml-2 mr-auto">Remove</label>
                </button>
            </div>
            <div className="px-2 py-1 flex text-black text-sm bg-[#E5E8EB]">
                Locked Roads
            </div>
            <div className="m-2 rounded-md clip-border overflow-x-auto">
                <table className="w-full table-auto text-xs text-black content-start">
                    <thead className="bg-[#E5E8EB]">
                        <tr>
                            <th className="text-left px-2 py-1">Road ID</th>
                            <th className="text-center px-2 py-1">Change</th>
                            <th className="text-center px-2 py-1">Rollback</th>
                            <th className="text-center px-2 py-1">Unlock</th>
                        </tr>
                    </thead>
                    <LockedRoadList />
                </table>
            </div>
            <div className="sticky bottom-0 mt-auto h-fit p-3 flex items-center justify-center bg-white shadow-[0_0_30px_0_rgba(0,0,0,0.1)] rounded-t-2xl">
                <button onClick={handleDiscard} className="mr-2 p-2 flex w-full text-black bg-[#E5E8EB] rounded-lg cursor-pointer">
                    <CancelIcon />
                    <label className="ml-2 mr-auto cursor-pointer">Discard</label>
                </button>
                <button onClick={onSave} className="p-2 flex w-full text-white bg-[#1E2E33] rounded-lg cursor-pointer">
                    <SaveIcon />
                    <label className="ml-2 mr-auto cursor-pointer">Save</label>
                </button>
            </div>
        </div>
    );
}