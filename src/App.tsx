import React, {MouseEvent, useState} from 'react';
import {Alert, Avatar, Button, List, ListItem, ListItemIcon, ListItemText, Stack, TextField} from "@mui/material";

import './App.css';
import Login from './components/Login/Login';
import AutoAlert from "./components/AutoAlert/AutoAlert";
import * as serviceWorkerRegistration from "./serviceWorkerRegistration";


async function isLoggedIn(token: string | null) {
    if (!token) return;
    return fetch('/backend/auth/user/current/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${token!}`,
        },
    })
        .then((response) => response.json())
        .then((data) => data['is_logged_in'])
        .catch((err) => alert(err));
}

interface IDialog {
    role: string;
    content: string;
}

async function getChatCompletions(token: string, contextDialogs: IDialog[]) {
    console.assert(contextDialogs !== null, "contextDialogs should not be null")
    console.assert(contextDialogs.length !== 0, "contextDialogs should not be empty");
    for (let i in contextDialogs) {
        console.assert(contextDialogs[i].content.length !== 0, "the content in contextDialogs should not be empty");
        console.assert(["user", "assistant"].includes(contextDialogs[i].role), `unexpected role ${contextDialogs[i].role}`);
    }

    return fetch('/backend/openai/chat/completions/', {
        method: 'POST',
        body: JSON.stringify({
            "model": "gpt-3.5-turbo",
            "messages": contextDialogs,
        }),
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${token!}`,
        },
    })
        .then((response) => {
            if (response.status !== 200) {
                throw new Error(`HTTP code ${response.status}`);
            }
            return response.json();
        })
        .then((data) => {
            if (data.status !== 200) {
                throw new Error(`HTTP code ${data['status']}`);
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
    const [questionValueInput, setQuestionValueInput] = useState<string>("Tell me a joke");
    const [errorText, setErrorText] = useState<string | null>(null);
    const [infoText, setInfoText] = useState<string | null>(null);

    const [dialogs, setDialogs] = useState<IDialog[]>([]);
    const clearDialogs = () => setDialogs([]);
    const DIALOG_COUNT_MAX = 10;

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

        return getChatCompletions(token!, newDialogs).then(
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
                <Button onClick={handleSubmit} variant="contained">Submit</Button>
            </Stack>
        </div>
    );
}
