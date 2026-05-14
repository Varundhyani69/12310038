const STACKS = ["backend", "frontend"];
const LEVELS = ["debug", "info", "warn", "error", "fatal"];
const BACKEND_PACKAGES = [
    "cache",
    "controller",
    "cron_job",
    "db",
    "domain",
    "handler",
    "repository",
    "route",
    "service"
];
const FRONTEND_PACKAGES = ["api", "component", "hook", "page", "state", "style"];
const SHARED_PACKAGES = ["auth", "config", "middleware", "utils"];

function validateStack(stack) {
    if (typeof stack !== "string" || !stack.trim()) {
        throw new Error("stack must be a non-empty string");
    }

    const value = stack.trim();
    if (!STACKS.includes(value)) {
        throw new Error(`stack must be one of: ${STACKS.join(", ")}`);
    }
}

function validateLevel(level) {
    if (typeof level !== "string" || !level.trim()) {
        throw new Error("level must be a non-empty string");
    }

    const value = level.trim();
    if (!LEVELS.includes(value)) {
        throw new Error(`level must be one of: ${LEVELS.join(", ")}`);
    }
}

function validatePackage(packageName, stack) {
    if (typeof packageName !== "string" || !packageName.trim()) {
        throw new Error("packageName must be a non-empty string");
    }

    if (typeof stack !== "string" || !stack.trim()) {
        throw new Error("stack is required to validate packageName");
    }

    const value = packageName.trim();
    const allowed = [
        ...SHARED_PACKAGES,
        ...(stack.trim() === "backend" ? BACKEND_PACKAGES : []),
        ...(stack.trim() === "frontend" ? FRONTEND_PACKAGES : [])
    ];

    if (!allowed.includes(value)) {
        throw new Error(`packageName must be one of: ${allowed.join(", ")}`);
    }
}

function validateMessage(message) {
    if (typeof message !== "string" || !message.trim()) {
        throw new Error("message must be a non-empty string");
    }
}

module.exports = {
    validateStack,
    validateLevel,
    validatePackage,
    validateMessage
};
