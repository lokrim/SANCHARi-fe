import { CloseIcon } from "./Icons";

export default function RoadInfoBox({
    roadid,
    roadName,
    roadLen,
    munci,
    panch,
    block,
    width,
    surfaceType,
    soilType,
    onClick
}) {
    return (
        <div className="mt-2 w-fit flex-col items-center bg-white rounded-2xl text-black shadow-md min-w-[200] overflow-hidden max-w-[250]">
            <div className="p-2 bg-[#F0F2F5] bg-clip-border flex items-center justify-between">
                <label className="text-black">Road Information</label>
                <button onClick={onClick} className="cursor-pointer hover:scale-90 transition"><CloseIcon /></button>
            </div>
            <div className="p-2 grid grid grid-cols-[80px_1fr] gap-1 items-center place-items-start truncate">
                <label className="w-full text-xs text-[#7B7B7B]">Road id</label>
                <label className="w-full text-sm text-black truncate" title={roadid}>{roadid ?? '--'}</label>
                <label className="w-full text-xs text-[#7B7B7B]">Road Name</label>
                <label className="w-full text-sm text-black truncate" title="">{roadName ?? '--'}</label>
                <label className="w-full text-xs text-[#7B7B7B]">Road Length</label>
                <label className="w-full text-sm text-black truncate" title="">{roadLen ?? '--'}</label>
                <label className="w-full text-xs text-[#7B7B7B]">Muncipality</label>
                <label className="w-full text-sm text-black truncate" title="">{munci ?? '--'}</label>
                <label className="w-full text-xs text-[#7B7B7B]">Panchayat</label>
                <label className="w-full text-sm text-black truncate" title="">{panch ?? '--'}</label>
                <label className="w-full text-xs text-[#7B7B7B]">Block</label>
                <label className="w-full text-sm text-black truncate" title="">{block ?? '--'}</label>
                <label className="w-full text-xs text-[#7B7B7B]">Width</label>
                <label className="w-full text-sm text-black truncate" title="">{width ?? '--'}</label>
                <label className="w-full text-xs text-[#7B7B7B]">Surface Type</label>
                <label className="w-full text-sm text-black truncate" title="">{surfaceType ?? '--'}</label>
                <label className="w-full text-xs text-[#7B7B7B]">Soil Type</label>
                <label className="w-full text-sm text-black truncate" title="">{soilType ?? '--'}</label>
            </div>
        </div>
    );
}