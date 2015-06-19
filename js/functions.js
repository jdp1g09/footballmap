var width = 600, height = 800, padding = 20;
var transfers, cTransfers = {}, countries =[];
var stadiums;
var zoomedOut = false;
var minScale = 1500;
var startScale = 4500;
var centerLimits = {
		minLat : 37,
		minLong : -14.5,
		maxLat : 70,
		maxLong : 16.5
}
//The ALbers equal-conic area projection (center default 55.4)
var projection = d3.geo.albers()
  .center([0, 54.5])
  .rotate([4.4, 0])
  .parallels([50, 60])
  .scale(startScale)
  .translate([width / 2, height / 2]);
  
var path = d3.geo.path()
	.projection(projection);

var capScale; 

var svg;

function startup(){
	svg = d3.select("#map").attr("height",height).attr("width",width);
	renderUK();
}

function getStadium(teamname){
	stadiums.forEach(function(entry) {
	    if (entry.team == teamname){
	    	return entry;
	    }
	});
}
	
function renderUK(){	
	d3.json("world2.json", function(error, uk) {
	  if (error) return console.error(error);
	  
	  var subunits = topojson.feature(uk, uk.objects.countries);
	
    /*d3.json("world.json", function(error, world) {
	  if (error) return console.error(error);
	  
	  var subunits = topojson.feature(world, world.features);*/
		  
	  var zoom = d3.behavior.zoom()
	    .translate(projection.translate())
	    .scale(projection.scale())
	    .scaleExtent([minScale,1000000])
	    .on("zoom", zoomed);
	  
	  svg.call(zoom);
	  
	  /* svg.append("path")
	      .datum(subunits)
	      .attr("d", path); */
	  
	  svg.append("g").attr("id","map").selectAll(".subunit")
	  .data(topojson.feature(uk, uk.objects.countries).features)
	  .enter().append("path")
	    .attr("class", function(d) { return "subunit " + d.id; })
	    .attr("d", path);
	  
	  /*svg.append("g").attr("id","map").selectAll(".subunit")
		  .data(world.features)
		  .enter().append("path")
		    .attr("class", function(d) { return "subunit " + d.id; })
		    .attr("d", path);*/
	
	d3.csv("stadiums.csv")
		.row(function(d) { 
			pushIfNotAlreadyIn(countries, d.Country);
			return {
				name: d["Stadium name"], 
				team: d.Team,
				league: d.League,
				country: d.Country,
				capacity: +d.Capacity,
				latitude: +d.Latitude,
				longitude: +d.Longitude
			};
		})
		.get(function(error, rows) {
			populateCTransfers();
			stadiums = rows;
			capScale = d3.scale.linear().domain([0, 800]).range([0, 800]);
			d3.csv("summer2013.csv")
				.row(function(d) { 
					// create emptry team object
					var fromObj = {
			    			team: d.From,
			    			country : "",
							latitude: 0,
							longitude: 0
				    	}, 
				    	toObj = {
			    			team: d.To,
			    			country: "",
							latitude: 0,
							longitude: 0
				    	};
					// create from team object
					stadiums.forEach(function(entry) {
					    if (entry.team == d.From){
					    	fromObj = {
				    			team: d.From,
								latitude: entry.latitude,
								longitude: entry.longitude,
								country: entry.country
					    	}
					    }
					});
					// create to team object
					stadiums.forEach(function(entry) {
						if (entry.team == d.To){
					    	toObj = {
				    			team: d.To,
								latitude: entry.latitude,
								longitude: entry.longitude,
								country: entry.country
					    	}
					    }
					});
					var transferObj = {
						player: d.Player, 
						from: fromObj,
						to: toObj,
						fee: +d.fee,
						date: d.Date
					};
					if (fromObj.country!=""&&toObj.country!=""){
						cTransfers[fromObj.country][toObj.country].noPlayers++;
						cTransfers[fromObj.country][toObj.country].totalFees += transferObj.fee;
					}
					return transferObj;
					// filter out data that goes to teams not in the stadium dataset
					/*if (toObj.latitude!=0&&fromObj.latitude!=0){
						return transferObj;
					}*/
				})
				.get(function(error, rows) { 
					transfers = rows;
					renderTransfers(transfers);
					renderStadiums(stadiums);
				});
			});
		});
}

