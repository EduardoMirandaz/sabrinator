#include "esp_camera.h"
#include <WiFi.h>
#include "esp_http_client.h"

const char* ssid = "REGACOFRENTE";
const char* password = "Rep45827891";

// ingestion endpoint
const char* upload_url = "http://192.168.1.170:5473/upload";

// captura da imagem
unsigned long captureInterval = 5000;
unsigned long lastCapture = 0;

// controle do flash
#define LED_PIN 4
unsigned long flashOnInterval = 0;   // liga a cada 1s
unsigned long flashDuration   = 10000;    // permanece ligado por 10s
unsigned long lastFlashOn = 0;
bool flashActive = false;

void setup() {
  Serial.begin(115200);

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW); // começa desligado

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(100); }

  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer   = LEDC_TIMER_0;
  config.pin_d0       = 5;
  config.pin_d1       = 18;
  config.pin_d2       = 19;
  config.pin_d3       = 21;
  config.pin_d4       = 36;
  config.pin_d5       = 39;
  config.pin_d6       = 34;
  config.pin_d7       = 35;
  config.pin_xclk     = 0;
  config.pin_pclk     = 22;
  config.pin_vsync    = 25;
  config.pin_href     = 23;
  config.pin_sscb_sda = 26;
  config.pin_sscb_scl = 27;
  config.pin_pwdn     = 32;
  config.pin_reset    = -1;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.frame_size   = FRAMESIZE_QVGA;
  config.jpeg_quality = 12;
  config.fb_count     = 1;

  esp_camera_init(&config);
}

void loop() {
  unsigned long now = millis();

  // ---------------------------------------------------
  // FLASH CONTROL
  // ---------------------------------------------------
  if (!flashActive && (now - lastFlashOn >= flashOnInterval)) {
    // ligar o flash
    digitalWrite(LED_PIN, HIGH);
    flashActive = true;
    lastFlashOn = now;
  }

  if (flashActive && (now - lastFlashOn >= flashDuration)) {
    // desligar o flash após 5 segundos
    digitalWrite(LED_PIN, LOW);
    flashActive = false;
  }

  // ---------------------------------------------------
  // IMAGE CAPTURE AND UPLOAD
  // ---------------------------------------------------
  if (now - lastCapture >= captureInterval) {
    lastCapture = now;

    camera_fb_t *fb = esp_camera_fb_get();
    if (!fb) return;

    esp_http_client_config_t cfg = {};
    cfg.url = upload_url;
    cfg.method = HTTP_METHOD_POST;

    esp_http_client_handle_t client = esp_http_client_init(&cfg);
    esp_http_client_set_header(client, "Content-Type", "image/jpeg");
    esp_http_client_set_post_field(client, (const char*)fb->buf, fb->len);

    esp_http_client_perform(client);
    esp_http_client_cleanup(client);

    esp_camera_fb_return(fb);
  }
}
