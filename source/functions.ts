const autotrim = new AutoFunction("trim", 1000,
	["onground", "pitch", "trim"],
	[],
	[], (states, inputs) => {

	const [onground, pitch, trim] =
	states as [boolean, number, number];

	if(onground){
		if(trim !== 0){write("trim", 0);}
		return;
	}

	const deadzone = 2;
	let mod = 10;

	if(Math.abs(pitch) < 10){
		mod = 1;
	}
	else if(Math.abs(pitch) < 50){
		mod = 5;
	}

	if(Math.abs(pitch) >= deadzone){
		let newTrim = trim + mod * Math.sign(pitch);
		newTrim = Math.round(newTrim / mod) * mod;

		write("trim", newTrim);
	}
});

const autolights = new AutoFunction("lights", 2000,
	["altitudeAGL", "onground", "onrunway", "gear"],
	[],
	[], (states, inputs) => {

	const [altitudeAGL, onground, onrunway, gear] =
	states as [number, boolean, boolean, boolean];

	write("master", true);
	write("beaconlights", true);
	write("navlights", true);

	if(onground){
		write("strobelights", onrunway);
		write("landinglights", onrunway);
	}
	else{
		write("strobelights", true);

		if(altitudeAGL < 1000 && gear){write("landinglights", true);}
		else{write("landinglights", false);}
	}
});

const autogear = new AutoFunction("gear", 1000,
	["gear", "altitudeAGL", "verticalspeed"],
	[],
	[], (states, inputs) => {

	const [gear, altitudeAGL, verticalspeed] =
	states as [boolean, number, number];

	let newState = gear;

	if(altitudeAGL < 100 || (verticalspeed <= -500 && altitudeAGL < 1200)){
		newState = true;
	}
	else if(verticalspeed >= 500 || altitudeAGL >= 2000){
		newState = false;
	}

	// readcommand to use the animation
	if(newState !== gear){readAsync("commands/LandingGear");}
});

const autobrakes = new AutoFunction("autobrakes", 1000,
	["leftbrake", "rightbrake", "autobrakes", "onground", "onrunway", "groundspeed"],
	[],
	[], (states, inputs) => {

	const [leftbrake, rightbrake, autobrakes, onground, onrunway, groundspeed] =
	states as [number, number, number, boolean, boolean, number];

	let newBrakes = autobrakes;

	if(onground && !onrunway){newBrakes = 0;}
	else if(!onground){newBrakes = 2;}
	else if(onrunway){newBrakes = 3;}

	if(onground && groundspeed > 30 && (leftbrake > 0.3 || rightbrake > 0.3)){
		newBrakes = 0;
	}

	if(newBrakes !== autobrakes){write("autobrakes", newBrakes);}
});

const autoflaps = new AutoFunction("flaps", 1000,
	["flaps", "airspeed", "altitudeAGL", "verticalspeed", "flapcount", "onground", "onrunway"],
	["flaplow", "flaphigh", "flapto"],
	[], (states, inputs) => {

	const [flaps, airspeed, altitudeAGL, verticalspeed, flapcount, onground, onrunway] =
	states as [number, number, number, number, number, boolean, boolean];

	const [flaplow, flaphigh, flapto] =
	inputs as [number, number, number];

	if((flapto < 0 || flapto > flapcount - 1) || (flaphigh < flaplow)){
		autoflaps.error();
		return;
	}

	let newFlaps = flaps;

	if(onground){
		if(onrunway){newFlaps = flapto;}
		else{newFlaps = 0;}
	}
	else if(altitudeAGL >= 250){
		const count = flapcount - 1;

		const mod = (flaphigh - flaplow) / count;
		newFlaps = Math.round((flaphigh - airspeed) / mod);

		newFlaps = Math.max(newFlaps, 0);
		newFlaps = Math.min(newFlaps, count);
	}

	if((verticalspeed >= 500 && newFlaps > flaps) || (verticalspeed <= -500 && newFlaps < flaps)){
		newFlaps = flaps;
	}

	if(newFlaps !== flaps){write("flaps", newFlaps);}
});

