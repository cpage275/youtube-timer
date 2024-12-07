let currentAngle;
let isDragging;
let startTime;
let isRunning;
let remainingTime;
let initialTime;
let minutesInput;
let secondsInput;
let startButton;
let CLOCK_RADIUS = 120;
let innerShadow;
let translateY = 10;
let centerX;
let inputY;
let videoData;
let currentIframe = null;
let showingVideo = false;
let targetDuration;
let player = null;
let playerReady = false;
let noVideosFound = false;
let canvas;
let cancelButton, pauseButton, newVideoButton;
let controlsY; // Y position for controls

function preload() {
  innerShadow = loadImage('inner-shadow-v2.png');
  loadJSON('videos_by_duration_smart.json', (data) => {
    videoData = data;
    console.log('JSON data loaded:', videoData);
  });
}

function setup() {
  // Create canvas first
  canvas = createCanvas(800, 600);
  canvas.style('display', 'block')
  canvas.position((windowWidth-width) / 2, (windowHeight - height) / 2);
  document.body.style.backgroundColor = 'black';
  // Initialize variables
  currentAngle = 0;
  isDragging = false;
  startTime = 0;
  isRunning = false;
  textFont("Inter");
  
  // Calculate controlsY AFTER canvas creation
  controlsY = (height/2 + translateY) - (CLOCK_RADIUS*3.3/2) - 32;
  
  // Create controls
  createControlButtons();
  hideControls();
  
  // Rest of setup remains the same...
  centerX = width/2 - CLOCK_RADIUS*1.67;
  inputY = height/2 + translateY - 70;
  
  // Create and style minute input
  minutesInput = createInput('5');
  minutesInput.position(centerX - 70, inputY-20);
  minutesInput.size(50);
  minutesInput.input(onTimeInputChange);
  styleInput(minutesInput);
  
  // Create and style seconds input
  secondsInput = createInput('00');
  secondsInput.position(centerX + 40, inputY-20);
  secondsInput.size(50);
  secondsInput.input(onTimeInputChange);
  styleInput(secondsInput);
  
  // Create and style start button - positioned below inputs
  startButton = createButton('Start');
  startButton.position(centerX - 70, inputY + 100);
  startButton.mousePressed(toggleTimer);
  styleButton(startButton);
  
  // Initialize time from inputs
  updateTimeFromInputs();
  
    windowResized();
}

function windowResized() {
  // Center the canvas
  canvas.position((windowWidth - width) / 2, (windowHeight - height) / 2);

  // Recalculate positions for inputs and buttons
  centerX = width / 2 - CLOCK_RADIUS * 1.67;
  inputY = height / 2 + translateY - 70;

  // Reposition minute input
  minutesInput.position((windowWidth - width) / 2 + centerX - 70, (windowHeight - height) / 2 + inputY - 20);

  // Reposition second input
  secondsInput.position((windowWidth - width) / 2 + centerX + 40, (windowHeight - height) / 2 + inputY - 20);

  // Reposition start button
  startButton.position((windowWidth - width) / 2 + centerX - 70, (windowHeight - height) / 2 + inputY + 100);

  // Reposition control buttons (Cancel, Pause, New Video)
  let rectangleLeft = width / 2 - (CLOCK_RADIUS * 5.6 / 2);
  let rectangleRight = width / 2 + (CLOCK_RADIUS * 5.6 / 2);
  let controlsY = (height / 2 + translateY) - (CLOCK_RADIUS * 3.3 / 2) - 56;

  cancelButton.position((windowWidth - width) / 2 + rectangleLeft + 124, (windowHeight - height) / 2 + controlsY);
  pauseButton.position((windowWidth - width) / 2 + rectangleLeft + 260, (windowHeight - height) / 2 + controlsY);
  newVideoButton.position((windowWidth - width) / 2 + rectangleRight - 175, (windowHeight - height) / 2 + controlsY);

  // Reposition iframe if showing video
  if (currentIframe) {
    let frameWidth = CLOCK_RADIUS * 5.3;
    let frameHeight = CLOCK_RADIUS * 3;
    let videoWidth = frameWidth;
    let videoHeight = (frameWidth * 9) / 16;

    if (videoHeight > frameHeight) {
      videoHeight = frameHeight;
      videoWidth = (frameHeight * 16) / 9;
    }

    let iframeX = (windowWidth - videoWidth) / 2;
    let iframeY = (windowHeight - videoHeight) / 2 + translateY;

    currentIframe.position(iframeX, iframeY);
  }
}

