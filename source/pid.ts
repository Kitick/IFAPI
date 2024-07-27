class PVA {
	lastError = 0;
	last2Error = 0;
	output = 0;

	cyclical:boolean;
	inverted:boolean;

	constructor(public kp:number = 0, public kv:number = 0, public ka:number = 0, public minValue:number = -Infinity, public maxValue:number = Infinity, public maxDelta:number = Infinity, public options:{
		cyclical?:boolean,
		inverted?:boolean
	} = {}){
		this.cyclical = options.cyclical ?? false;
		this.inverted = options.inverted ?? false;
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

		if(this.cyclical){
			current = this.#modulus(current);
			target = this.#modulus(target);

			error = target - current;
			error = this.#shorterDistance(error);
		}

		return error;
	}

	update(current:number, target:number, dt:number = 1, ms:boolean = false):number {
		if(ms){dt /= 1000};

		const error = this.#calcError(current, target);
		const velocity = (error - this.lastError);
		const lastVelocity = (this.lastError - this.last2Error);
		const accel = (velocity - lastVelocity);

		const deltaP = this.kp * error * dt;
		const deltaV = this.kv * velocity * dt;
		const deltaA = this.ka * accel * dt;
		const maxDelta = this.maxDelta * dt;

		let deltaOut = deltaP + deltaV + deltaA;
		deltaOut = this.#clampValue(deltaOut, -maxDelta, maxDelta);

		if(this.inverted){deltaOut = -deltaOut;}

		this.last2Error = this.lastError;
		this.lastError = error;

		this.output += deltaOut;
		this.output = this.#clampValue(this.output, this.minValue, this.maxValue);

		return this.output;
	}
}