const autospoilers = new AutoFunction("spoilers", 1000,
	["spoilers", "airspeed", "spd", "altitude", "altitudeAGL", "onrunway", "onground"],
	[],
	[], (states, inputs) => {

	const [spoilers, airspeed, spd, altitude, altitudeAGL, onrunway, onground] =
	states as [number, number, number, number, number, boolean, boolean];

	let newSpoilers = 0;

	if(onrunway || (!onground && altitudeAGL < 1000)){
		newSpoilers = 2;
	}
	else if(!onground && (airspeed - spd >= 20 || (spd > 255 && altitude < 10000)) && altitude < 28000){
		newSpoilers = 1;
	}

	if(newSpoilers !== spoilers){write("spoilers", newSpoilers);}
});

const autospeed = new AutoFunction("autospeed", 1000,
	["onground", "verticalspeed", "altitudeAGL", "altitude", "latitude", "longitude", "spd"],
	["latref", "longref", "climbspd", "climbalt", "spdref", "cruisespd"],
	[], (states, inputs) => {

	const [onground, verticalspeed, altitudeAGL, altitude, latitude, longitude, spd] =
	states as [boolean, number, number, number, number, number, number];

	const [latref, longref, climbspd, climbalt, spdref, cruisespd] =
	inputs as [number, number, number, number, number, number];

	// elevation is optional, so its not in the inputs
	const elevation = domInterface.read("altref")[0] as number|null;

	if(onground){
		autospeed.arm();
		return;
	}

	//const cruisespd = domInterface.load("cruisespd").get("cruisespd") as number|null;
	const alt = (elevation === null) ? altitudeAGL : altitude - elevation;

	let newSpeed = spd;

	if(autoland.isActive()){
		const distance = calcLLdistance({lat:latitude, long:longitude}, {lat:latref, long:longref});

		let speed = (distance - 2.5) * 10 + spdref;
		speed = Math.min(speed, spd);
		speed = Math.round(speed / 10) * 10;
		speed = Math.max(speed, spdref);

		newSpeed = speed;
	}
	else if(flypattern.isActive() || altitude <= climbalt){
		newSpeed = climbspd;
	}
	else if(altitude < 10000 || (altitude < 12000 && verticalspeed <= -500)){
		newSpeed = 250;
	}
	else if(alt >= 10000){
		newSpeed = cruisespd;
	}

	newSpeed = Math.min(newSpeed, cruisespd);

	if(newSpeed !== spd){write("spd", newSpeed);}
});

const levelchange = new AutoFunction("levelchange", 1000,
	["airspeed", "altitude", "alt"],
	["flcinput", "flcmode"],
	[], (states, inputs) => {

	const [airspeed, altitude, alt] =
	states as [number, number, number];

	const [flcinput, flcmode] =
	inputs as [number, climbType];

	let output = flcinput;

	const diffrence = alt - altitude;

	if(Math.abs(diffrence) < 100){
		levelchange.setActive(false);
		return;
	}

	if(flcmode === "v"){output = NMtoFT * Math.tan(output * toRad);}
	if(flcmode !== "f"){output *= airspeed / 60;}

	output *= Math.sign(diffrence);

	write("vs", output);
});

const markposition = new AutoFunction("markposition", -1,
	["latitude", "longitude", "altitude", "heading"],
	[],
	[], (states, inputs) => {

	const [latitude, longitude, altitude, heading] =
	states as [number, number, number, number];

	domInterface.write("latref", latitude);
	domInterface.write("longref", longitude);
	domInterface.write("hdgref", Math.round(heading));
	domInterface.write("altref", Math.round(altitude));
});

