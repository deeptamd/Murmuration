let flock;
let weatherData;
let apiURL = "https://api.openweathermap.org/data/2.5/weather?q=Bengaluru&APPID=aacedc9a30cfcbe4d7e237cd5ad4830b";

let currentTemp = 273; 
let targetTemp = 273; 
let currentHumidity = 50;
let targetHumidity = 50;
let daylightValue = 0; 
let weatherCondition = ""; 

let daylightSlider; 
let humiditySlider; 
let skyConditionSlider; 

let murmurationSound; 
let repelSound; 

let repelPoints = []; 

function preload() {
  murmurationSound = loadSound("STARLINGS.mp3"); 
  repelSound = loadSound("FLIGHT.mp3"); 
}

function setup() {
  createCanvas(1200, 600);
  loadWeatherData();
  setInterval(loadWeatherData, 10000);

  flock = new Flock();

  for (let i = 0; i < 2000; i++) {
    let b = new Boid(width / 2 + random(-50, 50), height / 2 + random(-50, 50));
    flock.addBoid(b);
  }

  let centerX = width / 2;
  let startY = height + 20; 

  // Daylight slider
  createP("Daylight (0 = Sunrise, 1 = Sunset)").position(centerX - 200, startY);
  daylightSlider = createSlider(0, 1, 0.5, 0.01);
  daylightSlider.position(centerX - 200, startY + 30);

  // Sky Condition slider
  createP("Sky Condition (0 = Rainy Weather, 1 = Clear Weather)").position(centerX - 200, startY + 80);
  skyConditionSlider = createSlider(0, 1, 0.5, 0.01);
  skyConditionSlider.position(centerX - 200, startY + 110);

  // Humidity slider
  createP("Humidity (0 = Humid, 100 = Dry)").position(centerX - 200, startY + 160);
  humiditySlider = createSlider(0, 100, 50, 1);
  humiditySlider.position(centerX - 200, startY + 190);

  murmurationSound.loop();
}

function draw() {
  background(255);

  daylightValue = daylightSlider.value();
  let skyConditionValue = skyConditionSlider.value();
  currentHumidity = humiditySlider.value();

  if (weatherData) {
    currentTemp = lerp(currentTemp, targetTemp, 0.05);
    currentHumidity = lerp(currentHumidity, targetHumidity, 0.05);

    for (let boid of flock.boids) {
      boid.updateWeatherEffects(currentTemp, currentHumidity, weatherCondition, daylightValue, skyConditionValue);
    }
  }

  flock.run();
  adjustBoidCount(daylightValue, skyConditionValue);
  adjustSoundVolumeAndPitch();

  if (repelPoints.length > 0) {
    flock.repelMultiple(repelPoints);
  }
}

function mousePressed() {
  if (mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
    repelPoints.push(createVector(mouseX, mouseY)); 
    repelSound.setVolume(0.1); 
    repelSound.play(0, 1, 0.2, 0, 1.5); 
  }
}

function mouseReleased() {
  if (repelSound.isPlaying()) {
    repelSound.fade(0, 1.5); 
  }
  repelPoints = []; 
}

function adjustBoidCount(daylightValue, skyConditionValue) {
  let targetBoidCount = map(daylightValue, 0, 1, 500, 1700); 
  while (flock.boids.length > targetBoidCount) flock.boids.pop(); 
  while (flock.boids.length < targetBoidCount) {
    let b = new Boid(width / 2 + random(-100, 100), height / 2 + random(-100, 100));
    flock.addBoid(b);
  }
}

function adjustSoundVolumeAndPitch() {
  let avgSpeed = flock.getAverageSpeed();
  murmurationSound.rate(map(avgSpeed, 2, 7, 0.8, 1.5)); 
  let density = flock.boids.length / 1200; 
  murmurationSound.setVolume(density);
}

function loadWeatherData() {
  loadJSON(apiURL, processWeatherData, handleError);
}

function processWeatherData(data) {
  weatherData = data;

  targetTemp = weatherData.main.temp;
  targetHumidity = weatherData.main.humidity;
  weatherCondition = weatherData.weather[0].description;

  let now = millis() / 1000 + weatherData.timezone; 
  let sunrise = weatherData.sys.sunrise;
  let sunset = weatherData.sys.sunset;

  daylightValue = (now >= sunrise && now <= sunset) ? map(now, sunrise, sunset, 0, 1) : 0;
}

function handleError(err) {
  console.error("Error loading weather data:", err);
}

class Flock {
  constructor() {
    this.boids = [];
  }

  run() {
    for (let boid of this.boids) {
      boid.run(this.boids);
    }
  }

  repelMultiple(points) {
    for (let point of points) {
      for (let boid of this.boids) {
        let distance = p5.Vector.dist(boid.position, point);
        if (distance < 200) {
          let repelForce = p5.Vector.sub(boid.position, point);
          repelForce.setMag(map(distance, 0, 200, boid.maxforce * 20, 0));
          boid.applyForce(repelForce);
        }
      }
    }
  }

  addBoid(b) {
    this.boids.push(b);
  }

  getAverageSpeed() {
    let totalSpeed = 0;
    for (let boid of this.boids) {
      totalSpeed += boid.velocity.mag();
    }
    return totalSpeed / this.boids.length;
  }
}

class Boid {
  constructor(x, y) {
    this.position = createVector(x, y);
    this.velocity = p5.Vector.random2D();
    this.acceleration = createVector(0, 0);
    this.maxspeed = 3;
    this.maxforce = 0.3;
  }

  applyForce(force) {
    this.acceleration.add(force);
  }

  updateWeatherEffects(temp, humidity, condition, daylight, sky) {
    this.maxspeed = map(temp, 270, 310, 2, 5);
  }

  run(boids) {
    this.update();
    this.render();
  }

  update() {
    this.velocity.add(this.acceleration);
    this.velocity.limit(this.maxspeed);
    this.position.add(this.velocity);
    this.acceleration.mult(0);
  }

  render() {
    fill(50);
    stroke(50);
    ellipse(this.position.x, this.position.y, 4, 4);
  }
}