function pushIfNotAlreadyIn(array, item){
	var matches = d3.selectAll(array).filter(function(d, i){
		if (array[i]==item){
			return true;
		} else {
			return false;
		}
	});
	
	if (matches[0].length==0){
		array.push(item);
	}
}

function populateCTransfers(){
	for (var c = 0, country; country = countries[c]; c++){
		cTransfers[country] = {};
		for (var c1 = 0, country1; country1 = countries[c1]; c1++){
			cTransfers[country][country1] = {
					noPlayers : 0,
					totalFees : 0
			}
		}
	}
}

function renderStadiums(stads){	
	svg.append("g").attr("id","stadiums").selectAll("circle")
		.data(stads)
		.enter()
		.append("circle")
		.attr("cx",function(d){return projection([d.longitude,d.latitude])[0];})
		.attr("cy",function(d){return projection([d.longitude,d.latitude])[1];})
		.attr("r",2)
		.style("fill","red")
		.on("mouseover", function(d){
			stadiumMouseOver(this, d, 5)
		})
		.on("mouseout", function(d){
			stadiumMouseOut(this, d, 2);
		})
}

function renderTransfers(data){
	var lines = svg.append("g").attr("id","transfers")
		.selectAll("line")
		.data(data);
	
	lines.enter().append("line")
		.attr("x1", function(d, i){
			return projection([d.from.longitude, d.from.latitude])[0];
		})
		.attr("y1", function(d){
			return projection([d.from.longitude, d.from.latitude])[1]
		})
		.attr("x2", function(d){
			return projection([d.to.longitude, d.to.latitude])[0];
		})
		.attr("y2", function(d){
			return projection([d.to.longitude, d.to.latitude])[1];
		})
		.style("stroke","black")
		.style("stroke-width",0.1);
	
	lines.exit().style("display","none");
}

function renderCTransfers(){
	d3.selectAll(transfers).filter(function(d, i){
		if (transfers[i].from.country == "England"){
			return true;
		} else {
			return false;
		}
	});
	console.log(d3.selectAll(stadiums).filter(function(d, i){
		if (stadiums[i].league == "International"){
			return true;
		} else {
			return false;
		}
	}));
}

function showCountries(){
	d3.selectAll("#stadiums circle")
		.style("display","none")
		.style("opacity",0)
		.filter(function(d){
			if (d.league == "International"){
				return true;
			} else {
				return false;
			}
		})
		.transition().duration(500)
		.style("opacity",1)
		.attr("r",10)
		.style("display","block")
		
	d3.selectAll("#stadiums circle")
		.style("display","none")
		.style("opacity",0)
		.filter(function(d){
			if (d.league == "International"){
				return true;
			} else {
				return false;
			}
		})
		.on("mouseover", function(d){
			stadiumMouseOver(this, d, 12);
		})
		.on("mouseout", function(d){
			stadiumMouseOut(this, d, 10);
		});
}

