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

	if(spdControl.memory.ThrottlePID === undefined){
		spdControl.memory.ThrottlePID = new PVA(1, 10, 0, -100, 100, 20 * 2);

		// if using N1
		spdControl.memory.n1PID = new PVA(1, 5, 0, 15, 110);
		spdControl.memory.n1ThrottlePID = new PVA(2, 1, 0, -100, 100, 20 * 2);
	}

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
	const altdiff = (dom.readInput("flcalt") as number ?? 0) - altitude;

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
		flcControl.memory.vsPID = new PVA(5, 25, 0, undefined, undefined, 200, {inverted:true});
	}

	const vsPID = flcControl.memory.vsPID as PVA;

	if(flcControl.stage === 0){
		flcControl.stage++;

		const vs = await server.readState("vs") as number;
		vsPID.init(vs);
	}

	if(flcalt > altitude){
		vsPID.minValue = 0;
		vsPID.maxValue = 5000;
	}
	else{
		vsPID.minValue = -3000;
		vsPID.maxValue = 0;
	}

	const vs = vsPID.update(airspeed, spdsel, true);

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

	if(n1Control.memory.n1ThrottlePID === undefined){
		n1Control.memory.n1ThrottlePID = new PID(10, 1, 0, -100, 100, 20 * 2);
	}

	const n1ThrottlePID = n1Control.memory.n1ThrottlePID as PID;
	const throttle = n1ThrottlePID.update(n1, n1sel, n1Control.delay);

	write("spdon", false);
	write("throttle", throttle);
});
*/