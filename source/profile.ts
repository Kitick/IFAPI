class ProfileStorage {
	static defaultName:string = "#default";

	#selectDOM:HTMLSelectElement;

	constructor(dom:HTMLSelectElement){
		this.#selectDOM = dom;

		const name = ProfileStorage.defaultName;

		if(localStorage.getItem(name) === null){this.save(name);}

		this.#build();
		this.load(name);
	}

	#build():void {
		let configs = [];
		for(let i = 0, length = localStorage.length; i < length; i++){
			configs.push(localStorage.key(i) as string);
		}

		configs.sort();

		this.#selectDOM.innerHTML = "";
		configs.forEach(name => {
			let option = new Option(name, name);
			this.#selectDOM.appendChild(option);
		});
	}

	#flash(id:string, colorName:string):void {
		const dom = document.getElementById(id);
		if(dom === null){return;}

		dom.classList.remove("off");
		dom.classList.add(colorName);

		setTimeout(() => {
			dom.classList.remove(colorName);
			dom.classList.add("off");
		}, 500);
	}

	add(name = prompt("Enter the name of the profile:")):void {
		while(name === ""){name = prompt("Name cannot be blank:");}
		if(name === null){return;}

		this.save(name);

		this.#build();
		this.#selectDOM.value = name;
	}

	save(name:string = this.#selectDOM.value):void {
		if(name === ""){this.add(); return;}

		const data = Autofunction.cache.loadAll();

		let profile:any = {};
		data.forEach((value, key) => {
			profile[key] = value;
		});

		localStorage.setItem(name, JSON.stringify(profile));

		this.#flash("save", "active");
	}

	load(name:string = this.#selectDOM.value):void {
		const profileString = localStorage.getItem(name);

		if(name === "" || profileString === null){this.#flash("load", "error"); return;}

		this.#selectDOM.value = name;
		const loadEmpty = (document.getElementById("loadempty") as HTMLInputElement).checked;

		const profile = JSON.parse(profileString);
		for(let id in profile){
			let value = profile[id] as dataValue;

			if(value !== null){
				let testValue = parseFloat(value.toString());
				if(!isNaN(testValue)){value = testValue;}
			}
			else if(!loadEmpty){continue;}

			Autofunction.cache.save(id, value);
		}

		this.#flash("load", "active");
	}

	remove(name:string = this.#selectDOM.value):void {
		if(name === ""){return;}

		const conf = confirm("Are you sure you want to delete: " + name);
		if(!conf){return;}

		localStorage.removeItem(name);
		this.#build();
	}
}