export const createDeviceName = async () => {
    const nameLengthAllowed = 10;
    let deviceName = "";

    await Swal.fire({
        title: "Device name:",
        input: "text",
        inputLabel: "Please insert the name which will be used for your device",
        allowEscapeKey: false,
        allowOutsideClick: false,
        inputValidator: insertedName => {
            if (!insertedName) return "We need the name of the device!";
            if (insertedName.length > nameLengthAllowed) return `Please insert shorter name! (${nameLengthAllowed} characters)`;

            deviceName = insertedName;
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