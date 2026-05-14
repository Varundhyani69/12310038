const axios = require("axios");
const path = require("path");
require("dotenv").config();
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const LOG_ENDPOINT = "http://4.224.186.213/evaluation-service/logs";

function getAccessToken() {
    const token = process.env.ACCESS_TOKEN;
    if (typeof token !== "string" || !token.trim()) {
        throw new Error("ACCESS_TOKEN is required in .env");
    }
    return token.trim();
}

async function postLog(payload) {
    const token = getAccessToken();

    try {
        const response = await axios.post(LOG_ENDPOINT, payload, {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            timeout: 10000
        });

        return {
            success: true,
            status: response.status,
            data: response.data
        };
    } catch (error) {
        if (error.response) {
            return {
                success: false,
                error: {
                    message: "Logging API returned an error",
                    details: {
                        status: error.response.status,
                        body: error.response.data
                    }
                }
            };
        }

        if (error.request) {
            return {
                success: false,
                error: {
                    message: "Logging API did not respond",
                    details: error.message
                }
            };
        }

        return {
            success: false,
            error: {
                message: "Request failed",
                details: error.message
            }
        };
    }
}

module.exports = {
    postLog
};
