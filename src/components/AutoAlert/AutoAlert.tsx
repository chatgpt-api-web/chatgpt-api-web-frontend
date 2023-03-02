import React from 'react';
import {Alert, AlertProps} from "@mui/material";

export default function AutoAlert({...rest}: AlertProps) {
    if (!rest['children']) {
        return null;
    }
    return (
        <Alert {...rest}/>
    )
}