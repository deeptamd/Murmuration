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

  let controlsDiv = createDiv('').style('display', 'flex')
                                  .style('flex-direction', 'row')
                                  .style('align-items', 'center')
                                  .style('gap', '800px')
                                  .style('position', 'absolute')
                                  .style('bottom', '10px')
                                  .style('top', '100px')
                                  .style('left', '50%')
                                  .style('transform', 'translateX(-50%)')
                                  .style('padding-bottom', '250px');

  function createSliderWithLabel(labelText, min, max, start, step) {
    let wrapper = createDiv('').parent(controlsDiv).style('text-align', 'center');
    createP(labelText).parent(wrapper).style('margin', '0');
    return createSlider(min, max, start, step).parent(wrapper);
  }

  daylightSlider = createSliderWithLabel("Daylight", 0, 1, 0.5, 0.01);
  skyConditionSlider = createSliderWithLabel("Sky Condition", 0, 1, 0.5, 0.01);
  humiditySlider = createSliderWithLabel("Humidity", 0, 100, 50, 1);

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
  let targetBoidCount = map(daylightValue, 0, 1, 500, 1700); // Fewer boids at night, more during day
  while (flock.boids.length > targetBoidCount) flock.boids.pop(); // Remove excess
  while (flock.boids.length < targetBoidCount) {
    let b = new Boid(width / 2 + random(-100, 100), height / 2 + random(-100, 100));
    flock.addBoid(b);
  }
}

function adjustSoundVolumeAndPitch() {
  let avgSpeed = flock.getAverageSpeed();
  murmurationSound.rate(map(avgSpeed, 2, 7, 0.8, 1.5)); // Adjust pitch based on average speed
  let density = flock.boids.length / 1200; // Normze density between 0 and 1
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

  let now = millis() / 1000 + weatherData.timezone; // Adjust for timezone
  let sunrise = weatherData.sys.sunrise;
  let sunset = weatherData.sys.sunset;

  if (now < sunrise || now > sunset) {
    daylightValue = 0;
  } else {
    daylightValue = map(now, sunrise, sunset, 0, 1); // Scale daylight between [0, 1]
  }
}

function handleError(err) {
  console.error("Error loading weather data:", err);
}

// Flock class
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

// Boid class
class Boid {
  constructor(x, y) {
    this.acceleration = createVector(0, 0);
    this.velocity = createVector(random(-1, 1), random(-1, 1));
    this.position = createVector(x, y);
    this.r = 1.5;
    this.maxspeed = 3;
    this.maxforce = 0.3;
    this.separationFactor = 20.0;
    this.cohesionFactor = 20.0;
  }

  run(boids) {
    this.flock(boids);
    this.update();
    this.borders();
    this.render();
  }

  applyForce(force) {
    this.acceleration.add(force);
  }

  updateWeatherEffects(temp, humidity, skyCondition, daylightValue, skyConditionValue) {
    let tempFactor = map(temp, 270, 310, 1.0, 2.0);
    this.cohesionFactor = tempFactor;

    let humidityFactor = map(humidity, 0, 100, 1.0, 3.0);
    this.separationFactor = humidityFactor;

    if (skyConditionValue < 0.5) {
      this.maxspeed = 7;
      this.maxforce = 0.5;
    } else {
      this.maxspeed = 3;
      this.maxforce = 0.3;
    }

    if (daylightValue < 0.2) {
      this.maxspeed = 2;
      this.maxforce = 0.2;
    }
  }

  flock(boids) {
    let sep = this.separate(boids).mult(this.separationFactor || 2.0);
    let ali = this.align(boids).mult(2);
    let coh = this.cohesion(boids).mult(this.cohesionFactor || 1);

    this.applyForce(sep);
    this.applyForce(ali);
    this.applyForce(coh);
  }

  update() {
    this.velocity.add(this.acceleration);
    this.velocity.limit(this.maxspeed);
    this.position.add(this.velocity);
    this.acceleration.mult(0);
  }

  render() {
    let theta = this.velocity.heading() + radians(90);
    fill(50);
    stroke(50);
    push();
    translate(this.position.x, this.position.y);
    rotate(theta);
    beginShape();
    vertex(0, -this.r * 2);
    vertex(-this.r, this.r * 2);
    vertex(this.r, this.r * 2);
    endShape(CLOSE);
    pop();
  }

  borders() {
    let margin = 220;
    if (this.position.x < margin) this.applyForce(createVector(this.maxforce, 0));
    if (this.position.y < margin) this.applyForce(createVector(0, this.maxforce));
    if (this.position.x > width - margin) this.applyForce(createVector(-this.maxforce, 0));
    if (this.position.y > height - margin) this.applyForce(createVector(0, -this.maxforce));
  }

  separate(boids) {
    let desiredSeparation = 20.0;
    let steer = createVector(0, 0);
    let count = 0;

    for (let other of boids) {
      let d = p5.Vector.dist(this.position, other.position);
      if (d > 0 && d < desiredSeparation) {
        let diff = p5.Vector.sub(this.position, other.position);
        diff.normalize();
        diff.div(d);
        steer.add(diff);
        count++;
      }
    }

    if (count > 0) steer.div(count);
    if (steer.mag() > 0) {
      steer.normalize();
      steer.mult(this.maxspeed);
      steer.sub(this.velocity);
      steer.limit(this.maxforce);
    }
    return steer;
  }

  align(boids) {
    let neighborDist = 30;
    let sum = createVector(0, 0);
    let count = 0;

    for (let other of boids) {
      let d = p5.Vector.dist(this.position, other.position);
      if (d > 0 && d < neighborDist) {
        sum.add(other.velocity);
        count++;
      }
    }

    if (count > 0) {
      sum.div(count);
      sum.normalize();
      sum.mult(this.maxspeed);
      let steer = p5.Vector.sub(sum, this.velocity);
      steer.limit(this.maxforce);
      return steer;
    }
    return createVector(0, 0);
  }

  cohesion(boids) {
    let neighborDist = 30;
    let sum = createVector(0, 0);
    let count = 0;

    for (let other of boids) {
      let d = p5.Vector.dist(this.position, other.position);
      if (d > 0 && d < neighborDist) {
        sum.add(other.position);
        count++;
      }
    }

    if (count > 0) {
      sum.div(count);
      sum.sub(this.position);
      sum.normalize();
      sum.mult(this.maxspeed);
      let steer = p5.Vector.sub(sum, this.velocity);
      steer.limit(this.maxforce);
      return steer;
    }
    return createVector(0, 0);
  }
}
