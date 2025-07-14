import {MapboxOverlay as DeckOverlay} from '@deck.gl/mapbox';
import {COORDINATE_SYSTEM} from '@deck.gl/core';
import {GeoJsonLayer, ArcLayer, ScatterplotLayer, PolygonLayer} from '@deck.gl/layers';
import {ScenegraphLayer} from '@deck.gl/mesh-layers';
import {Tile3DLayer} from '@deck.gl/geo-layers';
import {Tiles3DLoader} from "@loaders.gl/3d-tiles";
import {Matrix4, Vector3} from '@math.gl/core';
import {Ellipsoid} from '@math.gl/geospatial';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

//import {parsers} from '@loaders.gl/3d-tiles';

//window.parsers = parsers;

// source: Natural Earth http://www.naturalearthdata.com/ via geojson.xyz
const AIR_PORTS = 'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_10m_airports.geojson';

// Create a style element to add CSS rules
const style = document.createElement('style');
style.textContent = `
    .slider-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        padding: 10px;
        background-color: rgba(0, 0, 0, 0.2);
        z-index: 1000;
    }
    .slider {
        width: 100%;
    }
    .value {
        text-align: center;
        margin-top: 10px;
        color: white;
        font-size: 1.2em;
    }
`;
document.head.appendChild(style);


// Create the slider container
const sliderContainer = document.createElement('div');
sliderContainer.className = 'slider-container';

// Create the slider input
const slider = document.createElement('input');
slider.type = 'range';
slider.id = 'slider';
slider.className = 'slider';
slider.min = -500;
slider.max = 500;
slider.value = 0;

// Create the value display
const sliderValue = document.createElement('div');
sliderValue.className = 'value';
sliderValue.id = 'slider-value';
sliderValue.textContent = slider.value;

// Append slider and value display to the container
sliderContainer.appendChild(slider);
sliderContainer.appendChild(sliderValue);

// Append the container to the body
document.body.appendChild(sliderContainer);

// Add event listener to update the value display
slider.addEventListener('input', (event) => {
    sliderValue.textContent = event.target.value;
    window.depthBias = event.target.value >> 0;
    updateLayer();
});

const MapLibreTerrainDetails = {
  key: "terrain-3d",
  // only need if have no base map over the top
  // if want terrain 3d layer to be anything beyond transparent topology - seeing have base maps over the top it doesn't need it
  style: "https://api.maptiler.com/maps/outdoor/style.json?key=jNkuyUPDFsdopKupgiNZ",
  url: "https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=jNkuyUPDFsdopKupgiNZ",
};

window.tiles = []

    // create a custom style layer to implement the WebGL content
    const clearBufferLayer = {
        id: 'clearbuffer',
        type: 'custom',
        renderingMode: "3d",
        source: "",

        // method called when the layer is added to the map
        // Search for StyleImageInterface in https://maplibre.org/maplibre-gl-js/docs/API/
        onAdd (map, gl) {},

        // method fired on each animation frame
        render (gl, matrix) {
          //if (!viewer.active || !viewer.visible) {
            //return;
          //}
          //gl.clear(gl.DEPTH_BUFFER_BIT);
        }
    };

