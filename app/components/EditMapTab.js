'use client';

import { AddNodeIcon, AttributeIcon, CancelIcon, DeleteNodeIcon, DetectIcon, ExitIcon, HandDrawIcon, LogIcon, MapIcon, MergeNodeIcon, MoveNodeIcon, PolygonIcon, RedoIcon, RemoveIcon, SaveIcon, SelectIcon, SettingsIcon, ShootIcon, SpanIcon, UndoIcon, ZoomInIcon, ZoomOutIcon } from "./Icons";
import EditMapBtn from "./EditMapBtn";
import toast from "react-hot-toast";
import { useMapTool } from "../context/MapToolContext";
import { confirmWithInput } from "./confirmWithInputPromise";

export default function EditMapTab({ roadId }) {

    const { tool, setTool, saveEditRef, checkValidSave, cancelEditRef, detectedRoads, setDetectedRoads } = useMapTool();

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
        if ((!roadId && !detectedRoads) || !checkValidSave.current?.()) {
            toast.error('No Changes made');
            return;
        } else {
            await handleSave();
        }
    }

    return (
        <div className="flex-1 flex flex-col h-full overflow-y-auto">
            <div className="p-2">
                <button 
                    className={`p-2 flex w-full text-white ${tool === 'detect-roads' ? 'bg-[#1e506b]' : 'bg-[#1E2E33]'} rounded-lg`}
                    onClick={() => setTool(tool === 'detect-roads' ? 'move' : 'detect-roads')}
                >
                    <DetectIcon />
                    <label className="mx-auto">
                        {tool === 'detect-roads' ? 'Cancel Detection' : 'Detect Roads'}
                    </label>
                </button>
                {detectedRoads && (
                    <div className="mt-2 flex space-x-2">
                        <button 
                            className="p-2 flex-1 text-white bg-red-600 rounded-lg"
                            onClick={() => setDetectedRoads(null)}
                        >
                            Discard
                        </button>
                        <button 
                            className="p-2 flex-1 text-white bg-green-600 rounded-lg"
                            onClick={onSave}
                        >
                            Save
                        </button>
                    </div>
                )}
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
                    < ShootIcon />
                    <label className="ml-2 mr-auto">Remove</label>
                </button>
            </div>
            <div className="sticky bottom-0 mt-auto h-fit p-3 flex items-center justify-center bg-white shadow-[0_0_30px_0_rgba(0,0,0,0.1)] rounded-t-2xl">
                <button onClick={handleDiscard} className="mr-2 p-2 flex w-full text-black bg-[#E5E8EB] rounded-lg cursor-pointer">
                    < CancelIcon />
                    <label className="ml-2 mr-auto cursor-pointer">Discard</label>
                </button>
                <button onClick={onSave} className="p-2 flex w-full text-white bg-[#1E2E33] rounded-lg cursor-pointer">
                    < SaveIcon />
                    <label className="ml-2 mr-auto cursor-pointer">Save</label>
                </button>
            </div>
        </div>
    );
}