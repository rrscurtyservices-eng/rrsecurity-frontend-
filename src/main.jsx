import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// Side-effect: keep Firestore user/role documents in sync on sign-in
import "./utils/authSync";

const QUIET = import.meta.env.VITE_QUIET_LOGS === "true";
const QUIET_ERRORS = import.meta.env.VITE_QUIET_ERRORS === "true";
if (QUIET) {
  console.log = () => {};
  console.warn = () => {};
}
if (QUIET_ERRORS) {
  console.error = () => {};
}

ReactDOM.createRoot(document.getElementById("root")).render(
   <React.StrictMode>
    {/* <Provider store={store}> */}
      <BrowserRouter>
        <App />
      </BrowserRouter>
    {/* </Provider> */}
   </React.StrictMode> 
);


 
