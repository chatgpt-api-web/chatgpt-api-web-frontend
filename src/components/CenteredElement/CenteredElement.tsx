import {Grid} from "@mui/material";
import {ReactNode} from "react";

export default function CenteredElement({children}: { children: ReactNode }) {
    return (
        <Grid container direction="column" alignItems="center" justifyContent="center" style={{minHeight: '100vh'}}>
            {children}
        </Grid>
    )
}