# Control Govee StripLight from SofaBaton X1S

This repository allows you to control your Govee H619E strip light using the SofaBaton X1S remote. It works by emulating a Roku service on your local network, allowing you to send Govee commands like turning on/off, adjusting brightness, and changing colors.

> **Important:**  
> - This has been tested and confirmed to work with the **Govee H619E** strip light model.  
> - **Enable the local API** in the Govee app for this to work.  
> - This is an **experimental** solution, and while it may work with other Govee models, use it at your own risk.

## Supported Govee Commands

The Govee H619E accepts the following commands via the local API:

- `turn` – Turn the strip light on or off
- `devStatus` – Get the device status
- `scan` – Scan for nearby Govee devices
- `brightness` – Adjust the brightness of the light
- `colorwc` – Change the color and white balance

## How It Works

This repository emulates a Roku device on your local network. The buttons on the Roku remote must be mapped to specific Govee commands to control the light. Once set up, you can use the SofaBaton X1S remote to send commands to the Govee strip light via the emulated Roku device.

## Setup Instructions

1. **Update `index.ts`**  
   In the `index.ts` file, you'll find the Roku buttons already registered to control the Govee commands. You can customize or add more buttons as needed.

2. **Run the Application**  
   Start the service on your local network by running one of the following commands in your terminal:
   - `npm start` – Starts the service normally.
   - `npm run nohup` – Starts the service and logs messages to `nohup.txt` (this command runs the service in the background).

3. **Add Roku Device in SofaBaton X1S**  
   In the SofaBaton X1S app, add a new Roku device. The default device name is **`Govee H619E`**.

4. **Configure Your Device**  
   Once the Roku device is added, configure it as needed. You can now use the SofaBaton X1S remote to control the Govee H619E strip light.

## Notes

- Ensure that your Govee H619E strip light and SofaBaton X1S are connected to the same network.
- If you have multiple Govee devices, you can register additional Roku devices and map them to different Govee lights in the `index.ts` file.
- This is an experimental project, so expect some instability or compatibility issues with other models.

---

Feel free to contribute by submitting issues or pull requests if you have improvements or fixes!

