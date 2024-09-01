declare function io(): any;

type stateValue = string | number | bigint | boolean;
type dataValue = stateValue | null;
type dataMap = Map<string, dataValue>;
type inputHTML = HTMLInputElement | HTMLSelectElement;

type latlong = {lat:number, long:number};

type altType = "msl" | "agl";
type climbType = "f" | "g" | "v";
type patternLeg = "u" | "c" | "d" | "b" | "f";
type landType = "l" | "t" | "s" | "p";
type leftright = "l" | "r";

type funcCode = (states:stateValue[], inputs:stateValue[]) => void;

type StateTypes = { // Copy of Item Aliases
	[state:string]:dataValue,

	"aircraft":string,

	"throttle":number,
	"gear":boolean,
	"spoilers":number,
	"trim":number,
	"flaps":number,
	"parkingbrake":boolean,

	"airspeed":number,
	"groundspeed":number,
	"altitude":number,
	"altitudeAGL":number,
	"heading":number,
	"verticalspeed":number,

	"vnavon":boolean,
	"fplinfo":string,

	"autopilot":boolean,
	"alton":boolean,
	"vson":boolean,
	"spdon":boolean,
	"hdgon":boolean,
	"navon":boolean,
	"approach":boolean,

	"alt":number,
	"vs":number,
	"spd":number,
	"hdg":number,

	"pitch":number,
	"roll":number,
	"yaw":number,

	"latitude":number,
	"longitude":number,
	"variation":number,
	"wind":number,
	"winddir":number,

	"route":string,
	"coordinates":string,

	"flapcount":number,
	"n1":number|null,
	"onground":boolean,
	"onrunway":boolean,

	"autobrakes":number,
	"leftbrake":number,
	"rightbrake":number,

	"master":number,
	"navlights":number,
	"strobelights":number,
	"landinglights":number,
	"beaconlights":number,
};

type InputTypes = { // Copy of DOM ids
	[id:string]:dataValue,

	"flaphigh":number|null,
	"flaplow":number|null,
	"flapto":number|null,
	"cruisespd":number|null,

	"spdsel":number|null,
	"n1limit":number|null,
	"altsel":number|null,

	"rotate":number|null,
	"climbspd":number|null,
	"climbthrottle":number|null,
	"climbalt":number|null,
	"climbtype":altType,
	"flcmoderef":climbType,
	"flcinputref":number|null,
	"takeoffspool":boolean,
	"takeofflnav":boolean,

	"flytoalt":number|null,
	"flytolong":number|null,
	"flytohdg":number|null,
	"flcinput":number|null,
	"flcmode":climbType,

	"updist":number|null,
	"downwidth":number|null,
	"finallength":number|null,
	"direction":leftright,
	"leg":patternLeg,
	"approachfinal":boolean,

	"latref":number|null,
	"longref":number|null,
	"altref":number|null,
	"hdgref":number|null,

	"spdref":number|null,
	"flare":number|null,
	"touchdown":number|null,
	"vparef":number|null,
	"option":landType,
};

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