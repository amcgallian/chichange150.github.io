// Download page functionality
let allLayers = [];
let filteredLayers = [];
let selectedTags = new Set();
let expandedCard = null;

// Proper CSV parser that handles quoted fields
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"' && !inQuotes) {
      inQuotes = true;
    } else if (char === '"' && inQuotes) {
      inQuotes = false;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

async function loadCatalog() {
  try {
    const response = await fetch('./data/raw_catalog.csv');
    const csvText = await response.text();
    
    const lines = csvText.split('\n').filter(line => line.trim());
    const headers = parseCSVLine(lines[0]).map(h => h.trim());
    
    allLayers = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const layer = {};
      headers.forEach((header, index) => {
        let value = values[index] || '';
        value = value.trim();
        layer[header] = value;
      });
      allLayers.push(layer);
    }
    
    const lastUpdated = allLayers[0]?.last_updated || 'Unknown';
    document.getElementById('lastUpdated').innerHTML = 
      `<i class="far fa-calendar-alt"></i> Last updated: ${lastUpdated}<br><strong>${allLayers.length}</strong> total layers`;
    
    buildTagCloud();
    applyFilters();
    
  } catch (error) {
    console.error('Error:', error);
    document.getElementById('lastUpdated').innerHTML = 'Error loading catalog';
    document.getElementById('loading').innerHTML = 'Failed to load data. Please try again.';
  }
}

function buildTagCloud() {
  const tagCounts = {};
  const tagCloud = document.getElementById('tagCloud');
  tagCloud.innerHTML = '';
  
  allLayers.forEach(layer => {
    if (layer.tags) {
      const tags = layer.tags.split(',').map(t => t.trim());
      tags.forEach(tag => {
        if (tag && tag !== 'DVFM') {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
      });
    }
  });
  
  Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([tag, count]) => {
      const tagItem = document.createElement('div');
      tagItem.className = 'tag-item';
      if (selectedTags.has(tag)) {
        tagItem.classList.add('selected');
      }
      tagItem.setAttribute('data-tag', tag);
      tagItem.onclick = () => toggleTag(tag);
      tagItem.innerHTML = `
        <span class="tag-name">${tag}</span>
        <span class="tag-count">${count}</span>
      `;
      tagCloud.appendChild(tagItem);
    });
}

function toggleTag(tag) {
  if (selectedTags.has(tag)) {
    selectedTags.delete(tag);
  } else {
    selectedTags.add(tag);
  }
  
  document.querySelectorAll('.tag-item').forEach(item => {
    const itemTag = item.getAttribute('data-tag');
    if (selectedTags.has(itemTag)) {
      item.classList.add('selected');
    } else {
      item.classList.remove('selected');
    }
  });
  
  updateActiveFilters();
  applyFilters();
}

function updateActiveFilters() {
  const activeFiltersDiv = document.getElementById('activeFilters');
  const filterTagsDiv = document.getElementById('filterTags');
  
  if (selectedTags.size === 0) {
    activeFiltersDiv.style.display = 'none';
    return;
  }
  
  activeFiltersDiv.style.display = 'block';
  filterTagsDiv.innerHTML = '';
  
  selectedTags.forEach(tag => {
    const tagEl = document.createElement('span');
    tagEl.className = 'filter-tag';
    tagEl.innerHTML = `
      ${tag}
      <i class="fas fa-times" onclick="removeTag('${tag}')"></i>
    `;
    filterTagsDiv.appendChild(tagEl);
  });
}

function removeTag(tag) {
  selectedTags.delete(tag);
  updateActiveFilters();
  
  document.querySelectorAll('.tag-item').forEach(item => {
    if (item.getAttribute('data-tag') === tag) {
      item.classList.remove('selected');
    }
  });
  
  applyFilters();
}

function applyFilters() {
  const searchFilter = document.getElementById('searchFilter').value.toLowerCase();
  
  filteredLayers = allLayers.filter(layer => {
    if (selectedTags.size > 0) {
      const layerTags = layer.tags ? layer.tags.split(',').map(t => t.trim()) : [];
      let hasAllTags = true;
      selectedTags.forEach(tag => {
        if (!layerTags.includes(tag)) {
          hasAllTags = false;
        }
      });
      if (!hasAllTags) return false;
    }
    
    if (searchFilter) {
      const titleMatch = layer.title?.toLowerCase().includes(searchFilter);
      const descMatch = layer.description?.toLowerCase().includes(searchFilter);
      if (!titleMatch && !descMatch) return false;
    }
    
    return true;
  });
  
  document.getElementById('resultsCount').textContent = 
    `Showing ${filteredLayers.length} of ${allLayers.length} layers`;
  
  renderCards();
}

