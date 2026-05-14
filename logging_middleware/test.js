const { Log } = require("./src");

async function test() {
    try {
        const response = await Log(
            "backend",
            "error",
            "handler",
            "received string, expected bool"
        );

        console.log("Logging response:", response);
    } catch (error) {
        console.error("Test failed:", error.message);
    }
}

test();
