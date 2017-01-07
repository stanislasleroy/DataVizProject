// Reposition the SVG to cover the features.

function reset(_path, _collection, _feature) {

    if (current_zoom > map.getZoom()) {
        zoom_factor *= 2;
    } else if (current_zoom < map.getZoom()) {
        zoom_factor /= 2;
    }

    // console.log(zoom_factor);


    /* 
     * Mise à jour des durées des rames si modification du zoom
     * Non fonctionnel
     */

    // if (current_zoom != map.getZoom()) {

    //     d3.selectAll('.train').each(function(d, i) {

    //         var current_train = d3.select(this);
    //         var line = d3.select(this).attr("line");

    //         var duration = 0;

    //         if (line == "301")
    //             duration = durationA / (divider * zoom_factor);
    //         else if (line == "201")
    //             duration = durationB / (divider * zoom_factor);
    //         else if (line == "303")
    //             duration = durationC / (divider * zoom_factor);
    //         else if (line == "304")
    //             duration = durationD / (divider * zoom_factor);
    //         else if (line == "F1")
    //             duration = durationD / (divider * zoom_factor);
    //         else if (line == "F2")
    //             duration = durationD / (divider * zoom_factor);

    //         console.log("New duration : " + duration);
    //         current_train.transition().duration(duration);
    //     });
    // }

    var bounds = __path__.bounds(_collection);
    var topLeft = bounds[0];
    var bottomRight = bounds[1];


    // Affichage ou masquage des pie charts (donuts) en fonction du zoom
    d3.selectAll('.pie').each(function(d, i) {

        var bike_station_id = d3.select(this).attr("bike_station");
        var line = d3.select(this).attr("line");

        var bike_station = nearby_bike_stations[line][bike_station_id];
        var point = map.latLngToLayerPoint(new L.LatLng(bike_station.latitude, bike_station.longitude));
        d3.select(this).attr("transform", "translate(" + point.x + "," + point.y + ")");

        if (map.getZoom() >= 15) {
            d3.select(this).classed("hiddenLine", false);

        } else {
            d3.select(this).classed("hiddenLine ", true);
        }
    });

    // Affichage ou masquage des cercles concentriques en fonction du zoom
    d3.selectAll('.ring').each(function(d, i) {

        if (map.getZoom() >= 15) {
            d3.select(this).classed("hiddenLine", false);

        } else {
            d3.select(this).classed("hiddenLine ", true);
        }
    });

    svg.attr("width", bottomRight[0] - topLeft[0])
        .attr("height", bottomRight[1] - topLeft[1])
        .style("left", (topLeft[0]) + "px")
        .style("top", (topLeft[1]) + "px");

    g.attr("transform", "translate(" + (-topLeft[0]) + "," + (-topLeft[1]) + ")");

    _feature.attr("d", __path__);

    current_zoom = map.getZoom();
}

function getTransform(_node) {
    var p = _node.getPointAtLength(0)
    return "translate(" + [p.x, p.y] + ")";
}

// Use Leaflet to implement a D3 geometric transformation.
function projectPoint(_x, _y) {
    var point = map.latLngToLayerPoint(new L.LatLng(_y, _x));
    this.stream.point(point.x, point.y);
}

// Retourne la distance entre 2 points (lat,lon)
function getDistance(_lat1, _lat2, _lon1, _lon2) {

    var earthRadius = 6371000; //meters

    var dLat = toRad(_lat2 - _lat1);
    var dLng = toRad(_lon2 - _lon1);

    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(_lat1)) * Math.cos(toRad(_lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);

    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadius * c;
}

function toRad(_value) {
    return _value * Math.PI / 180;
}


/*
 * Renvoie la liste des arrêts pour la ligne "line"
 */
function getEffectiveStopPointsForJSON(_line) {

    result = [];

    var journeyPattern = _line.ChouettePTNetwork.ChouetteLineDescription.JourneyPattern;

    for (var i = 0; i < journeyPattern.length; i++) {

        for (var j = 0; j < journeyPattern[i].stopPointList.length; j++) {

            if (result.indexOf(journeyPattern[i].stopPointList[j]) === -1) {
                var value = journeyPattern[i].stopPointList[j];
                var id = value.substring(value.lastIndexOf(":") + 1);
                result.push(id);
            }
        }
    }
    return result;
}


