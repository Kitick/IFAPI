class ServerInterface {
	#server = (window as any).electron;

	#pingInterval:NodeJS.Timeout|null = null;
	pingDOM:HTMLElement|null = null;

	#requestIndex:number = 0;
	#requests:Map<number, (data:any) => void> = new Map();

	async #request(channel:string, ...data:any[]):Promise<any> {
		let index = this.#requestIndex;
		while(this.#requests.has(index)){
			index++;
		}

		this.#requestIndex = index + 1;

		return new Promise(resolve => {
			this.#requests.set(index, resolve);
			this.#server.send(channel, index, ...data);
		});
	}

	#response(index:number, data:any):void {
		const resolve = this.#requests.get(index);
		if(resolve === undefined){return;}

		this.#requests.delete(index);
		this.#requestIndex = 0;

		resolve(data);
	}

	constructor(pingDOM?:HTMLElement){
		this.pingDOM = pingDOM ?? null;

		this.#server.on("response", ([index, data]:[number, any]) => {
			this.#response(index, data);
		});

		this.#server.on("log", ([response]:[string]) => {
			log(response);
		});
	}

	async start(address:string):Promise<string> {
		address = address ?? (document.getElementById("address") as HTMLInputElement).value;
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

		const ip = await this.#request("start", address) as string;

		(document.getElementById("address") as HTMLInputElement).value = ip;
		setHidden(false);

		if(this.#pingInterval !== null){clearInterval(this.#pingInterval);}
		this.#pingInterval = setInterval(() => {this.ping();}, 1000);

		return ip;
	}

	async stop():Promise<void> {
		await this.#request("stop");
		location.reload();
	}

	async ping():Promise<number> {
		const start = performance.now();
		const devicePing = await this.#request("ping") as number;
		const totalPing = performance.now() - start;
		const serverPing = totalPing - devicePing;

		if(this.pingDOM !== null){
			this.pingDOM.innerText = `Total Ping: ${totalPing.toFixed(1)} ms`;
			this.pingDOM.innerText += `\n\nServer Ping: ${serverPing.toFixed(1)} ms`;
			this.pingDOM.innerText += `\nDevice Ping: ${devicePing.toFixed(1)} ms`;
		}

		return totalPing;
	}

	async readState<type extends keyof StateTypes>(state:type):Promise<StateTypes[type]>;

	async readState(state:string):Promise<dataValue> {
		return this.#request("read", state);
	}

	//async readStates<type extends (keyof StateTypes)[]>(...states:type):Promise<{[type2 in keyof type]:type[type2] extends keyof StateTypes ? StateTypes[type[type2]]:never}>;

	async readStates(...states:string[]):Promise<dataValue[]> {
		let promises:Promise<dataValue>[] = [];

		states.forEach(state => {
			promises.push(this.readState(state));
		});

		return Promise.all(promises);
	}

	async readStatesObject<type extends keyof StateTypes>(...states:type[]):Promise<{[key in type]:StateTypes[key]}>;

	async readStatesObject(...states:string[]):Promise<{[key:string]:dataValue}> {
		const values = await this.readStates(...states);

		let returnObject:{[key:string]:dataValue} = {};

		states.forEach((state, index) => {
			returnObject[state] = values[index];
		});

		return returnObject;
	}

	writeState(state:string, value:stateValue):void {
		this.#server.send("write", state, value);
	}

	async setState(state:string, value:stateValue, round:number = 3):Promise<void> {
		const current = await this.readState(state);

		if(typeof current === "number" && typeof value === "number"){
			const tolerance = 10 ** -round;

			if(Math.abs(current - value) >= tolerance){
				this.writeState(state, value);
			}
		}
		else if(current !== value){
			this.writeState(state, value);
		}
	}
}