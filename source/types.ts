declare function io(): any;

type stateValue = string | number | bigint | boolean;
type dataValue = stateValue | null;
type dataMap = Map<string, dataValue>;
type inputHTML = HTMLInputElement | HTMLSelectElement;

type latlong = {lat:number, long:number};

type altType = "msl" | "agl";
type climbType = "f" | "g" | "v";
type patternLeg = "u" | "c" | "d" | "b" | "f";

type funcCode = (states:stateValue[], inputs:stateValue[]) => void;

type fplStruct = {
	bearing:number,
	desiredTrack:number,
	distanceToDestination:number,
	distanceToNext:number,
	etaToDestination:number,
	etaToNext:number,
	eteToDestination:number,
	eteToNext:number,
	track:number,
	waypointName:string | null,
	icao:string | null,
	nextWaypointLatitude:number,
	nextWaypointLongitude:number,
	xTrackErrorDistance:number,
	xTrackErrorAngle:number,
	totalDistance:number,
	nextWaypointIndex:number,
	result:number,
	type:string,

	detailedInfo:{
		flightPlanId:string,
		flightId:string,
		flightPlanType:number,
		lastUpdate:string,
		waypoints:string[],
		flightPlanItems:fplItemStruct[]
	}
};

type fplItemStruct = {
	name:string,
	type:number,
	children:fplItemStruct[] | null,
	identifier:string,
	altitude:number,
	location:{
		Latitude:number,
		Longitude:number,
		AltitudeLight:number
	};
};

type vnavWaypoint = {
	name:string | null,
	index:number,
	children:number,
	altitude:number,
	altitudeRestriction:number[],
	altitudeRestrictionDistance:number,
	restrictionLocation:latlong
};

/*
let states:stateTypes = {
	"airspeed":null,
	"altitude":null,
	"spdon":null,
	"alton":null
};

function readStateType<K extends keyof stateTypes>(key: K):stateTypes[K]|null {
	return states[key];
}

let value = readStateType("groundspeed");

value;
*/

/*
type stateTypes = {
	[key:string]:stateValue

	"airspeed":number,
	"altitude":number,
	"spdon":boolean,
	"alton":boolean,
};
*/