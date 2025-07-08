export default function EditMapBtn({ id, icon, onClick, bg="bg-[#E5E8EB]", tool }) {
    return (
        <button
            id={id}
            onClick={() => onClick(id)}
            className={`p-2 flex ${bg} ${(tool === id && tool !== 'zoom-in' && tool !== 'zoom-out') ? "rounded-full border-[1px] border-black":"rounded-lg m-[1px]"} items-center justify-center cursor-pointer hover:scale-105`}
        >
            {icon}
        </button>
    );
}
