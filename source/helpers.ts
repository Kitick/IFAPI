const NMtoFT = 6076.12;

const toDeg = 180 / Math.PI;
const toRad = Math.PI / 180;

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

function dependencyCheck(id:string):void {
	if(id === "autoland" && autoland.isActive() && dom.readInput("approach")){
		dom.write("approach", false);
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

/*
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
*/

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