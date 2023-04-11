let zoomLevel = 15;
let connectedDevices = [];
let markers = L.layerGroup()
const mapContainer = document.querySelector("#map");
const deviceListContainer = document.querySelector("#devices-list");


/**
 * Creating leaflet map.
 */
const map = L.map(mapContainer, {attributionControl: false}).setView([45.328404, 14.469973], zoomLevel);

/**
 * Adding marker group and tile layers to the map.
 */
markers.addTo(map);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);



/**
 * Creates a marker at the given coordinates (usually the connected device's coordinates),
 * adds it to the markers group and returns the newly created marker to be stored with the device information.
 */
const createMarker = function(coordinates){
	const deviceMarker = L.marker([coordinates.x, coordinates.y]);
	deviceMarker.addTo(markers);
	
	return deviceMarker;
}


/**
 * Updates current zoom value whenever user changes the zoom level of the map.
 */
map.on("zoomend", () => {
	zoomLevel = map.getZoom()
});



/**
 * When pressing on the "Track" button on the connected device, the map begins following the marker.
 * Pressing the button again stops the following.
 */
let followMarkerFlag = false;
let followMarkerInterval = 0.5;
let followMarkerIntervalHandler;
const followDevice = function(button, device){
	if (button.getAttribute("data-following") === "true"){
		clearInterval(followMarkerIntervalHandler);

		button.setAttribute("data-following", "false");
		button.textContent = "Track";

		return;
	}
	else {
		// When a button is pressed to follow device, fetch all other buttons and reset their properties.
		// Also clear interval in case the map is already following a device.
		document.querySelectorAll('.action-buttons button').forEach(btn => {
			clearInterval(followMarkerIntervalHandler);

			btn.setAttribute("data-following", "false");
			btn.textContent = "Track";
		});

		button.textContent = "Stop tracking";
		button.setAttribute("data-following", "true");
		
		panMap(device.marker);

		followMarkerIntervalHandler = setInterval(() => {
			panMap(device.id, device.marker);
		}, followMarkerInterval * 1000);
	}
}

const panMap = function(deviceId, markerToFollow){
	/**
	 * Check whether the device that we are tracking is still connected to the server.
	 * If it's not, stop following the device's marker.
	 */
	if (!connectedDevices.some(device => device.id === deviceId)){
		clearInterval(followMarkerIntervalHandler);
		return;
	}

	const panAnimationDuration = 0.5;
	const options = {
		pan: {
			animate: true,
			duration: panAnimationDuration,
		},
	};

	map.setView(markerToFollow.getLatLng(), zoomLevel, options);
}