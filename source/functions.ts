const autotrim = new Autofunction("trim", 1000, [], ["pitch", "trim", "onground"], [], data => {
    const states = data.states;

    const onground = states.get("onground") as boolean;
    const pitch = states.get("pitch") as number;
    const trim = states.get("trim") as number;

    if(onground){
        autotrim.arm();
        return;
    }

    const deadzone = 2;
    let mod = 10;

    if(Math.abs(pitch) < 10){
        mod = 1;
    }
    else if(Math.abs(pitch) < 50){
        mod = 5;
    }

    if(Math.abs(pitch) >= deadzone){
        let newTrim = trim + mod * Math.sign(pitch);
        newTrim = Math.round(newTrim / mod) * mod;

        write("trim", newTrim);
    }
});

const autolights = new Autofunction("lights", 2000, [], ["altitudeAGL", "onground", "onrunway", "gear"], [], data => {
    const states = data.states;

    const altitudeAGL = states.get("altitudeAGL") as number;
    const onground = states.get("onground") as boolean;
    const onrunway = states.get("onrunway") as boolean;
    const gear = states.get("gear") as boolean;

    write("master", true);
    write("beaconlights", true);
    write("navlights", true);

    if(onground){
        write("strobelights", onrunway);
        write("landinglights", onrunway);
    }
    else{
        write("strobelights", true);

        if(altitudeAGL < 1000 && gear){write("landinglights", true);}
        else{write("landinglights", false);}
    }
});

const autogear = new Autofunction("gear", 1000, [], ["gear", "altitudeAGL", "verticalspeed"], [], data => {
    const states = data.states;

    const gear = states.get("gear") as boolean;
    const altitudeAGL = states.get("altitudeAGL") as number;
    const verticalspeed = states.get("verticalspeed") as number;

    let newState = gear;

    if(altitudeAGL < 100 || (verticalspeed <= -500 && altitudeAGL < 1500)){
        newState = true;
    }
    else if(verticalspeed >= 500 || altitudeAGL >= 2000){
        newState = false;
    }

    // readcommand to use the animation
    if(newState !== gear){read("commands/LandingGear");}
});

const autobrakes = new Autofunction("autobrakes", 1000, [], ["leftbrake", "rightbrake", "autobrakes", "onground", "onrunway", "groundspeed"], [], data => {
    const states = data.states;

    const leftbrake = states.get("leftbrake") as number;
    const rightbrake = states.get("rightbrake") as number;
    const autobrakes = states.get("autobrakes") as number;
    const onground = states.get("onground") as boolean;
    const onrunway = states.get("onrunway") as boolean;
    const groundspeed = states.get("groundspeed") as number;

    let newBrakes = autobrakes;

    if(onground && !onrunway){newBrakes = 0;}
    else if(!onground){newBrakes = 2;}
    else if(onrunway){newBrakes = 3;}

    if(onground && groundspeed > 30 && (leftbrake > 0.3 || rightbrake > 0.3)){
        newBrakes = 0;
    }

    if(newBrakes !== autobrakes){write("autobrakes", newBrakes);}
});

const autoflaps = new Autofunction("flaps", 1000, ["flaplow", "flaphigh", "flapto"], ["flaps", "airspeed", "altitudeAGL", "verticalspeed", "flapcount", "onground", "onrunway"], [], data => {
    const inputs = data.inputs;
    const states = data.states;

    const flaplow = inputs.get("flaplow") as number;
    const flaphigh = inputs.get("flaphigh") as number;
    const flapto = inputs.get("flapto") as number;

    const flaps = states.get("flaps") as number;
    const airspeed = states.get("airspeed") as number;
    const altitudeAGL = states.get("altitudeAGL") as number;
    const verticalspeed = states.get("verticalspeed") as number;
    const flapcount = states.get("flapcount") as number;
    const onground = states.get("onground") as boolean;
    const onrunway = states.get("onrunway") as boolean;

    if((flapto < 0 || flapto > flapcount - 1) || (flaphigh < flaplow)){
        autoflaps.error();
        return;
    }

    let newFlaps = flaps;

    if(onground){
        if(onrunway){newFlaps = flapto;}
        else{newFlaps = 0;}
    }
    else if(altitudeAGL >= 250){
        const count = flapcount - 1;

        const mod = (flaphigh - flaplow) / count;
        newFlaps = Math.round((flaphigh - airspeed) / mod);

        newFlaps = Math.max(newFlaps, 0);
        newFlaps = Math.min(newFlaps, count);
    }

    if((verticalspeed >= 500 && newFlaps > flaps) || (verticalspeed <= -500 && newFlaps < flaps)){
        newFlaps = flaps;
    }

    if(newFlaps !== flaps){write("flaps", newFlaps);}
});

