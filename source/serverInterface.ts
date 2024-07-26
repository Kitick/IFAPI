class ServerInterface {
	#server = (window as any).electron;

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
		setInterval(() => {this.ping();}, 1000);

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

	async readState(command:string):Promise<dataValue> {
		return this.#request("read", command);
	}

	async readStates(...commands:string[]):Promise<dataValue[]> {
		let promises:Promise<dataValue>[] = [];

		commands.forEach(command => {
			promises.push(this.readState(command));
		});

		return Promise.all(promises);
	}

	writeState(command:string, value:stateValue):void {
		this.#server.send("write", command, value);
	}
}