var map = L.map('map').setView([20, 0], 3); // Centered on the world with a zoom level of 2

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

var airportData; // Store airport data
var voronoiLayer; // Store Voronoi polygons layer

fetch('data/airports.geojson')
    .then(response => response.json())
    .then(data => {
        if (!data.features) {
            console.error("GeoJSON data does not contain a 'features' array.");
            return;
        }

        airportData = data; // Store data for nearest neighbor queries

        // Add airport points to the map
        var airportLayer = L.geoJSON(data, {
            pointToLayer: function(feature, latlng) {
                return L.circleMarker(latlng, {
                    radius: 2,
                    color: 'blue',
                    fillColor: 'lightblue',
                    fillOpacity: 0.7
                });
            },
            onEachFeature: function(feature, layer) {
                if (feature.properties) {
                    layer.bindPopup(
                        `<b>${feature.properties.name}</b><br>
                        IATA Code: ${feature.properties.iata_code || "N/A"}<br>
                        Wikipedia: <a href="${feature.properties.wikipedia}" target="_blank">More Info</a>`
                    );
                }
            }
        }).addTo(map);

        // Generate Voronoi polygons but do not add to the map yet
        var voronoiPolygons = turf.voronoi(data, { bbox: [-180, -90, 180, 90] });

        if (voronoiPolygons && voronoiPolygons.features.length > 0) {
            voronoiLayer = L.geoJSON(voronoiPolygons, {
                style: function() {
                    return {
                        color: 'red',
                        weight: 1,
                        fillColor: 'orange',
                        fillOpacity: 0.1
                    };
                }
            });
        } else {
            console.error("Voronoi computation failed.");
        }

        // Add a Legend
        var legend = L.control({ position: "bottomright" });

        legend.onAdd = function(map) {
            var div = L.DomUtil.create("div", "legend");
            div.innerHTML += "<h4>Legend</h4>";
            div.innerHTML += '<i style="background: blue; width: 10px; height: 10px; display: inline-block; margin-right: 5px; border-radius: 50%;"></i> Airport Locations<br>';
            div.innerHTML += '<i style="background: orange; width: 10px; height: 10px; display: inline-block; margin-right: 5px;"></i> Voronoi Polygons (Hidden)<br>';
            return div;
        };

        legend.addTo(map);

        // Add a toggle button for Voronoi Polygons
        var toggleButton = L.control({ position: "topright" });
        toggleButton.onAdd = function(map) {
            var button = L.DomUtil.create("button", "toggle-button");
            button.innerHTML = "Toggle Voronoi";
            button.style.padding = "5px";
            button.style.background = "white";
            button.style.border = "1px solid black";
            button.style.cursor = "pointer";

            button.onclick = function() {
                if (map.hasLayer(voronoiLayer)) {
                    map.removeLayer(voronoiLayer);
                } else {
                    map.addLayer(voronoiLayer);
                }
            };
            return button;
        };
        toggleButton.addTo(map);
    })
    .catch(error => console.error("Error loading GeoJSON:", error));

// Click Event to Find Nearest Airport
map.on('click', function(e) {
    if (!airportData || !airportData.features || airportData.features.length === 0) {
        console.error("Airport data not loaded yet.");
        return;
    }

    var clickedPoint = turf.point([e.latlng.lng, e.latlng.lat]);
    var nearestAirport = turf.nearestPoint(clickedPoint, airportData);

    if (nearestAirport && nearestAirport.geometry) {
        var props = nearestAirport.properties;
        var popupContent = `<b>Nearest Airport:</b> ${props.name}<br>
                            <b>IATA Code:</b> ${props.iata_code || "N/A"}<br>
                            <b>Wikipedia:</b> <a href="${props.wikipedia}" target="_blank">More Info</a>`;

        L.popup()
            .setLatLng([nearestAirport.geometry.coordinates[1], nearestAirport.geometry.coordinates[0]])
            .setContent(popupContent)
            .openOn(map);
    } else {
        console.error("No nearest airport found.");
    }
});
