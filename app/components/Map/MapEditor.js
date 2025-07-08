'use client';

import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { io } from "socket.io-client";
import { useMapTool } from "@/app/context/MapToolContext";
import toast from "react-hot-toast";

// WebSocket connection
const socket = io("http://localhost:3001");

const createNodeIcon = (tool) => {
  const div = document.createElement('div');
  div.className =
    'w-3 h-3 rounded-full border-2 border-white bg-blue-600 shadow-md transition-transform duration-150 hover:scale-125';

  if (tool === 'delete-node') {
    div.className += ' hover:bg-red-600';
  }

  return L.divIcon({
    className: '',
    html: div.outerHTML,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
};

const GeoJSONEditor = ({
  user,
  setSelectedRoadId,
  villageFeature,
  roadGeojson,
  setRoadGeojson,
  selectedFeatureId,
  setSelectedFeatureId,
  lockedRoads,
  setLockedRoads,
  setRoadInfo,
  setShowRoadInfo,
}) => {
  const map = useMap();
  const layerRef = useRef(null);
  const detectedLayerRef = useRef(null);
  const roadLayersRef = useRef(new Map());
  const updatedGeojson = useRef(new Map());
  const nodeMap = useRef(new Map());

  // Single global undo/redo stacks
  const undoStack = useRef([]);
  const redoStack = useRef([]);

  const beforeSave = useRef(new Map());
  const [selectedIds, setSelectedIds] = useState(new Set());
  const { 
    tool, 
    setTool, 
    detectedRoads, 
    setDetectedRoads, 
    isDetecting, 
    setIsDetecting,
    saveEditRef, 
    checkValidSave, 
    cancelEditRef, 
    logClickRef, 
    hideLogRef 
  } = useMapTool();
  const [historicalFeature, setHistoricalFeature] = useState(null);
  const [addAfterNodeIndex, setAddAfterNodeIndex] = useState(null);
  const [nodes, setNodes] = useState([]);
  const hasZoomed = useRef(false);
  const [isLoading, setIsLoading] = useState(false);

  // Helper function to create an action object for the undo/redo stack
  const createAction = (type, roadId, beforeState, afterState) => ({
    type,
    roadId,
    beforeState: JSON.parse(JSON.stringify(beforeState)),
    afterState: JSON.parse(JSON.stringify(afterState)),
    timestamp: Date.now()
  });

  // Helper function to push action to undo stack and clear redo stack
  const pushToUndoStack = (action) => {
    undoStack.current.push(action);
    redoStack.current.length = 0; // Clear redo stack when new action is performed

    // Optional: Limit stack size to prevent memory issues
    if (undoStack.current.length > 100) {
      undoStack.current.shift();
    }
  };

  useEffect(() => {
    if (!tool || !map) {
      setTool('move');
    }

    if (tool === 'move') {
      map.dragging.enable();
      map.touchZoom.enable();
      map.doubleClickZoom.enable();
      map.boxZoom.enable();
      map.keyboard.enable();
    } else {
      map.dragging.disable();
      map.touchZoom.disable();
      map.doubleClickZoom.disable();
      map.boxZoom.disable();
      map.keyboard.disable();
    }

    if (tool === 'zoom-in') {
      map.zoomIn();
      setTool('');
    }

    if (tool === 'zoom-out') {
      map.zoomOut();
      setTool('');
    }

    if (tool === 'undo') {
      undo();
      setTool('');
    }

    if (tool === 'redo') {
      redo();
      setTool('');
    }
  }, [tool, map]);

  useEffect(() => {
    if (tool !== 'add-node' || addAfterNodeIndex === null) return;

    const handleClick = (e) => {
      const { lat, lng } = e.latlng;
      const newIndex = insertNodeAt(addAfterNodeIndex, { lat, lng });
      setAddAfterNodeIndex(newIndex);
    };

    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [tool, addAfterNodeIndex, map]);

  // Handle detection click
  useEffect(() => {
    if (tool !== 'detect-roads' || isDetecting) return;

    const handleDetectionClick = async (e) => {
      try {
        const { lat, lng } = e.latlng;
        setIsDetecting(true);
        console.log(`Detecting roads at lat: ${lat}, lng: ${lng}`);
        
        // Show toast for user feedback
        const loadingToast = toast.loading('Detecting roads. Please wait...');
        
        // Set a timeout for the API call
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout
        
        // Call the API
        const response = await fetch(
          //`http://localhost:5000/infer_coord?lat=${lat}&lon=${lng}`,
          "http://localhost:5000/infer_coord?lat=21.686675&lon=71.311336" ,
          { signal: controller.signal }
        );
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          toast.error(`Error detecting roads: ${response.statusText}`, { id: loadingToast });
          throw new Error(`Detection failed with status: ${response.status}`);
        }
        
        const detectedGeojson = await response.json();
        // Filter out roads that are duplicates of existing ones
        const filteredGeojson = filterDuplicateRoads(detectedGeojson, roadGeojson);
        console.log('Filtered detected roads:', filteredGeojson);
        // Update state with filtered detected roads
        setDetectedRoads(filteredGeojson);
        toast.success('Roads detected successfully!', { id: loadingToast });
        
        // Switch to move tool after detection
        setTool('move');
      } catch (error) {
        if (error.name === 'AbortError') {
          toast.error('Detection timed out after 5 minutes.');
        } else {
          toast.error(`Error detecting roads: ${error.message}`);
          console.error('Detection error:', error);
        }
        setIsDetecting(false);
      } finally {
        setIsDetecting(false);
      }
    };

    map.on('click', handleDetectionClick);
    return () => {
      map.off('click', handleDetectionClick);
    };
  }, [tool, map, isDetecting, setDetectedRoads, setIsDetecting, setTool, roadGeojson]);

  useEffect(() => {
    saveEditRef.current = onSaveChange;
    checkValidSave.current = () => updatedGeojson.current.size > 0 || detectedRoads !== null;
    cancelEditRef.current = () => {
      beforeSave.current.forEach(f => applyFeatureChange(f));
      updatedGeojson.current.clear();
      setDetectedRoads(null); // Clear detected roads when canceling
    };
    logClickRef.current = logClick;
    hideLogRef.current = hideLog;
  }, [roadGeojson, detectedRoads]);

  // Modified onSaveChange to handle detected roads
  const onSaveChange = async (msg) => {
    try {
      const updates = [];
      
      // Add existing edited roads
      for (const [roadId, feature] of updatedGeojson.current.entries()) {
        updates.push({ id: roadId, geometry: feature.geometry });
      }
      
      // Add detected roads if any
      if (detectedRoads && detectedRoads.features) {
        detectedRoads.features.forEach(feature => {
          // Generate temporary IDs for new features
          const tempId = `new_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          feature.properties = feature.properties || {};
          feature.properties.roadid = tempId;
          updates.push({ id: tempId, geometry: feature.geometry, isNew: true });
        });
      }
      
      // Only proceed if we have updates
      if (updates.length > 0) {
        const response = await fetch("/api/geojson/update-road", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ updates, edited_by: user, edit_reason: msg })
        });
        
        if (!response.ok) {
          toast.error("Failed to save changes");
          throw new Error("Bulk save failed");
        }
        
        toast.success("Changes saved successfully");
        
        updatedGeojson.current.clear();
        beforeSave.current.clear();
        setDetectedRoads(null); // Clear detected roads after saving

        // Clear undo/redo stacks after successful save
        undoStack.current.length = 0;
        redoStack.current.length = 0;
      }
    } catch (error) {
      console.error("Error saving changes:", error);
    }
  };

  // Update nodes when selectedFeatureId changes
  useEffect(() => {
    if (!selectedFeatureId) {
      setNodes([]);
      return;
    }
    
    // First try to find in regular roads
    let selectedFeature = roadGeojson?.features?.find(
      (f) => f.properties.roadid === selectedFeatureId
    );
    
    // If not found in regular roads, check detected roads
    if (!selectedFeature && detectedRoads?.features) {
      selectedFeature = detectedRoads.features.find(
        (f) => f.properties.roadid === selectedFeatureId
      );
    }

    if (!selectedFeature) {
      setNodes([]);
      return;
    }

    const newNodes = [];
    let nodeIndex = 0;

    selectedFeature.geometry.coordinates.forEach((line, lineIndex) => {
      line.forEach(([lng, lat], pointIndex) => {
        newNodes.push({
          index: nodeIndex++,
          lat,
          lng,
          lineIndex,
          pointIndex,
        });
      });
    });

    setNodes(newNodes);
  }, [selectedFeatureId, roadGeojson, detectedRoads]);

  const insertNodeAt = (nodeIndex, latlng) => {
    // First check in regular roads
    let selectedFeature = roadGeojson?.features?.find(
      (f) => f.properties.roadid === selectedFeatureId
    );
    
    let isDetectedRoad = false;
    
    // If not found in regular roads, check detected roads
    if (!selectedFeature && detectedRoads?.features) {
      selectedFeature = detectedRoads.features.find(
        (f) => f.properties.roadid === selectedFeatureId
      );
      isDetectedRoad = true;
    }
    
    if (!selectedFeature) return;

    const node = nodes.find((n) => n.index === nodeIndex);
    if (!node) return;

    const prevFeature = JSON.parse(JSON.stringify(selectedFeature));

    if (!beforeSave.current.has(selectedFeatureId)) {
      beforeSave.current.set(selectedFeatureId, prevFeature);
    }

    const updatedFeature = JSON.parse(JSON.stringify(selectedFeature));
    const line = updatedFeature.geometry.coordinates[node.lineIndex];

    // Insert new point **after** selected index
    const insertIndex = node.pointIndex === 0 ? 0 : node.pointIndex + 1;
    line.splice(insertIndex, 0, [latlng.lng, latlng.lat]);

    // Create and push action to undo stack
    const action = createAction('insert-node', selectedFeatureId, prevFeature, updatedFeature);
    pushToUndoStack(action);

    if (isDetectedRoad) {
      // For detected roads, we need to update the detectedRoads state
      const updatedDetectedRoads = {
        ...detectedRoads,
        features: detectedRoads.features.map(f => 
          f.properties.roadid === selectedFeatureId ? updatedFeature : f
        )
      };
      setDetectedRoads(updatedDetectedRoads);
      
      // Also update the visual layer
      if (detectedLayerRef.current) {
        map.removeLayer(detectedLayerRef.current);
        const updatedLayer = L.geoJSON(updatedDetectedRoads, {
          style: {
            color: 'purple',
            weight: 6,
            opacity: 0.9,
            dashArray: '5,10',
          },
          onEachFeature: (feature, layer) => {
            layer.on('click', () => {
              if (tool === 'select') {
                const tempId = feature.properties.roadid || `temp_${Math.random().toString(36).substr(2, 9)}`;
                feature.properties.roadid = tempId;
                setSelectedFeatureId(tempId);
                setSelectedRoadId(tempId);
              }
            });
            layer.bindTooltip("Detected road (not saved)", { permanent: false, direction: 'top' });
          }
        });
        updatedLayer.addTo(map);
        detectedLayerRef.current = updatedLayer;
      }
    } else {
      applyFeatureChange(updatedFeature);
    }
    
    return insertIndex;
  };

  const updateNode = async (nodeIndex, newLatLng) => {
    // First check in regular roads
    let selectedFeature = roadGeojson?.features?.find(
      (f) => f.properties.roadid === selectedFeatureId
    );
    
    let isDetectedRoad = false;
    
    // If not found in regular roads, check detected roads
    if (!selectedFeature && detectedRoads?.features) {
      selectedFeature = detectedRoads.features.find(
        (f) => f.properties.roadid === selectedFeatureId
      );
      isDetectedRoad = true;
    }
    
    if (!selectedFeature) return;

    const node = nodes.find((n) => n.index === nodeIndex);
    if (!node) return;

    const prevFeature = JSON.parse(JSON.stringify(selectedFeature));

    if (!beforeSave.current.has(selectedFeatureId)) {
      beforeSave.current.set(selectedFeatureId, prevFeature);
    }

    const updatedFeature = JSON.parse(JSON.stringify(selectedFeature));
    updatedFeature.geometry.coordinates[node.lineIndex][node.pointIndex] = [
      newLatLng.lng,
      newLatLng.lat,
    ];

    // Create and push action to undo stack
    const action = createAction('update-node', selectedFeatureId, prevFeature, updatedFeature);
    pushToUndoStack(action);

    if (isDetectedRoad) {
      // For detected roads, we need to update the detectedRoads state
      const updatedDetectedRoads = {
        ...detectedRoads,
        features: detectedRoads.features.map(f => 
          f.properties.roadid === selectedFeatureId ? updatedFeature : f
        )
      };
      setDetectedRoads(updatedDetectedRoads);
      
      // Also update the visual layer
      if (detectedLayerRef.current) {
        map.removeLayer(detectedLayerRef.current);
        const updatedLayer = L.geoJSON(updatedDetectedRoads, {
          style: {
            color: 'purple',
            weight: 6,
            opacity: 0.9,
            dashArray: '5,10',
          },
          onEachFeature: (feature, layer) => {
            layer.on('click', () => {
              if (tool === 'select') {
                const tempId = feature.properties.roadid || `temp_${Math.random().toString(36).substr(2, 9)}`;
                feature.properties.roadid = tempId;
                setSelectedFeatureId(tempId);
                setSelectedRoadId(tempId);
              }
            });
            layer.bindTooltip("Detected road (not saved)", { permanent: false, direction: 'top' });
          }
        });
        updatedLayer.addTo(map);
        detectedLayerRef.current = updatedLayer;
      }
    } else {
      applyFeatureChange(updatedFeature);
    }
  };

  const deleteNode = (nodeIndex) => {
    // First check in regular roads
    let selectedFeature = roadGeojson?.features?.find(
      (f) => f.properties.roadid === selectedFeatureId
    );
    
    let isDetectedRoad = false;
    
    // If not found in regular roads, check detected roads
    if (!selectedFeature && detectedRoads?.features) {
      selectedFeature = detectedRoads.features.find(
        (f) => f.properties.roadid === selectedFeatureId
      );
      isDetectedRoad = true;
    }
    
    if (!selectedFeature) return;

    const node = nodes.find((n) => n.index === nodeIndex);
    if (!node) return;

    const prevFeature = JSON.parse(JSON.stringify(selectedFeature));

    if (!beforeSave.current.has(selectedFeatureId)) {
      beforeSave.current.set(selectedFeatureId, prevFeature);
    }

    const updatedFeature = JSON.parse(JSON.stringify(selectedFeature));
    const updatedLine = updatedFeature.geometry.coordinates[node.lineIndex];

    // Remove the point
    updatedLine.splice(node.pointIndex, 1);

    // If a line becomes empty, remove that line
    if (updatedLine.length === 0) {
      updatedFeature.geometry.coordinates.splice(node.lineIndex, 1);
    }

    // Create and push action to undo stack
    const action = createAction('delete-node', selectedFeatureId, prevFeature, updatedFeature);
    pushToUndoStack(action);

    if (isDetectedRoad) {
      // For detected roads, we need to update the detectedRoads state
      const updatedDetectedRoads = {
        ...detectedRoads,
        features: detectedRoads.features.map(f => 
          f.properties.roadid === selectedFeatureId ? updatedFeature : f
        )
      };
      setDetectedRoads(updatedDetectedRoads);
      
      // Also update the visual layer
      if (detectedLayerRef.current) {
        map.removeLayer(detectedLayerRef.current);
        const updatedLayer = L.geoJSON(updatedDetectedRoads, {
          style: {
            color: 'purple',
            weight: 6,
            opacity: 0.9,
            dashArray: '5,10',
          },
          onEachFeature: (feature, layer) => {
            layer.on('click', () => {
              if (tool === 'select') {
                const tempId = feature.properties.roadid || `temp_${Math.random().toString(36).substr(2, 9)}`;
                feature.properties.roadid = tempId;
                setSelectedFeatureId(tempId);
                setSelectedRoadId(tempId);
              }
            });
            layer.bindTooltip("Detected road (not saved)", { permanent: false, direction: 'top' });
          }
        });
        updatedLayer.addTo(map);
        detectedLayerRef.current = updatedLayer;
      }
    } else {
      applyFeatureChange(updatedFeature);
    }
  };

  const applyFeatureChange = (feature) => {
    const updated = JSON.parse(JSON.stringify(roadGeojson));
    const idx = updated.features.findIndex(f => f.properties.roadid === feature.properties.roadid);
    if (idx !== -1) {
      updated.features[idx] = feature;
      setRoadGeojson(updated);
      const layer = roadLayersRef.current.get(feature.properties.roadid);
      if (layer) {
        const latlngs = feature.geometry.coordinates.map(line => line.map(([lng, lat]) => [lat, lng]));
        layer.setLatLngs(latlngs);
      }
    }
    updatedGeojson.current.set(feature.properties.roadid, feature);
    socket.emit('road-edit', feature);
  };

  const undo = () => {
    if (undoStack.current.length === 0) return;

    const action = undoStack.current.pop();

    // Push current state to redo stack
    const currentFeature = roadGeojson.features.find(f => f.properties.roadid === action.roadId);
    if (currentFeature) {
      const redoAction = createAction(
        `redo-${action.type}`,
        action.roadId,
        action.beforeState,
        JSON.parse(JSON.stringify(currentFeature))
      );
      redoStack.current.push(redoAction);
    }

    // Apply the before state
    applyFeatureChange(action.beforeState);
  };

  const redo = () => {
    if (redoStack.current.length === 0) return;

    const action = redoStack.current.pop();

    // Push current state to undo stack
    const currentFeature = roadGeojson.features.find(f => f.properties.roadid === action.roadId);
    if (currentFeature) {
      const undoAction = createAction(
        action.type.replace('redo-', ''),
        action.roadId,
        JSON.parse(JSON.stringify(currentFeature)),
        action.afterState
      );
      undoStack.current.push(undoAction);
    }

    // Apply the after state
    applyFeatureChange(action.afterState);
  };

  const logClick = (roadid, timestamp) => {
    fetch(`api/roads/${roadid}/timestamp/${timestamp}/`)
      .then((res) => res.json())
      .then((res) => setHistoricalFeature(res));
  };

  const hideLog = () => {
    setHistoricalFeature(null);
  };

  // Checks if two line segments are similar (within threshold distance)
  const areSegmentsSimilar = (segment1, segment2, threshold = 0.0003) => { // ~30 meters
    // Simple comparison of start and end points
    const start1 = segment1[0];
    const end1 = segment1[segment1.length - 1];
    const start2 = segment2[0];
    const end2 = segment2[segment2.length - 1];
    
    // Calculate distances between start-start, start-end, end-start, end-end
    const d1 = Math.sqrt(Math.pow(start1[0] - start2[0], 2) + Math.pow(start1[1] - start2[1], 2));
    const d2 = Math.sqrt(Math.pow(start1[0] - end2[0], 2) + Math.pow(start1[1] - end2[1], 2));
    const d3 = Math.sqrt(Math.pow(end1[0] - start2[0], 2) + Math.pow(end1[1] - start2[1], 2));
    const d4 = Math.sqrt(Math.pow(end1[0] - end2[0], 2) + Math.pow(end1[1] - end2[1], 2));
    
    // If either pair of endpoints is close enough, consider them similar
    return (d1 < threshold && d4 < threshold) || (d2 < threshold && d3 < threshold);
  };

  // Filter out detected roads that overlap with existing ones
  const filterDuplicateRoads = (detectedGeojson, existingGeojson) => {
    if (!existingGeojson || !existingGeojson.features || !detectedGeojson || !detectedGeojson.features) {
      return detectedGeojson;
    }
    
    // Extract all line segments from existing roads
    const existingSegments = [];
    existingGeojson.features.forEach(feature => {
      if (feature.geometry && feature.geometry.coordinates) {
        feature.geometry.coordinates.forEach(line => {
          existingSegments.push(line);
        });
      }
    });
    
    // Filter out detected features that are similar to existing ones
    const filteredFeatures = detectedGeojson.features.filter(feature => {
      if (!feature.geometry || !feature.geometry.coordinates) return false;
      
      // For each line in the detected feature
      return feature.geometry.coordinates.some(detectedLine => {
        // Check if this line is unique (not similar to any existing segment)
        return !existingSegments.some(existingSegment => 
          areSegmentsSimilar(detectedLine, existingSegment)
        );
      });
    });
    
    return {
      ...detectedGeojson,
      features: filteredFeatures
    };
  };

  useEffect(() => {
    if (!villageFeature && !roadGeojson && !detectedRoads) return;

    setIsLoading(true);
    // Defer rendering to next tick to allow UI to update
    setTimeout(() => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        roadLayersRef.current.clear();
      }

      if (detectedLayerRef.current) {
        map.removeLayer(detectedLayerRef.current);
      }

      const layerGroup = L.featureGroup();

      if (villageFeature) {
        L.geoJSON(villageFeature, {
          style: {
            color: 'blue',
            weight: 2,
            dashArray: '4',
            fillOpacity: 0.1,
          },
        }).addTo(layerGroup);
      }

      if (roadGeojson) {
        L.geoJSON(roadGeojson, {
          style: (feature) => {
            const roadid = feature.properties.roadid;
            const isLocked = lockedRoads[roadid];
            return {
              color: selectedIds.has(roadid) ? 'green' : isLocked ? '#aaa' : 'red',
              weight: 6,
              opacity: 0.7,
            };
          },
          onEachFeature: (feature, layer) => {
            const roadid = feature.properties.roadid;
            roadLayersRef.current.set(roadid, layer);

            layer.on('click', () => {
              if (tool !== 'select') return;
              if (lockedRoads[roadid]) return;
              if (!selectedIds.has(roadid)) {
                socket.emit('road-lock', { roadid, username: user });
                setSelectedIds(prev => new Set(prev).add(roadid));
              }
              setSelectedFeatureId(roadid);
              setSelectedRoadId(roadid);
              fetch(`/api/roads/${roadid}/info/`).then(res => res.json()).then(setRoadInfo);

              setShowRoadInfo(true);
            });

            if (lockedRoads[roadid]) {
              layer.bindTooltip(`Locked by ${lockedRoads[roadid]}`, { permanent: false, direction: 'top' });
            }

            layerGroup.addLayer(layer);
          }
        });
      }

      // Render detected roads if available
      if (detectedRoads && detectedRoads.features) {
        const detectedLayer = L.geoJSON(detectedRoads, {
          style: {
            color: 'purple', // Different color for detected roads
            weight: 6,
            opacity: 0.9,
            dashArray: '5,10', // Dashed line to distinguish detected roads
          },
          onEachFeature: (feature, layer) => {
            // Add click handler for detected roads
            layer.on('click', () => {
              if (tool === 'select') {
                // Generate a temporary ID if needed
                const tempId = feature.properties.roadid || `temp_${Math.random().toString(36).substr(2, 9)}`;
                feature.properties.roadid = tempId;
                
                setSelectedFeatureId(tempId);
                setSelectedRoadId(tempId);
              }
            });
            
            // Add a tooltip to show this is a detected road
            layer.bindTooltip("Detected road (not saved)", { permanent: false, direction: 'top' });
          }
        });
        
        detectedLayer.addTo(map);
        detectedLayerRef.current = detectedLayer;
      }

      if (historicalFeature) {
        L.geoJSON(historicalFeature, {
          style: {
            color: 'orange',
            weight: 4,
            opacity: 0.8,
          }
        }).addTo(layerGroup);
      }

      layerGroup.addTo(map);
      layerRef.current = layerGroup;

      if (!hasZoomed.current) {
        const bounds = layerGroup.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { animate: false });
          hasZoomed.current = true;
        }
      }

      setIsLoading(false);
    }, 10);
  }, [villageFeature, roadGeojson, selectedFeatureId, lockedRoads, tool, selectedIds, historicalFeature, detectedRoads]);

  useEffect(() => {
    const handleUnload = () => {
      if (selectedFeatureId) {
        socket.emit('road-unlock', { roadid: selectedFeatureId });
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [selectedFeatureId]);

  return (
    <>
      {isLoading && (
        <div className="absolute z-50 top-0 left-0 right-0 bg-blue-500 text-white text-center py-1">
          Loading map data...
        </div>
      )}
      {isDetecting && (
        <div className="absolute z-50 top-0 left-0 right-0 bg-purple-500 text-white text-center py-1">
          Detecting roads... Please wait
        </div>
      )}
      {nodes.map((node) => (
        <Marker
          key={node.index}
          position={[node.lat, node.lng]}
          icon={createNodeIcon(tool)}
          draggable={tool === 'move-node' || tool === 'add-node'}
          eventHandlers={{
            dragend: (e) => {
              const latlng = e.target.getLatLng();
              updateNode(node.index, latlng);
            },
            click: () => {
              if (tool === 'delete-node') {
                deleteNode(node.index);
              } else if (tool === 'add-node') {
                setAddAfterNodeIndex(node.index);
              }
            }
          }}
        />
      ))}
    </>
  );
};

// Add the useMapTool hook to get the tool state
export default function MapEditor({
  user,
  setSelectedRoadId,
  villageFeature,
  roadGeojson,
  setRoadGeojson,
  setRoadInfo,
  setShowRoadInfo,
}) {
  const defaultPosition = [21.686675,71.311336];
  const mapRef = useRef(null);
  const [selectedFeatureId, setSelectedFeatureId] = useState(null);
  const [lockedRoads, setLockedRoads] = useState({});
  const { tool } = useMapTool(); // Add this line to get the tool state

  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "/leaflet/marker-icon-2x.png",
    iconUrl: "/leaflet/marker-icon.png",
    shadowUrl: "/leaflet/marker-shadow.png",
  });

  useEffect(() => {
    socket.emit("request-locks");

    socket.on("road-updated", (data) => {
      setRoadGeojson((prev) => {
        const updatedFeatures = prev.features.map((f) =>
          f.properties.roadid === data.properties.roadid ? data : f
        );
        return { ...prev, features: updatedFeatures };
      });
    });

    socket.on("road-locked", ({ roadid, username }) => {
      setLockedRoads((prev) => ({ ...prev, [roadid]: username }));
    });

    socket.on("road-unlocked", ({ roadid }) => {
      setLockedRoads((prev) => {
        const copy = { ...prev };
        delete copy[roadid];
        return copy;
      });
    });

    socket.on("initial-locks", (locks) => {
      setLockedRoads(locks);
    });

    return () => {
      socket.off("road-updated");
      socket.off("road-locked");
      socket.off("road-unlocked");
      socket.off("initial-locks");
    };
  }, [setRoadGeojson]);

  // Fix the cursor styles effect to use mapRef instead of map
  useEffect(() => {
    if (!mapRef.current) return;
    
    if (tool === 'detect-roads') {
      mapRef.current.getContainer().style.cursor = 'crosshair';
    } else if (tool === 'add-node') {
      mapRef.current.getContainer().style.cursor = 'cell';
    } else if (tool === 'delete-node') {
      mapRef.current.getContainer().style.cursor = 'not-allowed';
    } else if (tool === 'move-node') {
      mapRef.current.getContainer().style.cursor = 'move';
    } else if (tool === 'select') {
      mapRef.current.getContainer().style.cursor = 'pointer';
    } else {
      mapRef.current.getContainer().style.cursor = '';
    }
    
    return () => {
      if (mapRef.current) {
        mapRef.current.getContainer().style.cursor = '';
      }
    };
  }, [tool]);

  return (
    <div className="flex-1">
      <MapContainer
        center={defaultPosition}
        zoom={7}
        style={{ height: "100%", width: "100%" }}
        ref={mapRef}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
          attribution="© OpenStreetMap contributors"
        />

        {(villageFeature || roadGeojson) && (
          <GeoJSONEditor
            user={user}
            setSelectedRoadId={setSelectedRoadId}
            villageFeature={villageFeature}
            roadGeojson={roadGeojson}
            setRoadGeojson={setRoadGeojson}
            selectedFeatureId={selectedFeatureId}
            setSelectedFeatureId={setSelectedFeatureId}
            lockedRoads={lockedRoads}
            setLockedRoads={setLockedRoads}
            setRoadInfo={setRoadInfo}
            setShowRoadInfo={setShowRoadInfo}
          />
        )}
      </MapContainer>
    </div>
  );
}