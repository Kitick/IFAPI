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
	client = new Client(display);

	console.log("\nLoading Complete, Server Ready\n");
});

ipcMain.on("start", (event:any, [address]:[string]) => {
	client.log("Connection Requested");
	client.connect(address);
});

ipcMain.on("stop", (event:any) => {
	client.log("Closure Requested");
	client.close();
});

ipcMain.on("read", (event:any, [index, command]:[number, string]) => {
	const item = client.getItem(command);

	client.readState(command, () => {
		display.send("response", index, item?.value ?? undefined);
	});
});

ipcMain.on("write", (event:any, [command, value]:[string, stateValue]) => {
	const item = client.getItem(command);
	if(item === undefined){return;}

	item.value = value;
	client.writeState(command);
});

ipcMain.on("ping", (event:any, [index]:[number]) => {
	const start = performance.now();
	client.readState("autopilot", () => {
		const delay = performance.now() - start;
		display.send("response", index, delay);
	});
});