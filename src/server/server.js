const Analyzer = require("./core.js");

function fmt(cb) {
    return async (req, res) => {
        let output = "";
        try {
            output = await cb(req.body);
        } catch (e) {
            output = `Sorry, an error has occurred: ${e}`;
        }
        res.send(JSON.stringify(output)).status(200);
    };
}

// "server" is a local AriNet instance, which is proprietary
// The uses of "server" are pretty self explanatory though
function main(server, p, config) {
    const app = server.app;
    const analyzer = new Analyzer(config);

    app.post(
        p("/api/analyze/file"),
        fmt((body) => analyzer.analyzeFile(body))
    );
    app.post(
        p("/api/analyze/git"),
        fmt((body) => analyzer.analyzeGit(body))
    );
}

module.exports = main;
