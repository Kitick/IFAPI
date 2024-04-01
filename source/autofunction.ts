class Autofunction {
    #button:HTMLElement;
    #timeout:NodeJS.Timeout|null = null;
    #states:dataMap = new Map();
    #inputs:string[] = [];
    #dependents:Autofunction[] = [];
    #numStates = 0;
    #validStates = 0;
    #active = false;
    #armed = false;
    #code:funcCode;

    stage = 0;

    static cache = new StateCache();

    constructor(button:string, public delay:number, inputs:string[], states:string[], dependents:Autofunction[], code:funcCode){
        const element = document.getElementById(button);
        if(element === null){throw "Element " + button + " is undefined";}

        this.#button = element as HTMLElement;
        this.#button.addEventListener("click", () => {dependencyCheck(button); this.setActive();});
        this.#setButton();

        this.#numStates = states.length;
        this.#inputs = inputs;
        this.#dependents = dependents;
        this.#code = code;

        this.#inputs.forEach(input => {
            let element = document.getElementById(input);
            if(element === null || element.tagName !== "INPUT" || (element as HTMLInputElement).type !== "number"){return;}

            const inputElement = element as HTMLInputElement;
            const tooltip = document.getElementById("tooltip") as HTMLHeadingElement;

            inputElement.addEventListener("mouseenter", () => {tooltip.innerText = inputElement.placeholder;});
            inputElement.addEventListener("mouseout", () => {tooltip.innerText = "Tooltip";});
        });

        states.forEach(state => {
            this.#states.set(state, null);
        });

        Autofunction.cache.addArray(inputs);
    }

    getInputs(){return this.#inputs}
    getDependents(){return this.#dependents;}

    isActive(){return this.#active;}

    setActive(state = !this.#active):void {
        if(this.#active === state){return;}

        this.#active = state;
        this.#setButton();

        if(this.#active){
            this.stage = 0;
            this.#run();
            return;
        }
        else if(this.#timeout !== null){
            clearTimeout(this.#timeout);
            this.#timeout = null;
        }
    }

    #setButton(state:string = ""):void {
        const classList = this.#button.classList;
        const states = ["off", "active", "armed", "error"];

        if(state === ""){
            state = this.isActive() ? "active" : "off";
        }

        if(classList.contains(state)){return;}

        states.forEach(option => {
            classList.remove(option);
        });

        classList.add(state);
    }

    #run():void {
        const valid = this.validateInputs(true);

        if(!valid){this.error(); return;}

        this.#readStates(() => {
            const wasArmed = this.#armed;
            this.#armed = false;

            this.#code({
                states:this.#states,
                inputs:Autofunction.cache.loadArray(this.#inputs)
            });

            if(!this.#armed && wasArmed){
                this.#setButton();
            }

            if(this.delay === -1){
                this.setActive(false);
                return;
            }

            if(this.#active){
                this.#timeout = setTimeout(() => {this.#timeout = null; this.#run();}, this.delay);
            }
        });
    }

    #readStates(callback = () => {}):void {
        if(this.#numStates === 0){
            callback();
            return;
        }

        this.#validStates = 0;
        this.#states.forEach((value, state) => {
            read(state, returnValue => {this.#stateReturn(state, returnValue, callback);});
        });
    }

    #stateReturn(state:string, value:stateValue, callback = () => {}):void {
        this.#states.set(state, value);
        this.#validStates++;

        if(this.#validStates === this.#numStates){callback();}
    }

    validateInputs(doError = false):boolean {
        let valid = Autofunction.cache.isValidArray(this.#inputs, doError);

        this.#dependents.forEach(dependent => {
            valid = dependent.validateInputs() && valid;
        });

        return valid;
    }

    arm():void {
        this.#armed = true;
        this.#setButton("armed");
    }

    error():void {
        this.setActive(false);
        this.#setButton("error");
        setTimeout(() => {this.#setButton();}, 2000);
    }
}