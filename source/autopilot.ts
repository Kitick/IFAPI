const spdControl = new AutoFunction("spd", 50,
	["airspeed", "n1"],
	["apmaster", "spdsel"],
	[], (states, inputs) => {

	const [airspeed, n1] =
	states as [number, number|null];

	const [apmaster, spdsel] =
	inputs as [boolean, number];

	const n1sel = domInterface.read("n1sel")[0] as number|null;

	if(!apmaster){
		spdControl.error();
		return;
	}

	if(spdControl.memory.spdPID === undefined){
		spdControl.memory.spdPID = new PID(30, 1, 0, -100, 100, 20 * 2);

		// if using N1
		spdControl.memory.n1PID = new PID(10, 0.1, 0, 15);
		spdControl.memory.throttlePID = new PID(10, 1, 0, -100, 100, 20 * 2);
	}

	let throttle:number;

	if(n1sel !== null && n1 !== null){
		const n1PID = spdControl.memory.n1PID as PID;
		const throttlePID = spdControl.memory.throttlePID as PID;

		n1PID.maxValue = n1sel;

		const targetN1 = n1PID.update(airspeed, spdsel, spdControl.delay);
		throttle = throttlePID.update(n1, targetN1, spdControl.delay);
	}
	else{
		const spdPID = spdControl.memory.spdPID as PID;
		throttle = spdPID.update(airspeed, spdsel, spdControl.delay);
	}

	write("spdon", false);
	write("spd", spdsel);
	write("throttle", throttle);
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
	["airspeed", "altitude", "alton", "vson"],
	["apmaster", "spdsel", "flcalt"],
	[], (states, inputs) => {

	const [airspeed, altitude, alton, vson] =
	states as [number, number, boolean, boolean];

	const [apmaster, spdsel, flcalt] =
	inputs as [boolean, number, number];

	if(!apmaster){
		flcControl.error();
		return;
	}

	if(flcControl.memory.vsPID === undefined){
		flcControl.memory.vsPID = new PID(100, 5, 0, undefined, undefined, 200, {inverted:true});
	}

	const vsPID = flcControl.memory.vsPID as PID;

	if(flcalt > altitude){
		vsPID.minValue = 0;
		vsPID.maxValue = 5000;
	}
	else{
		vsPID.minValue = -3000;
		vsPID.maxValue = 0;
	}

	const vs = vsPID.update(airspeed, spdsel, flcControl.delay);

	write("spdon", false);
	if(alton){write("alton", false);}
	if(!vson){write("vson", true);}

	write("spd", spdsel);
	write("alt", flcalt);
	write("vs", vs);
});

/*
speed via throttle | spd
speed via vs | flc
alt via vs | vs

speed via n1 | n1
n1 via throttle | n1
*/