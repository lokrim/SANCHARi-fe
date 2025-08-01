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
import { useMapTool } from "@/app/context/MapToolContext";
import toast from "react-hot-toast";

/**
 * Creates a custom node icon for the map based on the current tool
 * @param {string} tool - The currently active tool
 * @returns {L.DivIcon} A Leaflet DivIcon for node representation
 */
const createNodeIcon = (tool) => {
  const div = document.createElement('div');
  div.className =
    'w-3 h-3 rounded-full border-2 border-white bg-blue-600 shadow-md transition-transform duration-150 hover:scale-125';

  // Add red hover effect for delete tool
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

/**
 * Core component that handles editing GeoJSON data on the map
 * Provides tools for road editing, detection, and manipulation
 */
const GeoJSONEditor = ({
  user,
  villageFeature,
  globalLockedRoads,
  roadGeojson,
  setRoadGeojson,
}) => {
  // Access the Leaflet map instance
  const map = useMap();
  
  // References for map layers
  const layerRef = useRef(null);
  const detectedLayerRef = useRef(null);
  const roadLayersRef = useRef(new Map());
  const updatedGeojson = useRef(new Map());
  const nodeMap = useRef(new Map());

  // Undo/redo functionality
  const undoStack = useRef([]);
  const redoStack = useRef([]);

  // Get context values from MapToolContext
  const { 
    tool, setTool, saveEditRef, checkValidSave, cancelEditRef, logClickRef, hideLogRef, 
    lockedRoads, setLockedRoads, beforeSaveRef, lockRoad, unlockRoad, unlockAllMyRoads, isMyRoad, selectRoad,
    selectedFeatureId, currentUser, setCurrentUser, applyFeatureChangeRef,
    detectedRoads, setDetectedRoads, isDetecting, setIsDetecting,
    socket 
  } = useMapTool();
  
  // Component state
  const [historicalFeature, setHistoricalFeature] = useState(null);
  const [addAfterNodeIndex, setAddAfterNodeIndex] = useState(null);
  const [nodes, setNodes] = useState([]);
  const hasZoomed = useRef(false);
  const [isLoading, setIsLoading] = useState(false);

  // Set current user when component initializes
  useEffect(() => {
    if (user && !currentUser) {
      setCurrentUser(user);
    }
  }, [user, currentUser, setCurrentUser]);

  /**
   * Creates an action object for the undo/redo stack
   * @param {string} type - Type of action performed
   * @param {string} roadId - ID of the affected road
   * @param {Object} beforeState - State before the action
   * @param {Object} afterState - State after the action
   * @returns {Object} Action object for undo/redo stack
   */
  const createAction = (type, roadId, beforeState, afterState) => ({
    type,
    roadId,
    beforeState: JSON.parse(JSON.stringify(beforeState)),
    afterState: JSON.parse(JSON.stringify(afterState)),
    timestamp: Date.now()
  });

  /**
   * Pushes an action to the undo stack and clears the redo stack
   * @param {Object} action - Action object to push to the stack
   */
  const pushToUndoStack = (action) => {
    undoStack.current.push(action);
    redoStack.current.length = 0; // Clear redo stack when new action is performed

    // Limit stack size to prevent memory issues
    if (undoStack.current.length > 20) {
      undoStack.current.shift();
    }
  };

  // Handle different tool interactions with the map
  useEffect(() => {
    if (!tool || !map) {
      setTool('move');
    }

    // Configure map interactivity based on active tool
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

    // Handle single-action tools that should reset after use
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

  // Update cursor based on the active tool
  useEffect(() => {
    if (!map) return;
    
    // Set appropriate cursor for different editing tools
    if (tool === 'detect-roads') {
      map.getContainer().style.cursor = 'crosshair';
    } else if (tool === 'add-node') {
      map.getContainer().style.cursor = 'cell';
    } else if (tool === 'delete-node') {
      map.getContainer().style.cursor = 'not-allowed';
    } else if (tool === 'move-node') {
      map.getContainer().style.cursor = 'move';
    } else if (tool === 'select') {
      map.getContainer().style.cursor = 'pointer';
    } else {
      map.getContainer().style.cursor = '';
    }
    
    // Reset cursor when component unmounts or tool changes
    return () => {
      if (map) {
        map.getContainer().style.cursor = '';
      }
    };
  }, [tool, map]);

  // Handle adding nodes with click when add-node tool is active
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

  /**
   * Handles road detection when 'detect-roads' tool is active
   * Sets up a click handler that calls the API to detect roads at clicked location
   */
  useEffect(() => {
    // Only activate detection click handler when tool is active and not already detecting
    if (tool !== 'detect-roads' || isDetecting) return;

    const handleDetectionClick = async (e) => {
      try {
        // Get click coordinates
        const { lat, lng } = e.latlng;
        setIsDetecting(true);
        console.log(`Detecting roads at lat: ${lat}, lng: ${lng}`);
        
        // Show loading toast for user feedback
        const loadingToast = toast.loading('Detecting roads. Please wait...');
        
        // Set a timeout for the API call to prevent indefinite waiting
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout
        
        // Call the road detection API
        // Note: Currently using a fixed coordinate for testing - replace with actual click coordinates when ready
        const response = await fetch(
          //`http://localhost:5000/infer_coord?lat=${lat}&lon=${lng}`,
          "http://localhost:5000/infer_coord?lat=21.686675&lon=71.311336",
          { signal: controller.signal }
        );
        
        clearTimeout(timeoutId);
        
        // Handle API errors
        if (!response.ok) {
          toast.error(`Error detecting roads: ${response.statusText}`, { id: loadingToast });
          throw new Error(`Detection failed with status: ${response.status}`);
        }
        
        // Process the detected roads
        const detectedGeojson = await response.json();
        
        // Filter out roads that are duplicates of existing ones
        const filteredGeojson = filterDuplicateRoads(detectedGeojson, roadGeojson);
        console.log('Filtered detected roads:', filteredGeojson);
        
        // Update state with filtered detected roads
        setDetectedRoads(filteredGeojson);
        toast.success('Roads detected successfully!', { id: loadingToast });
        
        // Switch to move tool after detection for better UX
        setTool('move');
      } catch (error) {
        // Handle specific error types
        if (error.name === 'AbortError') {
          toast.error('Detection timed out after 5 minutes.');
        } else {
          toast.error(`Error detecting roads: ${error.message}`);
          console.error('Detection error:', error);
        }
      } finally {
        // Ensure detection state is reset regardless of outcome
        setIsDetecting(false);
      }
    };

    // Attach and detach the click handler
    map.on('click', handleDetectionClick);
    return () => {
      map.off('click', handleDetectionClick);
    };
  }, [tool, map, isDetecting, setDetectedRoads, setIsDetecting, setTool, roadGeojson]);

  // Set up callback refs for external components to interact with this component
  useEffect(() => {
    saveEditRef.current = onSaveChange;
    checkValidSave.current = () => updatedGeojson.current.size > 0 || detectedRoads !== null;
    cancelEditRef.current = () => {
      beforeSaveRef.current.forEach(f => applyFeatureChange(f));
      updatedGeojson.current.clear();
      setDetectedRoads(null); // Clear detected roads when canceling
    };
    logClickRef.current = logClick;
    hideLogRef.current = hideLog;
    applyFeatureChangeRef.current = applyFeatureChange;
  }, [roadGeojson, detectedRoads]);

  // Escape key handler to unlock all roads
  useEffect(() => {
    const esc = (e) => {
      if (e.key === 'Escape' && selectedFeatureId) {
        unlockAllMyRoads();
      }
    };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [selectedFeatureId, unlockAllMyRoads]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKey = (e) => {
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        undo();
      } else if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
        e.preventDefault();
        redo();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [roadGeojson, selectedFeatureId]);

  /**
   * Update nodes when selectedFeatureId changes
   * Handles both regular and detected roads
   */
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

    if (!selectedFeature || !selectedFeature.geometry || !selectedFeature.geometry.coordinates) {
      setNodes([]);
      return;
    }

    const newNodes = [];
    let nodeIndex = 0;

    try {
      // Ensure we're dealing with arrays of coordinates
      selectedFeature.geometry.coordinates.forEach((line, lineIndex) => {
        // Check if line is an array before iterating
        if (Array.isArray(line)) {
          line.forEach(([lng, lat], pointIndex) => {
            // Ensure lng and lat are numbers
            if (typeof lng === 'number' && typeof lat === 'number') {
              newNodes.push({
                index: nodeIndex++,
                lat,
                lng,
                lineIndex,
                pointIndex,
              });
            }
          });
        }
      });
    } catch (error) {
      console.error("Error processing coordinates:", error);
    }

    setNodes(newNodes);
  }, [selectedFeatureId, roadGeojson, detectedRoads]);

  /**
   * Inserts a new node at a specified position
   * @param {number} nodeIndex - Index of the node after which to insert
   * @param {Object} latlng - Latitude and longitude of the new node
   * @returns {number|undefined} The new index or undefined if operation failed
   */
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

    // Store original state for possible rollback
    if (!beforeSaveRef.current.has(selectedFeatureId)) {
      beforeSaveRef.current.set(selectedFeatureId, prevFeature);
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
      
      // Update the visual layer
      updateDetectedRoadsLayer(updatedDetectedRoads);
    } else {
      applyFeatureChange(updatedFeature);
    }
    
    return insertIndex;
  };

  /**
   * Updates an existing node's position
   * @param {number} nodeIndex - Index of the node to update
   * @param {Object} newLatLng - New latitude and longitude
   */
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

    // Store original state for possible rollback
    if (!beforeSaveRef.current.has(selectedFeatureId)) {
      beforeSaveRef.current.set(selectedFeatureId, prevFeature);
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
      
      // Update the visual layer
      updateDetectedRoadsLayer(updatedDetectedRoads);
    } else {
      applyFeatureChange(updatedFeature);
    }
  };

  /**
   * Deletes a node from a road
   * @param {number} nodeIndex - Index of the node to delete
   */
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

    // Store original state for possible rollback
    if (!beforeSaveRef.current.has(selectedFeatureId)) {
      beforeSaveRef.current.set(selectedFeatureId, prevFeature);
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
      
      // Update the visual layer
      updateDetectedRoadsLayer(updatedDetectedRoads);
    } else {
      applyFeatureChange(updatedFeature);
    }
  };

  /**
   * Saves changes to the map, including both edited and detected roads
   * @param {string} msg - Commit message for the change
   */
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
          const tempId = feature.properties?.roadid || `new_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
        
        // Clean up after successful save
        updatedGeojson.current.clear();
        beforeSaveRef.current.clear();
        setDetectedRoads(null); // Clear detected roads after saving

        // Clear undo/redo stacks after successful save
        undoStack.current.length = 0;
        redoStack.current.length = 0;
      }
    } catch (error) {
      console.error("Error saving changes:", error);
    }
  };

  /**
   * Applies changes to a feature and updates the map
   * @param {Object} feature - The updated feature
   */
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

  /**
   * Undoes the last action
   */
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

    // Clean up beforeSave if we're going back to original state
    if(beforeSaveRef.current.has(action.roadId)){
      if(action.beforeState == beforeSaveRef.current.get(action.roadId)) beforeSaveRef.current.delete(action.roadId);
    }

    // Apply the before state
    applyFeatureChange(action.beforeState);
  };

  /**
   * Redoes the last undone action
   */
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

  /**
   * Shows historical version of a road
   */
  const logClick = (roadid, timestamp) => {
    fetch(`api/roads/${roadid}/timestamp/${timestamp}/`)
      .then((res) => res.json())
      .then((res) => setHistoricalFeature(res));
  };

  /**
   * Hides historical version of a road
   */
  const hideLog = () => {
    setHistoricalFeature(null);
  };

  /**
   * Checks if two line segments are similar (within threshold distance)
   * Used for detecting duplicate roads
   * 
   * @param {Array} segment1 - First line segment
   * @param {Array} segment2 - Second line segment
   * @param {number} threshold - Distance threshold (default: 0.0003, ~30 meters)
   * @returns {boolean} True if segments are similar
   */
  const areSegmentsSimilar = (segment1, segment2, threshold = 0.0003) => {
    // Validate input segments
    if (!Array.isArray(segment1) || !Array.isArray(segment2) || 
        segment1.length < 1 || segment2.length < 1) {
      return false;
    }
    
    try {
      // Get start and end points of both segments
      const start1 = segment1[0];
      const end1 = segment1[segment1.length - 1];
      const start2 = segment2[0];
      const end2 = segment2[segment2.length - 1];
      
      // Make sure coordinates are valid arrays with numbers
      if (!Array.isArray(start1) || !Array.isArray(end1) || 
          !Array.isArray(start2) || !Array.isArray(end2)) {
        return false;
      }
      
      // Calculate distances between endpoints
      const d1 = Math.sqrt(Math.pow(start1[0] - start2[0], 2) + Math.pow(start1[1] - start2[1], 2));
      const d2 = Math.sqrt(Math.pow(start1[0] - end2[0], 2) + Math.pow(start1[1] - end2[1], 2));
      const d3 = Math.sqrt(Math.pow(end1[0] - start2[0], 2) + Math.pow(end1[1] - start2[1], 2));
      const d4 = Math.sqrt(Math.pow(end1[0] - end2[0], 2) + Math.pow(end1[1] - end2[1], 2));
      
      // If either pair of endpoints is close enough, consider them similar
      return (d1 < threshold && d4 < threshold) || (d2 < threshold && d3 < threshold);
    } catch (error) {
      console.error("Error comparing segments:", error);
      return false;
    }
  };

  /**
   * Filters out detected roads that overlap with existing ones
   * Prevents duplicate roads from being added to the map
   * 
   * @param {Object} detectedGeojson - GeoJSON of newly detected roads
   * @param {Object} existingGeojson - GeoJSON of existing roads
   * @returns {Object} Filtered GeoJSON with only unique roads
   */
  const filterDuplicateRoads = (detectedGeojson, existingGeojson) => {
    // Validate input
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
      
      // Normalize LineString to MultiLineString if needed
      let coordinates = feature.geometry.coordinates;
      if (feature.geometry.type === 'LineString') {
        coordinates = [coordinates]; // Wrap in array to match MultiLineString format
      }
      
      // For each line in the detected feature
      return coordinates.some(detectedLine => {
        // Check if this line is unique (not similar to any existing segment)
        return !existingSegments.some(existingSegment => 
          areSegmentsSimilar(detectedLine, existingSegment)
        );
      });
    });
    
    // Ensure each feature has a unique road ID and proper geometry type
    filteredFeatures.forEach(feature => {
      // Add properties if missing
      if (!feature.properties) feature.properties = {};
      
      // Generate unique ID
      feature.properties.roadid = `detected_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Normalize geometry type
      if (feature.geometry.type === 'LineString') {
        feature.geometry.type = 'MultiLineString';
        feature.geometry.coordinates = [feature.geometry.coordinates];
      }
    });
    
    return {
      type: "FeatureCollection",
      features: filteredFeatures
    };
  };

  /**
   * Updates the detected roads layer on the map
   * Creates a new layer with proper styling and interactivity
   * 
   * @param {Object} updatedRoads - GeoJSON of detected roads
   */
  const updateDetectedRoadsLayer = (updatedRoads) => {
    if (!map || !updatedRoads) return;
    
    // Remove existing layer if present
    if (detectedLayerRef.current) {
      map.removeLayer(detectedLayerRef.current);
    }
    
    // Create new layer with detected roads
    const detectedLayer = L.geoJSON(updatedRoads, {
      // Distinct visual style for detected roads
      style: {
        color: 'purple',
        weight: 6,
        opacity: 0.9,
        dashArray: '5,10', // Dashed line indicates detected status
      },
      onEachFeature: (feature, layer) => {
        // Add click handler for detected roads
        layer.on('click', () => {
          if (tool === 'select') {
            // Ensure the feature has a roadid
            if (!feature.properties) feature.properties = {};
            const tempId = feature.properties.roadid || `temp_${Math.random().toString(36).substr(2, 9)}`;
            feature.properties.roadid = tempId;
            
            // Update the feature in the detectedRoads state with the ID
            const updatedDetectedRoads = {
              ...detectedRoads,
              features: detectedRoads.features.map(f => 
                f === feature ? {...f, properties: {...f.properties, roadid: tempId}} : f
              )
            };
            setDetectedRoads(updatedDetectedRoads);
            
            // Select the road for editing
            selectRoad(tempId);
          }
        });
        
        // Add a tooltip to show this is a detected road
        layer.bindTooltip("Detected road (not saved)", { permanent: false, direction: 'top' });
      }
    });
    
    // Add the layer to the map
    detectedLayer.addTo(map);
    detectedLayerRef.current = detectedLayer;
  };

  // Render map layers when data changes
  useEffect(() => {
    // Only proceed if we have data to render
    if (!villageFeature && !roadGeojson && !detectedRoads) return;
    if (!map || !map.getContainer()) return; // Make sure map exists and is mounted

    setIsLoading(true);
    
    // Defer rendering to ensure map is ready
    const timer = setTimeout(() => {
      try {
        // Clean up existing layers
        if (layerRef.current) {
          map.removeLayer(layerRef.current);
          roadLayersRef.current.clear();
        }

        if (detectedLayerRef.current) {
          map.removeLayer(detectedLayerRef.current);
        }

        // Create main feature group for all layers
        const layerGroup = L.featureGroup();

        // Render village boundary if available
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

        // Render existing roads if available
        if (roadGeojson) {
          L.geoJSON(roadGeojson, {
            style: (feature) => {
              const roadid = feature.properties.roadid;
              const isLocked = globalLockedRoads[roadid];
              const isMyLock = isMyRoad(roadid);
              
              return {
                color: isMyLock ? 'green' : isLocked ? '#aaa' : 'red',
                weight: 6,
                opacity: 0.7,
              };
            },
            onEachFeature: (feature, layer) => {
              const roadid = feature.properties.roadid;
              roadLayersRef.current.set(roadid, layer);

              layer.on('click', () => {
                if (tool !== 'select') return;
                if (globalLockedRoads[roadid] && globalLockedRoads[roadid] !== user) return;
                
                if (!isMyRoad(roadid)) {
                  lockRoad(roadid, user);
                }
                selectRoad(roadid);
              });

              if (globalLockedRoads[roadid] && globalLockedRoads[roadid] !== user) {
                layer.bindTooltip(`Locked by ${globalLockedRoads[roadid]}`, { permanent: false, direction: 'top' });
              }

              layerGroup.addLayer(layer);
            }
          });
        }

        // Render detected roads if available
        if (detectedRoads && detectedRoads.features && detectedRoads.features.length > 0) {
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
                  if (!feature.properties) feature.properties = {};
                  const tempId = feature.properties.roadid || `temp_${Math.random().toString(36).substr(2, 9)}`;
                  feature.properties.roadid = tempId;
                  
                  // Make sure to update the feature in the detectedRoads state
                  const updatedDetectedRoads = {
                    ...detectedRoads,
                    features: detectedRoads.features.map(f => 
                      f === feature ? {...f, properties: {...f.properties, roadid: tempId}} : f
                    )
                  };
                  setDetectedRoads(updatedDetectedRoads);
                  
                  selectRoad(tempId);
                }
              });
              
              // Add a tooltip to show this is a detected road
              layer.bindTooltip("Detected road (not saved)", { permanent: false, direction: 'top' });
            }
          });
          
          detectedLayer.addTo(map);
          detectedLayerRef.current = detectedLayer;
        }

        // Render historical feature if available
        if (historicalFeature) {
          L.geoJSON(historicalFeature, {
            style: {
              color: 'orange',
              weight: 4,
              opacity: 0.8,
            }
          }).addTo(layerGroup);
        }

        // Add all layers to the map
        layerGroup.addTo(map);
        layerRef.current = layerGroup;

        // Zoom to fit all features on initial load
        if (!hasZoomed.current) {
          const bounds = layerGroup.getBounds();
          if (bounds.isValid()) {
            map.fitBounds(bounds, { animate: false });
            hasZoomed.current = true;
          }
        }
      } catch (error) {
        console.error("Error rendering map layers:", error);
      } finally {
        setIsLoading(false);
      }
    }, 100); // Increased timeout for map initialization

    return () => clearTimeout(timer);
  }, [villageFeature, roadGeojson, selectedFeatureId, globalLockedRoads, lockedRoads, tool, historicalFeature, isMyRoad, user, detectedRoads, map]);

  // Clean up locks when navigating away
  useEffect(() => {
    const handleUnload = () => {
      if (selectedFeatureId) {
        unlockRoad(selectedFeatureId);
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [selectedFeatureId, unlockRoad]);

  // Component rendering
  return (
    <>
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute z-50 top-0 left-0 right-0 bg-blue-500 text-white text-center py-1">
          Loading map data...
        </div>
      )}
      
      {/* Road detection progress indicator */}
      {isDetecting && (
        <div className="absolute z-50 top-0 left-0 right-0 bg-purple-500 text-white text-center py-1">
          Detecting roads... Please wait
        </div>
      )}
      
      {/* Render node markers for the selected road */}
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

/**
 * Main MapEditor component
 * Wraps the GeoJSONEditor with a MapContainer and handles socket connections
 */
export default function MapEditor({
  user,
  villageFeature,
  roadGeojson,
  setRoadGeojson,
}) {
  // Default map position (Gujarat, India)
  const defaultPosition = [21.686675, 71.311336];
  const mapRef = useRef(null);
  const { setLockedRoads, socket, tool } = useMapTool();
  const [globalLockedRoads, setGlobalLockedRoads] = useState({});

  // Fix Leaflet icon issue
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "/leaflet/marker-icon-2x.png",
    iconUrl: "/leaflet/marker-icon.png",
    shadowUrl: "/leaflet/marker-shadow.png",
  });

  // Set up WebSocket connection for collaborative editing
  useEffect(() => {
    // Request currently locked roads
    socket.emit("request-locks");

    // Handle road updates from other users
    socket.on("road-updated", (data) => {
      setRoadGeojson((prev) => {
        const updatedFeatures = prev.features.map((f) =>
          f.properties.roadid === data.properties.roadid ? data : f
        );
        return { ...prev, features: updatedFeatures };
      });
    });

    // Handle road locking by other users
    socket.on("road-locked", ({ roadid, username }) => {
      setGlobalLockedRoads((prev) => ({ ...prev, [roadid]: username }));
    });

    // Handle road unlocking
    socket.on("road-unlocked", ({ roadid }) => {
      setGlobalLockedRoads((prev) => {
        const copy = { ...prev };
        delete copy[roadid];
        return copy;
      });
    });

    // Handle initial lock state
    socket.on("initial-locks", (locks) => {
      setGlobalLockedRoads(locks);
    });

    // Clean up socket listeners on unmount
    return () => {
      socket.off("road-updated");
      socket.off("road-locked");
      socket.off("road-unlocked");
      socket.off("initial-locks");
    };
  }, [setRoadGeojson]);

  return (
    <div className="flex-1">
      <MapContainer
        center={defaultPosition}
        zoom={7}
        style={{ height: "100%", width: "100%" }}
        whenCreated={(map) => {
          mapRef.current = map;
        }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
          attribution="© OpenStreetMap contributors"
        />

        {(villageFeature || roadGeojson) && (
          <GeoJSONEditor
            user={user}
            villageFeature={villageFeature}
            globalLockedRoads={globalLockedRoads}
            roadGeojson={roadGeojson}
            setRoadGeojson={setRoadGeojson}
          />
        )}
      </MapContainer>
    </div>
  );
}