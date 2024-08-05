const {app, BrowserWindow, ipcMain} = require("electron");

let display:any;
let client:Client;

app.whenReady().then(() => {
	const browser = new BrowserWindow({
		width: 1600,
		height: 900,
		webPreferences: {
			nodeIntegration: false,
			contextIsolation: true,
			preload: __dirname + "/preload.js",
		}
	});

	browser.loadFile("public/index.html");

	display = browser.webContents;
	client = new Client();

	console.log("\nLoading Complete, Server Ready\n");
});

ipcMain.on("start", async (event:any, [index, address]:[number, string]) => {
	client.log("Connection Requested");
	const ip = await client.connect(address);
	display.send("response", index, ip);
});

ipcMain.on("stop", async (event:any, [index]:[number]) => {
	client.log("Closure Requested");
	await client.close();
	display.send("response", index);
});

ipcMain.on("read", async (event:any, [index, state]:[number, string]) => {
	const value = await client.readState(state);
	display.send("response", index, value);
});

ipcMain.on("write", (event:any, [state, value]:[string, stateValue]) => {
	client.writeState(state, value);
});

ipcMain.on("ping", async (event:any, [index]:[number]) => {
	const start = performance.now();

	const logTransmits = client.logTransmits;
	client.logTransmits = client.logPings;

	await client.readState("autopilot");
	client.logTransmits = logTransmits;

	const delay = performance.now() - start;

	display.send("response", index, delay);
});