class PVA {
	#lastError:number = 0;
	#last2Error:number = 0;
	#lastTime:number = 0;
	#output:number = 0;

	#cyclical:boolean;
	#inverted:boolean;

	constructor(public kp:number = 0, public kv:number = 0, public ka:number = 0, public minValue:number = -Infinity, public maxValue:number = Infinity, public maxDelta:number = Infinity, public options:{
		cyclical?:boolean,
		inverted?:boolean
	} = {}){
		this.#cyclical = options.cyclical ?? false;
		this.#inverted = options.inverted ?? false;
	}

	#modulus(value:number):number {
		const range = this.maxValue - this.minValue;
		const normalized = ((value - this.minValue) % range + range) % range + this.minValue;
		return normalized;
	}

	#clampValue(value:number, minValue:number = -Infinity, maxValue:number = Infinity):number {
		value = Math.max(value, minValue);
		value = Math.min(value, maxValue);
		return value;
	}

	#shorterDistance(value:number):number {
		const range = this.maxValue - this.minValue;

		const sign = Math.sign(value);
		const normal = this.#modulus(value);

		if(normal > range / 2){
			return (range - normal) * -sign;
		}

		return value;
	}

	#calcError(current:number, target:number):number {
		let error = target - current;

		if(this.#cyclical){
			current = this.#modulus(current);
			target = this.#modulus(target);

			error = target - current;
			error = this.#shorterDistance(error);
		}

		return error;
	}

	init(output:number = 0):void {
		this.#output = output;
		this.#lastTime = performance.now() / 1000;
	}

	update(current:number, target:number, log = false):number {
		const currentTime = performance.now() / 1000;
		const dt = currentTime - this.#lastTime;
		if(dt === 0){return this.#output;}

		this.#lastTime = currentTime;

		const error = this.#calcError(current, target);
		const velocity = (error - this.#lastError) / dt;
		const lastVelocity = (this.#lastError - this.#last2Error) / dt;
		const acceleration = (velocity - lastVelocity) / dt;

		this.#last2Error = this.#lastError;
		this.#lastError = error;

		const deltaP = this.kp * error;
		const deltaV = this.kv * velocity;
		const deltaA = this.ka * acceleration;

		let deltaOut = (deltaP + deltaV + deltaA) * dt;
		const maxDelta = this.maxDelta * dt;

		deltaOut = this.#clampValue(deltaOut, -maxDelta, maxDelta);

		if(log){
			console.clear();
			console.table({
				"State":{
					"Error":error.toFixed(2),
					"Velocity":velocity.toFixed(2),
					"Acceleration":acceleration.toFixed(2),
					"Output":this.#output.toFixed(2),
					"Time":currentTime.toFixed(2),
				},
				"Output":{
					"Error":deltaP.toFixed(2),
					"Velocity":deltaV.toFixed(2),
					"Acceleration":deltaA.toFixed(2),
					"Output":(deltaOut).toFixed(2),
					"Time":dt.toFixed(2),
				}
			});
		}

		if(this.#inverted){deltaOut = -deltaOut;}

		this.#output += deltaOut;
		this.#output = this.#clampValue(this.#output, this.minValue, this.maxValue);

		return this.#output;
	}
}