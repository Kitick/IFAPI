"use strict";

function toggle(id){
	const element = document.getElementById(id);
	element.hidden = !element.hidden;
}

function makeSection(id, desc, usage){
	const section = document.getElementById(id);

	const descHeader = document.createElement("h2");
	const usageHeader = document.createElement("h2");
	const descP = document.createElement("p");
	const usageP = document.createElement("p");
	const br = document.createElement("br");

	descHeader.innerText = "Description";
	usageHeader.innerText = "Usage";

	descP.innerText = desc;
	usageP.innerText = usage;

	section.appendChild(descHeader);
	section.appendChild(descP);
	section.appendChild(br);
	section.appendChild(usageHeader);
	section.appendChild(usageP);
}

makeSection("trim",
	`Autotrim will detect control pressure and slowly move the elevator trim inorder to center the indecation.\n
	This system is most useful when using an autopilot, and when it is disengaged the aircrafts pitch will not change.`,

	`Activate at any time, and it will trim the aircraft when in the air.\n
	When flying manualy you need to slowly let go of any control inputs as it trims them, otherwise it may overtrim the aircraft.`
);

makeSection("gear",
	`Autogear will retract and lower the gear at a predefined altitude and climb/decent.`,

	`Activate at any time, and it will manage the gear.`
);

makeSection("lights",
	`Autolights manages lights depending on aircraft state.\n
	When off the runway, it will activate taxilights and beacon. When on a ruwnay, all lights besides taxi is on.\n
	When reaching a specific altitude, landing lights will be turned off. And turned back on for landing.`,

	`Activate at any time, and it will manage the lights.`
);

makeSection("brakes",
	`Autobrakes will auto enable max brakes for takeoff, and medium brakes for landing, and off otherwise.`,

	`Activate at any time, and it will manage the autobrakes.`
);

makeSection("flaps",
	`Autoflaps will automatically deploy and retract flaps based on the aircrafts speed within the specified range.\n
	The system will interpolate inbetween settings as linear.\n
	Takeoff flap will be deployed on a runway, and flaps will never reverse direction of travel.\n
	Example, when decending, flaps will never retract once deployed. Likewise for climbing.`,

	`Activate at any time, and it will manage the flaps.\n
	The FULL FLAPS speed is the speed at witch the aircraft would have full flaps deployed.
	If you want the landing flap to be less than the max available, then set the full flaps lower than your Vref.\n
	The CLEAN FLAPS speed is the speed at witch all flaps/slats are stowed.\n
	The TAKEOFF FLAP is the notch number of the flap to use for takeoff. This is NOT the degree of the flap.`
);