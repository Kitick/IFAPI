const spdControl = new AutoFunction("spd", 50,
	["airspeed", "altitude", "n1"],
	["apmaster", "spdsel"],
	[], async (states, inputs) => {

	const [airspeed, altitude, n1] =
	states as [number, number, number|null];

	const [apmaster, spdsel] =
	inputs as [boolean, number];

	const n1sel = dom.readInput("n1sel") as number|null;

	if(spdControl.memory.ThrottlePID === undefined){
		spdControl.memory.ThrottlePID = new PVA(1, 10, 0, -100, 100, 20 * 2);

		// if using N1
		spdControl.memory.n1PID = new PVA(1, 5, 0, 15, 110);
		spdControl.memory.n1ThrottlePID = new PVA(2, 1, 0, -100, 100, 20 * 2);
	}

	if(!apmaster){return;}

	const ThrottlePID = spdControl.memory.ThrottlePID as PVA;
	const n1PID = spdControl.memory.n1PID as PVA;
	const n1ThrottlePID = spdControl.memory.n1ThrottlePID as PVA;

	const usingN1 = n1sel !== null && n1 !== null;

	if(spdControl.stage === 0){
		spdControl.stage++;

		const throttle = await server.readState("throttle") as number;
		ThrottlePID.init(throttle);

	}
	if(spdControl.stage === 1 && usingN1){
		spdControl.stage++;

		const throttle = await server.readState("throttle") as number;
		n1ThrottlePID.init(throttle);
		n1PID.init(Number(n1));
	}

	let target = spdsel;
	const altdiff = (dom.readInput("altsel") as number ?? 0) - altitude;

	if(flcControl.isActive() && Math.abs(altdiff) > 100){
		target += 10 * Math.sign(altdiff);
	}

	let output:number;

	if(usingN1){
		n1PID.maxValue = n1sel;

		const targetN1 = n1PID.update(airspeed, target);
		output = n1ThrottlePID.update(n1, targetN1);
	}
	else{
		output = ThrottlePID.update(airspeed, target);
	}

	server.setState("spdon", false);
	server.setState("spd", spdsel);

	server.writeState("throttle", output);
});

const altControl = new AutoFunction("alt", 100,
	["altitude"],
	["apmaster", "altsel"],
	[], async (states, inputs) => {

	const [altitude] =
	states as [number];

	const [apmaster, altsel] =
	inputs as [boolean, number];

	if(altControl.memory.vsPID === undefined){
		altControl.memory.vsPID = new PVA(1, 15, 0, -2000, 2000, 200);
	}

	if(flcControl.isActive()){
		altControl.stage = 0;
		altControl.arm();
		return;
	}

	if(!apmaster){return;}

	const vsPID = altControl.memory.vsPID as PVA;

	if(altControl.stage === 0){
		altControl.stage++;

		altControl.memory.althold = altsel;

		const vs = await server.readState("verticalspeed") as number;
		vsPID.init(vs);
	}

	const althold = altControl.memory.althold;

	const targetVS = vsPID.update(altitude, althold, true);

	server.setState("alton", false);
	server.setState("vson", true);
	server.setState("alt", althold);

	server.writeState("vs", targetVS);
});

const flcControl = new AutoFunction("flc", 100,
	["airspeed", "altitude"],
	["apmaster", "spdsel", "altsel"],
	[], async (states, inputs) => {

	const [airspeed, altitude] =
	states as [number, number];

	const [apmaster, spdsel, altsel] =
	inputs as [boolean, number, number];

	if(flcControl.memory.vsPID === undefined){
		flcControl.memory.vsPID = new PVA(20, 50, 0, undefined, undefined, 200, {inverted:true});
	}

	if(!apmaster){return;}

	altControl.setActive(true);

	const vsPID = flcControl.memory.vsPID as PVA;

	if(flcControl.stage === 0){
		flcControl.stage++;

		const vs = await server.readState("verticalspeed") as number;
		vsPID.init(vs);
	}

	if(altsel > altitude){
		vsPID.minValue = 0;
		vsPID.maxValue = 5000;
	}
	else{
		vsPID.minValue = -3000;
		vsPID.maxValue = 0;
	}

	const targetVS = vsPID.update(airspeed, spdsel, true);

	server.setState("spdon", false);
	server.setState("alton", false);
	server.setState("vson", true);

	server.setState("spd", spdsel);
	server.setState("alt", altsel);

	server.writeState("vs", targetVS);
});

/*
speed via throttle | spd
speed via vs | flc
alt via vs | vs

speed via n1 | n1
n1 via throttle | n1
*/