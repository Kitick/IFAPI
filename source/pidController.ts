class PID {
	#lastError = 0;
	#last2Error = 0;
	#output = 0;

	#cyclical:boolean;
	#inverted:boolean;

	constructor(public kp:number = 0, public ki:number = 0, public kd:number = 0, public minValue:number = -Infinity, public maxValue:number = Infinity, public maxDelta:number = Infinity, public options:{
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

	update(current:number, target:number):number {
		const error = this.#calcError(current, target);

		const deltaP = this.kp * (error - this.#lastError);
		const deltaI = this.ki * error;
		const deltaD = this.kd * (error + -2 * this.#lastError + this.#last2Error);

		let deltaOut = deltaP + deltaI + deltaD;
		deltaOut = this.#clampValue(deltaOut, -this.maxDelta, this.maxDelta);

		if(this.#inverted){deltaOut *= -1;}

		this.#lastError = error;
		this.#last2Error = this.#lastError;

		this.#output += deltaOut;
		this.#output = this.#clampValue(this.#output, this.minValue, this.maxValue);

		return this.#output;
	}
}

class PIDController {
	#pid:PID;
	#interval:NodeJS.Timeout|null = null;

	constructor(pid:PID, public input:() => Promise<number>, public output:(value:number) => void, public target:number = 0){
		this.#pid = pid;
	}

	async start(delay:number):Promise<void> {
		this.stop();

		const inputValue = await this.input();
		const outputValue = this.#pid.update(inputValue, this.target);
		this.output(outputValue);

		this.#interval = setTimeout(() => {this.start(delay);}, delay);
	}

	stop():void {
		clearInterval(this.#interval ?? undefined);
		this.#interval = null;
	}
}