function createPlayer(videoId) {
  player = new YT.Player('youtube-player', {
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange
    }
  });
}

function createControlButtons() {
   // Calculate X positions based on gray rectangle bounds
  let rectangleLeft = width/2 - (CLOCK_RADIUS*5.6/2);
  let rectangleRight = width/2 + (CLOCK_RADIUS*5.6/2);
  
  // Adjust controlsY to be higher
  controlsY = (height/2 + translateY) - (CLOCK_RADIUS*3.3/2) - 56; // Changed from -32 to -56
  
  // Create Cancel button - positioned after timer text space
  cancelButton = createButton('');
  cancelButton.class('button cancel-button');
  cancelButton.html(`
    <span class="icon-wrapper cancel-icon">
      <i class="fa-solid fa-xmark"></i>
    </span>
    Cancel
  `);
  cancelButton.style('z-index', '1000');
  // Position after timer text (timer text width ~100px + 24px spacing)
  cancelButton.position(rectangleLeft + 124, controlsY);
  cancelButton.mousePressed(handleCancel);
  
  // Create Pause button - positioned after Cancel button
  pauseButton = createButton('');
  pauseButton.class('button pause-button');
  pauseButton.html(`
    <span class="icon-wrapper pause-icon">
      <i class="fa-solid fa-pause"></i>
    </span>
    Pause
  `);
  pauseButton.style('z-index', '1000');
  // Position 24px after Cancel button (assuming Cancel button width ~100px)
  pauseButton.position(rectangleLeft + 260, controlsY);
  pauseButton.mousePressed(toggleTimer);
  
  // Create New Video button - aligned with rectangle right edge
  newVideoButton = createButton('');
  newVideoButton.class('button new-video-button');
  newVideoButton.html(`
    <span class="icon-wrapper new-video-icon">
      <i class="fa-solid fa-shuffle"></i>
    </span>
    New video
  `);
  newVideoButton.style('z-index', '1000');
  // Position aligned with right edge, accounting for button width (~140px)
  newVideoButton.position(rectangleRight - 175, controlsY);
  newVideoButton.mousePressed(handleNewVideo);
  
  // Update button styles to ensure consistent widths
  let styles = `
    .button {
      background: none;
      border: none;
      color: white;
      font-family: 'Inter', sans-serif;
      font-size: 20px;
      padding: 8px 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      border-radius: 8px;
      transition: background-color 0.2s;
      position: relative;
      z-index: 1000;
      white-space: nowrap;
    }
    .button:hover {
      background-color: #292828;
    }
    .icon-wrapper {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .cancel-icon {
      background-color: rgba(227, 84, 52, 0.4);
    }
    .cancel-icon i {
      color: #E35434;
      font-size: 16px;
    }
    .pause-icon {
      background-color: rgba(225, 152, 12, 0.4);
    }
    .pause-icon i {
      color: #E1980C;
      font-size: 16px;
    }
    .new-video-icon {
      background-color: rgba(52, 101, 227, 0.4);
    }
    .new-video-icon i {
      color: #4176FF;
      font-size: 16px;
    }
    .timer-text {
      color: white;
      font-family: 'Inter', sans-serif;
      font-size: 40px;
      margin: 0;
    }
  `;
  
  let styleElement = document.createElement('style');
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}



function styleInput(input) {
  input.style('background-color', '#2E2D2D');
  input.style('color', '#ffffff');
  input.style('border', '0px solid', '#2E2D2D');
  input.style('border-radius', '8px');
  input.style('padding-left', '20px');
  input.style('padding-right', '20px');
  input.style('padding-top', '8px');
  input.style('padding-bottom', '8px');
  input.style('font-size', '40px');
  input.style('font-family', 'Inter');
  input.style('text-align', 'center');
  input.style('outline', 'none');
}