const map = new maplibregl.Map({
  container: 'map',
  center: 
  // [11.5257, 47.668], // SATELLITE DISHES
  // {lng: 144.9461381852518, lat: -37.823309471867276}, // MELBOURNE
  {lng: 175.11252326430883, lat: -37.946509614487},  // WAIKATO FARM
  //{lng: 144.34837818145752, lat: -38.142184946244264}, // GEELONG WEST
  //{lng: 5.470333099365234, lat: 45.04381225722565}, // GRENOBLE
  zoom: 16,
  // bearing: 75,
  pitch: 50,
  style: {
    version: 8,
    terrain: {
      source: `${MapLibreTerrainDetails.key}-terrain`,
      exaggeration: 1.0,
    },
    layers: [
      {
        id: "baseMap",
        type: "raster",
        source: "baseMap",
        minzoom: 0,
        maxzoom: 22,
      },
      {
        id: "hillshade",
        type: "hillshade",
        source: `${MapLibreTerrainDetails.key}-hillshade`,
        layout: { visibility: "visible" },
        paint: {
          "hillshade-shadow-color": '#000000',
          "hillshade-illumination-direction": 335,
        },
      },
    ],
    sources: {
      baseMap: {
        type: "raster",
        tiles: [
          "https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1Ijoia29vcmRpbmF0ZXMiLCJhIjoiY2xvMzloZTNzMGFnejJpbXlpMnBhejRmYiJ9.O6zz7n36s3gP11M44K3i7Q",
        ],
        tileSize: 256,
        minzoom: 0,
        maxzoom: 22,
        scheme: "xyz",
      },
      [`${MapLibreTerrainDetails.key}-hillshade`]: {
        type: "raster-dem",
        url: MapLibreTerrainDetails.url,
      },
      [`${MapLibreTerrainDetails.key}-terrain`]: {
        type: "raster-dem",
        url: MapLibreTerrainDetails.url,
      },
    },
  },
});

//const HOST = "http://localhost:8000/";
const HOST = "https://cdn-misc.kx.gd/3d-tile-test-2024/";
//const PATH = "geelong_west/tileset.json";
const PATH = "WaikatoFarm/tileset.json";
//const HOST = "https://bertt.github.io/";
//const PATH = "grenoble/buildings/tileset.json";

window.depthBias = 0;


window.tile3dLayer = new Tile3DLayer({
      id: "tile3dLayer",
      data: HOST + PATH,
      //parameters: {depthTest: false},

      loaders: Tiles3DLoader,
      sizeScale: 2,
      parameters: {
        depthBias: -window.depthBias,
      },
      onTilesetLoad: (tileset) => { 
        console.info("TILESET", tileset); 
        window.tileset = tileset;
      },
      onTileLoad: (tile) => { 
        //console.log("onTileLoad");
        const isNonEmptyArray = a => Array.isArray(a) && a.length > 0;
        const images = tile?.content?.gltf?.images;
        const exts = tile?.content?.gltf?.extensionsUsed;
        if (!isNonEmptyArray(images) && isNonEmptyArray(exts) && (exts.includes("SKYLINE_flid") && exts.includes("SKYLINE_floor"))) {
          tile.content = null;
        }
      },
});

function updateLayer() {
  console.log("before")
  console.log(window.tile3dLayer);
  window.tile3dLayer = new Tile3DLayer({
      id: "tile3dLayer",
      data: HOST + PATH,
      parameters: {
        depthBias: -window.depthBias,
      },
      loaders: Tiles3DLoader,
      sizeScale: 2,
      onTilesetLoad: (tileset) => { 
        console.info("TILESET", tileset); 
        window.tileset = tileset;
      },
      onTileLoad: (tile) => { 
        //console.log("onTileLoad");
        const isNonEmptyArray = a => Array.isArray(a) && a.length > 0;
        const images = tile?.content?.gltf?.images;
        const exts = tile?.content?.gltf?.extensionsUsed;
        if (!isNonEmptyArray(images) && isNonEmptyArray(exts) && (exts.includes("SKYLINE_flid") && exts.includes("SKYLINE_floor"))) {
          tile.content = null;
        }
      },
    });
  console.log("after")
  console.log(window.tile3dLayer);

  window.deckOverlay.setProps({layers: [window.tile3dLayer]});
}

//tile3dLayer = createLoggingProxy(tile3dLayer);

const deckOverlay = new DeckOverlay({
  interleaved: true,
  layers: [window.tile3dLayer],
});

map.on('load', () => {
  map.addControl(deckOverlay);
  map.addControl(new maplibregl.NavigationControl());
});

window.map = map;
window.deckOverlay = deckOverlay;
window.tile3dLayer = tile3dLayer;

