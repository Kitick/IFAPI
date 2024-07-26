const Net = require("net");
const UDP = require("dgram");

class Client {
	#address:string = "";
	#device:any = new Net.Socket();
	#scanner:any|null = null;
	#scannerTimeout:NodeJS.Timeout|null = null;
	#active:boolean = false;
	#dataBuffer:Buffer = Buffer.alloc(0);
	#manifest:Map<string, Item> = new Map();

	constructor(){
		this.#initManifest();

		this.#device.on("data", (buffer:Buffer) => {
			console.log(this.#address + " Rx\t\t\t", buffer);

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
		this.#manifest = new Map();
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
		if(id === -1){
			const item = this.getItem("manifest") as Item;
			this.#buildManifest(data);
			item.callback();
			return;
		}

		const item = this.getItem(id.toString());
		if(item === undefined){return;}

		item.buffer = data;
		item.callback();
	}

	#initalBuffer(id:number, state:number):Buffer {
		let buffer = Buffer.allocUnsafe(5);

		buffer.writeInt32LE(id);
		buffer[4] = state;

		return buffer;
	}

	#serverLog(name:string, item:Item, buffer:Buffer, writing = false){
		const equals = writing ? " =":"";
		const value = writing ? item.value:"";
		console.log(this.#address, "Tx", name, "(" + item.id.toString() + ")" + equals, value, buffer);
	}

	log(message:string):void {
		display.send("log", message);
		console.log(message);
	}

	async readState(itemID:string):Promise<dataValue> {
		return new Promise((resolve, reject) => {
			const item = this.getItem(itemID);
			if(item === undefined){reject(); return;}

			if(item.type === -1){resolve(null);}
			else{
				const length = item.addCallback(resolve);
				if(length > 1){return;}
			}

			const buffer = this.#initalBuffer(item.id, 0);

			this.#device.write(buffer);
			this.#serverLog(itemID, item, buffer);
		});
	}

	writeState(itemID:string, value:stateValue):void {
		const item = this.getItem(itemID);
		if(item === undefined){return;}

		item.value = value;
		let buffer = this.#initalBuffer(item.id, 1);

		buffer = Buffer.concat([buffer, item.buffer]);

		this.#device.write(buffer);
		this.#serverLog(itemID, item, buffer, true);
	}

	addItem(item:Item):void {
		this.#manifest.set(item.id.toString(), item);
		this.#manifest.set(item.name, item);

		if(item.alias !== null){
			this.#manifest.set(item.alias, item);
		}
	}

	getItem(itemID:string):Item|undefined {
		const item = this.#manifest.get(itemID);
		if(item === undefined){this.log(this.#address + " Invalid Item " + itemID);}
		return item;
	}
}