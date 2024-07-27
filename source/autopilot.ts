const spdControl = new AutoFunction("spd", 50,
	["airspeed", "altitude", "n1"],
	["apmaster", "spdsel"],
	[], async (states, inputs) => {

	const [airspeed, altitude, n1] =
	states as [number, number, number|null];

	const [apmaster, spdsel] =
	inputs as [boolean, number];

	const n1sel = dom.readInput("n1sel") as number|null;

	if(!apmaster){
		spdControl.error();
		return;
	}

	if(spdControl.memory.spdPID === undefined){
		spdControl.memory.spdPID = new PVA(1, 50, 0, -100, 100, 20 * 2);

		// if using N1
		spdControl.memory.n1PID = new PVA(0.1, 10, 0, 15);
		spdControl.memory.throttlePID = new PVA(1, 10, 0, -100, 100, 20 * 2);
	}

	if(spdControl.stage === 0){
		spdControl.stage++;
		const throttle = await server.readState("throttle") as number;

		spdControl.memory.spdPID.output = throttle;
		spdControl.memory.throttlePID.output = throttle;
		spdControl.memory.n1PID.output = n1;
	}

	console.log(spdControl.memory.spdPID.lastError, spdControl.memory.spdPID.last2Error);

	let target = spdsel;
	const altdiff = (dom.readInput("flcalt") as number ?? 0) - altitude;
	if(flcControl.isActive() && Math.abs(altdiff) > 100){
		target += 5 * Math.sign(altdiff);
	}

	let throttle:number;

	if(n1sel !== null && n1 !== null){
		const n1PID = spdControl.memory.n1PID as PVA;
		const throttlePID = spdControl.memory.throttlePID as PVA;

		n1PID.maxValue = n1sel;

		const targetN1 = n1PID.update(airspeed, target, spdControl.delay, true);
		throttle = throttlePID.update(n1, targetN1, spdControl.delay, true);
	}
	else{
		const spdPID = spdControl.memory.spdPID as PVA;
		throttle = spdPID.update(airspeed, target, spdControl.delay, true);
	}

	server.setState("spdon", false);
	server.setState("spd", spdsel);

	server.writeState("throttle", throttle);
});

/*
const n1Control = new AutoFunction("n1", 50,
	["n1"],
	["apmaster", "n1sel"],
	[], (states, inputs) => {

	const [n1] =
	states as [number];

	const [apmaster, n1sel] =
	inputs as [boolean, number];

	if(!apmaster){
		n1Control.error();
		return;
	}

	if(n1Control.memory.throttlePID === undefined){
		n1Control.memory.throttlePID = new PID(10, 1, 0, -100, 100, 20 * 2);
	}

	const throttlePID = n1Control.memory.throttlePID as PID;
	const throttle = throttlePID.update(n1, n1sel, n1Control.delay);

	write("spdon", false);
	write("throttle", throttle);
});
*/
const flcControl = new AutoFunction("flc", 100,
	["airspeed", "altitude"],
	["apmaster", "spdsel", "flcalt"],
	[], async (states, inputs) => {

	const [airspeed, altitude] =
	states as [number, number];

	const [apmaster, spdsel, flcalt] =
	inputs as [boolean, number, number];

	if(!apmaster){
		flcControl.error();
		return;
	}

	if(flcControl.memory.vsPID === undefined){
		flcControl.memory.vsPID = new PVA(5, 100, 0, undefined, undefined, 200, {inverted:true});
	}

	if(flcControl.stage === 0){
		flcControl.stage++;

		const vs = await server.readState("vs") as number;
		flcControl.memory.vsPID.output = vs;
	}

	const vsPID = flcControl.memory.vsPID as PVA;

	if(flcalt > altitude){
		vsPID.minValue = 0;
		vsPID.maxValue = 5000;
	}
	else{
		vsPID.minValue = -3000;
		vsPID.maxValue = 0;
	}

	const vs = vsPID.update(airspeed, spdsel, flcControl.delay, true);

	server.setState("spdon", false);
	server.setState("alton", false);
	server.setState("vson", true);

	server.setState("spd", spdsel);
	server.setState("alt", flcalt);

	server.writeState("vs", vs);
});

/*
speed via throttle | spd
speed via vs | flc
alt via vs | vs

speed via n1 | n1
n1 via throttle | n1
*/