function styleButton(button) {
  button.style('width', '200px');
  button.style('text-align', 'center');
  button.style('background-color', '#E35434');
  button.style('color', 'white');
  button.style('border', 'none');
  button.style('border-radius', '8px');
  button.style('padding', '18px 8px');
  button.style('font-size', '24px');
  button.style('font-weight', '500');
  button.style('font-family', 'Inter');
  button.style('cursor', 'pointer');
  button.style('outline', 'none');
  
  button.mouseOver(() => button.style('background-color', '#E9765D'));
  button.mouseOut(() => button.style('background-color', '#E35434'));
}

function draw() {
  background('black');
  
  // Update timer if running - moved outside of !showingVideo condition
  if (isRunning) {
    let elapsed = (millis() - startTime) / 1000;
    remainingTime = max(0, initialTime - elapsed);
    
    if (remainingTime <= 0) {
      isRunning = false;
      startButton.html('Start');
      showVideo();
    }
    
    updateInputsFromTime(remainingTime);
  }
  
  if (showingVideo) {
    // Draw timer text
    fill(255);
    textSize(40);
    textAlign(LEFT, CENTER);
    textFont('Inter');
    let rectangleLeft = width/2 - (CLOCK_RADIUS*5.6/2);
    text(formatTime(remainingTime), rectangleLeft, controlsY + 26);
  }
  
  // Draw main container
  push();
  fill("#2E2D2D");
  rectMode(CENTER);
  rect(width/2, height/2 + translateY, CLOCK_RADIUS*5.6, CLOCK_RADIUS*3.3, 8);
  
  // Draw clock face background (now black)
  fill(20);
  rect(width/2, height/2 + translateY, CLOCK_RADIUS*5.2, CLOCK_RADIUS*3, 16);
  
  if (noVideosFound && showingVideo) {
    // Draw "No videos found" message in center
    fill(255);
    textSize(24);
    textAlign(CENTER, CENTER);
    textFont('Inter');
    text("No videos found", width/2, height/2 + translateY);
    pop();
    return;
  }
  
  if (!showingVideo) {
    // Draw inner shadow image
    imageMode(CENTER);
    let imgWidth = CLOCK_RADIUS*2.7;
    let imgHeight = CLOCK_RADIUS*2.7;
    image(innerShadow, width/2 + CLOCK_RADIUS*1.1, height/2 + translateY, imgWidth, imgHeight);
    
    // Draw semicolon between inputs
    let semicolonX = ((minutesInput.x + minutesInput.width + secondsInput.x) / 2) + 16;
    let semicolonY = minutesInput.y + 36;
    
    fill("#E1980C");
    textSize(32);
    text(":", 226, 257);
    
    // Draw labels
    textSize(14);
    fill(255, 255, 255, 128);
    textAlign(CENTER);
    
    let minutesLabelX = minutesInput.x+20 + minutesInput.width/2;
    let secondsLabelX = secondsInput.x+20 + secondsInput.width/2;
    text("minutes", 178, 303);
    text("seconds", 284, 303);
    
    // Center the clock face
    push();
    translate(width/2 + CLOCK_RADIUS*1.1, height/2 + translateY);
    
    // Draw minute markers
    stroke(255, 255, 255, 100);
    strokeWeight(1);
    for (let i = 0; i < 60; i++) {
      push();
      rotate(i * PI/30);
      if (i % 5 !== 0) {
        line(CLOCK_RADIUS - 5, 0, CLOCK_RADIUS, 0);
      }
      pop();
    }
    
    // Draw 5-minute markers and numbers
    strokeWeight(2);
    stroke(255);
    for (let i = 0; i < 12; i++) {
      push();
      rotate(i * PI/6);
      line(CLOCK_RADIUS - 20, 0, CLOCK_RADIUS, 0);
      
      // Draw numbers in white
      push();
      rotate(-i * PI/6);
      noStroke();
      fill(255);
      textSize(16);
      textStyle(BOLD);
      textAlign(CENTER, CENTER);
      let markerValue = ((3 + i) * 5) % 60;
      let textRadius = CLOCK_RADIUS + 20;
      text(markerValue, textRadius * cos(i * PI/6), textRadius * sin(i * PI/6));
      pop();
      
      pop();
    }
    
    // Draw filled arc
    let angle = map(remainingTime, 0, 3600, 0, TWO_PI);
    fill(65, 118, 255, 200);
    noStroke();
    arc(0, 0, CLOCK_RADIUS * 2, CLOCK_RADIUS * 2, -HALF_PI, -HALF_PI + angle, PIE);
    
    // Draw center circle (now black)
    fill(20);
    noStroke();
    circle(0, 0, CLOCK_RADIUS * 0.75);
    
    // Draw handle
    if (!isRunning) {
      let handleAngle = map(remainingTime, 0, 3600, -HALF_PI, TWO_PI - HALF_PI);
      if (isDragging) {
        handleAngle = currentAngle;
      }
      let handleX = CLOCK_RADIUS * cos(handleAngle);
      let handleY = CLOCK_RADIUS * sin(handleAngle);
      fill(255);
      circle(handleX, handleY, 10);
    }
    pop();
  }
  
  pop();
}




