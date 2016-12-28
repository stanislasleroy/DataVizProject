// Reposition the SVG to cover the features.

function reset(_path, _collection, _feature) {

    current_zoom = map.getZoom();
    console.log("Current zoom = " + map.getZoom());

    // if (current_zoom === 15) {
    //     d3.selectAll('.pie').each(function(d, i) {
    //         d3.select(this).classed("hidden", false);
    //     });
    // } else {

    //     d3.selectAll('.pie').each(function(d, i) {
    //         d3.select(this).classed("hidden", true);
    //     });

    //     // if (current_zoom === 13 || current_zoom === 14) {

    //     // }
    // }

    var bounds = _path.bounds(_collection),
        topLeft = bounds[0],
        bottomRight = bounds[1];

    svg
        .attr("width", bottomRight[0] - topLeft[0])
        .attr("height", bottomRight[1] - topLeft[1])
        .style("left", topLeft[0] + "px")
        .style("top", topLeft[1] + "px");
    // .attr("width", "50000")
    // .attr("height", "50000")
    // .style("left", "0px")
    // .style("top", "0px");

    g.attr("transform", "translate(" + -topLeft[0] + "," + -topLeft[1] + ")");
    // g.attr("transform", "translate(" + 0 + "," +
    // 0 + ")");



    _feature.attr("d", _path);
}

function getTransform(node) {
    var p = node.getPointAtLength(0)
    return "translate(" + [p.x, p.y] + ")";
}

// Use Leaflet to implement a D3 geometric transformation.
function projectPoint(x, y) {
    var point = map.latLngToLayerPoint(new L.LatLng(y, x));
    this.stream.point(point.x, point.y);
}

function getDistance(lat1, lat2, lon1, lon2) {

    var earthRadius = 6371000; //meters

    var dLat = toRad(lat2 - lat1);
    var dLng = toRad(lon2 - lon1);

    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);

    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadius * c;
}

function toRad(Value) {
    return Value * Math.PI / 180;
}


/*
 * Renvoie la liste des arrêts pour la ligne "line"
 */
function getEffectiveStopPointsForJSON(line) {

    result = [];

    var journeyPattern = line.ChouettePTNetwork.ChouetteLineDescription.JourneyPattern;

    for (var i = 0; i < journeyPattern.length; i++) {

        for (var j = 0; j < journeyPattern[i].stopPointList.length; j++) {

            if (result.indexOf(journeyPattern[i].stopPointList[j]) === -1) {
                var value = journeyPattern[i].stopPointList[j];
                var id = value.substring(value.lastIndexOf(":") + 1);
                result.push(id);
            }
        }
    }
    // console.log(result);
    return result;
}


/*
 * Ajoute les points d'arrêts pour la ligne "line" dans l'objet global "stop_points"
 */
function loadStopPoints(line, effective_stop_points) {

    var current_line = line.ChouettePTNetwork.PTNetwork.lineId.substring(line.ChouettePTNetwork.PTNetwork.lineId.lastIndexOf(":") + 1);
    current_line = current_line.substring(0, 3);


    var points = line.ChouettePTNetwork.ChouetteLineDescription.StopPoint;

    for (var i = 0; i < points.length; i++) {

        var id = points[i].objectId.substring(points[i].objectId.lastIndexOf(":") + 1);

        if (effective_stop_points.indexOf(id) !== -1) {

            var newFeature = {
                "type": "Feature",
                "properties": {
                    "id": points[i].objectId,
                    "nom": points[i].name,
                    "desserte": current_line,
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [
                        parseFloat(points[i].longitude),
                        parseFloat(points[i].latitude)
                    ]
                }
            };

            stop_points.features.push(newFeature);
        }
    }

    // console.log(JSON.stringify(stop_points));
}


/*
 * Ajoute des horaires d'arrêts pour la ligne "line" dans l'objet global "stop_times"
 */
