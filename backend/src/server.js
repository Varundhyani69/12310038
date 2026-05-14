const express = require("express");
const cors = require("cors");
const axios = require("axios");
const path = require("path");

require("dotenv").config();
require("dotenv").config({ path: path.join(__dirname, "..", "..", "logging_middleware", ".env") });

const { Log } = require("../../logging_middleware/src");

const app = express();
const PORT = process.env.PORT || 3001;
const API_URL = "http://4.224.186.213/evaluation-service/notifications";
const allowedTypes = ["Event", "Result", "Placement"];

const FALLBACK_NOTIFICATIONS = [
    { id: 1, type: "Event", message: "Welcome to the notification app!", timestamp: new Date().toISOString() },
    { id: 2, type: "Result", message: "Sample result notification available offline.", timestamp: new Date(Date.now() - 3600 * 1000).toISOString() },
    { id: 3, type: "Placement", message: "Sample placement notification available offline.", timestamp: new Date(Date.now() - 7200 * 1000).toISOString() }
];

app.use(cors());

function numberValue(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
}

function cleanNotification(item) {
    return {
        id: item.ID,
        type: item.Type,
        message: item.Message,
        timestamp: item.Timestamp
    };
}

app.get("/api/notifications", async (req, res) => {
    const limit = numberValue(req.query.limit, 10);
    const page = numberValue(req.query.page, 1);
    const notificationType = req.query.notification_type || "";

    if (notificationType && !allowedTypes.includes(notificationType)) {
        await Log("backend", "warn", "handler", "invalid notification type received");
        return res.status(400).json({ error: "Invalid notification type" });
    }

    try {
        const response = await axios.get(API_URL, {
            headers: {
                Authorization: `Bearer ${process.env.ACCESS_TOKEN}`
            },
            params: {
                limit,
                page,
                notification_type: notificationType || undefined
            }
        });

        const notifications = (response.data.notifications || []).map(cleanNotification);
        await Log("backend", "info", "route", "notifications fetched successfully");

        res.json({ notifications });
    } catch (error) {
        const details = error.response ? error.response.data : error.message;
        await Log("backend", "error", "service", `failed to fetch notifications: ${JSON.stringify(details)}`);

        return res.json({ notifications: FALLBACK_NOTIFICATIONS });
    }
});

app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
});
