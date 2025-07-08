'use client';

import { useRouter } from "next/navigation";
import { useState } from "react";
import useLocationData from "@/lib/useLocationData";

export default function PopupLogin({ onClose, onLogin }) {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState("");
    const [areaError, setAreaError] = useState("");

    const {
        districts,
        taluks,
        villages,
        selectedDistrict,
        selectedTaluk,
        selectedVillage,
        loadTaluks,
        loadVillages,
        setSelectedVillage
    } = useLocationData();

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!selectedVillage) {
            setAreaError("Select full area of interest");
            return;
        } else {
            setAreaError("");
        }
        setError("");

        try {
            const res = await fetch("/api/login", {
                method: "POST",
                body: JSON.stringify({ username, password }),
                headers: { "Content-Type": "application/json" },
            });

            if (!res.ok) {
                const data = await res.json();
                if (res.status === 401) {
                    setError(data.error || "Invalid username or password");
                } else {
                    setError("Server error. Please try again later.");
                }
                return;
            }
            router.push(`/edit_map?district=${selectedDistrict}&sub_dist=${selectedTaluk}&village=${selectedVillage}`);
        } catch (err) {
            console.error("Login failed:", err);
            setError("Network error. Please check your internet connection.");
        }
    };


    return (
        <div className="absolute z-10 h-screen w-screen flex items-center justify-center bg-[#00000030]">
            <div className="flex flex-col items-center justify-center h-fit w-fit bg-white rounded-lg p-4">
                <form onSubmit={handleLogin}>
                    <div className="flex flex-col sm:flex-row justify-center">
                        <div className="flex flex-col mr-4 text-black">
                            <label className="text-black text-base mb-2">Select an area of interest</label>
                            <select
                                value={selectedDistrict}
                                onChange={(e) => loadTaluks(e.target.value)}
                                className="mt-1 p-2 w-48 border border-[#7B7B7B] rounded-lg"
                            >
                                <option value="">Select District</option>
                                {districts.map((option, index) => (
                                    <option key={index} value={option}>{option}</option>
                                ))}
                            </select>
                            <select
                                value={selectedTaluk}
                                onChange={(e) => loadVillages(e.target.value)}
                                className="mt-2 p-2 w-48 border border-[#7B7B7B] rounded-lg"
                            >
                                <option value="">Select Taluk</option>
                                {taluks.map((option, index) => (
                                    <option key={index} value={option}>{option}</option>
                                ))}
                            </select>
                            <select
                                value={selectedVillage}
                                onChange={(e) => setSelectedVillage(e.target.value)}
                                className="mt-2 p-2 w-48 border border-[#7B7B7B] rounded-lg"
                            >
                                <option value="">Select Village</option>
                                {villages.map((option, index) => (
                                    <option key={index} value={option}>{option}</option>
                                ))}
                            </select>
                            {areaError && <p className="mt-2 text-xs text-red-500">{areaError}</p>}
                        </div>
                        <div className="max-sm:mt-3 w-[1px] bg-[#E5E8EB]" />
                        <div className="flex flex-col sm:ml-4">
                            <label className="text-black text-base mb-2">Enter Log In Credentials</label>
                            <input
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="mt-1 p-2 w-48 border border-[#7B7B7B] text-black placeholder-[#7B7B7B] rounded-lg"
                                placeholder="Username"
                            />
                            <input
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                type="password"
                                className="mt-2 p-2 w-48 border border-[#7B7B7B] text-black placeholder-[#7B7B7B] rounded-lg"
                                placeholder="Password"
                            />
                            {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
                        </div>
                    </div>
                    <div className="flex w-full items-center justify-center gap-3 pt-4">
                        <button
                            onClick={onClose}
                            type="button"
                            className="py-2 flex flex-1 text-black text-sm bg-[#F0F2F5] rounded-lg items-center justify-center hover:scale-105 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="py-2 flex flex-1 text-white text-sm bg-[#1E2E33] rounded-lg items-center justify-center hover:scale-105 transition"
                        >
                            Login
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