function loadStopTimes(line) {

    var current_line = line.ChouettePTNetwork.PTNetwork.lineId.substring(line.ChouettePTNetwork.PTNetwork.lineId.lastIndexOf(":") + 1);
    current_line = current_line.substring(0, 3);

    stop_times[current_line] = {};

    // Création d'un nouveau hash 
    // { VehicleJourneyId -> {vehicleJourneyAtStop -> arrivalTime} }
    var vehicle_journey = getListVehicleJourney(line);


    // Récupération des calendriers
    var timetables = line.ChouettePTNetwork.Timetable;

    for (var i = 0; i < timetables.length; i++) {

        // Récupération des jours associés à la période de temps
        var calendar =
            getCalendars(timetables[i].period.startOfPeriod,
                timetables[i].period.endOfPeriod,
                timetables[i].dayType);

        // Affectation des vehicleJourneyId aux différents jours
        for (var j = 0; j < calendar.length; j++) {
            var current_date = calendar[j];
            stop_times[current_line][current_date] = {};

            for (var k = 0; k < timetables[i].vehicleJourneyId.length; k++) {
                stop_times[current_line][current_date][timetables[i].vehicleJourneyId[k]] = vehicle_journey[timetables[i].vehicleJourneyId[k]];
            }
        }
    }

    // console.log(JSON.stringify(stop_times));
    // console.log(Object.keys(stop_times[current_line]).length);
}


/*
 *
 */
function getCalendars(periodStart, periodEnd, days_to_compare) {

    var result = [];

    for (var d = new Date(periodStart); d <= new Date(periodEnd); d.setDate(d.getDate() + 1)) {

        if (Array.isArray(days_to_compare)) {
            if (days_to_compare.indexOf(days[d.getDay()]) !== -1) {
                result.push(formatDate(d));
            }
        } else {
            if (days_to_compare === days[d.getDay()]) {
                result.push(formatDate(d));
            }
        }
    }

    return result;
}


/*
 * Formatage de la date de la forme YYYY-MM-DD
 */
function formatDate(date) {
    var d = new Date(date),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
}


/*
 *
 */
function getListVehicleJourney(line) {

    var hash = {};

    // Parcourt des stopTimes pour les affecter aux vehicleJourneyId
    var vehicle_journeys = line.ChouettePTNetwork.ChouetteLineDescription.VehicleJourney;

    for (var i = 0; i < vehicle_journeys.length; i++) {

        var journey = vehicle_journeys[i];

        hash[journey.objectId] = {};

        for (var j = 0; j < journey.vehicleJourneyAtStop.length; j++) {
            var stop = journey.vehicleJourneyAtStop[j];
            var id = stop.stopPointId.substring(stop.stopPointId.lastIndexOf(":") + 1);
            hash[journey.objectId][id] = stop.arrivalTime;
        }
    }

    return hash;
}

/*
 *
 */
function getExtremitiesOfJourney(line) {

    var hash = {};

    // Parcourt des stopTimes pour les affecter aux vehicleJourneyId
    var vehicle_journeys = line.ChouettePTNetwork.ChouetteLineDescription.VehicleJourney;

    for (var i = 0; i < vehicle_journeys.length; i++) {

        var journey = vehicle_journeys[i];

        hash[journey.objectId] = {};

        for (var j = 0; j < journey.vehicleJourneyAtStop.length; j++) {
            var stop = journey.vehicleJourneyAtStop[j];
            var id = stop.stopPointId.substring(stop.stopPointId.lastIndexOf(":") + 1);
            hash[journey.objectId][id] = stop.arrivalTime;
        }
    }

    return hash;
}

function getNearbyBikeStations() {

    for (var i = 0; i < stop_points.features.length; i++) {

        var stop_point = stop_points.features[i];

        for (var j = 0; j < total_bike_stations.features.length; j++) {

            var bike_station = total_bike_stations.features[j];

            var d = getDistance(stop_point.geometry.coordinates[1],
                bike_station.geometry.coordinates[1],
                stop_point.geometry.coordinates[0],
                bike_station.geometry.coordinates[0]);

            if (d < distanceToStation) {

                if (!nearby_bike_stations[stop_point.properties.desserte])
                    nearby_bike_stations[stop_point.properties.desserte] = {};

                nearby_bike_stations[stop_point.properties.desserte][bike_station.properties.idstation] = {};
                nearby_bike_stations[stop_point.properties.desserte][bike_station.properties.idstation].latitude = bike_station.geometry.coordinates[1];
                nearby_bike_stations[stop_point.properties.desserte][bike_station.properties.idstation].longitude = bike_station.geometry.coordinates[0];
            }
        }
    }
}

