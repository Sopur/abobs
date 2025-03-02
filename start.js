const AriNet = require("./lib/server.js");
const startServer = require("./src/server/server.js");

void (async function main() {
    const server = new AriNet.Server();

    await server.create();
    server
        .json()
        .secure()
        .static(__dirname + "/../views")
        .links();
    const res = await server.linkFile("discord-annoyer", __dirname + "/server.js");
    if (res !== 201) throw new Error(`Couldn't link server file: error code '${res}`);
    console.log("Successfully linked server file");

    server.listen((port, address) => console.log(`Serving at ${address}`));
})();