function showVideo() {
  //windowResized()
  showingVideo = true;
  playerReady = false;
  
  // Round target duration to nearest second
  let roundedDuration = Math.round(targetDuration);
  
  // Hide input elements and start button
  minutesInput.style('display', 'none');
  secondsInput.style('display', 'none');
  startButton.style('display', 'none');
  
  let videos = videoData[roundedDuration.toString()] || [];
  if (videos.length === 0) {
    console.log('No videos found for this duration:', roundedDuration);
    noVideosFound = true;
    showControls();
    return;
  }
  
  noVideosFound = false;
  let video = videos[Math.floor(Math.random() * videos.length)];
  
  // Clean up existing player and iframe
  if (player) {
    player.destroy();
    player = null;
  }
  if (currentIframe) {
    currentIframe.remove();
    currentIframe = null;
  }
  
  // Create new iframe
  currentIframe = createElement('iframe');
  currentIframe.style('z-index', '100');
  currentIframe.attribute('src', `https://www.youtube.com/embed/${video.id}?autoplay=1&mute=1&start=0&enablejsapi=1&rel=0&origin=${window.location.origin}`);
  currentIframe.attribute('id', 'youtube-player');
  currentIframe.attribute('allow', 'autoplay');
  // Add rounded corners to iframe
  currentIframe.style('border-radius', '8px');
  currentIframe.style('border', 'none');
  
  // Size and position the iframe to leave room for timer
  let frameWidth = CLOCK_RADIUS * 5.3;
  let frameHeight = CLOCK_RADIUS * 3; // Changed back to original height
  let videoWidth = frameWidth;
  let videoHeight = (frameWidth * 9) / 16;
  
  if (videoHeight > frameHeight) {
    videoHeight = frameHeight;
    videoWidth = (frameHeight * 16) / 9;
  }
  
  currentIframe.attribute('width', videoWidth);
  currentIframe.attribute('height', videoHeight);
  
  let iframeX = (width - videoWidth) / 2;
  let iframeY = (height - videoHeight) / 2 + translateY; // Restored original Y position
  
  currentIframe.position(iframeX, iframeY);
  
   windowResized();
  currentIframe.style('border-radius', '8px');
  currentIframe.style('border', 'none');
  
 // Set up YouTube API if not already loaded
 if (!window.YT) {
    let tag = createElement('script');
    tag.attribute('src', 'https://www.youtube.com/iframe_api');
    let firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag.elt, firstScriptTag);
  }
  
  // Wait for API to load then create player
  if (window.YT && window.YT.Player) {
    createPlayer(video.id);
  } else {
    window.onYouTubeIframeAPIReady = () => {
      createPlayer(video.id);
    };
  }
  
  showControls();
}

