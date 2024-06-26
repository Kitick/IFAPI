class PIDController {
	#lastError = 0;
	#integral = 0;

	constructor(public Kp:number = 0, public Ki:number = 0, public Kd:number = 0, public minValue:number = -Infinity, public maxValue:number = Infinity, public cyclical:boolean = false){}

	#modulus(value:number):number {
		const range = this.maxValue - this.minValue;
		const normalized = ((value - this.minValue) % range + range) % range + this.minValue;
		return normalized;
	}

	#shorterDistance(value:number):number {
		const range = (this.maxValue - this.minValue);

		const sign = Math.sign(value);
		const normal = this.#modulus(value);

		if(normal > range / 2){
			return (range - normal) * -sign;
		}

		return value;
	}

	update(current:number, target:number, dt:number):number{
		let error = target - current;

		if(this.cyclical){
			current = this.#modulus(current);
			target = this.#modulus(target);

			error = target - current;
			error = this.#shorterDistance(error);
		}

		const integralError = error * dt;
		this.#integral += integralError;

		this.#integral = Math.max(this.#integral, this.minValue / this.Ki);
		this.#integral = Math.min(this.#integral, this.maxValue / this.Ki);

		const derivitive = (error - this.#lastError) / dt;

		this.#lastError = error;

		const p = this.Kp * error;
		const i = this.Ki * this.#integral;
		const d = this.Kd * derivitive;

		let output = p + i + d;

		output = Math.max(output, this.minValue);
		output = Math.min(output, this.maxValue);

		return output;
	}
}

////////////////// TESTING ONLY
let speedPID = new PIDController(5, 0.5, 5, -100, 100);
async function updateSpeed(target:number, dt:number):Promise<void> {
	const [current] = await readAsync("airspeed") as [number];
	const output = speedPID.update(current, target, dt);
	write("throttle", output);
}

let updateTimeout:NodeJS.Timeout;
function constantUpdate(target:number):void {
	clearTimeout(updateTimeout);
	updateSpeed(target, 0.1);
	updateTimeout = setTimeout(() => {constantUpdate(target);}, 100);
}
//////////////////////

const NMtoFT = 6076.12;

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

function dependencyCheck(id:string):void {
	if(id === "autoland" && autoland.isActive() && domInterface.read("approach")){
		domInterface.write("approach", false);
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