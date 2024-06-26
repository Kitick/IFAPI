class Autofunction {
	#button:HTMLElement;
	#timeout:NodeJS.Timeout|null = null;
	#states:string[] = [];
	#inputs:string[] = [];
	#dependents:Autofunction[] = [];
	#active:boolean = false;
	#armed:boolean = false;
	#code:funcCode;

	memory:Map<any, any> = new Map();
	stage = 0;

	constructor(button:string, public delay:number, states:string[], inputs:string[], dependents:Autofunction[], code:funcCode){
		const element = document.getElementById(button);
		if(element === null){throw "Element " + button + " is undefined";}

		this.#button = element as HTMLElement;
		this.#button.addEventListener("click", () => {dependencyCheck(button); this.setActive();});
		this.#setButton();

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

		domInterface.add(...inputs);
	}

	getInputs(){return this.#inputs}
	getDependents(){return this.#dependents;}

	isActive(){return this.#active;}

	setActive(state = !this.#active):void {
		if(this.#active === state){return;}

		this.#active = state;
		this.#setButton();

		if(this.#active){
			this.stage = 0;
			this.#run();
			return;
		}
		else if(this.#timeout !== null){
			clearTimeout(this.#timeout);
			this.#timeout = null;
		}
	}

	#setButton(state:string = ""):void {
		const classList = this.#button.classList;
		const states = ["off", "active", "armed", "error"];

		if(state === ""){
			state = this.isActive() ? "active" : "off";
		}

		if(classList.contains(state)){return;}

		states.forEach(option => {
			classList.remove(option);
		});

		classList.add(state);
	}

	async #run():Promise<void> {
		const valid = this.validateInputs(true);
		if(!valid){this.error(); return;}

		const wasArmed = this.#armed;
		this.#armed = false;

		const states = await readAsync(...this.#states);
		const inputs = domInterface.read(...this.#inputs);

		this.#code(states, inputs);

		if(!this.#armed && wasArmed){
			this.#setButton();
		}

		if(this.delay === -1){
			this.setActive(false);
			return;
		}

		if(this.#active){
			this.#timeout = setTimeout(() => {
				this.#timeout = null;
				this.#run();
			}, this.delay);
		}
	}

	validateInputs(doError = false):boolean {
		let valid = domInterface.validate(doError, ...this.#inputs);

		this.#dependents.forEach(dependent => {
			valid = dependent.validateInputs() && valid;
		});

		return valid;
	}

	arm():void {
		this.#armed = true;
		this.#setButton("armed");
	}

	error():void {
		this.setActive(false);
		this.#setButton("error");
		setTimeout(() => {this.#setButton();}, 2000);
	}
}