const setrunway = new AutoFunction("setrunway", -1,
	["route", "coordinates"],
	[],
	[], (states, inputs) => {

	const [route, coordinates] =
	states as [string, string];

	const fpl = route.split(",");
	let rwIndex = -1;

	for(let i = 0, length = fpl.length; i < length; i++){
		if(fpl[i].search(/RW\d\d.*/) === 0){
			rwIndex = i;
			break;
		}
	}

	if(rwIndex === -1){
		setrunway.error();
		return;
	}

	const runway = fpl[rwIndex][2] + fpl[rwIndex][3] + "0";
	const runwayCoords = coordinates.split(" ")[rwIndex].split(",");

	const latref = parseFloat(runwayCoords[0]);
	const longref = parseFloat(runwayCoords[1]);
	const hdgref = parseInt(runway);

	domInterface.write("latref", latref);
	domInterface.write("longref", longref);
	domInterface.write("hdgref", hdgref);
	domInterface.write("altref", null);
});

const rejecttakeoff = new AutoFunction("reject", -1,
	["onrunway"],
	[],
	[], (states, inputs) => {

	const [onrunway] =
	states as [boolean];

	if(!onrunway){
		rejecttakeoff.error();
		console.log("Not on a runway");
		return;
	}

	if(autotakeoff.isActive()){
		autotakeoff.error();
	}

	write("autopilot", false);
	write("throttle", -100);
});

const takeoffconfig = new AutoFunction("takeoffconfig", -1,
	["onground", "heading", "altitude"],
	["climbalt", "climbtype", "flcinputref", "flcmoderef"],
	[], (states, inputs) => {

	const [onground, heading, altitude] =
	states as [boolean, number, number];

	const [climbalt, climbtype, flcinputref, flcmoderef] =
	inputs as [number, altType, number, climbType];

	if(!onground){
		takeoffconfig.error();
		console.log("Not on the ground");
		return;
	}

	let alt = climbalt;
	if(climbtype === "agl"){
		const agl = Math.round(altitude / 100) * 100;
		alt += agl;
	}

	domInterface.write("flcinput", flcinputref);
	domInterface.write("flcmode", flcmoderef);

	write("alt", alt);
	write("hdg", heading);
	write("vs", 0);

	write("parkingbrake", false);
});

const autotakeoff = new AutoFunction("autotakeoff", 500,
	["onrunway", "n1", "airspeed"],
	["rotate", "climbspd", "climbthrottle", "takeoffspool", "takeofflnav", "takeoffvnav"],
	[takeoffconfig, rejecttakeoff], (states, inputs) => {

	const [onrunway, n1, airspeed] =
	states as [boolean, number|null, number];

	const [rotate, climbspd, climbthrottle, takeoffspool, takeofflnav, takeoffvnav] =
	inputs as [number, number, number, boolean, boolean, boolean];

	const throttle = 2 * climbthrottle - 100;

	let stage = autotakeoff.stage;

	if(stage === 0){
		if(!onrunway){
			autotakeoff.error("Not on a Runway");
			return;
		}

		autotakeoff.status = "Inital Setup";

		takeoffconfig.setActive(true);
		levelchange.setActive(false);

		write("spd", climbspd);

		write("autopilot", true);
		write("alton", true);
		write("vson", false);
		write("hdgon", true);

		const initalThrottle = takeoffspool ? -20 : throttle;
		write("throttle", initalThrottle);

		stage++;
	}
	else if(stage === 1){
		write("vson", true);

		if(!takeoffspool){
			stage++;
		}
		else if(n1 === null){
			write("throttle", throttle);
			stage++;
		}
		else if(n1 >= 40){
			write("throttle", throttle);
			stage++;
		}
		else{
			autotakeoff.status = "Spolling Engines";
		}
	}
	else if(stage === 2){
		autotakeoff.status = "Takeoff Roll";

		if(airspeed >= rotate){
			levelchange.setActive(true);
			stage++;
		}
	}
	else if(stage === 3){
		autotakeoff.status = "Rotate";

		if(climbspd - airspeed < 10){
			autotakeoff.status = "Climbout";

			if(takeofflnav){write("navon", true);}
			if(takeoffvnav){vnavSystem.setActive(true);}

			write("spdon", true);
			stage++;
		}
	}
	else{
		autotakeoff.status = "Takeoff Complete";
		autotakeoff.setActive(false);
	}

	autotakeoff.stage = stage;
});

