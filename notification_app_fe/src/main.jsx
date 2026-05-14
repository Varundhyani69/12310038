import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import "./index.css";

const API_URL = "http://localhost:3001/api/notifications";
const types = ["", "Event", "Result", "Placement"];
const viewedKey = "viewed_notifications";

function getViewedIds() {
    try {
        return JSON.parse(localStorage.getItem(viewedKey)) || [];
    } catch {
        return [];
    }
}

function sortByPriority(items) {
    const priority = {
        Placement: 3,
        Result: 2,
        Event: 1
    };

    return [...items].sort((a, b) => {
        if (a.viewed !== b.viewed) {
            return a.viewed - b.viewed;
        }

        if (priority[a.type] !== priority[b.type]) {
            return priority[b.type] - priority[a.type];
        }

        return new Date(b.timestamp) - new Date(a.timestamp);
    });
}

function App() {
    const [notifications, setNotifications] = useState([]);
    const [viewedIds, setViewedIds] = useState(getViewedIds);
    const [pageName, setPageName] = useState("all");
    const [type, setType] = useState("");
    const [limit, setLimit] = useState(10);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function fetchNotifications() {
        setLoading(true);
        setError("");

        const params = new URLSearchParams({
            limit: String(limit),
            page: String(page)
        });

        if (type) {
            params.append("notification_type", type);
        }

        try {
            const response = await fetch(`${API_URL}?${params.toString()}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Something went wrong");
            }

            setNotifications(data.notifications || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchNotifications();
    }, [type, limit, page]);

    function markViewed(id) {
        const nextIds = [...new Set([...viewedIds, id])];
        setViewedIds(nextIds);
        localStorage.setItem(viewedKey, JSON.stringify(nextIds));
    }

    const list = notifications.map((item) => ({
        ...item,
        viewed: viewedIds.includes(item.id)
    }));

    const shownNotifications = pageName === "priority"
        ? sortByPriority(list).slice(0, 10)
        : list;

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <Card>
                <CardContent>
                    <Typography variant="h5">Notifications</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Simple notification list for the evaluation app.
                    </Typography>

                    <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
                <Button
                    variant={pageName === "all" ? "contained" : "outlined"}
                    onClick={() => setPageName("all")}
                >
                    All
                </Button>
                <Button
                    variant={pageName === "priority" ? "contained" : "outlined"}
                    onClick={() => setPageName("priority")}
                >
                    Priority
                </Button>
                    </Stack>

                    <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Type</InputLabel>
                    <Select
                        value={type}
                        label="Type"
                        onChange={(event) => {
                            setType(event.target.value);
                            setPage(1);
                        }}
                    >
                        {types.map((item) => (
                            <MenuItem key={item} value={item}>
                                {item || "All"}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <TextField
                        label="Limit"
                        size="small"
                        type="number"
                        min="5"
                        value={limit}
                        onChange={(event) => setLimit(event.target.value)}
                />

                <TextField
                        label="Page"
                        size="small"
                        type="number"
                        min="1"
                        value={page}
                        onChange={(event) => setPage(event.target.value)}
                />
                    </Stack>

                    {loading && <Typography variant="body2">Loading...</Typography>}
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                    <Stack spacing={2}>
                {shownNotifications.map((item) => (
                    <Card key={item.id} variant="outlined">
                        <CardContent>
                            <Box sx={{ mb: 1 }}>
                                <Chip label={item.type} size="small" sx={{ mr: 1 }} />
                                <Chip
                                    label={item.viewed ? "viewed" : "new"}
                                    size="small"
                                    color={item.viewed ? "default" : "primary"}
                                />
                            </Box>
                            <Typography>{item.message}</Typography>
                            <Typography variant="caption" color="text.secondary">
                                {item.timestamp}
                            </Typography>
                            <br />
                        {!item.viewed && (
                            <Button
                                size="small"
                                variant="outlined"
                                sx={{ mt: 1 }}
                                onClick={() => markViewed(item.id)}
                            >
                                Mark viewed
                            </Button>
                        )}
                        </CardContent>
                    </Card>
                ))}
                    </Stack>

            {!loading && shownNotifications.length === 0 && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                            No notifications found.
                        </Typography>
            )}
                </CardContent>
            </Card>
        </Container>
    );
}

createRoot(document.getElementById("root")).render(<App />);
