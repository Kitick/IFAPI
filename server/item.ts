class Item {
	static #aliasMap = new Map<string, {alt:string, conversion:number|null}>();

	static addAlias(name:string, alt:string, conversion:number|null = null):void {
		this.#aliasMap.set(name, {alt:alt, conversion:conversion});
	}

	#alias:string|null = null;
	#conversion:number|null = null;
	#value:dataValue = null;
	#callbacks:(() => void)[] = [];

	constructor(public id:number, public type:bufferType, public name:string){
		const alias = Item.#aliasMap.get(this.name);

		if(alias !== undefined){
			this.#alias = alias.alt;
			this.#conversion = alias.conversion;
		}
	}

	get alias():string|null {return this.#alias;}
	get conversion():number|null {return this.#conversion;}

	get value():dataValue {return this.#value;}
	set value(data:dataValue){
		if(typeof data === "number" && isNaN(data)){data = null;}
		this.#value = data;
	}

	get buffer():Buffer {
		let value = this.value;
		if(value === null){throw this.name + " value is invalid";}

		if(this.conversion !== null){
			value = value as number;
			value /= this.conversion;
		}

		let buffer:Buffer;

		switch(this.type){
			case 0: buffer = Buffer.allocUnsafe(1); buffer.writeInt8(Number(value as boolean)); break;
			case 1: buffer = Buffer.allocUnsafe(4); buffer.writeInt32LE(value as number); break;
			case 2: buffer = Buffer.allocUnsafe(4); buffer.writeFloatLE(value as number); break;
			case 3: buffer = Buffer.allocUnsafe(8); buffer.writeDoubleLE(value as number); break;
			case 4: value = value as string; buffer = Buffer.allocUnsafe(4 + value.length); buffer.writeInt32LE(value.length); buffer.write(value, 4); break;
			case 5: buffer = Buffer.allocUnsafe(8); buffer.writeBigInt64LE(value as bigint); break;
			default: throw "buffer type is invalid";
		}

		return buffer;
	}

	set buffer(data:Buffer){
		let value:dataValue;

		switch(this.type){
			case 0: value = Boolean(data.readInt8()); break;
			case 1: value = data.readInt32LE(); break;
			case 2: value = data.readFloatLE(); break;
			case 3: value = data.readDoubleLE(); break;
			case 4: value = data.toString("utf8", 4); break;
			case 5: value = data.readBigInt64LE(); break;
			default: throw "buffer type is not valid";
		}

		if(this.conversion !== null){
			value = value as number;
			value *= this.conversion;
		}

		this.value = value;
	}

	addCallback(callback = () => {}):number {
		this.#callbacks.push(callback);
		const length = this.#callbacks.length;
		return length;
	}

	callback():void {
		this.#callbacks.forEach(clientCallback => {clientCallback();});
		this.#callbacks = [];
	}
}

Item.addAlias("aircraft/0/name", "aircraft");

Item.addAlias("simulator/throttle", "throttle", -0.1); // 1000 -1000
Item.addAlias("aircraft/0/systems/landing_gear/lever_state", "gear"); // bool
Item.addAlias("aircraft/0/systems/spoilers/state", "spoilers"); // 0, 1, 2
Item.addAlias("aircraft/0/systems/axes/elevator_trim", "trim"); // 1% = 10
Item.addAlias("aircraft/0/systems/flaps/state", "flaps"); // 0, 1, 2, ...
Item.addAlias("aircraft/0/systems/parking_brake/state", "parkingbrake"); // bool

Item.addAlias("aircraft/0/indicated_airspeed", "airspeed", 1.94384);
Item.addAlias("aircraft/0/groundspeed", "groundspeed", 1.94384);
Item.addAlias("aircraft/0/altitude_msl", "altitude");
Item.addAlias("aircraft/0/altitude_agl", "altitudeAGL");
Item.addAlias("aircraft/0/heading_magnetic", "heading", 180/Math.PI);
Item.addAlias("aircraft/0/vertical_speed", "verticalspeed", 196.8504);

Item.addAlias("aircraft/0/systems/autopilot/vnav/on", "vnavon");
Item.addAlias("aircraft/0/flightplan/full_info", "fplinfo");

Item.addAlias("aircraft/0/systems/autopilot/on", "autopilot");
Item.addAlias("aircraft/0/systems/autopilot/alt/on", "alton");
Item.addAlias("aircraft/0/systems/autopilot/vs/on", "vson");
Item.addAlias("aircraft/0/systems/autopilot/spd/on", "spdon");
Item.addAlias("aircraft/0/systems/autopilot/hdg/on", "hdgon");
Item.addAlias("aircraft/0/systems/autopilot/nav/on", "navon");

Item.addAlias("aircraft/0/systems/autopilot/alt/target", "alt", 3.28084);
Item.addAlias("aircraft/0/systems/autopilot/vs/target", "vs", 3.28084);
Item.addAlias("aircraft/0/systems/autopilot/spd/target", "spd", 1.94384);
Item.addAlias("aircraft/0/systems/autopilot/hdg/target", "hdg", 180/Math.PI);

Item.addAlias("aircraft/0/systems/axes/pitch", "pitch");
Item.addAlias("aircraft/0/systems/axes/roll", "roll");
Item.addAlias("aircraft/0/systems/axes/yaw", "yaw");

Item.addAlias("aircraft/0/latitude", "latitude");
Item.addAlias("aircraft/0/longitude", "longitude");
Item.addAlias("aircraft/0/magnetic_variation", "variation", 180/Math.PI);
Item.addAlias("environment/wind_velocity", "wind", 1.94384);
Item.addAlias("environment/wind_direction_true", "winddir", 180/Math.PI);

Item.addAlias("aircraft/0/flightplan/route", "route");
Item.addAlias("aircraft/0/flightplan/coordinates", "coordinates");

Item.addAlias("aircraft/0/configuration/flaps/stops", "flapcount");
Item.addAlias("aircraft/0/systems/engines/0/n1", "n1", 100);
Item.addAlias("aircraft/0/is_on_ground", "onground");
Item.addAlias("aircraft/0/is_on_runway", "onrunway");

Item.addAlias("aircraft/0/systems/auto_brakes/command_state", "autobrakes"); // 0, 1, 2, 3
Item.addAlias("aircraft/0/systems/brakes/left/percentage", "leftbrake"); // 0-1 (float)
Item.addAlias("aircraft/0/systems/brakes/right/percentage", "rightbrake"); // 0-1 (float)

Item.addAlias("aircraft/0/systems/electrical_switch/master_switch/state", "master");
Item.addAlias("aircraft/0/systems/electrical_switch/nav_lights_switch/state", "navlights"); // 0, 1
Item.addAlias("aircraft/0/systems/electrical_switch/strobe_lights_switch/state", "strobelights"); // 0, 1
Item.addAlias("aircraft/0/systems/electrical_switch/landing_lights_switch/state", "landinglights"); // 0, 1
Item.addAlias("aircraft/0/systems/electrical_switch/beacon_lights_switch/state", "beaconlights"); // 0, 1