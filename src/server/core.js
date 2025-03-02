const google = require("@google/generative-ai");
const fs = require("fs");

const PromptOpts = {
    model: "",
    prompt: "",
};
class Analyzer {
    constructor(config) {
        this.config = config;
        this.templates = {
            analyze: Analyzer.readTmpl("analyze.md"),
            errAI: "Sorry, but the AI didn't give a analyzable response. Please try again later.",
        };
        this.genAI = new google.GoogleGenerativeAI(config.googleai_token);
        this.model = this.genAI.getGenerativeModel({ model: config.code_processor_model });
    }

    static readTmpl(src) {
        return fs.readFileSync(`${__dirname}/${src}`).toString();
    }
    static parsable(str) {
        try {
            JSON.parse(str);
            return true;
        } catch {
            return false;
        }
    }

    async googleai(opts = PromptOpts) {
        let result = await this.model.generateContent(opts.prompt);
        let txt = result.response.text();
        if (txt.startsWith("```json")) txt = txt.slice("```json".length);
        if (txt.endsWith("```")) txt = txt.slice(0, -3);
        return txt;
    }

    async analyzeFile(code) {
        if (typeof code !== "string" && code.length < 10)
            return "Make sure your code is more than 10 characters long!";

        const res = await this.googleai({
            model: this.config.code_processor_model,
            prompt: `${this.templates.analyze}\n\n===\n\n` + code,
        });
        console.log(res);

        if (!Analyzer.parsable(res)) return this.templates.errAI;

        const analysis = JSON.parse(res);

        if (!Array.isArray(analysis)) return this.templates.errAI;
        for (const piece of analysis) {
            if (!piece.summary && !piece.details) return this.templates.errAI;
        }

        return analysis;
    }

    analyzeGit(link) {
        if (
            typeof code !== "string" &&
            !code.startsWith("https://github.com/" && !code.endsWith(".git"))
        )
            return "This doesn't look like a Github link!";

        return "Please submit a textual file.";
    }
}

module.exports = Analyzer;
