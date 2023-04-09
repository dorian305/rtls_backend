const zoomLevel = 10;
const mapContainer = document.querySelector("#map");
const deviceListContainer = document.querySelector("#devices-list");
const map = L.map(mapContainer, {attributionControl: false}).setView([45.328404, 14.469973], zoomLevel);

let connectedDevices = [];
let markers = L.layerGroup().addTo(map);



L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);




const createMarker = function(coordinates){
	return L.marker([coordinates.x, coordinates.y]).addTo(markers);
}