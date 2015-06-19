var width = 600, height = 800, padding = 20;
var transfers, cTransfers = {}, countries =[];
var stadiums, vertices, vPath;
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

var voronoi = d3.geom.voronoi()
	.clipExtent([[-10, 0], [width, height]]);

var capScale; 

var svg;

var cap_scale_color = d3.scale.linear()
	.domain([0,1])
	.range(["green","red"])

function startup(){
	svg = d3.select("#svgmap").attr("height",height).attr("width",width);
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
	d3.json("uk.json", function(error, uk) {
	  if (error) return console.error(error);
	  
	  var subunits = topojson.feature(uk, uk.objects.subunits);
		  
	  var zoom = d3.behavior.zoom()
	    .translate(projection.translate())
	    .scale(projection.scale())
	    .scaleExtent([minScale,1000000])
	    .on("zoom", zoomed);
	  
	  svg.call(zoom);
	  
	  /* svg.append("path")
	      .datum(subunits)
	      .attr("d", path); */
	  
	  vPath = svg.append("g").attr("id","voronoi").selectAll("path");
	  
	  svg.append("g").attr("id","vMap").selectAll(".subunit")
		  .data(topojson.feature(uk, uk.objects.subunits).features)
		  .enter().append("path")
		  .attr("class", function(d) { return "subunit " + d.id; })
		  .attr("d", path);
	  
	d3.csv("stadiums.csv")
		.row(function(d) { 
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
			stadiums = d3.selectAll(rows).filter(function(d, i){
				if (rows[i].league!="International"){
					return true;
				} else {
					return false;
				}
			})[0];
			cap_scale_color
				.domain([10,d3.max(stadiums,function(d){return d.capacity})])
			renderStadiums(stadiums);
			vertices = stadiums.map(function(d) {
				return [projection([d.longitude,d.latitude])[0], projection([d.longitude,d.latitude])[1]];
			});
			console.log(vertices);
			vPath = vPath.data(voronoi(vertices), polygon);
			
			vPath.enter().append("path")
		      .attr("d", polygon)
		      .attr("team",function(d,i){
		    	  return stadiums[i].team;
		      })
		      .attr("capacity",function(d,i){
		    	  return stadiums[i].capacity;
		      })
		      .style("fill",function(d, i){
		    	  return cap_scale_color(stadiums[i].capacity)
		      })
		      .attr("fan-density", function(d,i){
		    	  return stadiums[i].capacity/d3.geom.polygon(d).area();
		      })
		      .on("click", function(d,i){
		    	  console.log(d);
		    	  console.log(d3.geom.polygon(d).area());
		      })
		      .on("mouseover", function(d, i){
		    	  segmentMouseOver(stadiums[i])
		      })
		      .on("mouseout", function(d, i){
		    	  segmentMouseOut(stadiums[i]);
		      });
		});
	});
}

function polygon(d) {
  return "M" + d.join("L") + "Z";
}

function renderStadiums(stads){	
	svg.append("g").attr("id","vStadiums").selectAll("circle")
		.data(stads)
		.enter()
		.append("circle")
		.attr("cx",function(d){return projection([d.longitude,d.latitude])[0];})
		.attr("cy",function(d){return projection([d.longitude,d.latitude])[1];})
		.attr("r",1)
		.style("fill","black")
}

function segmentMouseOver(d){
	var team = d.team;
	d3.select("#team").text(team);
	var ins = document.getElementById("ins"); ins.innerHTML = "";
	var outs = document.getElementById("outs"); outs.innerHTML = "";
	// change label using d3
	var label = d3.select("#label")
		.style("display","block");
	label.style("left",projection([d.longitude,d.latitude])[0]+window.scrollX-(label.property("clientWidth")/2)+2+"px")
		.style("top",projection([d.longitude,d.latitude])[1]+window.scrollY-label.property("clientHeight")-8+"px");
	d3.select("#teamName").text(team);
	d3.select("#stadName").text(d.name);
	d3.select("#capacityLabel").text(d.capacity);
}

function segmentMouseOut(s, d){
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
		.attr("r",1)
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

  //var oldCenter = projection.invert(projection.center());
  projection.translate(d3.event.translate).scale(d3.event.scale);
  //var currentClip = voronoi.clipExtent([[],[]]);
  //voronoi.clipExtent([[],[]]);
  /*var newCenter = projection.invert(projection.center());
  console.log(newCenter[0])
  if (newCenter[0]<centerLimits.minLong){
	  projection.center(oldCenter);
  }*/
  svg.select("#vMap").selectAll("path").attr("d", path);
  
  svg.select("#vStadiums").selectAll("circle")
	.attr("cx",function(d){return projection([d.longitude,d.latitude])[0];})
	.attr("cy",function(d){return projection([d.longitude,d.latitude])[1];})
	
  updateVoronoi();
  /*vertices = stadiums.map(function(d) {
	console.log(d.longitude+" "+d.latitude);
	return [projection([d.longitude,d.latitude])[0], projection([d.longitude,d.latitude])[1]];
  });*/
  //vPath = vPath.data(voronoi(vertices), polygon);
    
}

function updateVoronoi(){
	vertices = stadiums.map(function(d) {
		return [projection([d.longitude,d.latitude])[0], projection([d.longitude,d.latitude])[1]];
	});
	
	d3.selectAll("#voronoi path")
		.data(voronoi(vertices))
		.attr("d",polygon);
}

function numberWithCommas(x) {
	str = x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return str;
}
