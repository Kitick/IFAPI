class DOMInterface {
	#data:Map<string, {dom:inputHTML, value:dataValue}> = new Map();

	constructor(elements:HTMLCollection){
		this.init(elements);
	}

	#parse(dom:inputHTML):void {
		const refrence = this.#data.get(dom.id);
		if(refrence === undefined){return;}

		let value:dataValue = null;

		switch(dom.type){
			case "number": value = parseFloat(dom.value); break;
			case "checkbox": value = (dom as HTMLInputElement).checked; break;
			case "select-one": value = dom.value; break;
		}

		if(typeof value === "number" && isNaN(value)){value = null;}

		refrence.value = value;
	}

	#error(dom:inputHTML):void {
		dom.classList.add("error");
		setTimeout(() => {dom.classList.remove("error");}, 2000);
	}

	init(elements:HTMLCollection):void {
		this.#data.clear();

		for(let i = 0, length = elements.length; i < length; i++){
			const element = elements[i];
			this.add(element.id);
		}
	}

	add(...ids:string[]):void {
		ids.forEach(id => {
			if(this.#data.get(id) !== undefined){return;}

			const element = document.getElementById(id);
			if(element === null){return;}

			const dom = element as inputHTML;

			dom.addEventListener("change", () => {
				this.#parse(dom);
			});

			this.#data.set(dom.id, {dom:dom, value:null});
			this.#parse(dom);
		});
	}

	readInput<type extends keyof InputTypes>(id:type):InputTypes[type];

	readInput(id:string):dataValue {
		return this.#data.get(id)?.value ?? null;
	}

	readInputs(...ids:string[]):dataValue[] {
		let values:dataValue[] = [];

		ids.forEach(id => {
			values.push(this.readInput(id));
		});

		return values;
	}

	readInputsObject<type extends keyof InputTypes>(...states:type[]):{[key in type]:InputTypes[key]};

	readInputsObject(...ids:string[]):{[key:string]:dataValue} {
		let returnObject:{[key:string]:dataValue} = {};

		ids.forEach(id => {
			returnObject[id] = this.readInput(id);
		});

		return returnObject;
	}

	readAll():dataMap {
		let returnMap:dataMap = new Map();

		this.#data.forEach((refrence, key) => {
			returnMap.set(key, refrence.value);
		});

		return returnMap;
	}

	write(id:string, value:dataValue):void {
		const refrence = this.#data.get(id);
		if(refrence === undefined){return;}

		refrence.value = value;
		const dom = refrence.dom;

		if(typeof value === "boolean"){
			(dom as HTMLInputElement).checked = value;
			return;
		}

		value = value ?? "";
		dom.value = value.toString();
	}

	validate(doError = false, ...ids:string[]):boolean {
		let overall = true;

		ids.forEach(id => {
			const refrence = this.#data.get(id);
			if(refrence === undefined){return false;}

			const valid = refrence.value !== null;

			if(!valid && doError){this.#error(refrence.dom);}

			overall = valid && overall;
		});

		return overall;
	}
}