import ReactDOM from "react-dom/client";
import { Amplify } from "aws-amplify";
import "@aws-amplify/ui-react/styles.css";

import outputs from "./../amplify_outputs.json";
import "./index.css";

Amplify.configure(outputs);

import App from "./App";

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