function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.PAUSED && isRunning) {
    // Video was paused externally (via YouTube controls)
    // So pause our timer too
    isRunning = false;
    pauseButton.html(`
      <span class="icon-wrapper pause-icon">
        <i class="fa-solid fa-play"></i>
      </span>
      Resume
    `);
  } else if (event.data === YT.PlayerState.PLAYING && !isRunning) {
    // Video was played externally (via YouTube controls)
    // So start our timer too
    isRunning = true;
    startTime = millis() - (initialTime - remainingTime) * 1000;
    pauseButton.html(`
      <span class="icon-wrapper pause-icon">
        <i class="fa-solid fa-pause"></i>
      </span>
      Pause
    `);
  }
}




function mousePressed() {
  if (!isRunning) {
    let d = dist(mouseX - (width/2 + CLOCK_RADIUS*1.1), 
                 mouseY - (height/2 + translateY), 0, 0);
    if (d < CLOCK_RADIUS + 10 && d > CLOCK_RADIUS - 10) {
      isDragging = true;
      updateAngleFromMouse();
    }
  }
}

function mouseDragged() {
  if (isDragging) {
    updateAngleFromMouse();
  }
}

function updateAngleFromMouse() {
  if (isDragging) {
    currentAngle = atan2(mouseY - (height/2 + translateY), 
                        mouseX - (width/2 + CLOCK_RADIUS*1.1));
    
    if (currentAngle < -HALF_PI) {
      currentAngle += TWO_PI;
    }
    
    let time = map(currentAngle, -HALF_PI, TWO_PI - HALF_PI, 0, 3600);
    time = round(time / 5) * 5;
    
    if (abs(time - 0) < 10 || abs(time - 3600) < 10) {
      time = 3600;
    }
    
    time = constrain(time, 0, 3600);
    remainingTime = time;
    updateInputsFromTime(remainingTime);
    currentAngle = map(time, 0, 3600, -HALF_PI, TWO_PI - HALF_PI);
  }
}

function mouseReleased() {
  isDragging = false;
}


function updateTimeFromInputs() {
  let minutes = parseInt(minutesInput.value()) || 0;
  let seconds = parseInt(secondsInput.value()) || 0;
  remainingTime = constrain(minutes * 60 + seconds, 0, 3600);
  initialTime = remainingTime;
  targetDuration = Math.round(remainingTime); // Round the target duration
  
  // Update angle based on time (clockwise from top)
  currentAngle = map(remainingTime, 0, 3600, -HALF_PI, TWO_PI - HALF_PI);
}


function updateInputsFromTime(time) {
  let minutes = floor(time / 60);
  let seconds = floor(time % 60);
  minutesInput.value(nf(minutes, 2));
  secondsInput.value(nf(seconds, 2));
}

function onTimeInputChange() {
  if (!isRunning) {
    updateTimeFromInputs();
  }
}

function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.PAUSED) {
    // Video was paused, pause timer
    isRunning = false;
    startButton.html('Resume');
  } else if (event.data === YT.PlayerState.PLAYING) {
    // Video was played, start timer
    isRunning = true;
    startTime = millis() - (initialTime - remainingTime) * 1000;
    startButton.html('Pause');
  }
}

function onPlayerReady(event) {
  playerReady = true;
  // No need to set initial state as autoplay is enabled
}

function onPlayerStateChange(event) {
  if (!playerReady) return;
  
  if (event.data === YT.PlayerState.PAUSED) {
    // Video was paused via YouTube controls
    // Update our UI and timer state
    isRunning = false;
    pauseButton.html(`
      <span class="icon-wrapper pause-icon">
        <i class="fa-solid fa-play"></i>
      </span>
      Resume
    `);
  } else if (event.data === YT.PlayerState.PLAYING) {
    // Video was played via YouTube controls
    // Update our UI and timer state
    isRunning = true;
    startTime = millis() - (initialTime - remainingTime) * 1000;
    pauseButton.html(`
      <span class="icon-wrapper pause-icon">
        <i class="fa-solid fa-pause"></i>
      </span>
      Pause
    `);
  }
}

