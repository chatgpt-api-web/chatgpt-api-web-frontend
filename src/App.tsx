import React, { MouseEvent, useState } from 'react';
import { Alert, Avatar, Button, FormControl, InputLabel, List, ListItem, ListItemIcon, ListItemText, MenuItem, Select, Stack, TextField } from "@mui/material";

import './App.css';
import Login from './components/Login/Login';
import AutoAlert from "./components/AutoAlert/AutoAlert";
import * as serviceWorkerRegistration from "./serviceWorkerRegistration";


async function isLoggedIn(token: string | null): Promise<boolean> {
    if (!token) return false;
    return fetch('/backend/auth/user/current/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${token!}`,
        },
    })
        .then((response) => response.json())
        .then((data) => Boolean(data['is_logged_in'] || false))
        .catch((err) => {
            alert(err);
            return false; // Explicitly return false in case of error
        });
}

interface IDialog {
    role: string;
    content: string;
}

async function getChatCompletions(model: string, token: string, contextDialogs: IDialog[]) {
    function stringifyPossibleError(obj: any) {
        // If obj is null or undefined, return an empty string.
        if (!obj) return "";

        // If obj.error.message exists and is a string, return it.
        if (obj.error && obj.error.message && typeof obj.error.message === "string") {
            return obj.error.message;
        }

        // If obj.error exists and is a string, return it.
        if (obj.error && typeof obj.error === "string") {
            return obj.error;
        }

        // If obj.message exists and is a string, return it.
        if (obj.message && typeof obj.message === "string") {
            return obj.message;
        }

        // Call stringify
        return JSON.stringify(obj);
    }

    console.assert(contextDialogs !== null, "contextDialogs should not be null")
    console.assert(contextDialogs.length !== 0, "contextDialogs should not be empty");
    for (let i in contextDialogs) {
        console.assert(contextDialogs[i].content.length !== 0, "the content in contextDialogs should not be empty");
        console.assert(["user", "assistant"].includes(contextDialogs[i].role), `unexpected role ${contextDialogs[i].role}`);
    }

    return fetch('/backend/openai/chat/completions/', {
        method: 'POST',
        body: JSON.stringify({
            "model": model,
            "messages": contextDialogs,
        }),
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${token!}`,
        },
    })
        .then(async (response) => {
            if (response.status !== 200) {
                try {
                    throw new Error(`HTTP code ${response.status} (backend). ${stringifyPossibleError(await response.json())}`);
                } catch (error) {
                    throw new Error(`HTTP code ${response.status} (backend).`);
                }
            }
            let data = await response.json();
            if (data.status !== 200) {
                throw new Error(`HTTP code ${data.status} (remote). ${stringifyPossibleError(data.data)}`);
            }
            if (data.data === null) {
                throw new Error("Empty response.");
            }
            const choices = data.data.choices;
            const newDialogs: IDialog[] = [...contextDialogs];
            for (let i in choices) {
                newDialogs.push(choices[i].message);
            }
            return newDialogs;
        });
}

let waitingForResponse = false;

export default function App() {
    const [questionValueInput, setQuestionValueInput] = useState<string>("");
    const [errorText, setErrorText] = useState<string | null>(null);
    const [infoText, setInfoText] = useState<string | null>(null);

    const [dialogs, setDialogs] = useState<IDialog[]>([]);
    const clearDialogs = () => setDialogs([]);
    const DIALOG_COUNT_MAX = 20;

    const [model, setModel] = useState<string>("gpt-4-turbo-preview");

    // Begin -- Log in stuffs
    const [loggedInInitialized, setLoggedInInitialized] = useState<boolean>(false);
    const [loggedIn, setLoggedIn] = useState<boolean>(false);
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const saveToken = (token: string | null) => {
        if (token) {
            localStorage.setItem('token', token!);
        } else {
            localStorage.removeItem('token');
        }
        setToken(token);
        setLoggedInInitialized(false);
    };

    if (!loggedInInitialized) {
        isLoggedIn(token).then((result) => {
            setLoggedIn(result);
            setLoggedInInitialized(true);
        }).catch((err) => alert(err));

        return (
            <div>
                Checking whether credential is valid...
            </div>
        )
    }

    if (!loggedIn) {
        return <Login setToken={saveToken}/>
    }

    const handleLogout = (_: MouseEvent<HTMLButtonElement>) => {
        saveToken(null);
        serviceWorkerRegistration.unregister();
    }

    // End -- Log in stuffs

    const handleClear = (_: MouseEvent<HTMLButtonElement>) => {
        setInfoText(null);
        setErrorText(null);
        setQuestionValueInput("");
        clearDialogs();
    }

    const handleSubmit = async (_: MouseEvent<HTMLButtonElement>) => {
        if (waitingForResponse) {
            console.info("The submit button is clicked more than once. Ignored.");
            return;
        }

        setInfoText(null);
        setErrorText(null);

        if (dialogs.length >= DIALOG_COUNT_MAX) {
            setErrorText("Maximum dialog depth reached. It is costly to ignore the limit.")
            return;
        }

        if (questionValueInput.length === 0) {
            setErrorText("The message text is empty.")
            return;
        }

        console.assert(token !== null);

        const onSubmitStarted = () => {
            waitingForResponse = true;
            setInfoText("Please wait...");
        }
        const onSubmitEnded = () => {
            waitingForResponse = false;
            setInfoText(null);
            setQuestionValueInput("");
        }

        onSubmitStarted();
        let newDialogs = [...dialogs, {role: "user", content: questionValueInput}];
        setDialogs(newDialogs);

        return getChatCompletions(model, token!, newDialogs).then(
            (retDialogs) => {
                setDialogs(retDialogs);
                onSubmitEnded();
            }
        ).catch(
            (error) => {
                setErrorText(error.toString());
                onSubmitEnded();
            }
        );
    };

    return (
        <div>
            <List>
                {dialogs.map((dialog, _) => {
                    if (dialog.role === "user") {
                        return (
                            <ListItem>
                                <ListItemIcon>
                                    <Avatar variant="rounded"/>
                                </ListItemIcon>
                                <ListItemText style={{whiteSpace: 'pre-wrap'}}>{dialog.content.trim()}</ListItemText>
                            </ListItem>
                        )
                    } else {
                        return (
                            <ListItem>
                                <ListItemIcon>
                                    <Avatar variant="rounded" src={`${process.env.PUBLIC_URL}/img/robot.svg`}/>
                                </ListItemIcon>
                                <ListItemText style={{whiteSpace: 'pre-wrap'}}>{dialog.content.trim()}</ListItemText>
                            </ListItem>
                        )
                    }
                })}
            </List>

            <Stack sx={{py: 1}} spacing={1}>
                <AutoAlert severity="error">{errorText}</AutoAlert>
                <AutoAlert severity="info">{infoText}</AutoAlert>
                <Alert severity="info">
                    Avoid polite or wordy language to save the use of token.
                </Alert>
                <Alert severity="info">
                    A conversation with long history is costly. Use the clear button to start a new conversation
                    whenever possible.
                </Alert>
            </Stack>

            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}
                   sx={{px: 2, py: 1}}>
                <Stack direction="column" alignItems="center" justifyContent="space-between" spacing={1}>
                    <Button onClick={handleClear} variant="outlined">Clear</Button>
                    <Button onClick={handleLogout} variant="outlined">Logout</Button>
                </Stack>

                <Stack width="100%" direction="column" alignItems="center" justifyContent="space-between" spacing={1}>

                    <FormControl fullWidth>
                        <InputLabel id="model-select-label">Model</InputLabel>
                        <Select
                            fullWidth
                            label="Model"
                            id="select-model"
                            labelId="model-select-label"
                            value={model}
                            onChange={(e) => {
                                setModel(e.target.value)
                            }}
                        >
                        <MenuItem value="gpt-4o">gpt-4o</MenuItem>
                            <MenuItem value="gpt-4-turbo-preview">gpt-4-turbo-preview</MenuItem>
                            <MenuItem value="gpt-4-turbo">gpt-4-turbo</MenuItem>
                            <MenuItem value="gpt-3.5-turbo">gpt-3.5-turbo</MenuItem>
                            <MenuItem value="claude-3-opus-20240229">claude-3-opus-20240229</MenuItem>
                            <MenuItem value="claude-3-sonnet-20240229">claude-3-sonnet-20240229</MenuItem>
                            <MenuItem value="claude-3-haiku-20240307">claude-3-haiku-20240307</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        label="Input your message"
                        value={questionValueInput} onChange={(e) => {
                            setQuestionValueInput(e.target.value)
                        }}
                        multiline
                        maxRows={5}
                        minRows={1}
                    />
                </Stack>
                <Button onClick={handleSubmit} variant="contained">Submit</Button>
            </Stack>
        </div>
    );
}
