import React, {MouseEvent, useState} from 'react';
import {
    Avatar,
    Stack,
    Button,
    Alert,
    TextField,
    List,
    ListItem,
    ListItemIcon,
    ListItemText, Typography,
} from "@mui/material";

// import logo from './logo.svg';
import './App.css';
import Login from './components/Login/Login';
import CenteredElement from "./components/CenteredElement/CenteredElement";


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

export default function App() {
    const [questionValueInput, setQuestionValueInput] = useState("Tell me a joke");
    const [questionValue, setQuestionValue] = useState("Tell me a joke");
    const [answerValue, setAnswerValue] = useState("Get a response by clicking the submit button.");

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

    const handleLogout = (event: MouseEvent<HTMLButtonElement>) => {
        saveToken(null);
    }

    // End -- Log in stuffs


    const handleSubmit = (event: MouseEvent<HTMLButtonElement>) => {
        setQuestionValue(questionValueInput);
        setAnswerValue("Please wait...");

        fetch('/backend/openai/chat/completions/', {
            method: 'POST',
            body: JSON.stringify({
                "model": "gpt-3.5-turbo",
                "messages": [{"role": "user", "content": questionValueInput}]
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
                if (data['status'] !== 200) {
                    throw new Error(`HTTP code ${data['status']}`);
                }
                const ans = data['data']['choices'][0]['message']['content'].trim();
                setAnswerValue(ans);
            })
            .catch((err) => {
                setAnswerValue(`Error: ${err.message}`)
            });
    };

    return (
        <div className="App">
            <List sx={{py: 2}}>
                <ListItem>
                    <ListItemIcon>
                        <Avatar variant="rounded"/>
                    </ListItemIcon>
                    <ListItemText style={{ whiteSpace: 'pre-wrap' }}>{questionValue}</ListItemText>
                </ListItem>
                <ListItem>
                    <ListItemIcon>
                        <Avatar variant="rounded" src="img/robot.svg"/>
                    </ListItemIcon>
                    <ListItemText style={{ whiteSpace: 'pre-wrap' }}>{answerValue}</ListItemText>
                </ListItem>
            </List>

            <Stack sx={{py: 2}} spacing={2}>
                <Alert severity="info">
                    Note: A conversation with history is costly. This feature is not implemented now.
                </Alert>
                <Alert severity="info">
                    Note: Avoid polite or wordy language to save the use of token.
                </Alert>
            </Stack>

            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}
                   sx={{px: 2, py: 2}}>
                <Button onClick={handleLogout} variant="outlined">Logout</Button>
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