/*
 * Ajoute les points d'arrêts pour la ligne "line" dans l'objet global "stop_points"
 */
function loadStopPoints(_line, effective_stop_points) {

    var current_line = _line.ChouettePTNetwork.PTNetwork.lineId.substring(_line.ChouettePTNetwork.PTNetwork.lineId.lastIndexOf(":") + 1);
    current_line = current_line.substring(0, 3);


    var points = _line.ChouettePTNetwork.ChouetteLineDescription.StopPoint;

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
}


/*
 * Ajoute des horaires d'arrêts pour la ligne "-_line" dans l'objet global "stop_times"
 */
function loadStopTimes(_line) {

    var current_line = _line.ChouettePTNetwork.PTNetwork.lineId.substring(_line.ChouettePTNetwork.PTNetwork.lineId.lastIndexOf(":") + 1);
    current_line = current_line.substring(0, 3);

    stop_times[current_line] = {};

    // Création d'un nouveau hash 
    // { VehicleJourneyId -> {vehicleJourneyAtStop -> arrivalTime} }
    var vehicle_journey = getListVehicleJourney(_line);


    // Récupération des calendriers
    var timetables = _line.ChouettePTNetwork.Timetable;

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

    console.log(JSON.stringify(stop_times));
    // console.log(stop_times);

}


/*
 *
 */
function getCalendars(_periodStart, _periodEnd, _days_to_compare) {

    var result = [];

    for (var d = new Date(_periodStart); d <= new Date(_periodEnd); d.setDate(d.getDate() + 1)) {

        if (Array.isArray(_days_to_compare)) {
            if (_days_to_compare.indexOf(days[d.getDay()]) !== -1) {
                result.push(formatDate(d));
            }
        } else {
            if (_days_to_compare === days[d.getDay()]) {
                result.push(formatDate(d));
            }
        }
    }

    return result;
}


/*
 * Formatage de la date de la forme YYYY-MM-DD
 */
function formatDate(_date) {
    var d = new Date(_date),
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
function getListVehicleJourney(_line) {

    var hash = {};

    // Parcourt des stopTimes pour les affecter aux vehicleJourneyId
    var vehicle_journeys = _line.ChouettePTNetwork.ChouetteLineDescription.VehicleJourney;

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
 * Non utilisé
 */
function getExtremitiesOfJourney(_line) {

    var hash = {};

    // Parcourt des stopTimes pour les affecter aux vehicleJourneyId
    var vehicle_journeys = _line.ChouettePTNetwork.ChouetteLineDescription.VehicleJourney;

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

function loadBikeStationsHistory(_history) {

    console.log("loadBikeStationsHistory");

    for (var id in _history) {

        // console.log(history[id]["values"]);

        if (!bike_stations_history[id])
            bike_stations_history[id] = {};

        for (var j = 0; j < _history[id]["values"].length; j++) {

            var value = _history[id]["values"][j];

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
    // console.log(bike_stations_history)
}


/*
 * Affichage des lignes secondaires
 */
function displaySecondaryLine(_data, _type) {

    // console.log(_data);

    var path = d3.geo.path().projection(transform);

    var feature = g.selectAll('.' + _type)
        .data(_data.features)
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
        reset(path, _data, feature);
    });

    reset(path, _data, feature);
}

/*
 * Affichage des stations Vélo'v
 */
function displayBikeStations(_data) {

    var path = d3.geo.path().projection(transform);

    var feature = g.selectAll('.pathVelov')
        .data(_data.features)
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
            var mouse = d3.mouse(g.node()).map(function(d) {
                return parseInt(d);
            });

            tooltip.classed('hidden', false)
                .attr('style', 'left:' + (mouse[0] + 10) + 'px; top:' + (mouse[1] + 10) + 'px')
                .html(d.properties.nom + "<br>Id station : " + d.properties.idstation + "<br>Nb de bornes : " + d.properties.nbbornettes + "<br>Station bonus : " + d.properties.stationbonus);
            d3.select(this).style("stroke", "red");
        })
        .on('mouseout', function() {
            tooltip.classed('hidden', true);
            d3.select(this).style("stroke", "black");
        });

    map.on("viewreset", function() {
        reset(path, _data, feature);
    });

    reset(path, _data, feature);
}


/*
 * Affichage des stations de métro
 */
function displayMetroStations(_data) {

    var path = d3.geo.path().projection(transform);

    var feature = g.selectAll('.pathStationsMetro')
        .data(_data.features)
        .enter().append("path")
        .classed("stationsMetro", true)
        .attr("id", function(d) {
            return d.properties.id;
        })
        .style({
            'stroke-width': 2,
            'stroke-linejoin': 'round',
            'stroke-linecap': 'round'
        })
        .style("stroke", function(d) {
            return "black";
            var id = d.properties.desserte.substring(0, 3);
            var array = details_line[id].color.split(" ");
            var color = (d3.rgb(array[0], array[1], array[2])).toString();
            return color;
        })
        .style("fill", function(d) {
            return "white";
            var id = d.properties.desserte.substring(0, 3);
            var array = details_line[id].color.split(" ");
            var color = (d3.rgb(array[0], array[1], array[2])).toString();
            return color;
        });

    map.on("viewreset", function() {
        reset(path, _data, feature);
    });

    reset(path, _data, feature);
}

/*
 * Affichage des stations de métro
 */
function displayMetroLines(_data) {

    var path = d3.geo.path().projection(transform);

    var feature = g.selectAll('.pathMetroLine')
        .data(_data.features)
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

            if (map.getZoom() >= 15) {
                d3.selectAll('.pie').filter(".p" + selectedLine).each(function(d, i) {
                    d3.select(this).classed("hiddenLine", false);
                });
            }


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
        reset(path, _data, feature);
    });

    reset(path, _data, feature);
}

