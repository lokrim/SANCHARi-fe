'use client';

import { useState } from "react";
import useLocationData from "@/lib/useLocationData";
import {
  AboutIcon,
  EditMap,
  LeftArrowIcon,
  NavigationIcon,
  SearchIcon,
  UpArrowIcon,
} from "./Icons";

export default function SideBarHome({ onEditMapClick, onLocationSearch }) {
  const [showSearchOptions, setShowSearchOptions] = useState(false);
  const [showNavOptions, setShowNavOptions] = useState(false);
  const [searchBy, setSearchBy] = useState("Panchayat");

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

  const handleSearch = () => {
    if (selectedDistrict && selectedTaluk && selectedVillage) {
      onLocationSearch(selectedDistrict, selectedTaluk, selectedVillage);
    } else {
      alert("Please select district, taluk, and village.");
    }
  };

  return (
    <div className="absolute z-10 top-0 bottom-0 left-0 w-70 bg-[#F0F2F5] p-2 rounded-r-2xl">
      <div className={`w-full rounded-lg transition ease-in-out text-black ${showSearchOptions ? "bg-white" : "hover:bg-white"} ${showNavOptions ? "hidden" : ""}`}>
        <div className="flex items-start p-2">
          <button
            type="button"
            disabled={showSearchOptions}
            onClick={() => {
              setShowSearchOptions(!showSearchOptions);
              setShowNavOptions(false);
            }}
            className="flex items-center w-full text-left"
          >
            <SearchIcon />
            Search
          </button>
          {showSearchOptions && (
            <button type="button" onClick={() => setShowSearchOptions(false)} className="ml-auto">
              <UpArrowIcon />
            </button>
          )}
        </div>

        {showSearchOptions && (
          <div className="flex flex-col px-2 pb-2">
            <hr className="border-[#E5E8EB]" />
            <div className="mt-2 flex items-center">
              <label className="text-xs text-black mr-2">Search by</label>
              <select
                id="search-by"
                className="text-xs bg-[#F0F2F5] px-2 py-1 rounded-sm"
                onChange={(e) => setSearchBy(e.target.value)}
              >
                <option value="Panchayat">Panchayat</option>
                <option value="General">General</option>
              </select>
            </div>

            {searchBy === "General" && (
              <input className="mt-2 p-2 w-full border border-[#7B7B7B] rounded-lg" placeholder="Search" />
            )}

            {searchBy === "Panchayat" && (
              <div className="flex flex-col">
                <select onChange={(e) => loadTaluks(e.target.value)} className="mt-2 p-2 w-full border border-[#7B7B7B] rounded-lg">
                  <option>Select District</option>
                  {districts.map((d, i) => <option key={i} value={d}>{d}</option>)}
                </select>

                <select onChange={(e) => loadVillages(e.target.value)} className="mt-2 p-2 w-full border border-[#7B7B7B] rounded-lg">
                  <option>Select Taluk</option>
                  {taluks.map((t, i) => <option key={i} value={t}>{t}</option>)}
                </select>

                <select onChange={(e) => setSelectedVillage(e.target.value)} className="mt-2 p-2 w-full border border-[#7B7B7B] rounded-lg">
                  <option>Select Village</option>
                  {villages.map((v, i) => <option key={i} value={v}>{v}</option>)}
                </select>
              </div>
            )}

            <button onClick={handleSearch} className="mt-2 py-2 px-4 bg-[#1E2E33] rounded-xl text-white text-sm">Search</button>
          </div>
        )}
      </div>

      <div className={`my-2 w-full rounded-lg transition ease-in-out text-black ${showNavOptions ? "bg-white" : "hover:bg-white"}`}>
        {showNavOptions && (
          <div className="px-1 py-2 flex items-center" onClick={() => setShowNavOptions(false)}>
            <LeftArrowIcon />
            <label className="text-sm text-black ml-2">Go back</label>
          </div>
        )}
        <div className="flex items-start p-2">
          <button
            type="button"
            disabled={showNavOptions}
            onClick={() => {
              setShowNavOptions(!showNavOptions);
              setShowSearchOptions(false);
            }}
            className="flex items-center gap-2 w-full text-left"
          >
            <NavigationIcon />
            Navigation
          </button>
        </div>
        {showNavOptions && (
          <div className="flex flex-col px-2 pb-2">
            <hr className="border-[#E5E8EB]" />
            <input className="mt-2 p-2 w-full border border-[#7B7B7B] rounded-lg" placeholder="Search" />
            <input className="mt-2 p-2 w-full border border-[#7B7B7B] rounded-lg" placeholder="Search" />
            <button className="mt-2 py-2 px-4 bg-[#1E2E33] rounded-xl text-white text-sm">Get Directions</button>
          </div>
        )}
      </div>

      <div className={`${showNavOptions ? "hidden" : ""}`}>
        <button type="button" onClick={onEditMapClick} className="hover:bg-white transition ease-in-out text-black my-2 w-full rounded-lg p-2 inline-flex">
          <EditMap />
          Edit Map
        </button>
        <button type="button" className="hover:bg-white transition ease-in-out text-black my-2 w-full rounded-lg p-2 inline-flex">
          <AboutIcon />
          About
        </button>
      </div>

      <div className="flex flex-col items-center absolute left-0 right-0 bottom-10 text-center">
        <img className="w-10 h-10" src="/logo.png" alt="KSREC logo" />
        <label className="mt-2 text-[#9A9A9A] text-xs">©SANCHARi 2025</label>
      </div>
    </div>
  );
}
