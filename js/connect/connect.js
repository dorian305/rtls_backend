const coordsElem = document.querySelector("#coordinates");
const deviceIDElem = document.querySelector("#device-id");
const statusElem = document.querySelector("#connection-status");
const animationPulseElem = document.querySelector("#animation-pulse");

const coordinatesList = [];
const numberOfLastSavedCoordinates = 10;
const sendCoordsToServerInterval = 0.1; // in seconds
const deviceType = checkDeviceType();
const worker = new Worker("js/connect/locationUpdater.js?ver=1.5");

let connected = false;
let smoothedCoordinates = {};
let lastSmoothedCoordinates = {};
let coordinatesUpdateInterval = null;



/**
 * Prompting the device for location services and initiates connection to the server
 * if the service is allowed through a web worker.
 * 
 * Otherwise notifies the user that location services are required to run the application.
 */
statusElem.textContent = "Please allow location permission to use the service.";
if (!"geolocation" in navigator){
    statusElem.textContent = "Geolocation is not supported by this browser.";
}

else {
    const locationOptions = {
        enableHighAccuracy: true,
        maximumAge: 0,
    };

    navigator.geolocation.watchPosition(gettingLocationSuccess, gettingLocationError, locationOptions);
}


/**
 * Allows for data communication between worker thread and main thread (this).
 */
worker.addEventListener("message", event => {
    /**
     * Store the received data.
     */
    const data = event.data;

    /**
     * Worker has successfully connected to the server.
     */
    if (data.type === "connectionSuccess"){
        statusElem.textContent = "Connected to the server.";
        coordsElem.textContent = "Fetching your device's coordinates...";
        animationPulseElem.style.display = "block";
        connected = true;
        startCoordinatesSendInterval();
    }
    
    /**
     * Worker failed to connect to the server.
     */
    if (data.type === "connectionError"){
        statusElem.textContent = data.error;
        connected = false;
    }


    /**
     * Worker has received device's ID from the server.
     */
    if (data.type === "sendingDeviceID"){
        deviceIDElem.innerHTML = `Device id:<br>${data.deviceID}`;
    }
});



/**
 * Determining the type of the device.
*/
function checkDeviceType(){
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isTablet = /iPad/i.test(navigator.userAgent);

    if (isMobile) return "mobile";
    if (isTablet) return "tablet";
    if (!isMobile && !isTablet) return "pc";
}


/**
 * Periodically sends newly calculated coordinates to the server.
 * If the last coordinates and newly calculated are the same, dont send.
 */
function startCoordinatesSendInterval(){
    coordinatesUpdateInterval = setInterval(() => {
        if (Object.keys(smoothedCoordinates).length === 0) return;
        if (JSON.stringify(smoothedCoordinates) === JSON.stringify(lastSmoothedCoordinates)) return;

        worker.postMessage({
            type: "coordinatesUpdate",
            coordinates: smoothedCoordinates,
        });
    }, sendCoordsToServerInterval * 1000);
}



/**
 * Runs whenever watchPosition of geolocation notices a new coordinate update.
 * If the device hasn't connected to the server, first attempt to connect.
 * otherwise, start calculating the average of the last couple of coordinates in order to display a smooth
 * movement on the map. Also keep track of last calculated coordinates.
 */
function gettingLocationSuccess(position){
    if (!connected){
        connected = "pending";

        worker.postMessage({
            type: "connectToServer",
            deviceType: deviceType,
        });

        statusElem.textContent = "Connecting to the server...";
    }

    else {
        const newCoordinates = {
            x: position.coords.latitude,
            y: position.coords.longitude,
        };
        
        coordinatesList.push(newCoordinates);

        if (coordinatesList.length > numberOfLastSavedCoordinates) {
            coordinatesList.shift();
        }
        
        let sumX = 0;
        let sumY = 0;
        for (let i = 0; i < coordinatesList.length; i++) {
            sumX += coordinatesList[i].x;
            sumY += coordinatesList[i].y;
        }
        
        lastSmoothedCoordinates = smoothedCoordinates;

        smoothedCoordinates = {
            x: sumX / coordinatesList.length,
            y: sumY / coordinatesList.length,
        };

        smoothedCoordinates.x = Number(smoothedCoordinates.x.toFixed(6));
        smoothedCoordinates.y = Number(smoothedCoordinates.y.toFixed(6));

        coordsElem.textContent = `(X: ${smoothedCoordinates.x}, Y: ${smoothedCoordinates.y})`;
    }
}


/**
 * If watchPosition fails to get location information.
 */
function gettingLocationError(error){
    let errorString = "";

    switch (error.code) {
        case error.PERMISSION_DENIED:
            errorString = "User denied the request for Geolocation.";
            break;
        case error.POSITION_UNAVAILABLE:
            errorString = "Location information is unavailable.";
            break;
        case error.TIMEOUT:
            errorString = "The request to get user location timed out.";
            break;
        default:
            errorString = "An unknown error occurred.";
            break;
    }

    statusElem.textContent = errorString;
}