const autospoilers = new Autofunction("spoilers", 1000, [], ["spoilers", "airspeed", "spd", "altitude", "altitudeAGL", "onrunway", "onground"], [], data => {
    const states = data.states;

    const spoilers = states.get("spoilers") as number;
    const airspeed = states.get("airspeed") as number;
    const spd = states.get("spd") as number;
    const altitude = states.get("altitude") as number;
    const altitudeAGL = states.get("altitudeAGL") as number;
    const onrunway = states.get("onrunway") as boolean;
    const onground = states.get("onground") as boolean;

    let newSpoilers = 0;

    if(onrunway || (!onground && altitudeAGL < 1000)){
        newSpoilers = 2;
    }
    else if(airspeed - spd >= 20 && altitude < 28000){
        newSpoilers = 1;
    }

    if(newSpoilers !== spoilers){write("spoilers", newSpoilers);}
});

const autospeed = new Autofunction("autospeed", 1000, ["latref", "longref", "climbspd", "spdref", "cruisespd"], ["onground", "airspeed", "verticalspeed", "altitudeAGL", "altitude", "latitude", "longitude", "spd"], [], data => {
    const inputs = data.inputs;
    const states = data.states;

    const latref = inputs.get("latref") as number;
    const longref = inputs.get("longref") as number;
    const climbspd = inputs.get("climbspd") as number;
    const spdref = inputs.get("spdref") as number;
    const cruisespd = inputs.get("cruisespd") as number;

    const onground = states.get("onground") as boolean;
    const airspeed = states.get("airspeed") as number;
    const verticalspeed = states.get("verticalspeed") as number;
    const altitudeAGL = states.get("altitudeAGL") as number;
    const altitude = states.get("altitude") as number;
    const latitude = states.get("latitude") as number;
    const longitude = states.get("longitude") as number;
    const spd = states.get("spd") as number;

    if(onground){
        autospeed.arm();
        return;
    }

    // elevation os optional
    const elevation = Autofunction.cache.load("altref") as number|null;
    //const cruisespd = autofunction.cache.load("cruisespd").get("cruisespd") as number|null;
    const alt = (elevation === null) ? altitudeAGL : altitude - elevation;

    if(autoland.isActive()){
        const distance = calcLLdistance({lat:latitude, long:longitude}, {lat:latref, long:longref});
        
        let speed = (distance - 2.5) * 10 + spdref;
        speed = Math.min(speed, spd);
        speed = Math.round(speed / 10) * 10;
        speed = Math.max(speed, spdref);

        write("spd", speed);
    }
    else if(flypattern.isActive()){

    }
    else if(autotakeoff.isActive()){
        if(verticalspeed > 500 && alt <= 10000 && climbspd - airspeed < 10){
            write("spd", climbspd);
            write("spdon", true);
        }
    }

    if(verticalspeed < -500 && alt <= 12000 && alt >= 10000){
        write("spd", 250);
    }

    if(cruisespd !== null && verticalspeed > 500 && alt > 10000){
        write("spd", cruisespd);
    }
});

const levelchange = new Autofunction("levelchange", 1000, ["flcinput", "flcmode"], ["airspeed", "altitude", "alt", "vs"], [], data => {
    const inputs = data.inputs;
    const states = data.states;

    const flcinput = inputs.get("flcinput") as number;
    const flcmode = inputs.get("flcmode") as climbType;

    const airspeed = states.get("airspeed") as number;
    const altitude = states.get("altitude") as number;
    const alt = states.get("alt") as number;
    const vs = states.get("vs") as number;

    let output = flcinput;

    const diffrence = alt - altitude;

    if(Math.abs(diffrence) < 100){
        levelchange.setActive(false);
        return;
    }

    if(flcmode === "v"){
        output = 6076.12 * Math.tan(output * toRad);
    }

    if(flcmode !== "f"){
        output *= Math.sign(diffrence) * (airspeed / 60);
    }

    output = Math.round(output / 100) * 100;

    if(output !== vs){write("vs", output);}
});

