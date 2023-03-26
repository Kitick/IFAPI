function loaded(){
	statLog = document.getElementById("status");

	autotrim.button = document.getElementById(autotrim.button);
	autolights.button = document.getElementById(autolights.button);
	autogear.button = document.getElementById(autogear.button);
	autoflaps.button = document.getElementById(autoflaps.button);

	// Tests Socket
	socket.emit("test", response => {
		statLog.innerText = response;
		console.log(response);
	});
}

function bridge(){
    document.getElementById("autopilot").hidden = true;
    let address = document.getElementById("address").value;

	if(address !== "" && address.search(/\./) === -1){
		address = "192.168.1." + address;
	}

    socket.emit("bridge", address, response => {
        statLog.innerText = response;
        console.log(response);
    });
}

function closeBridge(){
	reset();

    socket.emit("break", response => {
        statLog.innerText = response;
        console.log(response);
    });
}

function read(command, callback = () => {}){
    socket.emit("read", command, value => {
		callback(value);
	});
}

function readAsync(command, callback = () => {}){
    socket.emit("readAsync", command, value => {
		callback(value);
	});
}

function write(command, value){
    socket.emit("write", command, value);
}

function reset(){
	document.getElementById("autopilot").hidden = true;

	clearInterval(slowInterval);
	clearInterval(fastInterval);

	autotrim.changeActive(false);
	autolights.changeActive(false);
	autogear.changeActive(false);
	autoflaps.changeActive(false);
}

let statLog;
let slowInterval;
let fastInterval;
const socket = io.connect();

socket.on("ready", () => {
    document.getElementById("autopilot").hidden = false;
	slowInterval = setInterval(() => {slowupdate();}, 1000);
	fastInterval = setInterval(() => {fastupdate();}, 100);
});

socket.on("log", response => {
    statLog.innerText = response;
    console.log(response);
});