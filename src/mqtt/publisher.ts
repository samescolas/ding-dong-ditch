import mqtt from "mqtt";

const ENABLED = process.env.MQTT_ENABLED === "true";
const BROKER = process.env.MQTT_BROKER || "";
const PREFIX = process.env.MQTT_TOPIC_PREFIX || "dingdongditch";
const DISCOVERY_PREFIX = process.env.MQTT_DISCOVERY_PREFIX || "homeassistant";

let client: mqtt.MqttClient | null = null;

// Track cameras we've already published discovery for
const discoveredCameras = new Set<string>();

export interface RecordingEvent {
  camera: string;
  file: string;
  path: string;
  date: string;
  timestamp: string;
  url: string;
}

export function initMqtt(): void {
  if (!ENABLED) {
    console.log("[mqtt] disabled (MQTT_ENABLED != true)");
    return;
  }

  if (!BROKER) {
    console.warn("[mqtt] MQTT_ENABLED is true but MQTT_BROKER is not set, skipping");
    return;
  }

  client = mqtt.connect(BROKER, {
    clientId: `dingdongditch-${Date.now()}`,
    clean: true,
    reconnectPeriod: 5000,
    will: {
      topic: `${PREFIX}/status`,
      payload: Buffer.from("offline"),
      retain: true,
      qos: 1,
    },
  });

  client.on("connect", () => {
    console.log(`[mqtt] connected to ${BROKER}`);
    client!.publish(`${PREFIX}/status`, "online", { retain: true, qos: 1 });
  });

  client.on("error", (err) => {
    console.error(`[mqtt] error: ${err.message}`);
  });

  client.on("reconnect", () => {
    console.log("[mqtt] reconnecting...");
  });
}

function safeName(camera: string): string {
  return camera.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
}

function publishDiscovery(camera: string): void {
  if (!client?.connected) return;

  const id = safeName(camera);
  if (discoveredCameras.has(id)) return;
  discoveredCameras.add(id);

  const device = {
    identifiers: [`dingdongditch_${id}`],
    name: `DingDongDitch ${camera}`,
    manufacturer: "DingDongDitch",
    model: "Ring Camera Recorder",
  };

  // Sensor: last recording timestamp + attributes
  const sensorConfig = {
    name: "Last Recording",
    unique_id: `dingdongditch_${id}_last_recording`,
    state_topic: `${PREFIX}/recordings/${id}/event`,
    value_template: "{{ value_json.timestamp }}",
    json_attributes_topic: `${PREFIX}/recordings/${id}/event`,
    icon: "mdi:cctv",
    device,
  };

  client.publish(
    `${DISCOVERY_PREFIX}/sensor/dingdongditch/${id}/config`,
    JSON.stringify(sensorConfig),
    { retain: true, qos: 1 },
  );

  // Device trigger: for automations
  const triggerConfig = {
    automation_type: "trigger",
    type: "action",
    subtype: "recording_saved",
    topic: `${PREFIX}/recordings/${id}/event`,
    device,
  };

  client.publish(
    `${DISCOVERY_PREFIX}/device_automation/dingdongditch_${id}/recording/config`,
    JSON.stringify(triggerConfig),
    { retain: true, qos: 1 },
  );

  console.log(`[mqtt] published HA discovery for camera: ${camera}`);
}

export function publishRecording(event: RecordingEvent): void {
  if (!client?.connected) return;

  const id = safeName(event.camera);

  // Ensure discovery is published for this camera
  publishDiscovery(event.camera);

  client.publish(
    `${PREFIX}/recordings/${id}/event`,
    JSON.stringify(event),
    { qos: 1 },
  );

  console.log(`[mqtt] published recording event: ${event.path}`);
}