const markposition = new Autofunction("markposition", -1, [], ["latitude", "longitude", "altitude", "heading"], [], data => {
    const states = data.states;

    const latitude = states.get("latitude") as number;
    const longitude = states.get("longitude") as number;
    const altitude = states.get("altitude") as number;
    const heading = states.get("heading") as number;

    Autofunction.cache.save("latref", latitude);
    Autofunction.cache.save("longref", longitude);
    Autofunction.cache.save("hdgref", Math.round(heading));
    Autofunction.cache.save("altref", Math.round(altitude));
});

const setrunway = new Autofunction("setrunway", -1, [], ["route", "coordinates"], [], data => {
    const states = data.states;

    const route = states.get("route") as string;
    const coordinates = states.get("coordinates") as string;

    const fpl = route.split(",");
    let rwIndex = -1;

    for(let i = 0, length = fpl.length; i < length; i++){
        if(fpl[i].search(/RW\d\d.*/) === 0){
            rwIndex = i;
            break;
        }
    }

    if(rwIndex === -1){
        setrunway.error();
        return;
    }

    const runway = fpl[rwIndex][2] + fpl[rwIndex][3] + "0";
    const runwayCoords = coordinates.split(" ")[rwIndex].split(",");

    const latref = parseFloat(runwayCoords[0]);
    const longref = parseFloat(runwayCoords[1]);
    const hdgref = parseInt(runway);

    Autofunction.cache.save("latref", latref);
    Autofunction.cache.save("longref", longref);
    Autofunction.cache.save("hdgref", hdgref);
});

const rejecttakeoff = new Autofunction("reject", -1, [], ["onrunway"], [], data => {
    const states = data.states;

    const onrunway = states.get("onrunway") as boolean;

    if(!onrunway){
        rejecttakeoff.error();
        console.log("Not on a runway");
        return;
    }

    if(autotakeoff.isActive()){
        autotakeoff.error();
    }

    write("throttle", -100);
});

const takeoffconfig = new Autofunction("takeoffconfig", -1, ["climbalt", "climbtype"], ["onground", "heading", "altitude"], [], data => {
    const inputs = data.inputs;
    const states = data.states;

    const climbalt = inputs.get("climbalt") as number;
    const climbtype = inputs.get("climbtype") as altType;

    const onground = states.get("onground") as boolean;
    const heading = states.get("heading") as number;
    const altitude = states.get("altitude") as number;

    if(!onground){
        takeoffconfig.error();
        console.log("Not on the ground");
        return;
    }

    let alt = climbalt;
    if(climbtype === "agl"){
        const agl = Math.round(altitude / 100) * 100;
        alt += agl;
    }

    write("alt", alt);
    write("hdg", heading);
    write("vs", 0);

    write("parkingbrake", false);
});

const autotakeoff = new Autofunction("autotakeoff", 500, ["rotate", "climbspd", "climbthrottle", "takeoffspool", "takeofflnav", "takeoffvnav"], ["onrunway", "n1", "airspeed"], [takeoffconfig, levelchange, rejecttakeoff], data => {
    const inputs = data.inputs;
    const states = data.states;

    const rotate = inputs.get("rotate") as number;
    const climbspd = inputs.get("climbspd") as number;
    const climbthrottle = inputs.get("climbthrottle") as number;
    const takeoffspool = inputs.get("takeoffspool") as boolean;
    const takeofflnav = inputs.get("takeofflnav") as boolean;
    const takeoffvnav = inputs.get("takeoffvnav") as boolean;

    const onrunway = states.get("onrunway") as boolean;
    const n1 = states.get("n1") as number|null;
    const airspeed = states.get("airspeed") as number;

    const throttle = 2 * climbthrottle - 100;

    let stage = autotakeoff.stage;

    if(stage === 0){
        if(!onrunway){
            autotakeoff.error();
            console.log("Not on a runway");
            return;
        }

        takeoffconfig.setActive(true);
        levelchange.setActive(false);

        write("spd", climbspd);

        write("autopilot", true);
        write("alton", true);
        write("vson", false);
        write("hdgon", true);

        const initalThrottle = takeoffspool ? -20 : throttle;
        write("throttle", initalThrottle);

        stage++;
    }
    else if(stage === 1){
        write("vson", true);

        if(!takeoffspool){
            stage++;
        }
        else if(n1 === null){
            write("throttle", throttle);
            stage++;
        }
        else if(n1 >= 40){
            write("throttle", throttle);
            stage++;
        }
    }
    else if(stage === 2){
        if(airspeed >= rotate){
            levelchange.setActive(true);
            stage++;
        }
    }
    else if(stage === 3){
        if(climbspd - airspeed < 10){
            if(takeofflnav){write("navon", true);}
            if(takeoffvnav){vnavSystem.setActive(true);}

            write("spdon", true);
            stage++;
        }
    }
    else{
        autotakeoff.setActive(false);
    }

    autotakeoff.stage = stage;
});

