function log(message:string){
	statLog.innerText = message;
	console.log(message);
}

async function readLog(...commands:string[]):Promise<void> {
	const values = await server.readStates(...commands);
	console.log(values.join(", "));
}

function setHidden(hidden:boolean):void {
	for(let i = 1, length = panels.length; i < length; i++){
		const panel = panels[i] as HTMLDivElement;
		panel.hidden = hidden;
	}
}

const statLog = document.getElementById("status") as HTMLSpanElement;
const panels = document.getElementsByClassName("panel") as HTMLCollectionOf<HTMLDivElement>;

const server = new ServerInterface(document.getElementById("ping") as HTMLSpanElement);
const domInterface = new DOMInterface(document.getElementsByClassName("data") as HTMLCollection);
const storage = new ProfileStorage(document.getElementById("profile-select") as HTMLSelectElement);

/*
const select = document.getElementById("voices") as HTMLSelectElement;
const voices = speechSynthesis.getVoices();
for(let i = 0, length = voices.length; i < length; i++){
	const newOption = new Option(voices[i].lang, i.toString());
	select.add(newOption);
}
*/