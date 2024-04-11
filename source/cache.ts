class StateCache {
	#data = new Map<string, {dom:inputHTML, value:dataValue}>();

	constructor(){}

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

	addArray(ids:string[]):void {
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

	add(...ids:string[]):void {this.addArray(ids);}

	loadArray(ids:string[]):dataMap {
		let returnMap:dataMap = new Map();

		ids.forEach(id => {
			const value = this.load(id);
			if(value === undefined){return;}

			returnMap.set(id, value);
		});

		return returnMap;
	}
 
	load(id:string):dataValue|undefined {
		const value = this.#data.get(id)?.value;
		return value;
	}

	loadAll():dataMap {
		let returnMap:dataMap = new Map();

		this.#data.forEach((refrence, key) => {
			returnMap.set(key, refrence.value);
		});

		return returnMap;
	}

	save(id:string, value:dataValue):void {
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

	isValid(id:string, doError = false):boolean {
		const refrence = this.#data.get(id);
		if(refrence === undefined){return false;}

		const valid = refrence.value !== null;

		if(!valid && doError){this.#error(refrence.dom);}

		return valid;
	}

	isValidArray(ids:string[], doError = false):boolean {
		let valid = true;
		ids.forEach(id => {
			valid = this.isValid(id, doError) && valid;
		});

		return valid;
	}
}