function arcTween(_a) {
    var i = d3.interpolate(this._current, _a);
    this._current = i(0);
    return function(t) {
        return arc(i(t));
    };
}


function change(_id, _data) {

    // console.log("Change");

    p = d3.selectAll("#pie-velov-" +
        _id);
    p.data(pie(_data));
    p.transition().duration(500).attrTween("d", arcTween); // redraw the arcs
}


/*
 * Création et animation des rames de métro
 */
function animateMetro() {

    var nodes = d3.selectAll('.lineMetro')[0];

    nodes.forEach(function(data, i) {

        var nb_stations_rencontrees = 0;

        var nb_stations = [];

        var current_line = d3.select(data).attr("code_titan");

        if (stop_times[current_line]) {

            var journeys = stop_times[current_line][current_day];

            var index = 0;

            var interval = setInterval(function() {

                    // console.log(continue_draw_trains);

                    if (!continue_draw_trains)
                        clearInterval(interval);
                    else {
                        if (index >= Object.keys(journeys).length) {
                            clearInterval(interval);
                            console.log("Arrêt des métros");
                        } else {

                            // console.log(journeys);
                            var key = Object.keys(journeys)[index];
                            // console.log(journeys[key]);

                            var key2 = Object.keys(journeys[key])[0];
                            // console.log(journeys[key][key2]);

                            // Mise à jour de l'affichage de l'heure
                            d3.select('#hour').html(journeys[key][key2].slice(0, 5));


                            var path_length_n = data.getTotalLength();
                            var actived = true;

                            var circle = g.append("circle")
                                .attr("r", 8)
                                .attr("fill", data.style["stroke"])
                                .attr("transform", getTransform(data))
                                .attr('fill-opacity', 0.5)
                                .classed("train", true)
                                .attr("line", current_line)
                                .attr("journey", function() {
                                    // console.log(Object.keys(journeys)[index]);
                                    return Object.keys(journeys)[index];
                                })
                                .classed("hiddenLine", function(d) {
                                    if (selectedLine == "")
                                        return false;
                                    else if (d3.select(data).attr("code_titan") == selectedLine)
                                        return false;
                                    else
                                        return true;
                                })
                                .classed("t" + d3.select(data).attr("code_titan"), d3.select(data).attr("code_titan"))
                                .transition()
                                .duration(function() {
                                    if (d3.select(data).attr("ligne") == "A")
                                        return durationA / (divider * zoom_factor);
                                    else if (d3.select(data).attr("ligne") == "B")
                                        return durationB / (divider * zoom_factor);
                                    else if (d3.select(data).attr("ligne") == "C")
                                        return durationC / (divider * zoom_factor);
                                    else if (d3.select(data).attr("ligne") == "D")
                                        return durationD / (divider * zoom_factor);
                                    else if (d3.select(data).attr("ligne") == "F1")
                                        return durationF1 / (divider * zoom_factor);
                                    else if (d3.select(data).attr("ligne") == "F2")
                                        return durationF2 / (divider * zoom_factor);
                                    else
                                        return duration / zoom_factor;
                                })
                                .ease("linear")
                                .remove()
                                .attrTween("transform", function(d, i) {

                                    return function(t) {

                                        var p;

                                        if (d3.select(data).attr("sens") == "Aller")
                                            p = data.getPointAtLength(path_length_n * t);
                                        else
                                            p = data.getPointAtLength(path_length_n - path_length_n * t);

                                        var coord = map.layerPointToLatLng(L.point(p.x, p.y));

                                        var code_titan = d3.select(data).attr("code_titan");
                                        var scale = 1;

                                        for (var key in stop_points.features) {

                                            var value = stop_points.features[key];

                                            var dist_to_metro_station = getDistance(value.geometry.coordinates[1], coord.lat, value.geometry.coordinates[0], coord.lng);

                                            // Si la rame est proche d'une station de métro
                                            if (dist_to_metro_station < 20) {

                                                scale = 2 - (dist_to_metro_station / 40);

                                                // On regarde parmi les stations de Vélo'v voisines
                                                for (var bike_station_id in nearby_bike_stations[code_titan]) {

                                                    var bike_station = nearby_bike_stations[code_titan][bike_station_id];

                                                    var dist_to_bike_station = getDistance(bike_station.latitude, coord.lat, bike_station.longitude, coord.lng);

                                                    // Si la rame est proche de la station de Vélo'v
                                                    if (dist_to_bike_station < distanceToStation) {

                                                        if (selectedLine == "" || (selectedLine != "" && d3.select(data).attr("code_titan") == selectedLine)) {
                                                            // if (d3.select(data).attr("code_titan") == "301") {

                                                            var id = "velov-" + bike_station_id;

                                                            var h = bike_stations_history["velov-" + bike_station_id];

                                                            var current_station_id = value.properties.id.substring(value.properties.id.lastIndexOf(":") + 1);

                                                            if (h) {
                                                                if (h[current_day]) {

                                                                    var current_station_id = value.properties.id.substring(value.properties.id.lastIndexOf(":") + 1);
                                                                    // if (current_station_id == "7606") {

                                                                    var journey_id = Object.keys(journeys)[index];
                                                                    var journey = journeys[journey_id];

                                                                    var passage_time = journey[current_station_id];
                                                                    var passage_date = new Date(current_day + "T" + passage_time);

                                                                    passage_date.setTime(passage_date.getTime() + passage_date.getTimezoneOffset() * 60 * 1000);

                                                                    var coeff = 1000 * 60 * 5;
                                                                    var rounded = new Date(Math.round(passage_date.getTime() / coeff) * coeff);

                                                                    var date_before;
                                                                    var date_after;

                                                                    // Intervalle de 5 minutes
                                                                    // [t+0 ; t+5] ou [ t-5 ; t+0]
                                                                    if (passage_date < rounded) {
                                                                        date_before = new Date(rounded.getTime() - 5 * 60000);
                                                                        date_after = rounded;
                                                                    } else {
                                                                        date_after = new Date(rounded.getTime() + 5 * 60000);
                                                                        date_before = rounded;
                                                                    }


                                                                    if (h[current_day][date_before.toLocaleTimeString()] && h[current_day][date_after.toLocaleTimeString()]) {

                                                                        var new_data = [{
                                                                            "type": "available_bikes",
                                                                            "number": h[current_day][date_after.toLocaleTimeString()].available_bikes
                                                                        }, {
                                                                            "type": "available_bike_stands",
                                                                            "number": h[current_day][date_after.toLocaleTimeString()].available_bike_stands
                                                                        }];

                                                                        change(bike_station_id, new_data);


                                                                        var available_bikes_offset = h[current_day][date_after.toLocaleTimeString()].available_bikes - h[current_day][date_before.toLocaleTimeString()].available_bikes;

                                                                        if (available_bikes_offset < 0) {
                                                                            // if (available_bikes_offset < 0 && current_station_id == "6004") {
                                                                            // if (available_bikes_offset < 0 && current_station_id == "7608") {

                                                                            // console.log(available_bikes_offset);

                                                                            var point = map.latLngToLayerPoint(new L.LatLng(bike_station.latitude, bike_station.longitude));

                                                                            var nb_circles = 0;

                                                                            // console.log("To do : " + Math.abs(available_bikes_offset));

                                                                            // if (map.getZoom() < 15) {
                                                                            var y = setInterval(function() {
                                                                                // console.log("    nb_circles : " + nb_circles + "/" + available_bikes_offset);
                                                                                // console.log(nb_circles + "/" + available_bikes_offset);

                                                                                if (nb_circles > Math.abs(available_bikes_offset)) {
                                                                                    clearInterval(y);
                                                                                } else {
                                                                                    // console.log(nb_circles);
                                                                                    g.append("circle")
                                                                                        .classed("ring", true)
                                                                                        .classed("r" + selectedLine, selectedLine)
                                                                                        .classed("hiddenLine", function(d) {
                                                                                            if (map.getZoom() >= 15) {
                                                                                                return true;
                                                                                            } else {
                                                                                                if (selectedLine == "")
                                                                                                    return false;
                                                                                                else if (d3.select(data).attr("code_titan") == selectedLine)
                                                                                                    return false;
                                                                                                else
                                                                                                    return true;
                                                                                            }
                                                                                        })
                                                                                        .attr("bike_station", current_station_id)
                                                                                        .attr("line", code_titan)
                                                                                        .attr("transform", "translate(" + point.x + ", " + point.y + ")")
                                                                                        .attr("r", 6)
                                                                                        .style("stroke-width", 1)
                                                                                        .style("stroke", "red")
                                                                                        .transition()
                                                                                        .ease("linear")
                                                                                        .duration(1000)
                                                                                        .style("stroke-opacity", 1e-6)
                                                                                        .style("stroke-width", 1)
                                                                                        .style("stroke", "brown")
                                                                                        .attr("r", 50)
                                                                                        .remove();
                                                                                }

                                                                                nb_circles++;

                                                                            }, ring_interval);
                                                                            // }
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }

                                        return "translate(" + [p.x, p.y] + ")scale(" + scale + ")";
                                    }
                                });

                            index++;
                        }
                    }
                    // }, delay_between_metro);
                },
                // Tentative de moduler la fréquence des rames de métro
                // pour montrer l'évolution du nombre de rames entre le matin/soir et en journée (pics).
                // Mais setInterval() ne permet pas de modifier la durée de l'interval de façon dynamique
                getDelayBetweenMetro());
        }
    });

}

function displayDonuts() {

    var data1 = [{
        "type": "available_bikes",
        "number": 0
    }, {
        "type": "available_bike_stands",
        "number": 20
    }];

    for (var line in nearby_bike_stations) {

        for (var bike_station_id in nearby_bike_stations[line]) {

            var bike_station = nearby_bike_stations[line][bike_station_id];
            var point2 = map.latLngToLayerPoint(new L.LatLng(bike_station.latitude, bike_station.longitude));

            var feature = g.selectAll('.pathPie')
                .data(pie(data1))
                .enter()
                .append("path")
                .attr("id", "pie-velov-" + bike_station_id)
                .attr("line", line)
                // .attr("data-legend", "test")
                // .style("fill", function(d, i) {
                //     return color(d.data.type);
                // })
                .classed("hiddenLine", function() {
                    if (map.getZoom() >= 15)
                        return false;
                    else
                        return true;
                })
                .classed("pie", true)
                .attr("bike_station", bike_station_id)
                .classed("p" + line, line)
                .classed("" + line, line)
                .attr("fill", function(d, i) {
                    return color(d.data.type);
                })
                .attr("transform", "translate(" + point2.x + "," + point2.y + ")");

            feature.transition()
                .duration(500)
                .attr("fill", function(d, i) {
                    return color(d.data.type);
                })
                .attr("d", arc)
                .each(function(d) {
                    this._current = d;
                }); // enregistre l'angle initial
        }
    }

    // legend = svg.append("g")
    //     .attr("class", "legend")
    //     .attr("transform", "translate(500,300)")
    //     .style("font-size", "12px")
    //     .call(d3.legend);
}

function getDelayBetweenMetro() {

    // console.log("delay_between_metro : " + delay_between_metro);

    return delay_between_metro;
}