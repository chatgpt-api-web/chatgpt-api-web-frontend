import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);
root.render(
    <React.StrictMode>
        <App/>
    </React.StrictMode>
);

// Check if the website is hosted on an IPv4 address. If so, do not register service worker.
const isHostedOnRawIPv4 = () => {
    const hostname = window.location.hostname;
    const isIPv4 = /^(\d+\.\d+\.\d+\.\d+)$/.test(hostname);
    return isIPv4;
};

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://cra.link/PWA
if (isHostedOnRawIPv4()) {
    serviceWorkerRegistration.unregister();
} else {
    serviceWorkerRegistration.register();
}


// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
