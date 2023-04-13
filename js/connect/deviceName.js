export const createDeviceName = async () => {
    let deviceName;

    await Swal.fire({
        title: "Device name:",
        input: "text",
        inputLabel: "Please insert the name which will be used for your device",
        allowEscapeKey: false,
        allowOutsideClick: false,
        inputValidator: value => {
            if (!value) return "We need the name of the device!";

            deviceName = value;
        },
        customClass: {
            container: "swal-container",
            popup: "swal-popup",
            confirmButton: "swal-button-confirm",
            input: "swal-input",
        },
    });

    return deviceName;
};