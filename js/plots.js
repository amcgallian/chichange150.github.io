// Initialize plots when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  createStaticPlot();
  initializeDynamicPlot();
  
  // Make update functions globally available
  window.updatePlotWithFeatures = updateDynamicPlotWithFeatures;
  window.updatePlotWithLocation = updateDynamicPlotWithLocation;
});

function createStaticPlot() {
  // Sample static data - this would come from your harvested data
  const layerTypes = [
    'Feature Service',
    'Feature Layer',
    'Web Map',
    'StoryMap',
    'Scene Service',
    'Image Service'
  ];
  
  const counts = [45, 32, 28, 15, 12, 8];
  const colors = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c'];
  
  const trace = {
    labels: layerTypes,
    values: counts,
    type: 'pie',
    marker: {
      colors: colors
    },
    textinfo: 'label+percent',
    textposition: 'outside',
    automargin: true,
    hole: 0.3
  };
  
  const layout = {
    title: {
      text: 'Layer Distribution by Type',
      font: { size: 14 }
    },
    margin: { t: 40, b: 20, l: 20, r: 20 },
    showlegend: false,
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: {
      size: 11
    }
  };
  
  const config = {
    responsive: true,
    displayModeBar: false
  };
  
  Plotly.newPlot('staticPlotContent', [trace], layout, config);
}

function initializeDynamicPlot() {
  // Initial empty plot with instructions
  const trace = {
    x: ['Click on map to see data'],
    y: [1],
    type: 'bar',
    marker: {
      color: '#bdc3c7'
    }
  };
  
  const layout = {
    title: {
      text: 'Click on the map to see layer details',
      font: { size: 14 }
    },
    xaxis: { 
      showticklabels: false
    },
    yaxis: { 
      showticklabels: false
    },
    margin: { t: 40, b: 30, l: 30, r: 30 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    annotations: [{
      x: 0.5,
      y: 0.5,
      xref: 'paper',
      yref: 'paper',
      text: 'Click any location on the map<br>to see interactive statistics',
      showarrow: false,
      font: {
        size: 12,
        color: '#7f8c8d'
      }
    }]
  };
  
  const config = {
    responsive: true,
    displayModeBar: false
  };
  
  Plotly.newPlot('dynamicPlotContent', [trace], layout, config);
}

function updateDynamicPlotWithFeatures(layer, attributes, lat, lng) {
  // Extract attribute names and values
  const attributeKeys = Object.keys(attributes).slice(0, 8); // Limit to 8 attributes
  const attributeValues = attributeKeys.map(key => {
    const val = attributes[key];
    return typeof val === 'number' ? val : 0;
  });
  
  const trace = {
    x: attributeKeys,
    y: attributeValues,
    type: 'bar',
    marker: {
      color: '#3498db',
      opacity: 0.8
    },
    text: attributeValues.map(v => typeof v === 'number' ? v.toLocaleString() : v),
    textposition: 'auto'
  };
  
  const layout = {
    title: {
      text: `${layer.title || 'Layer'} at (${lat.toFixed(4)}°, ${lng.toFixed(4)}°)`,
      font: { size: 12 }
    },
    xaxis: { 
      title: 'Attributes',
      tickangle: -15,
      automargin: true
    },
    yaxis: { 
      title: 'Value',
      automargin: true
    },
    margin: { t: 50, b: 80, l: 60, r: 30 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)'
  };
  
  const config = {
    responsive: true,
    displayModeBar: false
  };
  
  Plotly.react('dynamicPlotContent', [trace], layout, config);
}

function updateDynamicPlotWithLocation(lat, lng) {
  // Generate sample data based on location
  const categories = [
    'Population Density',
    'Building Count',
    'Park Area (acres)',
    'Road Length (km)',
    'Flood Risk (%)',
    'Land Value ($/sqft)',
    'Elevation (m)',
    'Tree Coverage (%)'
  ];
  
  // Use lat/lng to seed random but deterministic values
  const seed = Math.abs(Math.sin(lat) * Math.cos(lng) * 10000);
  const values = categories.map((_, i) => {
    return Math.floor((seed * (i + 1)) % 1000) + 50;
  });
  
  const trace = {
    x: categories,
    y: values,
    type: 'bar',
    marker: {
      color: '#2ecc71',
      opacity: 0.8
    },
    text: values.map(v => v.toLocaleString()),
    textposition: 'auto'
  };
  
  const layout = {
    title: {
      text: `Location Statistics (${lat.toFixed(4)}°, ${lng.toFixed(4)}°)`,
      font: { size: 12 }
    },
    xaxis: { 
      title: 'Attributes',
      tickangle: -15,
      automargin: true
    },
    yaxis: { 
      title: 'Value',
      automargin: true
    },
    margin: { t: 50, b: 100, l: 70, r: 30 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)'
  };
  
  const config = {
    responsive: true,
    displayModeBar: false
  };
  
  Plotly.react('dynamicPlotContent', [trace], layout, config);
}

// Handle window resize
window.addEventListener('resize', function() {
  const dynamicPlot = document.getElementById('dynamicPlotContent');
  const staticPlot = document.getElementById('staticPlotContent');
  
  if (dynamicPlot && dynamicPlot._fullLayout) {
    Plotly.relayout('dynamicPlotContent', {
      'xaxis.automargin': true,
      'yaxis.automargin': true
    });
  }
  
  if (staticPlot && staticPlot._fullLayout) {
    Plotly.relayout('staticPlotContent', {
      'margin.t': 40,
      'margin.b': 20
    });
  }
});