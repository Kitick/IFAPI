class AutoFunction {
	#triggerDOM:HTMLElement;
	#statusDOM:HTMLElement|null;
	#status!:string;

	#waiting:boolean = false;

	#states:string[] = [];
	#inputs:string[] = [];
	#dependents:AutoFunction[] = [];

	#active:boolean = false;
	#armed:boolean = false;
	#code:funcCode;

	memory:any = {};
	stage = 0;

	constructor(triggerID:string, public delay:number, states:string[], inputs:string[], dependents:AutoFunction[], code:funcCode){
		const triggerDOM = document.getElementById(triggerID);
		this.#statusDOM = document.getElementById(triggerID + "-status");
		this.status = "Idle";

		if(triggerDOM === null){throw "Element " + triggerID + " is undefined";}

		this.#triggerDOM = triggerDOM as HTMLElement;
		this.#triggerDOM.addEventListener("click", () => {
			dependencyCheck(triggerID);
			this.setActive();
		});
		this.#setTrigger();

		this.#states = states;
		this.#inputs = inputs;
		this.#dependents = dependents;
		this.#code = code;

		this.#inputs.forEach(input => {
			let element = document.getElementById(input);
			if(element === null || element.tagName !== "INPUT" || (element as HTMLInputElement).type !== "number"){return;}

			const inputElement = element as HTMLInputElement;
			const tooltip = document.getElementById("tooltip") as HTMLHeadingElement;

			inputElement.addEventListener("mouseenter", () => {
				tooltip.innerText = inputElement.placeholder;
			});
			inputElement.addEventListener("mouseout", () => {
				tooltip.innerText = "Tooltip";
			});
		});
	}

	set status(message:string){
		this.#status = message;

		if(this.#statusDOM === null){return;}

		const text = "STATUS:\n\n" + message;

		if(this.#statusDOM.innerText !== text){this.#statusDOM.innerText = text;}
	}

	get status():string {return this.#status;}

	isActive(){return this.#active;}

	setActive(state = !this.#active):void {
		if(this.#active === state){return;}

		this.#active = state;
		this.#setTrigger();

		this.stage = 0;
		this.#run();
	}

	#setTrigger(state?:string):void {
		const classList = this.#triggerDOM.classList;
		const states = ["off", "active", "armed", "error"];

		if(state === undefined){state = this.isActive() ? "active" : "off";}

		if(classList.contains(state)){return;}

		states.forEach(option => {
			classList.remove(option);
		});

		classList.add(state);
	}

	#validateNull<type>(values:(type|null)[]):values is type[] {
		return values.every(value => value !== null);
	}

	async #run(override:boolean = false):Promise<void> {
		if((!this.#active && !override) || this.#waiting){return;}

		if(!this.validateInputs(true)){
			this.error("Some Required Inputs are Missing");
			return;
		}

		const wasArmed = this.#armed;
		this.#armed = false;

		const states = await server.readStates(...this.#states);
		const inputs = dom.readInputs(...this.#inputs);

		if(!this.#validateNull(states) || !this.#validateNull(inputs)){
			this.error("Some Required States are Missing");
			return;
		}

		await this.#code(states, inputs); // Some functions may be async

		if(!this.#armed && wasArmed){
			this.#setTrigger();
		}

		if(this.delay === -1){
			this.setActive(false);
			return;
		}

		this.#waiting = true;
		await sleep(this.delay);
		this.#waiting = false;

		this.#run();
	}

	validateInputs(doError = false):boolean {
		let valid = dom.validate(doError, ...this.#inputs);

		this.#dependents.forEach(dependent => {
			valid = dependent.validateInputs() && valid;
		});

		return valid;
	}

	arm():void {
		this.#armed = true;
		this.#setTrigger("armed");
	}

	error(message?:string):void {
		if(message !== undefined){this.status = message;}

		this.setActive(false);
		this.#setTrigger("error");
		setTimeout(() => {this.#setTrigger();}, 2000);
	}
}