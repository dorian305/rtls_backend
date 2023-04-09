const protocol = "ws";
const endpoint = "localhost";

let socket; // Websocket handler
let localDevice = {}; // This device handler
let coordinates = {x: 0, y: 0,}; // The device's coordinates

/**
 * We setup this event listener so we can communicate with the web worker from the main thread and
 * vice versa via messages. Messages are usually data that web worker requires that main thread fetches
 * and sends to the worker, and worker can send back result of whatever it's doing back to main thread.
 */
self.addEventListener("message", event => {
    /**
     * Store the data from main thread.
     */
    const data = event.data;

    if (data.type === "connectToServer"){
        /**
         * Lets web worker know the application is ready to initiate websocket connection to the server.
         */
        socket = new WebSocket(`${protocol}://${endpoint}:3001`);

        /**
         * When connection to the server is successfully established, send the device information to the server,
         * to fetch unique identifier.
         * 
         * Also update the status in HTML.
         */
        socket.addEventListener('open', event => {
            localDevice.type = data.deviceType;
            localDevice.coordinates = coordinates;

            socket.send(JSON.stringify({
                type: "deviceConnected",
                device: localDevice,
            }));

            self.postMessage({type: "connectionSuccess"});
        });


        /**
         * Handle if the connection to the server fails.
         */
        socket.addEventListener('error', event => {
            self.postMessage({
                type: "connectionError",
                error: `The connection to the server failed.`,
            });
        });


        /**
         * When the server returns the generated ID of the device, set the device ID to the generated ID.
         */
        socket.addEventListener('message', event => {
            const data = JSON.parse(event.data);
        
            if (data.type === "deviceConnected"){
                const updatedDevice = data.device;
                localDevice = updatedDevice;

                self.postMessage({
                    type: "sendingDeviceID",
                    deviceID: localDevice.id,
                });
            }
        });
    }

    /**
     * Updating device coordinates and sending it to the server.
     */
    if (data.type === "coordinatesUpdate"){
        localDevice.coordinates = data.coordinates;

        console.log(`Sending coordinates x: ${localDevice.coordinates.x} y: ${localDevice.coordinates.y}`);
        
        socket.send(JSON.stringify({
            type: "locationUpdate",
            device: localDevice,
        }));
    }
});