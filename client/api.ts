import * as R from "ramda";

const SERVER_URL = "http://localhost:8000/";

interface LedConfig {
  initialBrightness: number;
  sequence: number[][];
  color: string;
}

function loadConfig(): Promise<LedConfig> {
  return fetch(`${SERVER_URL}`).then((r) =>
    r.json().then((o) => {
      const { initial_brightness: initialBrightness, sequence, color } = o;
      console.log({ initialBrightness, sequence, color });
      return { initialBrightness, sequence, color };
    })
  );
}

function saveConfig(cfg: LedConfig): Promise<Response> {
  const { initialBrightness: initial_brightness, sequence, color } = cfg;
  return fetch(`${SERVER_URL}`, {
    method: "POST",
    body: JSON.stringify({ initial_brightness, sequence, color }),
  });
}

export { loadConfig, saveConfig };
