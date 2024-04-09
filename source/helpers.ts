function cyclical(value:number, range = 360):number {
	value = ((value % range) + range) % range;
	return value;
}

function dms(deg:number, min = 0, sec = 0):number {
	return Math.sign(deg) * (Math.abs(deg) + (min / 60) + (sec / 3600));
}

function calcLLfromHD(refrence:latlong, hdg:number, dist:number, magvar = 0):latlong {
	dist /= 60;

	hdg = -hdg + 90 - magvar;
	hdg *= toRad;

	const lat2 = dist * Math.sin(hdg) + refrence.lat;
	const long2 = (dist * Math.cos(hdg)) / Math.cos(toRad * (refrence.lat + lat2) * 0.5) + refrence.long;

	return {lat:lat2, long:long2};
}

function calcLLdistance(location:latlong, location2:latlong):number {
	const deltaY = 60 * (location2.lat - location.lat);
	const deltaX = 60 * (location2.long - location.long) * Math.cos((location.lat + location2.lat) * 0.5 * toRad);
	const distance = (deltaX ** 2 + deltaY ** 2) ** 0.5;

	return distance;
}

function controlThrottle(throttle:number, spd:number, spdDifference:number):void {
	write("spdon", false);

	if(throttle > 0){write("throttle", -80);}
	else{write("throttle", -100);}

	write("spd", spd);
	write("spoilers", 1);

	if(spdDifference){
		write("spdon", true);
		write("spoilers", 2);
	}
}

function showfpl(id:string, waypoint:string, div:HTMLDivElement):void {
	const input = document.createElement("input");
	const br = document.createElement("br");
	input.type = "number";
	input.id = id;
	div.innerHTML += " " + waypoint;
	div.appendChild(input);
	div.appendChild(br);
}

function nextRestriction(item:fplItemStruct, waypoint:vnavWaypoint, itemIndex:number, childIndex:number):vnavWaypoint {
	if(item.identifier === waypoint.name || item.name === waypoint.name) {
		waypoint.index = itemIndex;
		waypoint.children = childIndex;
		waypoint.altitude = item.altitude;
	}
	if(itemIndex >= waypoint.index && item.altitude !== -1) {
		waypoint.altitudeRestriction.push(item.altitude);
		waypoint.restrictionLocation = {lat:item.location.Latitude, long:item.location.Longitude};
	}

	return waypoint;
}

function speak(text:string):void {
	text = text.toString()

	const select = document.getElementById("voices") as HTMLSelectElement;
	const voiceIndex = select.selectedIndex;

	const voices = speechSynthesis.getVoices();
	const voiceRateInput = document.getElementById("utterancerate") as HTMLInputElement;

	let voiceRate = parseInt(voiceRateInput.value);
	if(isNaN(voiceRate)){voiceRate = 1;}

	const utterance = new SpeechSynthesisUtterance(text);
	utterance.rate = voiceRate;
	utterance.voice = voices[voiceIndex];
	speechSynthesis.speak(utterance);
}

speechSynthesis.getVoices();

const toDeg = 180 / Math.PI;
const toRad = Math.PI / 180;

function setAll(className:string):void {
	const state = className === "off";

	autogear.setActive(state);
	autospoilers.setActive(state);
	autotrim.setActive(state);
	autoflaps.setActive(state);
	autolights.setActive(state);
	autobrakes.setActive(state);
	autospeed.setActive(state);

	const all = document.getElementById("all") as HTMLButtonElement;
	all.className = state ? "active" : "off";
}

function config():void {
	const configs = new Map<string, {instance:Autofunction, checked:boolean}>();

	configs.set("autoflaps", {
		instance: autoflaps,
		checked: (document.getElementById("configflaps") as HTMLInputElement).checked
	});
	configs.set("autospeed", {
		instance: autoflaps,
		checked: (document.getElementById("configspeed") as HTMLInputElement).checked
	});
	configs.set("autotakeoff", {
		instance: autoflaps,
		checked: (document.getElementById("configtakeoff") as HTMLInputElement).checked
	});
	configs.set("flypattern", {
		instance: autoflaps,
		checked: (document.getElementById("configpattern") as HTMLInputElement).checked
	});
	configs.set("autoland", {
		instance: autoflaps,
		checked: (document.getElementById("configland") as HTMLInputElement).checked
	});

	let inputArray:string[] = [];

	configs.forEach(config => {
		if(!config.checked){return;}

		const functions = [config.instance];
		functions.concat(config.instance.getDependents());

		functions.forEach(func => {
			func.getInputs().forEach(id => {
				if(inputArray.indexOf(id) !== -1){return;}
				inputArray.push(id);
			});
		});
	});

	inputArray.forEach(input => {
		const dom = document.getElementById(input) as HTMLInputElement|null;
		if(dom === null || dom.type !== "number"){return;}

		const value = prompt(dom.placeholder + "\nLeave blank to not change");
		if(value === null || value === ""){return;}

		Autofunction.cache.save(input, value);
	});
};

function dependencyCheck(id:string):void {
	if(id === "autoland" && autoland.isActive() && Autofunction.cache.load("approach")){
		Autofunction.cache.save("approach", false);
	}
	else if(id === "flypattern" && flypattern.isActive()){
		autoland.setActive(false);
		flyto.setActive(false);
	}
	else if(id === "flyto" && flyto.isActive()){
		flypattern.setActive(false);
		autoland.setActive(false);
	}
}