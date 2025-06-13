// mdns-sync.js
// A single-file mDNS sync tool acting as client or server
// Uses mdns-server for mDNS and Express for HTTP

const fs = require("fs");
//  0. HELPER FUNCTIONS
function convertBufferToString(a) {if (a.data) for (i in a.data) a.data[i] = a.data[i].toString(); return a;}

const db = {};


function sniffmDNSpackets(NetworkInterfaceIpAddr) {
	const mdns = require('mdns-server')({interface: NetworkInterfaceIpAddr,reuseAddr: true,loopback: false,noInit: true});

	// listen for response events from server
	mdns.on('response', function(response) {
	  console.log("got a new mDNS response.",response);
	  for (k in response.answers) {
		  let answer = response.answers[k];
		  
		  // 1. Handle DEVICES for a given SERVICE
		  if (answer.type == "PTR") {
			  // 1.1 Filter by RELEVANT SERVICE TYPES
			  if (!["in-addr.arpa","_googlecast._tcp.local","_tcp.local"].some(suffix => answer.name.endsWith(suffix))) return;
			  
			  // 1.2 Initialize POINTERS (services) sub-database
			  if (!db.PTR) db.PTR = {};
  
			  // 1.3 Initialize this SERVICE TYPE (e.g. _googlecast._tcp.local), if needed
			  if (!db.PTR[answer.name]) {
			  	  db.PTR[answer.name] = [answer.data];
			  }	else {
				  // Add a new DEVICE to this SERVICE TYPE if needed
				  if (!db.PTR[answer.name].includes(answer.data)) 
					  db.PTR[answer.name].push(answer.data);
			  }		  	
		  }
		  // 2. Handle DEVICE IP resolution
		  if (answer.type == "A") {
			  // 2.1 Initialize ADDRESSES sub-database
			  if (!db.A) db.A = {};
			  db.A[answer.name] = answer.data;		  	
		  }
		  
		  if (["TXT","SRV"].includes(answer.type)) {
			  // Initialize this device / entry, if needed
			  if (db[answer.name] === undefined) db[answer.name] = {"TXT":null,"SRV":null};
			  
			  db[answer.name][answer.type] = answer.data;
		  }
		  
		  fs.writeFileSync('database.json', JSON.stringify(db));
	  }
	})

	// listen for query events from server
	mdns.on('query', function(query) {/*	var q = []; if (query.questions) q = q.concat(query.questions); */});

	// listen for the server being destroyed
	mdns.on('destroyed', function () {console.log('Server destroyed.');process.exit(0);});

	// query for all services on networks
	mdns.on('ready', function () {
		
	  console.log("mDNS server is ready...");
	  // mdns.query({questions:[{ name: '_:googlecast._tcp.local', type: 'PTR', class: 'IN'}]} );
	})

	// initialize the server now that we are watching for events
	mdns.initServer()

}
sniffmDNSpackets("192.168.1.84");