function loadBikeStationsHistory(history) {

    // console.log(history);

    for (var id in history) {

        // console.log(history[id]["values"]);

        if (!bike_stations_history[id])
            bike_stations_history[id] = {};

        for (var j = 0; j < history[id]["values"].length; j++) {

            var value = history[id]["values"][j];

            var index_1 = value[0].indexOf("T");
            var index_2 = value[0].indexOf("+");

            var day = value[0].substring(0, index_1);
            var hour = value[0].substring(index_1 + 1, index_2);

            if (available_days.indexOf(day) == -1)
                available_days.push(day);

            if (!bike_stations_history[id][day])
                bike_stations_history[id][day] = {};

            if (!bike_stations_history[id][day][hour])
                bike_stations_history[id][day][hour] = {};

            bike_stations_history[id][day][hour].available_bikes = value[1];
            bike_stations_history[id][day][hour].available_bike_stands = value[2];
        }
    }

    // Paramétrage du slider
    d3.select('#slider').attr("max", available_days.length);
    d3.select('#day').html(available_days[0]);


    // for (var i = 0; i < history.ObservationCollection.member.length; i++) {

    //     var member = history.ObservationCollection.member[i];

    //     if (!bike_stations_history[member.name])
    //         bike_stations_history[member.name] = {};

    //     for (var j = 0; j < member.result.DataArray.values.length; j++) {

    //         var value = member.result.DataArray.values[j];

    //         var index_1 = value[0].indexOf("T");
    //         var index_2 = value[0].indexOf("+");

    //         var day = value[0].substring(0, index_1);
    //         var hour = value[0].substring(index_1 + 1, index_2);

    //         if (!bike_stations_history[member.name][day])
    //             bike_stations_history[member.name][day] = {};

    //         if (!bike_stations_history[member.name][day][hour])
    //             bike_stations_history[member.name][day][hour] = {};

    //         bike_stations_history[member.name][day][hour].available_bikes = value[1];
    //         bike_stations_history[member.name][day][hour].available_bike_stands = value[2];
    //     }
    // }

    // console.log(JSON.stringify(bike_stations_history));
}

function displaySecondaryLine(data, type) {

    var path = d3.geo.path().projection(transform);

    var feature = g.selectAll('.' + type)
        .data(data)
        .enter().append("path")
        .style({
            'fill-opacity': 0.0,
            'stroke-width': 1,
            'stroke-linejoin': 'round',
            'stroke-linecap': 'round'
        })
        .style("stroke", function(d) {
            var array = d.properties.couleur.split(" ");
            var color = (d3.rgb(array[0], array[1], array[2])).toString();
            return color;
        });

    map.on("viewreset", function() {
        reset(path, data, feature);
    });

    reset(path, data, feature);
}

function displayBikeStations(data) {

    var path = d3.geo.path().projection(transform);

    var feature = g.selectAll('.pathVelov')
        .data(data.features)
        .enter().append("path")
        .classed("stationsVelo", true)
        .attr("id", function(d) {
            return "id_" + d.properties.idstation;
        })
        .style("stroke", "black")
        .style("fill", function(d) {
            return d.properties.stationbonus === "Oui" ? "#FFBF00" : "#d3d3d3";
        })
        .on('mouseover', function(d) {
            var mouse = d3.mouse(svg.node()).map(function(d) {
                return parseInt(d);
            });
            tooltip.classed('hidden', false)
                .attr('style', 'left:' + (mouse[0]) + 'px; top:' + (mouse[1]) + 'px')
                .html(d.properties.nom + "<br>Id station : " + d.properties.idstation + "<br>Nb de bornes : " + d.properties.nbbornettes + "<br>Station bonus : " + d.properties.stationbonus);
            d3.select(this).style("stroke", "red");
        })
        .on('mouseout', function() {
            tooltip.classed('hidden', true);
            d3.select(this).style("stroke", "black");
        });

    map.on("viewreset", function() {
        reset(path, data, feature);
    });

    reset(path, data, feature);
}


