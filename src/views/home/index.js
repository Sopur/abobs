function bellRandom(stddev = 1) {
    let u1 = Math.random();
    let u2 = Math.random();
    let z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z0 * stddev;
}

const CastleSources = [
    undefined,
    "Construction",
    "Max Destruction",
    "Mid Destruction",
    "Fireworks",
];
const CastleStates = {
    empty: 0,
    building: 1,
    destroyed: 2,
    torn: 3,
    perfect: 4,
};
class CastleRender {
    constructor() {
        this.switchEmpty();
        this.config = {
            scale: 1 / 20,
            ratio: {
                x: 101,
                y: 179,
            },
        };
        this.displayState = -1;
        this.md = new showdown.Converter({
            simplifiedAutoLink: true,
            strikethrough: true,
            tables: true,
            openLinksInNewWindow: true,
            // backslashEscapesHTMLTags: true,
        });
    }

    get state() {
        if (this.isEmpty) return CastleStates.empty;
        if (this.isLoading) return CastleStates.building;
        if (this.mistakes === 0) return CastleStates.perfect;
        if (this.mistakes <= 3) return CastleStates.torn;
        return CastleStates.destroyed;
    }

    switchLoading() {
        const dotsHolder = document.getElementById("dots");
        const label = document.getElementById("label");
        this.isEmpty = false;
        this.isLoading = true;
        this.mistakes = 0;
        label.innerHTML = "Loading...";
        dotsHolder.innerHTML = "";
    }

    switchEmpty() {
        this.isEmpty = true;
        this.isLoading = false;
        this.mistakes = 0;
    }

    switchMistakes() {
        this.isEmpty = false;
        this.isLoading = false;
        this.mistakes = 0;
    }

    render(t = 0) {
        const castle = document.getElementById("castle");
        const x = Math.cos(t / this.config.ratio.x) * this.config.scale;
        const y = Math.sin(t / this.config.ratio.y) * this.config.scale;
        castle.style.left = `${Math.floor(x)}%`;
        castle.style.top = `${Math.floor(y)}%`;

        const expected = `../media/${CastleSources[this.state]}.gif`;
        if (this.displayState !== this.state && this.state !== 0) {
            castle.src = expected;
            this.displayState = this.state;
        }

        requestAnimationFrame((t) => this.render(t));
    }

    async fetch(path, txt) {
        return await (
            await fetch(path, {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify(txt),
            })
        ).json();
    }
    analyze(output) {
        const label = document.getElementById("label");
        const dotsHolder = document.getElementById("dots");
        this.switchMistakes();

        switch (typeof output) {
            case "string": {
                this.mistakes = 0;
                break;
            }
            case "object": {
                this.mistakes = output.filter((mistake) => !mistake.marked).length;

                let images = [];
                dotsHolder.innerHTML = "";
                for (let i = 0; i < output.length; i++) {
                    const mistake = output[i];
                    if (mistake.marked) continue;
                    const image = document.createElement("img");

                    image.style.left = `${(40 / output.length) * (i + 1) + 17}%`;
                    image.style.top = `${Math.floor(
                        ((Math.sin((i / output.length) * 5 + 2.5) + 1) / 2) * 25 + 60
                    )}%`;
                    image.className = "dot";
                    image.src = "../media/Scroll.png";
                    images.push(image);

                    image.onclick = () => {
                        const classifier = document.getElementById("classifier");
                        const castle = document.getElementById("castle");
                        const dots = document.getElementById("dots");
                        const review = document.getElementById("review");

                        for (const image of images) {
                            image.style.opacity = 0;
                            image.style.pointerEvents = "none";
                        }
                        // castle.style.opacity = 0;
                        // castle.style.pointerEvents = "none";
                        // castle.style.width = "0%";
                        // castle.style.height = "0%";
                        // dots.style.opacity = 0;

                        review.style.display = "unset";

                        document.getElementById("details-1").innerHTML = this.md.makeHtml(
                            mistake.summary
                        );
                        document.getElementById("details-2").innerHTML = this.md.makeHtml(
                            mistake.details
                        );

                        document.getElementById("back").onclick = () => {
                            review.style.display = "none";
                            for (const image of images) {
                                image.style.opacity = 1;
                                image.style.pointerEvents = "all";
                            }
                        };
                        document.getElementById("clear").onclick = () => {
                            this.analyze(
                                output.map((mis) => {
                                    return {
                                        ...mis,
                                        marked: mis.marked || mis.summary === mistake.summary,
                                    };
                                })
                            );
                            review.style.display = "none";
                            for (const image of images) {
                                image.style.opacity = 1;
                                image.style.pointerEvents = "all";
                            }
                        };
                    };
                    dotsHolder.appendChild(image);
                }
                break;
            }
        }
        if (this.mistakes === 0) label.innerText = `Mistakes found: ${this.mistakes} - Great job!`;
        else label.innerText = `Mistakes found: ${this.mistakes}`;
    }
    async analyzeTxt(txt) {
        this.switchLoading();
        this.analyze(await this.fetch(`../api/analyze/file`, txt));
    }
    async analyzeLink(link) {
        this.switchLoading();
        this.analyze(await this.fetch(`../api/analyze/file`, link));
    }
}

async function main() {
    const visualMode = document.getElementById("visual_mode");
    const clipboard = document.getElementById("clipboard");
    const upload = document.getElementById("upload");
    const castle = new CastleRender();
    castle.render();

    visualMode.onclick = (e) => {
        if (document.documentElement.dataset.theme === "dark") {
            document.documentElement.dataset.theme = "light";
        } else {
            document.documentElement.dataset.theme = "dark";
        }
    };

    clipboard.onclick = async () => {
        if (castle.isLoading) return;
        const txt = await navigator.clipboard.readText();
        castle.analyzeTxt(txt);
    };

    upload.onchange = (event) => {
        const file = event.target.files[0]; // Get the selected file
        if (file) {
            const reader = new FileReader();
            reader.onload = async function (e) {
                if (castle.isLoading) return;
                castle.analyzeTxt(e.target.result);
            };
            reader.readAsText(file);
        }
    };

    // clipboard.onclick();
}

window.onload = main;