const flyto = new AutoFunction("flyto", 1000,
	["latitude", "longitude", "variation", "groundspeed", "wind", "winddir"],
	["flytolat", "flytolong", "flytohdg"],
	[], (states, inputs) => {

	const [latitude, longitude, variation, groundspeed, wind, winddir] =
	states as [number, number, number, number, number, number];

	const [flytolat, flytolong, flytohdg] =
	inputs as [number, number, number];

	function cyclical(value:number):number {
		value = ((value % 360) + 360) % 360;
		return value;
	}

	const distance = calcLLdistance({lat:latitude, long:longitude}, {lat:flytolat, long:flytolong});

	if(distance < 1){
		flyto.status = "Arrived";
		flyto.setActive(false);
		return;
	}

	const hdgTarget = cyclical(flytohdg);

	// X and Y are in nm
    const deltaY = 60 * (flytolat - latitude);
    const deltaX = 60 * (flytolong - longitude) * Math.cos((latitude + flytolat) * 0.5 * toRad);
    const direct = cyclical(Math.atan2(deltaX, deltaY) * toDeg - variation);

    let diffrence = hdgTarget - direct;

    if(diffrence > 180){diffrence -= 360;}
    else if(diffrence < -180){diffrence += 360;}

	const xtrack = distance * Math.sin(diffrence * toRad);

	const absTrack = Math.abs(xtrack);
	const intAngle = 45;
	const intDist = 1.5;

	let correction = (intAngle / intDist) * absTrack;
	if(absTrack > intDist){correction = intAngle;}

	const course = cyclical(hdgTarget - correction * Math.sign(xtrack));

	// Wind Correction
	const windmag = cyclical(winddir - variation + 180);
	const courseMath = (-course + 90) * toRad;
	const windMath = (-windmag + 90) * toRad;

	const courseX = 2 * groundspeed * Math.cos(courseMath);
	const courseY = 2 * groundspeed * Math.sin(courseMath);
	const windX = wind * Math.cos(windMath);
	const windY = wind * Math.sin(windMath);

	const windCorrect = cyclical(Math.atan2(courseX - windX, courseY - windY) * toDeg);

	function leftright(value:number, round:number = 1):string {
		return `${value < 0 ? "L" : "R"} ${Math.abs(value).toFixed(round)}`;
	}

	flyto.status = `Distance: ${distance.toFixed(1)}nm`;
	flyto.status += `\nX-Track: ${leftright(xtrack, 2)}nm`;
	flyto.status += `\n\nOffset: ${leftright(diffrence)}°`;
	flyto.status += `\nCrab Angle: ${leftright(windCorrect - course)}°`;

	write("hdg", windCorrect);
});

const flypattern = new AutoFunction("flypattern", 1000,
	["latitude", "longitude", "variation", "groundspeed"],
	["latref", "longref", "hdgref", "updist", "downwidth", "finallength", "turnconst", "leg", "direction", "approach"],
	[], (states, inputs) => {

	const [latitude, longitude, variation, groundspeed] =
	states as [number, number, number, number];

	const [latref, longref, hdgref, updist, downwidth, finallength, turnconst, leg, direction, approach] =
	inputs as [number, number, number, number, number, number, number, patternLeg, string, boolean];

	const circuit = (direction === "r") ? 1 : -1;
	const hdg90 = hdgref + 90 * circuit;

	const refrence = {location:{lat:latref, long:longref}, hdg:hdgref};
	const final = refrence;

	const upwind = {
		location:calcLLfromHD(refrence.location, hdgref, updist + 1.5, variation),
		hdg:hdgref,
	};
	const crosswind = {
		location:calcLLfromHD(upwind.location, hdg90, downwidth, variation),
		hdg:hdg90,
	};
	const base = {
		location:calcLLfromHD(refrence.location, hdgref + 180, finallength, variation),
		hdg:hdg90 + 180,
	};
	const downwind = {
		location:calcLLfromHD(base.location, hdg90, downwidth, variation),
		hdg:hdgref + 180,
	};

	const pattern = {
		u:upwind,
		c:crosswind,
		d:downwind,
		b:base,
		f:final,
	};

	const currentLeg = pattern[leg];
	const distance = calcLLdistance({lat:latitude, long:longitude}, currentLeg.location);

	const speed = groundspeed / 60; // kts to nm/m
	const turnrate = (turnconst / groundspeed) * 60 * toRad; // deg/s to rad/m

	let legout = leg;
	if(distance < speed / turnrate){
		const legOrder = ["u", "c", "d", "b", "f"];
		let legIndex = legOrder.indexOf(leg);

		if(leg !== "f" || (leg === "f" && distance < 1)){
			legIndex = (legIndex + 1) % 5;
			legout = legOrder[legIndex] as patternLeg;
		}
	}

	if(legout === "f" && approach){
		autoland.setActive(true);
	}

	const latout = currentLeg.location.lat;
	const longout = currentLeg.location.long;
	const hdgout = ((currentLeg.hdg % 360) + 360) % 360;

	domInterface.write("leg", legout);
	domInterface.write("flytolat", latout);
	domInterface.write("flytolong", longout);
	domInterface.write("flytohdg", hdgout);

	flyto.setActive(true);
});