function toggleTimer() {
  if (!showingVideo) {
    // First time starting
    isRunning = true;
    startTime = millis();
    initialTime = remainingTime;
    targetDuration = remainingTime;
    pauseButton.html(`
      <span class="icon-wrapper pause-icon">
        <i class="fa-solid fa-pause"></i>
      </span>
      Pause
    `);
    showVideo();
    showControls();
  } else {
    // Toggle pause/resume for both timer and video
    isRunning = !isRunning;
    if (isRunning) {
      // Resume both timer and video
      startTime = millis() - (initialTime - remainingTime) * 1000;
      pauseButton.html(`
        <span class="icon-wrapper pause-icon">
          <i class="fa-solid fa-pause"></i>
        </span>
        Pause
      `);
      if (player && playerReady && !noVideosFound) {
        player.playVideo();
      }
    } else {
      // Pause both timer and video
      pauseButton.html(`
        <span class="icon-wrapper pause-icon">
          <i class="fa-solid fa-play"></i>
        </span>
        Resume
      `);
      if (player && playerReady && !noVideosFound) {
        player.pauseVideo();
      }
    }
  }
}





//code for controls on play

function formatTime(time) {
  let minutes = floor(time / 60);
  let seconds = floor(time % 60);
  return `${nf(minutes, 2)}:${nf(seconds, 2)}`;
}

function showControls() {
  cancelButton.style('display', 'flex');
  pauseButton.style('display', 'flex');
  newVideoButton.style('display', 'flex');
}

function hideControls() {
  cancelButton.style('display', 'none');
  pauseButton.style('display', 'none');
  newVideoButton.style('display', 'none');
}

// Modified toggleTimer function
function toggleTimer() {
  if (!showingVideo) {
    // First time starting
    isRunning = true;
    startTime = millis();
    initialTime = remainingTime;
    targetDuration = remainingTime;
    pauseButton.html(`
      <span class="icon-wrapper pause-icon">
        <i class="fa-solid fa-pause"></i>
      </span>
      Pause
    `);
    showVideo();
    showControls();
  } else {
    // Toggle pause/resume
    isRunning = !isRunning;
    if (isRunning) {
      // Resume
      startTime = millis() - (initialTime - remainingTime) * 1000;
      pauseButton.html(`
        <span class="icon-wrapper pause-icon">
          <i class="fa-solid fa-pause"></i>
        </span>
        Pause
      `);
      if (player) player.playVideo();
    } else {
      // Pause
      pauseButton.html(`
        <span class="icon-wrapper pause-icon">
          <i class="fa-solid fa-play"></i>
        </span>
        Resume
      `);
      if (player) player.pauseVideo();
    }
  }
}
function handleCancel() {
  // Stop timer
  isRunning = false;
  
  // Clean up video player
  if (player) {
    player.destroy();
    player = null;
  }
  if (currentIframe) {
    currentIframe.remove();
    currentIframe = null;
  }
  
  // Reset all states
  showingVideo = false;
  noVideosFound = false;
  playerReady = false;
  
  // Hide controls
  hideControls();
  
  // Reset and show original timer interface
  if (minutesInput && secondsInput && startButton) {
    minutesInput.style('display', 'block');
    secondsInput.style('display', 'block');
    startButton.style('display', 'block');
    
    // Reset to 5 minutes
    minutesInput.value('5');
    secondsInput.value('00');
    startButton.html('Start');
    
    // Initialize timer values
    updateTimeFromInputs();
  } else {
    // If elements are missing, recreate them
    setup();
  }
}




function handleNewVideo() {
  // Store current remaining time
  let currentTime = Math.round(remainingTime);
  let wasRunning = isRunning; // Store running state
  
  // Clean up existing video
  if (player) {
    player.destroy();
    player = null;
  }
  if (currentIframe) {
    currentIframe.remove();
    currentIframe = null;
  }
  
  // Update target duration to remaining time
  targetDuration = currentTime;
  
  // Show new video
  showVideo();
  
  // Maintain timer and running state
  initialTime = currentTime;
  if (wasRunning) {
    startTime = millis();
    isRunning = true;
  }
}



function handleNoVideos() {
  noVideosFound = true;
  isRunning = false;
  
  // Remove video iframe if it exists
  if (currentIframe) {
    currentIframe.remove();
    currentIframe = null;
  }
  
  // Hide controls
  hideControls();
  
  // Reset player
  player = null;
}