const flyto = new Autofunction("flyto", 1000, ["flytolat", "flytolong", "flytohdg"], ["latitude", "longitude", "variation", "groundspeed", "wind", "winddir"], [], data => {
    const inputs = data.inputs;
    const states = data.states;

    const flytolat = inputs.get("flytolat") as number;
    const flytolong = inputs.get("flytolong") as number;
    const flytohdg = inputs.get("flytohdg") as number;

    const latitude = states.get("latitude") as number;
    const longitude = states.get("longitude") as number;
    const variation = states.get("variation") as number;
    const groundspeed = states.get("groundspeed") as number;
    const wind = states.get("wind") as number;
    const winddir = states.get("winddir") as number;

    const distance = calcLLdistance({lat:latitude, long:longitude}, {lat:flytolat, long:flytolong});

    if(distance < 1){
        flyto.setActive(false);
        return;
    }

    // Direct To
    const deltaY = 60 * (flytolat - latitude);
    const deltaX = 60 * (flytolong - longitude) * Math.cos((latitude + flytolat) * 0.5 * toRad);
    let course = cyclical(Math.atan2(deltaX, deltaY) * toDeg - variation);

    const hdgTarget = cyclical(flytohdg);
    let diffrence = hdgTarget - course;

    if(diffrence > 180){diffrence -= 360;}
    else if(diffrence < -180){diffrence += 360;}

    // Course Correction
    if(Math.abs(diffrence) < 5){course -= -0.1 * diffrence ** 3 + 8.5 * diffrence;}
    else{course -= 30 * Math.sign(diffrence);}

    // Wind Correction
    const windmag = cyclical(winddir - variation + 180);
    let courseMath = -course + 90;
    let windMath = -windmag + 90;

    courseMath *= toRad;
    windMath *= toRad;

    const courseX = 2 * groundspeed * Math.cos(courseMath);
    const courseY = 2 * groundspeed * Math.sin(courseMath);
    const windX = wind * Math.cos(windMath);
    const windY = wind * Math.sin(windMath);

    course = cyclical(Math.atan2(courseX - windX, courseY - windY) * toDeg);

    write("hdg", course);
});

