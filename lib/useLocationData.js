'use client';

import { useState, useEffect } from 'react';

export default function useLocationData() {
  const [districts, setDistricts] = useState([]);
  const [taluks, setTaluks] = useState([]);
  const [villages, setVillages] = useState([]);

  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedTaluk, setSelectedTaluk] = useState('');
  const [selectedVillage, setSelectedVillage] = useState('');

  useEffect(() => {
    fetch('/api/load-values/dist_name')
      .then(res => res.json())
      .then(data => setDistricts(data.map(item => item.district)))
      .catch(err => console.error("Error fetching districts:", err));
  }, []);

  const loadTaluks = async (district) => {
    setTaluks([]);
    setSelectedTaluk('');
    setVillages([]);
    setSelectedVillage('');
    setSelectedDistrict(district);

    if (district === 'Select District') return;

    try {
      const res = await fetch(`/api/load-values/subdist_name?district=${district}`);
      const data = await res.json();
      setTaluks(data.map(item => item.sub_dist));
    } catch (err) {
      console.error('Error fetching taluks:', err);
    }
  };

  const loadVillages = async (taluk) => {
    setVillages([]);
    setSelectedVillage('');
    setSelectedTaluk(taluk);

    if (taluk === 'Select Taluk') return;

    try {
      const res = await fetch(`/api/load-values/village_name?district=${selectedDistrict}&sub_dist=${taluk}`);
      const data = await res.json();
      setVillages(data.map(item => item.name));
    } catch (err) {
      console.error('Error fetching villages:', err);
    }
  };

  return {
    districts,
    taluks,
    villages,
    selectedDistrict,
    selectedTaluk,
    selectedVillage,
    setSelectedDistrict,
    setSelectedTaluk,
    setSelectedVillage,
    loadTaluks,
    loadVillages
  };
}
