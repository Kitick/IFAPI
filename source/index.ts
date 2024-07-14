const server = (window as any).electron;

server.on("ready", ([address]:[string]) => {
	(document.getElementById("address") as HTMLInputElement).value = address;
	setHidden(false);
	setInterval(() => {ping();}, 1000);
});

server.on("log", ([response]:[string]) => {
	log(response);
});

server.on("ping", ([devicePing]:[number]) => {
	const totalPing = performance.now() - pingDelay;
	const serverPing = totalPing - devicePing;

	pingDOM.innerText = `Total Ping: ${totalPing.toFixed(1)} ms`;
	pingDOM.innerText += `\n\nServer Ping: ${serverPing.toFixed(1)} ms`;
	pingDOM.innerText += `\nDevice Ping: ${devicePing.toFixed(1)} ms`;
});

function log(message:string){
	statLog.innerText = message;
	console.log(message);
}

let pingDOM = document.getElementById("ping") as HTMLElement;
let pingDelay:number = 0;

function ping(){
	pingDelay = performance.now();
	server.send("ping");
}

const readbacks:Map<string, (value:stateValue) => void> = new Map();

server.on("readback", ([id, value]:[string, stateValue]) => {
	const callback = readbacks.get(id) as any;
	callback(value);

	readbacks.delete(id);
});

async function readAsync(...commands:string[]):Promise<stateValue[]> {
	let promises:Promise<stateValue>[] = [];

	commands.forEach(command => {
		promises.push(new Promise(resolve => {
			let index = 0;
			let id = "";

			while(true){
				id = command + index.toString();
				if(!readbacks.has(id)){break;}
				index++;
			}

			readbacks.set(id, resolve);
			server.send("read", command, id);
		}));
	});

	return Promise.all(promises);
}

async function readLog(...commands:string[]):Promise<void> {
	await readAsync(...commands).then(values => {
		console.log(values.join(", "));
	});
}

function write(command:string, value:stateValue):void {
	server.send("write", command, value);
}

function bridge():void {
	let address = (document.getElementById("address") as HTMLInputElement).value;
	const parts = address.split(".");

	if(address !== ""){
		if(parts.length < 2){
			address = "1." + address;
		}
		if(parts.length < 3){
			address = "168." + address;
		}
		if(parts.length < 4){
			address = "192." + address;
		}
	}

	server.send("bridge", address);
}

function closeBridge():void {
	server.send("break");
	location.reload();
}

function setHidden(hidden:boolean):void {
	for(let i = 1, length = panels.length; i < length; i++){
		const panel = panels[i] as HTMLDivElement;
		panel.hidden = hidden;
	}
}

const domInterface = new DOMInterface("data");

const statLog = document.getElementById("status") as HTMLSpanElement;
const panels = document.getElementsByClassName("panel") as HTMLCollectionOf<HTMLDivElement>;

const storage = new ProfileStorage(document.getElementById("profile-select") as HTMLSelectElement);
/*
const select = document.getElementById("voices") as HTMLSelectElement;
const voices = speechSynthesis.getVoices();
for(let i = 0, length = voices.length; i < length; i++){
	const newOption = new Option(voices[i].lang, i.toString());
	select.add(newOption);
}
*/