const flypattern = new Autofunction("flypattern", 1000, ["latref", "longref", "hdgref", "updist", "downwidth", "finallength", "turnconst", "leg", "direction", "approach"], ["latitude", "longitude", "variation", "groundspeed"], [flyto], data => {
    const inputs = data.inputs;
    const states = data.states;

    const latref = inputs.get("latref") as number;
    const longref = inputs.get("longref") as number;
    const hdgref = inputs.get("hdgref") as number;
    const updist = inputs.get("updist") as number;
    const downwidth = inputs.get("downwidth") as number;
    const finallength = inputs.get("finallength") as number;
    const turnconst = inputs.get("turnconst") as number;
    const leg = inputs.get("leg") as patternLeg;
    const direction = inputs.get("direction") as string;
    const approach = inputs.get("approach") as boolean;

    const latitude = states.get("latitude") as number;
    const longitude = states.get("longitude") as number;
    const variation = states.get("variation") as number;
    const groundspeed = states.get("groundspeed") as number;

    const circuit = (direction === "r") ? 1 : -1;
    const hdg90 = hdgref + 90 * circuit;

    const refrence = {location:{lat:latref, long:longref}, hdg:hdgref};
    const final = refrence;

    const upwind = {
        location:calcLLfromHD(refrence.location, hdgref, updist + 1.5, variation),
        hdg:hdgref,
    };
    const crosswind = {
        location:calcLLfromHD(upwind.location, hdg90, downwidth, variation),
        hdg:hdg90,
    };
    const base = {
        location:calcLLfromHD(refrence.location, hdgref + 180, finallength, variation),
        hdg:hdgref + 180,
    };
    const downwind = {
        location:calcLLfromHD(base.location, hdg90, downwidth, variation),
        hdg:hdg90,
    };

    const pattern = {
        u:upwind,
        c:crosswind,
        d:downwind,
        b:base,
        f:final,
    };

    const currentLeg = pattern[leg];
    const distance = calcLLdistance({lat:latitude, long:longitude}, currentLeg.location);

    const speed = groundspeed / 60; // kts to nm/m
    const turnrate = (turnconst / groundspeed) * 60 * toRad; // deg/s to rad/m

    let legout = leg;
    if(distance < speed / turnrate){
        const legOrder = ["u", "c", "d", "b", "f"];
        let legIndex = legOrder.indexOf(leg);

        if(leg !== "f" || (leg === "f" && distance < 1)){
            legIndex = (legIndex + 1) % 5;
            legout = legOrder[legIndex] as patternLeg;
        }
    }

    if(legout === "f" && approach){
        autoland.setActive(true);
    }

    const latout = currentLeg.location.lat;
    const longout = currentLeg.location.long;
    const hdgout = cyclical(currentLeg.hdg);

    Autofunction.cache.save("leg", legout);
    Autofunction.cache.save("flytolat", latout);
    Autofunction.cache.save("flytolong", longout);
    Autofunction.cache.save("flytohdg", hdgout);

    flyto.setActive(true);
});

const goaround = new Autofunction("goaround", -1, ["climbalt", "climbspd", "climbtype"], ["onground", "altitude", "vs"], [levelchange], data => {
    const inputs = data.inputs;
    const states = data.states;

    const climbalt = inputs.get("climbalt") as number;
    const climbspd = inputs.get("climbspd") as number;
    const climbtype = inputs.get("climbtype") as altType;

    const onground = states.get("onground") as boolean;
    const altitude = states.get("altitude") as number;
    const vs = states.get("vs") as number;

    const flapto = Autofunction.cache.load("flapto") as number|null;

    if(onground){
        goaround.error();
        console.log("Cannot goaround on the ground");
        return;
    }

    autoland.error();

    Autofunction.cache.save("flcmode", "g");
    Autofunction.cache.save("flcinput", 500);
    Autofunction.cache.save("leg", "u");

    let alt = climbalt;
    if(climbtype === "agl"){
        const agl = Math.round(altitude / 100) * 100;
        alt += agl;
    }

    write("spd", climbspd);
    write("alt", alt);
    write("spdon", true);
    write("alton", true);
    write("hdgon", true);

    if(autoflaps.isActive() && flapto !== null){write("flaps", flapto);}

    if(vs < 0){write("vs", 0);}

    setTimeout(() => {
        levelchange.setActive(true);
    }, 500);
});

