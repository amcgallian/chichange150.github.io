// Map initialization and management
let map1, map2;

// Initialize maps when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  initializeMaps();
});

function initializeMaps() {
  map1 = document.getElementById('map1');
  map2 = document.getElementById('map2');
  
  setupMap(map1, 'map1');
  setupMap(map2, 'map2');
  
  // Set up toggle button
  setupMapToggle();
  
  // Watch for second map becoming visible
  watchSecondMap();
}

function setupMap(mapElement, mapId) {
  if (!mapElement) return;
  
  // Wait for view to be ready
  if (mapElement.view) {
    onMapReady(mapElement);
  } else {
    mapElement.addEventListener('arcgisViewReady', function() {
      console.log(`Map ${mapId} ready`);
      onMapReady(mapElement);
    }, { once: true });
  }
}

function onMapReady(mapElement) {
  // Add time slider if map has time-enabled layers
  addTimeSlider(mapElement);
  
  // Set up click handler for dynamic plot updates
  if (mapElement.id === 'map1') {
    setupClickHandler(mapElement);
  }
}

function addTimeSlider(mapElement) {
  if (!mapElement || !mapElement.view) return;
  
  // Check if slider already exists
  if (mapElement.querySelector('arcgis-time-slider')) return;
  
  const view = mapElement.view;
  
  view.when(() => {
    // Check if any layers have time info
    const layers = view.map.layers;
    let hasTimeLayers = false;
    
    layers.forEach(layer => {
      if (layer.timeInfo) {
        hasTimeLayers = true;
      }
    });
    
    if (hasTimeLayers) {
      const timeSlider = document.createElement('arcgis-time-slider');
      timeSlider.setAttribute('view', '');
      timeSlider.setAttribute('full-time-extent', '');
      timeSlider.setAttribute('playback-speed', '1000');
      timeSlider.setAttribute('loop', '');
      timeSlider.view = view;
      mapElement.appendChild(timeSlider);
      console.log('Time slider added to map', mapElement.id);
    }
  });
}

function setupClickHandler(mapElement) {
  if (!mapElement || !mapElement.view) return;
  
  const view = mapElement.view;
  
  view.on('click', function(event) {
    // Show loading spinner
    const loadingSpinner = document.getElementById('plotLoading');
    if (loadingSpinner) {
      loadingSpinner.classList.remove('hidden');
    }
    
    // Get map point coordinates
    const mapPoint = event.mapPoint;
    const latitude = mapPoint.latitude;
    const longitude = mapPoint.longitude;
    
    // Hit test to find features at click location
    view.hitTest(event).then(function(response) {
      const results = response.results;
      
      // Filter for graphics from feature layers
      const featureResults = results.filter(function(result) {
        return result.graphic && result.graphic.layer;
      });
      
      // Simulate async operation
      setTimeout(function() {
        if (featureResults.length > 0) {
          // Found actual features
          const firstFeature = featureResults[0];
          const layer = firstFeature.graphic.layer;
          const attributes = firstFeature.graphic.attributes;
          
          updateDynamicPlotWithFeatures(layer, attributes, latitude, longitude);
        } else {
          // No features found, show location-based data
          updateDynamicPlotWithLocation(latitude, longitude);
        }
        
        // Hide loading spinner
        if (loadingSpinner) {
          loadingSpinner.classList.add('hidden');
        }
      }, 500);
    }).catch(function(error) {
      console.error('Hit test failed:', error);
      
      // Fallback to location-based data
      setTimeout(function() {
        updateDynamicPlotWithLocation(latitude, longitude);
        
        if (loadingSpinner) {
          loadingSpinner.classList.add('hidden');
        }
      }, 500);
    });
  });
}

function setupMapToggle() {
  const mapColumn = document.getElementById('mapColumn');
  const toggleBtn = document.getElementById('toggleMapBtn');
  
  if (!mapColumn || !toggleBtn) return;
  
  toggleBtn.addEventListener('click', function() {
    if (mapColumn.classList.contains('single-view')) {
      // Switch to split view
      mapColumn.classList.remove('single-view');
      mapColumn.classList.add('split-view');
      toggleBtn.querySelector('i').className = 'fas fa-minus';
      toggleBtn.title = 'Remove Second Map View';
      
      // Resize both maps after split
      setTimeout(() => {
        if (map1 && map1.view) map1.view.resize();
        if (map2 && map2.view) map2.view.resize();
      }, 100);
    } else {
      // Switch to single view
      mapColumn.classList.remove('split-view');
      mapColumn.classList.add('single-view');
      toggleBtn.querySelector('i').className = 'fas fa-plus';
      toggleBtn.title = 'Add Second Map View';
      
      // Resize main map
      setTimeout(() => {
        if (map1 && map1.view) map1.view.resize();
      }, 100);
    }
  });
}

function watchSecondMap() {
  const secondMapContainer = document.getElementById('secondMapContainer');
  if (!secondMapContainer) return;
  
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'class') {
        const map2 = document.getElementById('map2');
        if (map2 && !secondMapContainer.classList.contains('hidden')) {
          setupMap(map2, 'map2');
        }
      }
    });
  });
  
  observer.observe(secondMapContainer, { attributes: true });
}

// Make functions available globally for plots.js
window.updateDynamicPlotWithFeatures = function(layer, attributes, lat, lng) {
  // This will be implemented in plots.js
  if (window.updatePlotWithFeatures) {
    window.updatePlotWithFeatures(layer, attributes, lat, lng);
  }
};

window.updateDynamicPlotWithLocation = function(lat, lng) {
  // This will be implemented in plots.js
  if (window.updatePlotWithLocation) {
    window.updatePlotWithLocation(lat, lng);
  }
};