function displayMetroStations(data) {

    var path = d3.geo.path().projection(transform);

    var feature = g.selectAll('.pathStationsMetro')
        .data(data.features)
        .enter().append("path")
        .classed("stationsMetro", true)
        .attr("id", function(d) {
            return d.properties.id;
        })
        .style({
            'stroke-width': 4,
            'stroke-linejoin': 'round',
            'stroke-linecap': 'round'
        })
        .style("stroke", function(d) {
            return "gray";
            var id = d.properties.desserte.substring(0, 3);
            var array = details_line[id].color.split(" ");
            var color = (d3.rgb(array[0], array[1], array[2])).toString();
            return color;
        })
        .style("fill", function(d) {
            return "gray";
            var id = d.properties.desserte.substring(0, 3);
            var array = details_line[id].color.split(" ");
            var color = (d3.rgb(array[0], array[1], array[2])).toString();
            return color;
        });

    map.on("viewreset", function() {
        reset(path, data, feature2);
    });

    reset(path, data, feature);
}


function displayLineStations(data) {

    var path = d3.geo.path().projection(transform);

    var feature = g.selectAll('.pathMetroLine')
        .data(data.features)
        .enter().append("path")
        .classed("lineMetro", true)
        .attr("sens", function(d) {
            return d.properties.sens;
        })
        .attr("ligne", function(d) {
            return d.properties.ligne;
        })
        .attr("code_titan", function(d) {
            return d.properties.code_titan.substring(0, 3);
        })
        .style({
            'fill': 'none'
        })
        .style({
            'stroke-width': 4,
            'stroke-linejoin': 'round',
            'stroke-linecap': 'round'
        })
        .style("stroke", function(d) {
            var array = d.properties.couleur.split(" ");
            var color = (d3.rgb(array[0], array[1], array[2])).toString();
            return color;
        })
        .on('mousemove', function(d) {
            d3.select(this).style("stroke-width", 8);
        })
        .on('click', function(d) {
            d3.select(this).style("stroke-width", 8);
            selectedLine = d.properties.code_titan.substring(0, 3);
            // console.log(selectedLine);
            //  console.log(d3.selectAll('.train').filter(".t" + selectedLine));

            // Masquer tous les éléments
            d3.selectAll('.train').each(function(d, i) {
                d3.select(this).classed("hiddenLine", true);
            });

            d3.selectAll('.pie').each(function(d, i) {
                d3.select(this).classed("hiddenLine ", true);
            });

            d3.selectAll('.ring').each(function(d, i) {
                d3.select(this).classed("hiddenLine ", true);
            });

            // Afficher les éléments sélectionnés
            d3.selectAll('.train').filter(".t" + selectedLine).each(function(d, i) {
                d3.select(this).classed("hiddenLine", false);
            });

            d3.selectAll('.pie').filter(".p" + selectedLine).each(function(d, i) {
                d3.select(this).classed("hiddenLine", false);
            });

            d3.selectAll('.ring').filter(".r" + selectedLine).each(function(d, i) {
                d3.select(this).classed("hiddenLine", false);
            });


            //     // Masquer tous les éléments
            //     d3.selectAll(".train").filter("*:not(" + ".r" + selectedLine + ")").each(function(d, i) {
            //         d3.select(this).classed("hiddenLine", true);
            //     });

            //    d3.selectAll(".pie").filter("*:not(" + ".p" + selectedLine + ")").each(function(d, i) {
            //         d3.select(this).classed("hiddenLine ", true);
            //     });

            //     d3.selectAll(".ring").filter("*:not(" + ".r" + selectedLine + ")").each(function(d, i) {
            //         d3.select(this).classed("hiddenLine ", true);
            //     });

        })
        .on('mouseout', function() {
            d3.select(this).style("stroke-width", 4);
        });

    map.on("viewreset", function() {
        reset(path, data, feature);
    });

    reset(path, data, feature);
}