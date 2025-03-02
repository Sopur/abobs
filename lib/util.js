function isLocalIP(req) {
    return (
        req.ip === "127.0.0.1" || req.ip === "::1" || req?.connection?.remoteAddress === "127.0.0.1"
    );
}

module.exports = { isLocalIP };
