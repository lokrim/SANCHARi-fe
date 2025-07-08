import { AvatarIcon } from "./Icons";

export default function LogCard({active, timestamp, name, desc, onClick, onHide}) {
    return (
        <div className="mx-2 mt-4 p-2 bg-white shadow-lg drop-shadow rounded-lg h-fit">
            <div>
                <label className="text-black text-sm font-bold">{new Date(timestamp).toLocaleString()}</label>
                <div className="my-1 flex items-center">
                    <div className="mr-2 p-1 bg-[#F5F5F5] rounded-full">
                        < AvatarIcon />
                    </div>
                    <label className="text-black text-sm">{name}</label>
                </div>
                <label className="text-black text-sm">{desc}</label>
                <div className="mt-1 flex items-center justify-end">
                    {active == timestamp && <button onClick={onHide} className="p-2 mr-2 bg-[#F5F5F5] text-black rounded-sm text-xs font-bold cursor-pointer">Hide</button>}
                    <button onClick={onClick} className="p-2 bg-[#E8F3FF] text-[#1A3FE5] rounded-sm text-xs font-bold cursor-pointer">Show in map</button>
                </div>
            </div>
        </div>
    );
}