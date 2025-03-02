/**
 * This file's purpose is to provide compatibility to AriNet
 * AriNet (Aristo's Network) is series of systems all brought together visually on a single website
 * This app is on AriNet to be publicly served securely with 0 downtime and stuff like that
 */

async function entry(api) {
    // Documentation will NOT be provided for these methods
    api.static("/stratos", api.util.ext("stratos/src/views")); // Specifies that AriNet can host the files

    // Specifies to pass the express instance in the server function
    require("./src/server/server.js")(api.server, (p) => `/stratos${p}`, {
        code_processor_model: api.config.code_processor_model,
        max_tokens: api.config.max_tokens,
        openai_token: api.global_config.openai_token,
        googleai_token: api.global_config.googleai_token,
    });
}

module.exports = entry;
