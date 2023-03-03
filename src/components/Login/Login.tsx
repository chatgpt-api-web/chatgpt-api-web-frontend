import React, {MouseEvent, useState} from 'react';
import {Button, Stack, TextField, Card, Typography} from "@mui/material";
import AutoAlert from '../AutoAlert/AutoAlert';
import CenteredElement from "../CenteredElement/CenteredElement";

async function loginUser(username: string, password: string) {
    return fetch('/backend/auth/login/token/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            'username': username,
            'password': password,
        })
    })
        .then((response) => response.json())
        .then((data) => data.token);
}

export default function Login({setToken}: { setToken: (token: string) => void }) {
    const [username, setUserName] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleSubmit = async (_: MouseEvent<HTMLButtonElement>) => {
        setErrorMessage(null);
        return loginUser(username, password).then((token) => {
            if (!token) throw new Error('Login failed.');
            setToken(token);
        }).catch((error) => {
            setErrorMessage(error.toString());
        });
    }

    return (
        <CenteredElement>
            <Card>
                <Typography variant="h1" sx={{px: 2, py: 2, fontSize: 32}}>Login</Typography>
                <AutoAlert severity="error" sx={{py: 2}}>{errorMessage}</AutoAlert>
                <Stack direction="column" justifyContent="center" alignItems="center"
                       spacing={2} sx={{px: 2, py: 2}}>
                    <TextField
                        fullWidth
                        label="Username"
                        sx={{minWidth: 150}}
                        value={username} onChange={e => setUserName(e.target.value)}
                    />
                    <TextField
                        fullWidth
                        label="Password"
                        type={"password"}
                        sx={{minWidth: 150}}
                        value={password} onChange={e => setPassword(e.target.value)}
                    />
                    <Button type="submit" variant="contained" onClick={handleSubmit}
                            sx={{minWidth: 100}}>Login</Button>
                </Stack>
            </Card>
        </CenteredElement>
    )
}