const goaround = new AutoFunction("goaround", -1,
	["onground"],
	["climbalt", "climbspd", "climbtype", "altref", "flcinputref", "flcmoderef"],
	[], (states, inputs) => {

	const [onground] =
	states as [boolean];

	const [climbalt, climbspd, climbtype, altref, flcinputref, flcmoderef] =
	inputs as [number, number, altType, number, number, climbType];

	if(onground){
		goaround.error();
		autoland.status = "Cannot Go-Around on the ground";
		return;
	}

	autoland.error("Go-Around");

	domInterface.write("leg", "u");
	domInterface.write("flcinput", flcinputref);
	domInterface.write("flcmode", flcmoderef);

	let alt = climbalt;
	if(climbtype === "agl"){
		const agl = Math.round(altref / 100) * 100;
		alt += agl;
	}

	write("spd", climbspd);
	write("alt", alt);
	write("spdon", true);
	write("alton", true);
	write("hdgon", true);

	levelchange.setActive(true);
});

const autoland = new AutoFunction("autoland", 500,
	["latitude", "longitude", "altitude", "groundspeed", "onrunway"],
	["latref", "longref", "altref", "hdgref", "vparef", "flare", "touchdown", "option", "flcinputref", "flcmoderef"],
	[flypattern, goaround], (states, inputs) => {

	const [latitude, longitude, altitude, groundspeed, onrunway] =
	states as [number, number, number, number, boolean];

	const [latref, longref, altref, hdgref, vparef, flare, touchdown, option, flcinputref, flcmoderef] =
	inputs as [number, number, number, number, number, number, number, string, number, climbType];

	const altitudeAGL = altitude - altref;

	if(autoland.stage === 0){
		domInterface.write("flcmode", "v");
		domInterface.write("leg", "f");
		autoland.stage++;
	}

	const touchdownZone = calcLLfromHD({lat:latref, long:longref}, hdgref, touchdown / NMtoFT);
	const touchdownDistance = calcLLdistance({lat:latitude, long:longitude}, touchdownZone);

	if(autoland.stage === 1 && altitudeAGL <= flare){
		autoland.stage++;

		levelchange.setActive(false);

		domInterface.write("flcinput", flcinputref);
		domInterface.write("flcmode", flcmoderef);

		return;
	}

	if(autoland.stage === 2){
		write("vs", -200);

		if(option !== "p"){
			autoland.status = "Flare";

			write("spdon", false);
			write("throttle", -100);
		}

		if(option === "p"){
			autoland.status = "Flying Low-Pass";

			autoland.setActive(false);
			setTimeout(() => {goaround.setActive(true);}, 10000);
		}
		else if(option === "l" && onrunway){
			autoland.status = "Landing Complete";

			autoland.setActive(false);
			flypattern.setActive(false);
			flyto.setActive(false);
			write("autopilot", false);
		}
		else if(option === "t" && onrunway){
			autoland.status = "Preparing for Takeoff";

			autoland.setActive(false);
			setTimeout(() => {
				autoland.status = "Touch and Go Complete";
				autotakeoff.setActive(true);
			}, 5000);
		}
		else if(option === "s" && onrunway){
			autoland.status = "Stopping for Stop and Go";

			if(groundspeed > 1){return;}

			autoland.status = "Stop and Go Complete";
			autoland.setActive(false);
			autotakeoff.setActive(true);
		}

		return;
	}

	const currentVPA = Math.asin(altitudeAGL / (touchdownDistance * NMtoFT)) * toDeg;

	let mod = 3;
	let limit = 1;

	if(touchdownDistance <= 2){
		mod = 1;
		limit = 0.5;
	}
	else if(touchdownDistance <= 3){
		mod = 2;
		limit = 0.75;
	}

	let vpaout = currentVPA - mod * (vparef - currentVPA);
	vpaout = Math.round(vpaout * 100) / 100;

	if(touchdownDistance > 3 && (vpaout < vparef - limit || (vpaout < vparef - 0.25 && domInterface.read("flcinput")[0] === 0))){
		autoland.status = "Level-off for GPS G/S Capture";
		vpaout = 0;
	}
	else{
		autoland.status = "Following GPS G/S";
	}

	vpaout = Math.min(vpaout, vparef + limit);

	domInterface.write("flcinput", vpaout);

	write("alt", -1000);

	levelchange.setActive(true);
	flypattern.setActive(true);

	if(autogear.isActive()){autogear.setActive(option !== "p");}
});

