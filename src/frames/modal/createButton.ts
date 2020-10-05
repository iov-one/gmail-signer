import { cssToString } from "../../utils/css";

const ButtonStyle = {
  margin: "0 8px 0 0",
  border: "none",
  padding: "8px 0 6px 0",
  width: "100px",
  textTransform: "uppercase",
  borderRadius: "3px",
  borderBottom: "2px solid rgba(0, 0, 0, 0.15)",
  fontFamily: "'Roboto', sans-serif",
  fontWeight: 500,
  fontSize: "small",
};

const NeutralButtonStyle = {
  backgroundColor: "#f0f0f0",
  color: "#303030",
};

const DefaultButtonStyle = {
  backgroundColor: "seagreen",
  color: "white",
};

export const createButton = (
  label: string,
  clickHandler: () => void,
  isDefault: boolean = false
): HTMLInputElement => {
  const button: HTMLInputElement = document.createElement("input");
  button.setAttribute("type", "button");
  button.setAttribute("value", label);
  if (isDefault) {
    button.setAttribute(
      "style",
      cssToString({ ...ButtonStyle, ...DefaultButtonStyle })
    );
  } else {
    button.setAttribute(
      "style",
      cssToString({ ...ButtonStyle, ...NeutralButtonStyle })
    );
  }
  button.onclick = clickHandler;
  return button;
};
