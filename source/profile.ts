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

	add(name?:string):void {
		const nameInput = document.getElementById("profile-name") as HTMLInputElement;

		if(name === undefined){
			name = nameInput.value as string;
		}

		nameInput.value = "";

		this.save(name);

		this.#build();
		this.#selectDOM.value = name;
	}

	save(name:string = this.#selectDOM.value):void {
		if(name === ""){this.add(); return;}

		const data = domInterface.readAll();

		let profile:any = {};
		data.forEach((value, key) => {
			profile[key] = value;
		});

		localStorage.setItem(name, JSON.stringify(profile));

		this.#flash("profile-save", "active");
	}

	load(name:string = this.#selectDOM.value):void {
		const profileString = localStorage.getItem(name);

		if(name === "" || profileString === null){this.#flash("profile-load", "error"); return;}

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

			domInterface.write(id, value);
		}

		this.#flash("profile-load", "active");
	}

	remove(name:string = this.#selectDOM.value):void {
		if(name === ""){return;}

		const conf = confirm("Are you sure you want to delete: " + name);
		if(!conf){return;}

		localStorage.removeItem(name);
		this.#build();
	}
}