const updatefpl = new AutoFunction("updatefpl", -1,
	["fplinfo"],
	[],
	[], (states, inputs) => {

	const [fplinfo] =
	states as [string];

	const fpl:fplStruct = JSON.parse(fplinfo);
	const flightPlanItems = fpl.detailedInfo.flightPlanItems;

	const lastIndex = flightPlanItems.length - 1;
	const lastId = `index${lastIndex}children`;
	const lastItem = document.getElementById(lastId + "0");

	const lastChildren = flightPlanItems[lastIndex].children;
	if(lastChildren === null){return;}

	const lastChildId = lastId + (lastChildren.length - 1).toString();
	const lastChildItem = document.getElementById(lastChildId);

	if (lastItem === null || (lastChildren !== null && lastChildItem === null)) {
		const div = document.getElementById("waypoints") as HTMLDivElement;
		div.innerHTML = "";

		for (let i = 0, length = flightPlanItems.length; i < length; i++) {
			let waypoint;
			const itemChildren = flightPlanItems[i].children;
			if (itemChildren === null) {
				waypoint = fpl.detailedInfo.waypoints[i];
				showfpl(`index${i}children0`, waypoint, div);
			} else {
				for (let j = 0, length = itemChildren.length; j < length; j++) {
					waypoint = itemChildren[j].identifier;
					showfpl(`index${i}children${j}`, waypoint, div);
				}
			}
		}
	}
});

