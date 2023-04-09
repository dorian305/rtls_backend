const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const https = require('https');
const fs = require('fs');

require('dotenv').config();
const isLocal = process.env.NODE_ENV !== 'production';
const port = 3001;

if (isLocal){
    var server = new WebSocket.Server({port: port});

    console.log(`Started RTLS server on local machine on port ${port}`);
}

else {
    var httpsServer = https.createServer({
        cert: fs.readFileSync('/etc/letsencrypt/live/manjaric.com-0001/fullchain.pem'),
        key: fs.readFileSync('/etc/letsencrypt/live/manjaric.com-0001/privkey.pem'),
    });
    
    server = new WebSocket.Server({server: httpsServer});
    
    httpsServer.listen(port, () => {
        console.log(`Started RTLS server on port ${port}`);
    });
}

/**
 * Storing dashboard sockets to be able to send information to all dashboards that are connected.
 */
let dashboardSockets = [];

/**
 * This is the list that holds the information about the connected devices.
 */
let connectedDevices = [];

server.on('connection', socket => {
    /**
     * Assign unique identifier for each socket.
     */
    socket.id = uuidv4();
    console.log(`A new websocket connection has been established (socket id: ${socket.id})`);


    socket.on('message', receivedData => {
        receivedData = JSON.parse(receivedData)

        if (receivedData.type === "fetchInitial"){
            /**
             * When dashboard connects, it requests all the connected devices for display.
             * Store the dashboard's websocket because it is needed for receiving device updates.
             * 
             * Also set a flag that the socket is dashboard to be able to differentiate from device socket.
             */
            dashboardSockets.push(socket);

            socket.isDashboard = true;

            socket.send(JSON.stringify({
                type: "fetchInitial",
                connectedDevices: connectedDevices,
            }));
        }



        if (receivedData.type === "deviceConnected"){
            /**
             * When a new device connects, update the device's ID property and return
             * the updated device properties to the connecting device.
             * NOTE: the device's ID is the same as the socket's ID for the sake of device
             * identification when the connection is closed.
             * 
             * Append the connected device to the list of connected devices.
             * 
             * Send to the dashboard the connected device for display.
             */
            const newlyConnectedDevice = {
                id: socket.id,
                type: receivedData.device.type,
                coordinates: receivedData.device.coordinates,
            };

            socket.send(JSON.stringify({
                type: "deviceConnected",
                device: newlyConnectedDevice,
            }));
            
            connectedDevices.push(newlyConnectedDevice);

            if (dashboardSockets){
                dashboardSockets.forEach(dashboardSocket => {
                    dashboardSocket.send(JSON.stringify({
                        type: "deviceConnected",
                        device: newlyConnectedDevice,
                    }));
                });
            }

            console.log(`A new device has connected to the server (device id: ${newlyConnectedDevice.id})\n`);
        }



        if (receivedData.type === "locationUpdate"){
            /**
             * All the connected devices periodically send updated location information.
             * Update the stored device information with new information.
             * 
             * Send the updated information to the dashboard for display.
             */
            const storedDeviceToUpdate = connectedDevices[connectedDevices.findIndex(device => device.id === receivedData.device.id)];

            storedDeviceToUpdate.coordinates.x = receivedData.device.coordinates.x;
            storedDeviceToUpdate.coordinates.y = receivedData.device.coordinates.y;

            // console.log(`Received new coordinates from ${storedDeviceToUpdate.id}`);
            // console.table(storedDeviceToUpdate);

            if (dashboardSockets){
                dashboardSockets.forEach(dashboardSocket => {
                    dashboardSocket.send(JSON.stringify({
                        type: "locationUpdate",
                        device: storedDeviceToUpdate,
                    }));
                })
            }
        }
    });



    socket.on('close', () => {
        /**
         * Socket to the server has been closed.
         * If it is dashboard, remove it from the dashboards list.
         * 
         * Otherwise it was a device that was disconnected, find which device has disconnected,
         * remove that device from the list of connected devices and send the device to the dashboard
         * so the dashboard can remove it from the map.
         */
        if (socket.isDashboard){
            dashboardSockets.filter(dashboardSocket => dashboardSocket.id !== socket.id);

            console.log(`Dashboard connection with the id ${socket.id} has been closed.\n`);
            return;
        }

        let disconnectedDevice = null;

        connectedDevices = connectedDevices.filter(device => {
            const isDisconnected = device.id === socket.id;

            if (isDisconnected){
                disconnectedDevice = device;
            }
            
            return !isDisconnected;
        });

        if (dashboardSockets){
            dashboardSockets.forEach(dashboardSocket => {
                dashboardSocket.send(JSON.stringify({
                    type: "deviceDisconnected",
                    device: disconnectedDevice,
                }))
            });
        }

        console.log(`Device with the id ${socket.id} has been closed.\n`);
    });
});