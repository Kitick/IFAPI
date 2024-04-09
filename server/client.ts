const Net = require("net");
const UDP = require("dgram");

class Client {
	#display:any;
	#address:string = "";
	#device:any = new Net.Socket();
	#scanner:any|null = null;
	#scannerTimeout:NodeJS.Timeout|null = null;
	#active:boolean = false;
	#dataBuffer:Buffer = Buffer.alloc(0);
	#manifest:Map<string, Item> = new Map();

	constructor(display:any){
		this.#display = display;

		this.#initManifest();

		this.#device.on("data", (buffer:Buffer) => {
			console.log(this.#address + " Rx\t\t\t", buffer);

			this.#dataBuffer = Buffer.concat([this.#dataBuffer, buffer]);

			this.#validate();
		});

		this.#device.on("error", (error:any) => {
			if(error.code === "ECONNREFUSED"){
				this.log(this.#address + " TCP Connection Refused");
			}
		});

		this.log("TCP Socket Created");
	}

	get #scanning(){return this.#scanner !== null;}

	#initManifest():void {
		this.#manifest = new Map();
		this.addItem(new Item(-1, 4, "manifest"));
	}

	#closeScanner(){
		if(!this.#scanning){return;}

		clearTimeout(this.#scannerTimeout as NodeJS.Timeout);
		this.#scannerTimeout = null;

		this.#scanner.close();
		this.#scanner = null;
	}

	#findAddress():void {
		if(this.#scanning){
			this.log("Already searching for packets");
			return;
		}

		this.log("Searching for UDP packets...");

		this.#scanner = UDP.createSocket("udp4");

		this.#scanner.on("message", (data:any, info:any) => {
			let address = info.address;
			this.log(address + " UDP Packet Found");

			this.#closeScanner();
			this.connect(address);
		});

		this.#scanner.bind(15000);

		this.#scannerTimeout = setTimeout(() => {
			this.#closeScanner();
			this.log("UDP search timed out\n\nTry using an IP address");
		}, 10000);
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

	#processData(id:number, data:Buffer):void {
		if(id === -1){
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
			this.#display.send("ready", this.#address);

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
		this.#display.send("log", message);
		console.log(message);
	}

	connect(address = ""):void {
		if(this.#active){
			this.log(this.#address + " TCP is already active");
			this.#display.send("ready", this.#address);
			return;
		}

		this.#address = address;

		if(this.#address === ""){
			this.#findAddress();
			return;
		}

		this.log(this.#address + " Attempting TCP Connection");

		this.#device.connect({host:this.#address, port:10112}, () => {
			this.#active = true;
			this.log(this.#address + " TCP Established, Requesting Manifest");
			this.readState("manifest");
		});
	}

	close():void {
		if(this.#scanning){this.#closeScanner();}

		if(!this.#active){
			this.log("TCP Closed");
			return;
		}

		this.#active = false;

		this.#device.end(() => {
			this.log(this.#address + " TCP Closed");
			this.#address = "";
		});
	}

	readState(itemID:string, callback = () => {}):void {
		const item = this.getItem(itemID);
		if(item === undefined){callback(); return;}

		if(item.type === -1){callback();}
		else{
			const length = item.addCallback(callback);
			if(length > 1){return;}
		}

		const buffer = this.#initalBuffer(item.id, 0);

		this.#device.write(buffer);
		this.#serverLog(itemID, item, buffer);
	}

	writeState(itemID:string):void {
		const item = this.getItem(itemID);
		if(item === undefined){return;}

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