#include "esp_camera.h"
#include <WiFi.h>
#include "esp_http_client.h"


const char* ssid = "REGACOFRENTE";
const char* password = "Rep45827891";

// your ingestion endpoint (image binary POST)
const char* upload_url = "http://192.168.1.170:5473/upload";

// interval for taking images (ms)
unsigned long interval = 1000;
unsigned long lastCapture = 0;

void setup() {
  Serial.begin(115200);

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
  config.frame_size   = FRAMESIZE_QVGA;   // enough for monitoring eggs
  config.jpeg_quality = 12;
  config.fb_count     = 1;

  esp_camera_init(&config);
}

void loop() {
  if (millis() - lastCapture >= interval) {
    lastCapture = millis();

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
