import { port, protocol, endpoint } from "./websocketInit.js";

const socket = new WebSocket(`${protocol}://${endpoint}:${port}`);


socket.addEventListener('open', event => {
    /**
     * Request information about the connected devices.
     */
    socket.send(JSON.stringify({type: "fetchInitial"}));
});




socket.addEventListener('message', event => {
    /**
     * Need to parse the serialized JSON object before using it.
     */
    const data = JSON.parse(event.data);

    if (data.type === "fetchInitial"){
        /**
         * When dashboard connects to the server, it requests information about the connected devices.
         * Once the connected devices are obtained, store them, create markers for each device
         * and display their positions on the map. Also add the connected devices in the left panel.
         */
        connectedDevices = data.connectedDevices;

        connectedDevices.forEach(device => {
            device.marker = createMarker(device.coordinates);
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

        console.log(`Received updated coordinates from ${storedDeviceToUpdate.id}`);
        console.table(storedDeviceToUpdate.coordinates);
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

});


const addDeviceToList = function(device) {
    deviceListContainer.innerHTML += createDeviceElem(device);
}



const removeDeviceFromList = function(device) {
    const deviceElem = deviceListContainer.querySelector(`[data-id="${device.id}"]`);
    deviceListContainer.removeChild(deviceElem);
}


const createDeviceElem = function(device){
    let deviceImageSrc;

    if (device.type === "mobile"){
        deviceImageSrc = "images/mobile.png";
    }

    else if (device.type === "tablet"){
        deviceImageSrc = "images/tablet.png";
    }

    else {
        deviceImageSrc = "images/pc.png";
    }

    const html = `
        <div class="connected-device-elem" data-id=${device.id}>
        <div class="device-information">
            <img src="${deviceImageSrc}" class="device-image">
            <span>${device.id}</span>
        </div>
        <div class="action-buttons">
                <button>Button 1</button>
                <button>Button 2</button>
                <button>Button 3</button>
            </div>
        </div>
    `;

    return html;
}