function stadiumMouseOver(s, d, newRadius){
	var team = d.team;
	d3.select("#team").text(team);
	var ins = document.getElementById("ins"); ins.innerHTML = "";
	var outs = document.getElementById("outs"); outs.innerHTML = "";
	d3.select(s).transition().duration(250).attr("r", newRadius);
	// change label using d3
	var label = d3.select("#label")
		.style("display","block");
	label.style("left",d3.event.x+window.scrollX-(label.property("clientWidth")/2)+2+"px")
		.style("top",d3.event.y+window.scrollY-label.property("clientHeight")-8+"px");
	d3.select("#teamName").text(team);
	d3.select("#stadName").text(d.name);
	d3.select("#capacityLabel").text(d.capacity);
	var team_money = {
			ins: 0,
			outs: 0
	};
	d3.selectAll("line")
	  .filter(function(d){
	    if (d.to.team == team){
	    	return true;
	    } else {
	    	return false;
	    }
	  })
	  .style("stroke","green")
	  .style("stroke-width",1)
	  .each(function(d){
		  team_money.ins += d.fee;
		  var tr = document.createElement("tr");
		  var td = document.createElement("td");
		  td.innerHTML = d.player;
		  td.setAttribute("style","text-align:left");
		  tr.appendChild(td);
		  var td = document.createElement("td");
		  td.innerHTML = d.from.team;
		  tr.appendChild(td);
		  var td = document.createElement("td");
		  td.innerHTML = '\u00A3'+numberWithCommas(d.fee);
		  tr.appendChild(td);
		  ins.appendChild(tr);
	  });
	
	d3.selectAll("line")
	  .filter(function(d){
	    if (d.from.team == team){
	    	return true;
	    } else {
	    	return false;
	    }
	  })
	  .style("stroke","red")
	  .style("stroke-width",1)
	  .each(function(d){
		  team_money.outs += d.fee;
		  var tr = document.createElement("tr");
		  var td = document.createElement("td");
		  td.innerHTML = d.player;
		  td.setAttribute("style","text-align:left");
		  tr.appendChild(td);
		  var td = document.createElement("td");
		  td.innerHTML = d.to.team;
		  tr.appendChild(td);
		  var td = document.createElement("td");
		  td.innerHTML = '\u00A3'+numberWithCommas(d.fee);
		  tr.appendChild(td);
		  outs.appendChild(tr);
	  });	
	d3.select("#inSum").text('\u00A3'+numberWithCommas(team_money.ins));
	d3.select("#outSum").text('\u00A3'+numberWithCommas(team_money.outs));
}

function stadiumMouseOut(s, d, newRadius){
	d3.select(s).transition().duration(500).attr("r",newRadius);
	d3.select("#label")
		.style("display","none");
	d3.selectAll("line")
		.style("stroke","black")
		.style("stroke-width",0.1);
}

function showStadiums(){
	d3.selectAll("#stadiums circle")
		.style("display","")
		.style("display","block")
		.transition().duration(1000)
		.style("opacity",1)
		.attr("r",2)
		.filter(function(d){
			if (d.league == "International"){
				return true;
			} else {
				return false;
			}
		})
		.style("display","none");
}

function minCapacity(slidebar){
	val = slidebar.value;
	
	d3.selectAll("#stadiums circle")
		.style("fill","black")
		.filter(function(d){
			if (d.capacity>val){
				return true
			} else return false;
		})
		.style("fill","red");
	
	d3.select("#capacity").text(val);
}
	
function zoomed() {
  /*console.log(d3.event.scale);
  console.log(d3.event.translate);*/
  // TODO: set limits of scale = 1000
  // TODO: set limits of translate = [230.67978811959614, 359.65795640628005]
  if (d3.event.scale<startScale && !zoomedOut){
	  zoomedOut = true;
	  showCountries();
  } else if (d3.event.scale>startScale && zoomedOut){
	  zoomedOut = false;
	  showStadiums();
  }
  //var oldCenter = projection.invert(projection.center());
  projection.translate(d3.event.translate).scale(d3.event.scale);
  /*var newCenter = projection.invert(projection.center());
  console.log(newCenter[0])
  if (newCenter[0]<centerLimits.minLong){
	  projection.center(oldCenter);
  }*/
  svg.selectAll("path").attr("d", path);
  svg.selectAll("circle")
  	.attr("cx",function(d){return projection([d.longitude,d.latitude])[0];})
	.attr("cy",function(d){return projection([d.longitude,d.latitude])[1];})
  svg.selectAll("line")
  	.attr("x1",function(d){return projection([d.from.longitude,d.from.latitude])[0];})
	.attr("y1",function(d){return projection([d.from.longitude,d.from.latitude])[1];})
	.attr("x2",function(d){return projection([d.to.longitude,d.to.latitude])[0];})
	.attr("y2",function(d){return projection([d.to.longitude,d.to.latitude])[1];})
}

function numberWithCommas(x) {
	str = x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return str;
}
