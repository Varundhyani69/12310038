const {
    validateStack,
    validateLevel,
    validatePackage,
    validateMessage
} = require("./validators");
const { postLog } = require("./api");

async function Log(stack, level, packageName, message) {
    try {
        validateStack(stack);
        validateLevel(level);
        validatePackage(packageName, stack);
        validateMessage(message);

        const payload = {
            stack: stack.trim(),
            level: level.trim(),
            package: packageName.trim(),
            message: message.trim()
        };

        const result = await postLog(payload);

        if (!result.success) {
            console.error("Log request failed:", result.error.message);
            return result;
        }

        return result;
    } catch (error) {
        const message = error && error.message ? error.message : "Unexpected logging error";
        console.error("Log validation failed:", message);
        return {
            success: false,
            error: {
                message
            }
        };
    }
}

module.exports = {
    Log
};
