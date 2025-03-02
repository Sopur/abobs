const fs = require("fs");
const http = require("http");
const https = require("https");
const path = require("path");
const express = require("express");
const BodyParser = require("body-parser");
const CookieParser = require("cookie-parser");
const multer = require("multer");
const helmet = require("helmet");
const { isLocalIP } = require("./util");

class Limiter {
    constructor(max, resetTime) {
        this.resetTime = resetTime;
        this.max = max;
        this.reinit();
    }

    get deletable() {
        return Date.now() - this.resetTime > this.start;
    }

    reinit() {
        this.start = Date.now();
        this.reqs = 0;
    }

    req() {
        if (this.deletable) this.reinit();
        if (this.reqs > this.max) return true;
        this.reqs++;
        return false;
    }
}

const ServerOpts = {
    is_production: false,
    local_port: 8080,
    internal_path: "/internal",
    https: {
        key: "",
        cert: "",
    },
};
class Server {
    constructor(opts = ServerOpts) {
        this.opts = { ...ServerOpts, ...opts };

        this.isSecure =
            this.opts.is_production && this.opts.https.key.length && this.opts.https.cert.length;
        this.httpPort = this.opts.is_production ? 80 : this.opts.local_port;
        this.httpsPort = 443; // There is no "local" secure port
        this.port = this.isSecure ? this.httpsPort : this.httpPort;
        this.address = `${this.isSecure ? "https" : "http"}://localhost:${this.port}`;
        this.linked = {};
    }

    get isServer() {
        return !this.isClient;
    }

    internalFetch(addr, opts) {
        return fetch(this.address + this.opts.internal_path + addr, opts);
    }

    async requestHostCheck() {
        try {
            const res = await this.internalFetch("/check");
            return true;
        } catch (e) {
            return false;
        }
    }

    async create() {
        this.isClient = await this.requestHostCheck();

        // Setup server if this isn't a client
        if (this.isClient) return;
        this.app = express();
        if (this.isSecure) {
            this.server = https.createServer(
                {
                    key: this.opts.https.key,
                    cert: this.opts.https.cert,
                },
                this.app
            );
        } else {
            this.server = http.createServer(this.app);
        }
        return this;
    }

    close() {
        this.server.close();
        if (this.trafficCheck) clearInterval(this.trafficCheck);
    }

    listen(cb) {
        if (this.isServer) this.server.listen(this.port, () => cb(this.port, this.address));
        return this.app;
    }

    json(isStrict = false) {
        if (this.isServer) this.app.use(BodyParser.json({ strict: isStrict }));
        return this;
    }

    cookies() {
        if (this.isServer) this.app.use(CookieParser());
        return this;
    }

    secure(opts) {
        if (this.isServer) {
            this.app.use(helmet(opts));
            this.app.disable("x-powered-by");
        }
        return this;
    }

    static(src) {
        if (this.isServer) this.app.use(express.static(src));
        return this;
    }

    ratelimits(maxReq = 5, perTime = 5000) {
        if (this.isClient || this.trafficRates) return this;

        const allowedEndings = [
            // Normal dev shi
            ".txt",
            ".json",
            ".map",

            // SoapEngine compatibility
            ".di",
            ".list",

            // Normal web shi
            ".html",
            ".css",
            ".js",
            ".ico",
            ".png",
            ".mp3",
            ".gif",
            ".woff2",
        ];

        this.trafficRates = new Map();
        this.app.use((req, res, next) => {
            // Allow for general shit

            if (allowedEndings.some((ending) => req.url.endsWith(ending))) return next();

            const ip = req.ip;
            if (typeof ip !== "string" || ip.length < 2) return res.sendStatus(400); // Express bug
            if (!this.trafficRates.has(ip)) this.trafficRates.set(ip, new Limiter(maxReq, perTime));
            if (this.trafficRates.get(ip).req()) return res.sendStatus(429); // If rate limiter flagged this req
            next();
        });

        // Every 30s look over every IP and check if it can be removed
        this.trafficCheck = setInterval(() => {
            for (const pair of this.trafficRates) {
                const ip = pair[0];
                const limiter = pair[1];
                if (limiter.deletable) this.trafficRates.delete(ip);
            }
        }, 30000);

        return this;
    }

    links() {
        if (this.isClient) return this;

        this.app.get(this.opts.internal_path + "/check", (req, res) => {
            if (!isLocalIP(req)) return res.sendStatus(404); // For non-local requesters pretend like this doesn't exist
            res.sendStatus(200);
        });

        this.app.post(this.opts.internal_path + "/link", async (req, res) => {
            const name = req?.body?.name;
            const src = req?.body?.path;
            if (!isLocalIP(req)) return res.sendStatus(401); // Only local processes are allowed to link
            res.sendStatus(await this.linkFile(name, src));
        });

        return this;
    }

    async linkFile(name, src) {
        if (!name || name.length < 2 || !src || src.length < 2) return 400; // Invalid name/path

        // Locate path
        const alts = [src, path.resolve(src), path.normalize(__dirname + `/${src}`)];
        src = undefined;
        for (const alt of alts) {
            const altPath = path.resolve(alt);
            if (!fs.existsSync(altPath)) continue;
            src = altPath;
            break;
        }
        if (!src) return 404;

        // Import
        const link = require(src);
        if (typeof link !== "function") return 500; // Default isn't a function

        if (this.isClient) {
            try {
                const res = await this.internalFetch("/link", {
                    method: "POST",
                    headers: {
                        "content-type": "application/json",
                    },
                    body: JSON.stringify({
                        name,
                        path: src,
                    }),
                });
                if (!res.ok) return res.status;
            } catch (e) {
                return 503; // Cannot contact host server
            }
        } else {
            if (this.linked[name]) return 409; // Conflict, link already exists
            this.linked[name] = src;
            link(this);
        }
        return 201;
    }

    async linkAll(files) {
        let res = [];
        for (const file of files) {
            res.push(this.linkFile(file[0], file[1]));
        }
        return Promise.all(res);
    }
}

module.exports = {
    ServerOpts,
    Server,
};
