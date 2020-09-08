import * as R from "ramda";
import { showMessage } from "react-native-flash-message"

const SERVER_URL = "http://192.168.0.135:8888/";

interface LedConfig {
  initialBrightness: number;
  sequence: number[][];
  color: string;
}

function loadConfig(): Promise<void | LedConfig> {
  return fetch(`${SERVER_URL}`).then((r) => {
    if (!r.ok) {
      showMessage({
        message: "Something went wrong while loading config from server \n" + r.body,
        type: "danger",
      });
      return new Promise(x => null)
    }  
    return r.json().then((o) => {
      const { initial_brightness: initialBrightness, sequence, color } = o;
      showMessage({
        message: "Reloaded config",
        type: "success",
      });
      return { initialBrightness, sequence, color };
    })
  });
}

function saveConfig(cfg: LedConfig): Promise<void | Response> {
  const { initialBrightness: initial_brightness, sequence, color } = cfg;
  return fetch(`${SERVER_URL}`, {
    method: "POST",
    body: JSON.stringify({ initial_brightness, sequence, color }),
  }).then(r => {
    if (!r.ok) {
      showMessage({
        message: "Something went wrong while saving config to server \n" + r.body,
        type: "danger",
      });
    } else {
      showMessage({
        message: "Saved config",
        type: "success",
      });
    }
  });
}

export { loadConfig, saveConfig };
