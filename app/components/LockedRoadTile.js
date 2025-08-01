import { LockOpen, UndoIcon } from "./Icons";

export default function LockedRoadTile({ roadid, state, onRollback, onClick, onUnlock, hasChanged }) {
    return (
        <tr className="odd:bg-[#F6F6F6] even:bg-[#E5E8EB]">
            <td onClick={onClick} className="cursor-pointer hover:text-blue-500 hover:scale-95 text-left px-2 py-2">{roadid}</td>
            <td className="place-items-center px-2 py-2">
                <div className={`w-2 h-2 rounded-full border-[1px] border-white ${state == 'c' ? "bg-yellow-300" : "bg-green-500"}`}></div>
            </td>
            <td className="place-items-center px-2 py-2">
                {hasChanged && <button title="Rollback Road" onClick={onRollback} className="flex place-items-center cursor-pointer hover:scale-105">< UndoIcon /></button>}
            </td>
            <td className="place-items-center px-2 py-2">
                <button title="Unlock Road" onClick={onUnlock} className="flex place-items-center cursor-pointer hover:scale-105">< LockOpen /></button>
            </td>
        </tr>
    );
}