const vnavSystem = new AutoFunction("vnav", 1000,
	["fplinfo", "onground", "autopilot", "groundspeed", "altitude", "vnavon"],
	[],
	[], (states, inputs) => {

	const [fplinfo, onground, autopilot, groundspeed, altitude, vnavon] =
	states as [string, boolean, boolean, number, number, boolean];

	if(onground || !autopilot || vnavon || levelchange.isActive()) {
		vnavSystem.error();
		return;
	}

	updatefpl.setActive(true);

	const fpl:fplStruct = JSON.parse(fplinfo);
	const flightPlanItems = fpl.detailedInfo.flightPlanItems;

	let nextWaypoint:vnavWaypoint = {
		name:fpl.waypointName,
		index:-1,
		children:0,
		altitude:0,
		altitudeRestriction:[],
		altitudeRestrictionDistance:0,
		restrictionLocation:{lat:0, long:0}
	};

	let stage = vnavSystem.stage;

	for(let i = 0, length = flightPlanItems.length; i < length; i++) {
		const item = flightPlanItems[i];
		const itemChildren = item.children;

		if(itemChildren === null){
			nextWaypoint = nextRestriction(item, nextWaypoint, i, 0);
		}
		else{
			for(let j = 0; j < itemChildren.length; j++){
				nextWaypoint = nextRestriction(itemChildren[i], nextWaypoint, i, j);
			}
		}
	}

	const itemId = `index${nextWaypoint.index}children${nextWaypoint.children}`;

	const element = document.getElementById(itemId);
	if (element !== null && element.tagName === "INPUT"){
		const item = element as HTMLInputElement;
		const nextWaypointSpeed = item.value;

		if (nextWaypointSpeed !== "") {
			if (fpl.distanceToNext <= 10) {
				write("spd", nextWaypointSpeed);
			}
		}
	}

	if(nextWaypoint.altitudeRestriction.length === 0){
		speak("No altitude restriction, VNAV disabled");
		vnavSystem.error();
		return;
	}

	if(nextWaypoint.altitude !== -1) {
		const altDiffrence = nextWaypoint.altitude - altitude;
		const fpm = altDiffrence / fpl.eteToNext;
		write("alt", nextWaypoint.altitude);
		write("vs", fpm);
	}
	else{
		nextWaypoint.altitudeRestrictionDistance = calcLLdistance({lat:fpl.nextWaypointLatitude, long:fpl.nextWaypointLongitude}, nextWaypoint.restrictionLocation);
		const altDiffrence = nextWaypoint.altitudeRestriction[0] - altitude;
		const eteToNext = ((fpl.distanceToNext + nextWaypoint.altitudeRestrictionDistance) / groundspeed) * 60;
		const fpm = altDiffrence / eteToNext;
		write("alt", nextWaypoint.altitudeRestriction[0]);
		write("vs", fpm);
	}

	vnavSystem.stage = stage;
});

let calloutFlags:boolean[] = [];

const callout = new AutoFunction("callout", 250,
	["onrunway", "airspeed", "verticalspeed", "throttle", "gear", "altitudeAGL", "altitude"],
	["rotate", "minumuns"],
	[], (states, inputs) => {

	const [onrunway, airspeed, verticalspeed, throttle, gear, altitudeAGL, altitude] =
	states as [boolean, number, number, number, boolean, number, number];

	const [rotate, minumuns] =
	inputs as [number, number];

	// elevation is optional, so its not in the inputs
	const elevation = domInterface.read("altref")[0] as number|null;
	const alt = (elevation === null) ? altitudeAGL : altitude - elevation;

	const v1 = rotate;
	const v2 = rotate + 10;

	let stage = callout.stage;

	if(stage === 0){
		calloutFlags = [false, false, false, false, false, false, false, false];
		stage++;
	}

	if(stage === 1 && airspeed >= v1 && onrunway && throttle > 40){
		speak("V1");
		stage++;
	}
	else if(stage === 2 && airspeed >= rotate && onrunway && throttle > 40){
		speak("Rotate");
		stage++;
	}
	else if(stage === 3 && airspeed >= v2 && throttle > 40){
		speak("V2");
		stage++;
	}

	if(!speechSynthesis.speaking && verticalspeed < -500 && !gear && alt <= 1000){
		speak("Landing Gear");
	}

	if(!speechSynthesis.speaking && verticalspeed < -500 && alt <= minumuns + 10 && alt >= minumuns){
		speak("Minimums");
	}

	const alts = [1000, 500, 100, 50, 40, 30, 20, 10];

	if(verticalspeed < -500){
		for(let i = 0, length = alts.length - 1; i < length; i++){
			if(!speechSynthesis.speaking && alt <= alts[i] && alt > alts[i + 1] && !calloutFlags[i]){
				speak(alts[i].toString());
				calloutFlags[i] = true;
				break;
			}
		}
	}

	callout.stage = stage;
});

const autofunctions = [autobrakes, autoflaps, autogear, autoland, autolights, autospeed, autospoilers, autotakeoff, autotrim, callout, flypattern, flyto, goaround, levelchange, markposition, rejecttakeoff, setrunway, takeoffconfig, updatefpl, vnavSystem];