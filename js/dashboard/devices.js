import { port, protocol, endpoint } from "./websocketInit.js";

const socket = new WebSocket(`${protocol}://${endpoint}:${port}`);

let socketId = "";


socket.addEventListener('open', event => {
    /**
     * Request information about the connected devices.
     */
    socket.send(JSON.stringify({type: "fetchInitial"}));
});


/**
 * Lost the connection to the server.
 */
socket.addEventListener('close', event => {
    Swal.fire({
        title: "Error!",
        text: "The connection to the websocket server has been lost.",
        icon: "error",
        confirmButtonText: "Reload",
        customClass: {
            container: "swal-container",
            popup: "swal-popup",
            confirmButton: "swal-button-confirm",
            input: "swal-input",
        },
    }).then(res => {
        if (res.isConfirmed){
            location.reload();
        }
    });
});



/**
 * Error when trying to establish a connection to the websocket server.
 */
socket.addEventListener('error', event => {
    Swal.fire({
        title: "Error!",
        text: "An error occured while communicating with the server.",
        icon: "error",
        confirmButtonText: "Reload",
        customClass: {
            container: "swal-container",
            popup: "swal-popup",
            confirmButton: "swal-button-confirm",
            input: "swal-input",
        },
    }).then(res => {
        if (res.isConfirmed){
            location.reload();
        }
    });
});



socket.addEventListener('message', event => {
    /**
     * Need to parse the serialized JSON object before using it.
     */
    const data = JSON.parse(event.data);

    if (data.type === "fetchInitial"){
        /**
         * When dashboard connects to the server, it requests information about the connected devices and socket id.
         * Once the information is obtained, store it, create markers for each device
         * and display their positions on the map. Also add the devices in the left panel.
         */
        connectedDevices = data.connectedDevices;
        socketId = data.socketId;

        connectedDevices.forEach(device => {
            device.marker = createMarker(device.coordinates);
            console.log(device);
            addDeviceToList(device);
        });
    }


    if (data.type === "locationUpdate"){
        /**
         * Every time a connected device sends an updated location information, server sends us that information
         * so we can update stored device's information on the dashboard and display up to date data.
         * Update the coordinates and marker position.
         */
        const deviceWithUpdatedInfo = data.device;
        const storedDeviceToUpdate = connectedDevices[connectedDevices.findIndex(device => device.id === deviceWithUpdatedInfo.id)];

        storedDeviceToUpdate.coordinates.x = deviceWithUpdatedInfo.coordinates.x;
        storedDeviceToUpdate.coordinates.y = deviceWithUpdatedInfo.coordinates.y;
        storedDeviceToUpdate.marker.setLatLng(new L.LatLng(
            storedDeviceToUpdate.coordinates.x,
            storedDeviceToUpdate.coordinates.y,
        ));

        // console.log(`Received updated coordinates from ${storedDeviceToUpdate.id}`);
        // console.table(storedDeviceToUpdate.coordinates);
    }


    if (data.type === "deviceConnected"){
        /**
         * When a new device connects to the server, server sends us its information for display.
         * Create a new marker for the device and add it to the list of connected devices.
         * 
         * Also add the device to the left panel.
         */
        const newlyConnectedDevice = data.device
        
        newlyConnectedDevice.marker = createMarker(newlyConnectedDevice.coordinates)
        connectedDevices.push(newlyConnectedDevice);

        addDeviceToList(newlyConnectedDevice);
    }


    if (data.type === "deviceDisconnected"){
        /**
         * When a device disconnects from the server, server sends us which device has disconnected
         * so we can remove it from the list of connected devices and remove the marker for that device from the map.
         * 
         * Also remove the device from the left panel.
         */
        const disconnectedDevice = data.device;
        const storedDeviceToRemove = connectedDevices[connectedDevices.findIndex(device => device.id === disconnectedDevice.id)];

        map.removeLayer(storedDeviceToRemove.marker);

        connectedDevices = connectedDevices.filter(device => device.id !== storedDeviceToRemove.id);

        removeDeviceFromList(storedDeviceToRemove);
    }

    
    
    if (data.type === "ping"){
        /**
         * The server has pinged the connection, send back pong to acknowledge.
         */
        socket.send(JSON.stringify({
            type: "pong",
            socketId: socketId,
        }));

        console.log(`Server pinged me, sending back pong...`);
    }
});


/**
 * When device connects, add element to the list of connected elements.
 */
const addDeviceToList = function(device) {
    deviceListContainer.appendChild(createDeviceElem(device));
}


/**
 * When device disconnects, remove element from the list of connected elements.
 */
const removeDeviceFromList = function(device) {
    const deviceElem = deviceListContainer.querySelector(`[data-id="${device.id}"]`);
    deviceListContainer.removeChild(deviceElem);
}


/**
 * Creating the html element for the connected device.
 */
const createDeviceElem = function(device){
    const deviceImageCollection = {
        mobile: "images/mobile.png",
        tablet: "images/tablet.png",
        pc: "images/pc.png",
    }
    const deviceImageSrc = deviceImageCollection[device.type];

    const connectedDeviceElem = document.createElement("div");
    const deviceInformationElem = document.createElement("div");
    const deviceImageElem = document.createElement("img");
    const spanElem = document.createElement("span");
    const actionButtonsElem = document.createElement("div");
    const actionButtonElem = document.createElement("button");

    connectedDeviceElem.setAttribute("data-id", device.id);
    connectedDeviceElem.setAttribute("class", "connected-device-elem");
    deviceInformationElem.setAttribute("class", "device-information");
    deviceImageElem.setAttribute("src", deviceImageSrc);
    deviceImageElem.setAttribute("class", "device-image");
    spanElem.textContent = device.name;
    actionButtonsElem.setAttribute("class", "action-buttons");
    actionButtonElem.setAttribute("data-following", "false");
    actionButtonElem.textContent = "Track";

    connectedDeviceElem.appendChild(deviceInformationElem);
    connectedDeviceElem.appendChild(actionButtonsElem);
    deviceInformationElem.appendChild(deviceImageElem);
    deviceInformationElem.appendChild(spanElem);
    actionButtonsElem.appendChild(actionButtonElem);

    // Add event listener for the follow button
    actionButtonElem.addEventListener("click", e => {
        followDevice(e.target, device);
    });

    return connectedDeviceElem;
}