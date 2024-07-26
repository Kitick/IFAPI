const Net = require("net");
const UDP = require("dgram");

class Client {
	#address:string = "";
	#device:any = new Net.Socket();
	#scanner:any|null = null;
	#scannerTimeout:NodeJS.Timeout|null = null;
	#active:boolean = false;
	#dataBuffer:Buffer = Buffer.alloc(0);
	#manifest:Map<string|number, Item> = new Map();

	logTransmits:boolean = true;
	logPings:boolean = false;

	constructor(){
		this.#initManifest();

		this.#device.on("data", (buffer:Buffer) => {
			//console.log(`${this.#address} | Rx`, buffer);

			this.#dataBuffer = Buffer.concat([this.#dataBuffer, buffer]);

			this.#validate();
		});

		this.log("TCP Socket Created");
	}

	get #scanning(){return this.#scanner !== null;}

	#closeScanner(){
		if(!this.#scanning){return;}

		clearTimeout(this.#scannerTimeout as NodeJS.Timeout);
		this.#scannerTimeout = null;

		this.#scanner.close();
		this.#scanner = null;
	}

	async #findAddress():Promise<string> {
		if(this.#scanning){
			this.log("Already searching for packets");
			return Promise.reject();
		}

		this.log("Searching for UDP packets...");

		this.#scanner = UDP.createSocket("udp4");

		const search = new Promise<string>((resolve, reject) => {
			this.#scanner.on("message", (data:any, info:any) => {
				let address = info.address;
				this.log(address + " UDP Packet Found");

				this.#closeScanner();
				resolve(address);
			});

			this.#scanner.on("error", (error:any) => {
				this.log("UDP Error: " + error.code);
				this.#closeScanner();
				reject();
			});

			this.#scanner.bind(15000);
		});

		const timeout = new Promise<string>((_, reject) => {
			this.#scannerTimeout = setTimeout(() => {
				this.log("UDP search timed out\n\nTry using an IP address");
				this.#closeScanner();
				reject();
			}, 10000);
		});

		return Promise.race([search, timeout]);
	}

	async connect(address = ""):Promise<string> {
		if(this.#active){
			this.log(this.#address + " TCP is already active");
			return this.#address;
		}

		this.#address = address;

		if(this.#address === ""){
			this.#address = await this.#findAddress();
		}

		this.log(this.#address + " Attempting TCP Connection");

		this.#device.on("error", (error:any) => {
			if(error.code === "ECONNREFUSED"){
				this.log(this.#address + " TCP Connection Refused");
			}
			else{
				this.log(this.#address + " TCP Error: " + error.code);
			}

			return Promise.reject();
		});

		return new Promise(resolve => {
			this.#device.connect({host:this.#address, port:10112}, async () => {
				this.#active = true;
				this.log(this.#address + " TCP Established, Requesting Manifest");

				await this.readState("manifest");

				resolve(this.#address);
			});
		});
	}

	async close():Promise<void> {
		if(this.#scanning){this.#closeScanner();}

		if(!this.#active){
			this.log("TCP Closed");
			return;
		}

		this.#active = false;

		return new Promise(resolve => {
			this.#device.end(() => {
				this.log(this.#address + " TCP Closed");
				this.#address = "";
				resolve();
			});
		});
	}

	#initManifest():void {
		this.#manifest.clear();
		this.addItem(new Item(-1, 4, "manifest"));
	}

	#validate():void {
		if(this.#dataBuffer.length < 9){return;}

		const dataLength = this.#dataBuffer.readInt32LE(4) + 8; // 4 byte id + 4 byte length

		if(this.#dataBuffer.length < dataLength){return;}

		const id = this.#dataBuffer.readInt32LE(0);
		const data = this.#dataBuffer.subarray(8, dataLength);

		this.#dataBuffer = this.#dataBuffer.subarray(dataLength);

		this.#processData(id, data);

		if(this.#dataBuffer.length > 0){this.#validate();}
	}

	#buildManifest(data:Buffer):void {
		this.#initManifest();

		const stringData = data.toString().split("\n");

		stringData.forEach(raw => {
			const itemRaw = raw.split(",");

			const id = parseInt(itemRaw[0]);
			const type = parseInt(itemRaw[1]) as bufferType;
			const name = itemRaw[2];

			const item = new Item(id, type, name);
			this.addItem(item);
		});

		this.log(this.#address + "\nManifest Built, API Ready");
	}

	#processData(id:number, data:Buffer):void {
		const item = this.#manifest.get(id);
		if(item === undefined){return;}

		if(id === -1){this.#buildManifest(data);}
		else{item.buffer = data;}

		this.#transmitLog(item, data, "Rx");

		item.callback();
	}

	#initalBuffer(id:number, state:number):Buffer {
		let buffer = Buffer.allocUnsafe(5);

		buffer.writeInt32LE(id);
		buffer[4] = state;

		return buffer;
	}

	#transmitLog(item:Item, buffer:Buffer, type:string, showValue:boolean = true){
		if(!this.logTransmits){return;}
		const equals = " = " + item.value?.toString();
		const assign = showValue ? equals : "";
		console.log(`${this.#address} | ${type}  ${item.id.toString()}  ${item.alias ?? item.name}${assign}`, buffer);
	}

	log(message:string):void {
		display.send("log", message);
		console.log(message);
	}

	async readState(itemID:string):Promise<dataValue> {
		return new Promise(resolve => {
			const item = this.#manifest.get(itemID);
			if(item === undefined){resolve(null); return;}

			if(item.type === -1){resolve(null);}
			else{
				const length = item.addCallback(resolve);
				if(length > 1){return;}
			}

			const buffer = this.#initalBuffer(item.id, 0);

			this.#device.write(buffer);
			this.#transmitLog(item, buffer, "Qx", false);
		});
	}

	writeState(itemID:string, value:stateValue):void {
		const item = this.#manifest.get(itemID);
		if(item === undefined){this.log(`Item '${itemID}' is invalid`); return;}

		item.value = value;

		let buffer = this.#initalBuffer(item.id, 1);
		buffer = Buffer.concat([buffer, item.buffer]);

		this.#device.write(buffer);
		this.#transmitLog(item, buffer, "Tx");
	}

	addItem(item:Item):void {
		this.#manifest.set(item.id, item);
		this.#manifest.set(item.name, item);

		if(item.alias !== null){
			this.#manifest.set(item.alias, item);
		}
	}
}