const autoland = new Autofunction("autoland", 1000, ["latref", "longref", "altref", "hdgref", "vparef", "flare", "touchdown", "option"], ["latitude", "longitude", "altitude", "groundspeed", "onrunway"], [levelchange, flypattern, goaround], data => {
    const inputs = data.inputs;
    const states = data.states;

    const latref = inputs.get("latref") as number;
    const longref = inputs.get("longref") as number;
    const altref = inputs.get("altref") as number;
    const hdgref = inputs.get("hdgref") as number;
    const vparef = inputs.get("vparef") as number;
    const flare = inputs.get("flare") as number;
    const touchdown = inputs.get("touchdown") as number;
    const option = inputs.get("option") as string;

    const latitude = states.get("latitude") as number;
    const longitude = states.get("longitude") as number;
    const altitude = states.get("altitude") as number;
    const groundspeed = states.get("groundspeed") as number;
    const onrunway = states.get("onrunway") as boolean;

    if(autoland.stage === 0){
        Autofunction.cache.save("flcmode", "v");
        Autofunction.cache.save("leg", "f");
        autoland.stage++;
    }

    const touchdownZone = calcLLfromHD({lat:latref, long:longref}, hdgref, touchdown / 6076.12);
    const touchdownDistance = 6076.12 * calcLLdistance({lat:latitude, long:longitude}, touchdownZone); // nm to ft

    if(autoland.stage >= 2 || touchdownDistance <= 1000){
        if(autoland.stage === 2){
            autoland.stage++;

            levelchange.setActive(false);

            Autofunction.cache.save("flcmode", "g");
            Autofunction.cache.save("flcinput", 500);

            write("vs", -200);
        }

        if(option !== "p"){
            write("spdon", false);
            write("throttle", -100);
        }

        if(option === "p"){
            autoland.setActive(false);
            setTimeout(() => {goaround.setActive(true);}, 10000);
        }
        else if(option === "l"){
            autoland.setActive(false);
            flypattern.setActive(false);
            flyto.setActive(false);
        }
        else if(option === "t" && onrunway){
            autoland.setActive(false);
            setTimeout(() => {autotakeoff.setActive(true);}, 5000);
        }
        else if(option === "s" && groundspeed < 1){
            autoland.setActive(false);
            autotakeoff.setActive(true);
        }

        return;
    }

    const altDiffrence = altitude - altref;
    const currentVPA = Math.asin(altDiffrence / touchdownDistance) * toDeg;

    let mod = 2;
    if(touchdownDistance <= 6076){mod = 0.5;}

    let vpaout = currentVPA - mod * (vparef - currentVPA);
    vpaout = Math.round(vpaout * 10) / 10;

    vpaout = Math.min(vpaout, vparef + 0.5);
    if(vpaout < vparef - 0.5){vpaout = 0;}

    Autofunction.cache.save("flcinput", vpaout);

    const stopalt = altref + flare;
    write("alt", stopalt);

    levelchange.setActive(true);
    flypattern.setActive(true);

    if(autogear.isActive()){autogear.setActive(option !== "p");}
});

const updatefpl = new Autofunction("updatefpl", -1, [], ["fplinfo"], [], data => {
    const states = data.states;

    const fplinfo = states.get("fplinfo") as string;

    const fpl:fplStruct = JSON.parse(fplinfo);
    const flightPlanItems = fpl.detailedInfo.flightPlanItems;

    const lastIndex = flightPlanItems.length - 1;
    const lastId = `index${lastIndex}children`;
    const lastItem = document.getElementById(lastId + "0");

    const lastChildren = flightPlanItems[lastIndex].children;
    if(lastChildren === null){return;}

    const lastChildId = lastId + (lastChildren.length - 1).toString();
    const lastChildItem = document.getElementById(lastChildId);

    if (lastItem === null || (lastChildren !== null && lastChildItem === null)) {
        const div = document.getElementById("waypoints") as HTMLDivElement;
        div.innerHTML = "";

        for (let i = 0, length = flightPlanItems.length; i < length; i++) {
            let waypoint;
            const itemChildren = flightPlanItems[i].children;
            if (itemChildren === null) {
                waypoint = fpl.detailedInfo.waypoints[i];
                showfpl(`index${i}children0`, waypoint, div);
            } else {
                for (let j = 0, length = itemChildren.length; j < length; j++) {
                    waypoint = itemChildren[j].identifier;
                    showfpl(`index${i}children${j}`, waypoint, div);
                }
            }
        }
    }
});

