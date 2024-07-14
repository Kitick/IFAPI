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
		spdControl.memory.spdPID = new PID(30, 1, 0, -100, 100);

		// if using N1
		spdControl.memory.n1PID = new PID(5, 0.1, 0, 15);
		spdControl.memory.throttlePID = new PID(10, 1, 0, -100, 100);
	}

	const throttleSpeed = 20 * (spdControl.delay / 1000) * 2; // %/s
	spdControl.memory.spdPID.maxDelta = throttleSpeed;
	spdControl.memory.throttlePID.maxDelta = throttleSpeed;

	let throttle:number;

	if(n1sel !== null && n1 !== null){
		const n1PID = spdControl.memory.n1PID as PID;
		const throttlePID = spdControl.memory.throttlePID as PID;

		n1PID.maxValue = n1sel;

		const targetN1 = n1PID.update(airspeed, spdsel);
		throttle = throttlePID.update(n1, targetN1);
	}
	else{
		const spdPID = spdControl.memory.spdPID as PID;
		throttle = spdPID.update(airspeed, spdsel);
	}

	write("spdon", false);
	write("spd", spdsel);
	write("throttle", throttle);
});