let flock;
let weatherData;
let apiURL = "https://api.openweathermap.org/data/2.5/weather?q=Bengaluru&APPID=aacedc9a30cfcbe4d7e237cd5ad4830b";

let daylightSlider, humiditySlider, skyConditionSlider;

function setup() {
  createCanvas(1200, 600);
  flock = new Flock();

  for (let i = 0; i < 2000; i++) {
    let b = new Boid(width / 2, height / 2);
    flock.addBoid(b);
  }

  daylightSlider = createSlider(0, 1, 0.5, 0.01);
  humiditySlider = createSlider(0, 100, 50, 1);
  skyConditionSlider = createSlider(0, 1, 0.5, 0.01);

  daylightSlider.position(width / 2 - 150, height - 50);
  humiditySlider.position(width / 2, height - 50);
  skyConditionSlider.position(width / 2 + 150, height - 50);
}

function draw() {
  background(30); // Darkened background

  flock.run();
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

  addBoid(b) {
    this.boids.push(b);
  }
}

class Boid {
  constructor(x, y) {
    this.position = createVector(x, y);
    this.velocity = p5.Vector.random2D();
    this.acceleration = createVector(0, 0);
    this.maxspeed = 3;
    this.maxforce = 0.05;
  }

  run(boids) {
    this.update();
    this.borders();
    this.render();
  }

  update() {
    this.velocity.add(this.acceleration);
    this.velocity.limit(this.maxspeed);
    this.position.add(this.velocity);
    this.acceleration.mult(0);
  }

  render() {
    fill(255);
    stroke(255);
    push();
    translate(this.position.x, this.position.y);
    ellipse(0, 0, 10, 10); // Increased size
    pop();
  }

  borders() {
    if (this.position.x < 0) this.position.x = width;
    if (this.position.x > width) this.position.x = 0;
    if (this.position.y < 0) this.position.y = height;
    if (this.position.y > height) this.position.y = 0;
  }
}