const vnavSystem = new Autofunction("vnav", 1000, [], ["fplinfo", "onground", "autopilot", "groundspeed", "altitude", "vnavon"], [], data => {
    const states = data.states;

    const fplinfo = states.get("fplinfo") as string;
    const onground = states.get("onground") as boolean;
    const autopilot = states.get("autopilot") as boolean;
    const groundspeed = states.get("groundspeed") as number;
    const altitude = states.get("altitude") as number;
    const vnavon = states.get("vnavon") as boolean;

	if(onground || !autopilot || vnavon || levelchange.isActive()) {
		vnavSystem.error();
        return;
	}

    updatefpl.setActive(true);

    const fpl:fplStruct = JSON.parse(fplinfo);
	const flightPlanItems = fpl.detailedInfo.flightPlanItems;

    let nextWaypoint:vnavWaypoint = {
        name:fpl.waypointName,
        index:-1,
        children:0,
        altitude:0,
        altitudeRestriction:[],
        altitudeRestrictionDistance:0,
        restrictionLocation:{lat:0, long:0}
    };

	let stage = vnavSystem.stage;

	for(let i = 0, length = flightPlanItems.length; i < length; i++) {
        const item = flightPlanItems[i];
        const itemChildren = item.children;

		if(itemChildren === null){
			nextWaypoint = nextRestriction(item, nextWaypoint, i, 0);
		}
        else{
			for(let j = 0; j < itemChildren.length; j++){
				nextWaypoint = nextRestriction(itemChildren[i], nextWaypoint, i, j);
			}
		}
	}

    const itemId = `index${nextWaypoint.index}children${nextWaypoint.children}`;

    const element = document.getElementById(itemId);
    if (element !== null && element.tagName === "INPUT"){
        const item = element as HTMLInputElement;
        const nextWaypointSpeed = item.value;

        if (nextWaypointSpeed !== "") {
            if (fpl.distanceToNext <= 10) {
                write("spd", nextWaypointSpeed);
            }
        }
    }

	if(nextWaypoint.altitudeRestriction.length === 0){
        speak("No altitude restriction, VNAV disabled");
        vnavSystem.error();
		return;
	}

	if(nextWaypoint.altitude !== -1) {
		const altDiffrence = nextWaypoint.altitude - altitude;
		const fpm = altDiffrence / fpl.eteToNext;
		write("alt", nextWaypoint.altitude);
		write("vs", fpm);
	}
    else{
		nextWaypoint.altitudeRestrictionDistance = calcLLdistance({lat:fpl.nextWaypointLatitude, long:fpl.nextWaypointLongitude}, nextWaypoint.restrictionLocation);
		const altDiffrence = nextWaypoint.altitudeRestriction[0] - altitude;
		const eteToNext = ((fpl.distanceToNext + nextWaypoint.altitudeRestrictionDistance) / groundspeed) * 60;
		const fpm = altDiffrence / eteToNext;
		write("alt", nextWaypoint.altitudeRestriction[0]);
		write("vs", fpm);
	}

	vnavSystem.stage = stage;
});

let calloutFlags:boolean[] = [];

const callout = new Autofunction("callout", 250, ["rotate", "minumuns"], ["onrunway", "airspeed", "verticalspeed", "throttle", "gear", "altitudeAGL", "altitude"], [], data => {
    const inputs = data.inputs;
    const states = data.states;

    const rotate = inputs.get("rotate") as number;
    const minumuns = inputs.get("minumuns") as number;

    const onrunway = states.get("onrunway") as boolean;
    const airspeed = states.get("airspeed") as number;
    const verticalspeed = states.get("verticalspeed") as number;
    const throttle = states.get("throttle") as number;
    const gear = states.get("gear") as boolean;
    const altitudeAGL = states.get("altitudeAGL") as number;
    const altitude = states.get("altitude") as number;

    const v1 = rotate;
    const v2 = rotate + 10;

    const elevation = Autofunction.cache.load("altref") as number|null;
    const alt = (elevation === null) ? altitudeAGL : altitude - elevation;

    let stage = callout.stage;

    if(stage === 0){
        calloutFlags = [false, false, false, false, false, false, false, false];
        stage++;
    }

    if(stage === 1 && airspeed >= v1 && onrunway && throttle > 40){
        speak("V1");
        stage++;
    }
    else if(stage === 2 && airspeed >= rotate && onrunway && throttle > 40){
        speak("Rotate");
        stage++;
    }
    else if(stage === 3 && airspeed >= v2 && throttle > 40){
        speak("V2");
        stage++;
    }

    if(!speechSynthesis.speaking && verticalspeed < -500 && !gear && alt <= 1000){
        speak("Landing Gear");
    }

    if(!speechSynthesis.speaking && verticalspeed < -500 && alt <= minumuns + 10 && alt >= minumuns){
        speak("Minimums");
    }

    const alts = [1000, 500, 100, 50, 40, 30, 20, 10];

    if(verticalspeed < -500){
        for(let i = 0, length = alts.length - 1; i < length; i++){
            if(!speechSynthesis.speaking && alt <= alts[i] && alt > alts[i + 1] && !calloutFlags[i]){
                speak(alts[i].toString());
                calloutFlags[i] = true;
                break;
            }
        }
    }

    callout.stage = stage;
});

const autofunctions = [autobrakes, autoflaps, autogear, autoland, autolights, autospeed, autospoilers, autotakeoff, autotrim, callout, flypattern, flyto, goaround, levelchange, markposition, rejecttakeoff, setrunway, takeoffconfig, updatefpl, vnavSystem];