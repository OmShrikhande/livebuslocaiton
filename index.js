import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-database.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAc_3UzizC6Y-hzI_5fDYmXiTSTwR69oac",
    authDomain: "bus-tracker-4e0fc.firebaseapp.com",
    databaseURL: "https://bus-tracker-4e0fc-default-rtdb.firebaseio.com",
    projectId: "bus-tracker-4e0fc",
    storageBucket: "bus-tracker-4e0fc.appspot.com",
    messagingSenderId: "899399291440",
    appId: "1:899399291440:web:1c4535401988d905e293f5",
    measurementId: "G-JFC5HHBVGC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

let map;
let marker;
let vehiclePath = [];
let polyline;

console.log("this is loaded from js file")

// Initialize Google Map and Marker
window.initMap = function() {
    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: 21.1496273646212, lng: 79.08079485255764 },
        zoom: 18,
        mapId: "DEMO_MAP_ID",
        mapTypeId: "hybrid",
    });

    marker = new google.maps.Marker({
        position: { lat: 21.1496273646212, lng: 79.08079485255764 },
        map,
        title: "Moving Marker",
        icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 5,
            rotation: 0,
            fillColor: '#FF0000',
            fillOpacity: 1,
            strokeWeight: 1,
        },
    });

    polyline = new google.maps.Polyline({
        path: vehiclePath,
        geodesic: true,
        strokeColor: "#FF0000",
        strokeOpacity: 1.0,
        strokeWeight: 2,
    });

    polyline.setMap(map);

    // Start tracking live location
    trackLiveLocation();
}

// Track live location from Firebase and update the marker
function trackLiveLocation() {
    const locationRef = ref(database, 'bus/Location');

    onValue(locationRef, (snapshot) => {
        const data = snapshot.val();
        if (data && data.Latitude && data.Longitude) {
            const newPosition = { lat: data.Latitude, lng: data.Longitude };
            const heading = data.Heading || 0; // Assuming 'Heading' is provided in the data
            marker.setPosition(newPosition);
            marker.setIcon({
                path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                scale: 5,
                rotation: heading,
                fillColor: '#FF0000',
                fillOpacity: 1,
                strokeWeight: 1,
            });
            map.setCenter(newPosition);
            updateVehiclePath(newPosition);
            updateSpeed(data.Speed); // Update the speed display
        }
    }, (error) => {
        console.error("Error fetching location data:", error);
    });
}

// Update the vehicle path on the map
function updateVehiclePath(position) {
    vehiclePath.push(position);
    polyline.setPath(vehiclePath);
}

// Update the speed display in the circular container
function updateSpeed(speed) {
    const speedElement = document.getElementById("speed-display");
    speedElement.innerText = speed > 0 ? `${speed} km/h` : "-- km/h";
}