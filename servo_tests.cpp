#include <Arduino.h>
#include <ESP32Servo.h>

#define BUZZER_PIN 23      
#define SERVO_PIN 15       

Servo myServo;             

// --- Servo positions ---
const int CLOSE_ANGLE = 0;     
const int OPEN_ANGLE = 90;     

// --- Setup ---
void setup() {
  Serial.begin(115200);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  // Starts servo
  myServo.attach(SERVO_PIN);
  myServo.write(CLOSE_ANGLE);  // Começa fechado
  delay(500);
}

void loop() { 
  for (int i = 0; i < 4; i++) {
    myServo.write(OPEN_ANGLE);
    delay(1000);

    beep_egg_amount(i + 1);
    delay(1000);

    myServo.write(CLOSE_ANGLE);
    delay(1500);

    delay(2000);
  }
}

// --- Function to beep accordingly to the amount of eggs ---
void beep_egg_amount(int egg_amount) {

  for (int i = 0; i < egg_amount; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(200);
    digitalWrite(BUZZER_PIN, LOW);
    delay(200);
  }

  // Final beep a little bit longer
  digitalWrite(BUZZER_PIN, HIGH);
  delay(400);
  digitalWrite(BUZZER_PIN, LOW);
}