function renderCards() {
  const grid = document.getElementById('layersGrid');
  grid.innerHTML = '';
  
  if (filteredLayers.length === 0) {
    grid.style.display = 'none';
    document.getElementById('noDataMessage').style.display = 'block';
    document.getElementById('loading').style.display = 'none';
    return;
  }
  
  filteredLayers.forEach((layer, index) => {
    const card = createCard(layer, index);
    grid.appendChild(card);
  });
  
  document.getElementById('loading').style.display = 'none';
  grid.style.display = 'grid';
  document.getElementById('noDataMessage').style.display = 'none';
}

function createCard(layer, index) {
  const card = document.createElement('div');
  card.className = 'layer-card';
  card.setAttribute('data-index', index);
  
  let iconClass = 'fa-layer-group';
  let typeClass = '';
  if (layer.type === 'Feature Service') {
    iconClass = 'fa-draw-polygon';
    typeClass = 'feature-service';
  } else if (layer.type === 'Web Map') {
    iconClass = 'fa-map';
    typeClass = 'web-map';
  } else if (layer.type === 'StoryMap') {
    iconClass = 'fa-book-open';
    typeClass = 'storymap';
  } else if (layer.type === 'Map Service') {
    iconClass = 'fa-image';
    typeClass = 'map-service';
  } else if (layer.type === 'Image Service') {
    iconClass = 'fa-image';
    typeClass = 'image-service';
  }
  
  const tags = layer.tags 
    ? layer.tags.split(',').map(t => t.trim()).filter(t => t && t !== 'DVFM')
    : [];
  
  const modDate = layer.modified ? new Date(layer.modified).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }) : 'Unknown';
  
  card.innerHTML = `
    <div class="card-header" onclick="toggleCard(${index})">
      <div class="type-icon ${typeClass}">
        <i class="fas ${iconClass}"></i>
      </div>
      <div class="card-title">
        <h3>${layer.title || 'Untitled'}</h3>
        <div class="card-meta">
          <span><i class="far fa-calendar"></i> ${modDate}</span>
          <span><i class="far fa-eye"></i> ${layer.view_count || 0}</span>
        </div>
      </div>
      <div class="expand-icon">
        <i class="fas fa-chevron-down"></i>
      </div>
    </div>
    <div class="card-details">
      <div class="details-content">
        ${layer.description ? `
          <div class="description">
            ${layer.description}
          </div>
        ` : ''}
        
        <div class="metadata-grid">
          <div class="metadata-item">
            <span class="metadata-label">Type</span>
            <span class="metadata-value">${layer.type || 'Unknown'}</span>
          </div>
          <div class="metadata-item">
            <span class="metadata-label">Owner</span>
            <span class="metadata-value">${layer.owner || 'Unknown'}</span>
          </div>
          <div class="metadata-item">
            <span class="metadata-label">Created</span>
            <span class="metadata-value">${layer.created || 'Unknown'}</span>
          </div>
          <div class="metadata-item">
            <span class="metadata-label">Views</span>
            <span class="metadata-value">${layer.view_count || 0}</span>
          </div>
        </div>
        
        ${tags.length > 0 ? `
          <div class="tags-container">
            ${tags.map(tag => `<span class="tag-badge">${tag}</span>`).join('')}
          </div>
        ` : ''}
        
        <div class="action-buttons">
          <a href="${layer.url || '#'}" target="_blank" class="btn btn-primary">
            <i class="fas fa-external-link-alt"></i> View on ArcGIS
          </a>
          <button class="btn btn-secondary" onclick="event.stopPropagation(); toggleCard(${index})">
            <i class="fas fa-chevron-up"></i>
          </button>
        </div>
      </div>
    </div>
  `;
  
  return card;
}

function toggleCard(index) {
  const card = document.querySelector(`.layer-card[data-index="${index}"]`);
  
  if (expandedCard && expandedCard !== card) {
    expandedCard.classList.remove('expanded');
  }
  
  card.classList.toggle('expanded');
  expandedCard = card.classList.contains('expanded') ? card : null;
}

function clearFilters() {
  document.getElementById('searchFilter').value = '';
  selectedTags.clear();
  
  document.querySelectorAll('.tag-item').forEach(item => {
    item.classList.remove('selected');
  });
  
  updateActiveFilters();
  applyFilters();
  expandedCard = null;
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('searchFilter').addEventListener('input', () => {
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
      applyFilters();
      expandedCard = null;
    }, 300);
  });
  
  document.getElementById('clearFilters').addEventListener('click', clearFilters);
  
  // Make functions available globally for onclick handlers
  window.toggleTag = toggleTag;
  window.removeTag = removeTag;
  window.toggleCard = toggleCard;
  window.clearFilters = clearFilters;
  
  loadCatalog();
});