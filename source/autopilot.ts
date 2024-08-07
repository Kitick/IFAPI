const spdControl = new AutoFunction("spd", 50,
	["airspeed", "altitude", "n1", "throttle"],
	["apmaster", "spdsel"],
	[], async (states, inputs) => {

	const [airspeed, altitude, n1, throttle] =
	states as [number, number, number|null, number];

	const [apmaster, spdsel] =
	inputs as [boolean, number];

	const n1sel = dom.readInput("n1sel") ?? 110;
	const n1Value = n1 ?? throttle;

	if(spdControl.memory.throttlePID === undefined){
		spdControl.memory.throttlePID = new PVA(2, 1, 0, -100, 100, 15 * 2);
		spdControl.memory.n1PID = new PVA(1, 5, 0, 15, 110);
	}

	if(!apmaster){return;}

	const throttlePID = spdControl.memory.throttlePID as PVA;
	const n1PID = spdControl.memory.n1PID as PVA;

	if(spdControl.stage === 0){
		spdControl.stage++;

		throttlePID.init(throttle);
		n1PID.init(n1Value);
	}

	let target = spdsel;

	if(flcControl.isActive()){
		const altdiff = (dom.readInput("altsel") ?? 0) - altitude;
		target += 10 * Math.sign(altdiff);
	}

	n1PID.maxValue = n1sel;
	const targetN1 = n1PID.update(airspeed, target);
	const output = throttlePID.update(n1Value, targetN1);

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

	if(altControl.stage === 0){
		altControl.memory.althold = altsel;
	}

	if(altsel !== altControl.memory.althold){
		altControl.arm();
	}

	if(!apmaster){return;}

	const vsPID = altControl.memory.vsPID as PVA;

	if(altControl.stage === 0){
		altControl.stage++;

		const vs = await server.readState("verticalspeed");
		vsPID.init(vs);
	}

	const althold = altControl.memory.althold;

	const targetVS = vsPID.update(altitude, althold);

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
		flcControl.memory.vsPID = new PVA(100, 100, 0, undefined, undefined, 200, {inverted:true});
	}

	if(!apmaster){return;}

	altControl.setActive(true);

	const vsPID = flcControl.memory.vsPID as PVA;

	if(flcControl.stage === 0){
		flcControl.stage++;

		const vs = await server.readState("verticalspeed");
		vsPID.init(vs);
	}

	const altdiff = altsel - altitude;
	const timetolevel = vsPID.output / vsPID.maxDelta;
	const timetoalt = (altdiff / vsPID.output) * 60;

	if(Math.abs(timetolevel) >= Math.abs(timetoalt)){
		flcControl.setActive(false);
		return;
	}

	if(altsel > altitude){
		vsPID.minValue = 0;
		vsPID.maxValue = 5000;
	}
	else{
		vsPID.minValue = -3000;
		vsPID.maxValue = 0;
	}

	const targetVS = vsPID.update(airspeed, spdsel);

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