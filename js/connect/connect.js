const worker = new Worker("js/connect/locationUpdater.js?ver=1.5");
const animationPulse = document.querySelector("#animation-pulse");
const statusElem = document.querySelector("#connection-status");
const deviceIDElem = document.querySelector("#device-id");
const coordsElem = document.querySelector("#coordinates");
const deviceType = checkDeviceType();
const coordinatesList = [];
const numberOfLastSavedCoordinates = 10;
const sendCoordsToServerInterval = 100; // in ms


let connected = false;
let smoothedCoordinates;
let coordinatesUpdateInterval;



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

    if (data.type === "connectionSuccess"){
        statusElem.textContent = "Connected to the server.";
        coordsElem.textContent = "Fetching your device's coordinates...";
        animationPulse.style.display = "block";
        connected = true;
        startCoordinatesSendInterval();
    }
    
    
    if (data.type === "connectionError"){
        statusElem.textContent = data.error;
        connected = false;
    }


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


function startCoordinatesSendInterval(){
    coordinatesUpdateInterval = setInterval(() => {
        if (!smoothedCoordinates) return;

        worker.postMessage({
            type: "coordinatesUpdate",
            coordinates: smoothedCoordinates,
        });
    }, sendCoordsToServerInterval);
}



/**
 * Runs whenever watchPosition of geolocation notices a new coordinate update.
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
        
        // Adding the new coordinates to the list
        coordinatesList.push(newCoordinates);

        // Keeping only the last 10 coordinates
        if (coordinatesList.length > numberOfLastSavedCoordinates) {
            coordinatesList.shift();
        }
        
        // Averaging the coordinates in the list to get the smoothed coordinates
        smoothedCoordinates = coordinatesList.reduce((acc, cur) => {
            return {
                x: acc.x + cur.x,
                y: acc.y + cur.y,
            };
        }, {x: 0, y: 0});

        smoothedCoordinates.x /= coordinatesList.length;
        smoothedCoordinates.y /= coordinatesList.length;

        coordsElem.textContent = `X: ${smoothedCoordinates.x}, Y: ${smoothedCoordinates.y}`;
    }

    // if (!connected){
    //     connected = "pending";
    //     worker.postMessage({
    //         type: "connectToServer",
    //         deviceType: deviceType,
    //     });
    //     statusElem.textContent = "Connecting to the server...";
    // }
    // else {
    //     const newCoordinates = {
    //         x: position.coords.latitude,
    //         y: position.coords.longitude,
    //     };
        
    //     worker.postMessage({
    //         type: "coordinatesUpdate",
    //         coordinates: newCoordinates,
    //     });

    //     coordsElem.textContent = `X: ${newCoordinates.x}, Y: ${newCoordinates.y}`;
    // }
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