<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Real-Time Bus Tracker</title>
  <style>
    body, html {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
    #map {
      width: 100%;
      height: 100vh;
    }
    #info-display-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 220px;
      background: rgba(0, 0, 0, 0.7);
      border-radius: 10px;
      padding: 15px;
      color: white;
      font-size: 14px;
      font-weight: bold;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
      z-index: 1000;
      text-align: center;
    }
    .info-box {
      margin-bottom: 10px;
      padding: 10px;
      border-radius: 5px;
      background: rgba(255, 255, 255, 0.2);
    }
    .btn {
      background: blue;
      color: white;
      border: none;
      padding: 8px 12px;
      cursor: pointer;
      font-size: 12px;
      border-radius: 5px;
      margin-top: 5px;
      display: block;
      width: 100%;
    }
    #reset-button {
      background: red;
    }
  </style>
  <script src="https://www.gstatic.com/firebasejs/10.5.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.5.0/firebase-database-compat.js"></script>
  <script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyAUgBbj1x9Pnm-XbGbJ-N-erUw6p10oqJ8"></script>
</head>
<body>
  <div id="map"></div>
  <div id="info-display-container">
    <div class="info-box">Speed: <span id="speed-display">--</span> km/h</div>
    <div class="info-box">Daily Distance: <span id="daily-distance">--</span> km</div>
    <div class="info-box">Total Distance: <span id="total-distance">--</span> km</div>
    <button id="focus-button" class="btn">Focus on Bus</button>
    <button id="reset-button" class="btn">Reset Total Distance</button>
  </div>

  <script>
    document.addEventListener("DOMContentLoaded", () => {
      const firebaseConfig = {
        apiKey: "AIzaSyAc_3UzizC6Y-hzI_5fDYmXiTSTwR69oac",
        authDomain: "bus-tracker-4e0fc.firebaseapp.com",
        databaseURL: "https://bus-tracker-4e0fc-default-rtdb.firebaseio.com",
        projectId: "bus-tracker-4e0fc",
        storageBucket: "bus-tracker-4e0fc.appspot.com",
        messagingSenderId: "899399291440",
        appId: "1:899399291440:web:1c4535401988d905e293f5"
      };

      firebase.initializeApp(firebaseConfig);
      const db = firebase.firestore();
      const realtimeDb = firebase.database();

      let map, marker, routePolyline, routeCoordinates = [];
      let lastKnownLocation = { lat: 21.1496, lng: 79.0807 }; // Default location
      let autoFocus = true;
      let busStopMarkers = []; // Store markers for cleanup

      function initMap() {
        map = new google.maps.Map(document.getElementById('map'), {
          center: lastKnownLocation,
          zoom: 18,
          disableDefaultUI: true
        });

        marker = new google.maps.Marker({
          position: lastKnownLocation,
          map: map,
          icon: {
            url: 'https://cdn-icons-png.flaticon.com/512/201/201818.png',
            scaledSize: new google.maps.Size(40, 40)
          }
        });

        routePolyline = new google.maps.Polyline({
          path: routeCoordinates,
          geodesic: true,
          strokeColor: 'blue',
          strokeOpacity: 1.0,
          strokeWeight: 4,
          map: map
        });

        addBusStopMarkers();
        trackLiveLocation();
      }

      function addBusStopMarkers() {
        console.log("Fetching bus stops from Firestore...");
        db.collection('Locations').get().then((querySnapshot) => {
          if (querySnapshot.empty) {
            console.log("No stops found in the database.");
            return;
          }

          // Clear existing markers
          busStopMarkers.forEach(marker => marker.setMap(null));
          busStopMarkers = [];

          querySnapshot.forEach((doc) => {
            const stopName = doc.id;
            const { Latitude, Longitude } = doc.data();
            if (Latitude && Longitude) {
              console.log(`Adding marker for stop: ${stopName} at (${Latitude}, ${Longitude})`); // Log each stop
              const marker = new google.maps.Marker({
                position: { lat: parseFloat(Latitude), lng: parseFloat(Longitude) },
                map: map,
                title: stopName,
                icon: {
                  url: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
                  scaledSize: new google.maps.Size(30, 30)
                }
              });
              busStopMarkers.push(marker);
            } else {
              console.log(`Invalid coordinates for stop: ${stopName}`);
            }
          });
        }).catch((error) => {
          console.error("Error fetching bus stops from Firestore:", error);
        });
      }

      function trackLiveLocation() {
        console.log("Fetching live bus data from Realtime Database...");
        realtimeDb.ref('bus').on('value', (snapshot) => {
          const data = snapshot.val();
          console.log("Fetched live bus data:", data); // Log fetched live bus data
          if (!data || !data.Location) return;

          const { Latitude, Longitude, Speed } = data.Location;
          if (Latitude && Longitude) {
            console.log(`Updating bus location to (${Latitude}, ${Longitude}) with speed: ${Speed}`);
            lastKnownLocation = { lat: Latitude, lng: Longitude };
            marker.setPosition(lastKnownLocation);

            // Call Roads API to snap to roads
            snapToRoads(lastKnownLocation);

            if (autoFocus) {
              map.panTo(lastKnownLocation);
            }
          }
          document.getElementById("speed-display").innerText = Speed ? Speed.toFixed(2) : "--";
          document.getElementById("daily-distance").innerText = data.Distance?.DailyDistance ? data.Distance.DailyDistance.toFixed(2) : "--";
          document.getElementById("total-distance").innerText = data.Distance?.TotalDistance ? data.Distance.TotalDistance.toFixed(2) : "--";
        }, (error) => {
          console.error("Error fetching live bus data from Realtime Database:", error);
        });
      }

      function snapToRoads(location) {
        const apiKey = "pGOrGnquqIicNcKbFSQqba-w6ko="; // Updated Roads API key
        const url = `https://roads.googleapis.com/v1/snapToRoads?path=${location.lat},${location.lng}&interpolate=true&key=${apiKey}`;

        fetch(url)
          .then(response => response.json())
          .then(data => {
            if (data.snappedPoints) {
              const snappedCoordinates = data.snappedPoints.map(point => ({
                lat: point.location.latitude,
                lng: point.location.longitude
              }));

              // Update the polyline with snapped coordinates
              routeCoordinates.push(...snappedCoordinates);
              routePolyline.setPath(routeCoordinates);
            } else {
              console.log("No snapped points returned from Roads API.");
            }
          })
          .catch(error => {
            console.error("Error calling Roads API:", error);
          });
      }

      document.getElementById("focus-button").addEventListener("click", () => {
        autoFocus = true;
        map.panTo(lastKnownLocation);
      });

      document.getElementById("reset-button").addEventListener("click", () => {
        console.log("Resetting total distance in Realtime Database...");
        realtimeDb.ref('bus/Distance/TotalDistance').set(0).then(() => {
          console.log("Total distance reset successfully.");
          document.getElementById("total-distance").innerText = "0.00";
        }).catch((error) => {
          console.error("Error resetting total distance in Realtime Database:", error);
        });
      });

      setTimeout(initMap, 1000);
    });
  </script>
</body>
</html>