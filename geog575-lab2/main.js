'use strict';

import { legend } from './color-legend.js';

let year = 2020;
const blue = '#5d80b4';
const red = '#c66154';
const demShareNat = 0.514;
const repShareNat = 0.469;  
let demShare = demShareNat;
let repShare = repShareNat;
const duration = 1000;
let counties, states, countyData;

$(document).ready(() => {
    $('#d3BubbleLegend').hide();
    $('#d3BubbleMap').hide();
    $('#exampleModal').modal('show');

    setListeners();
    setMap();
});

function setListeners() {
    $('input[name="flexRadioDefault"]').on('click', e => {
        // d3.select('#d3Legend > *').remove();
        // d3.select('#d3Map > *').remove();
        // svg.selectAll()
        // createViz();
        let active = e.target.id;
        if (active === 'choroRadio') {
            $('#d3BubbleLegend').hide();
            $('#d3BubbleMap').hide();
            $('#d3ChoroLegend').show();
            $('#d3ChoroMap').show();
        }  else {
            $('#d3ChoroLegend').hide();
            $('#d3ChoroMap').hide();
            $('#d3BubbleLegend').show();
            $('#d3BubbleMap').show();
        }
    });


}

//set up choropleth map
function setMap() {
    //use queue to parallelize asynchronous data loading
    const promises = [];
    promises.push(d3.csv('./election20_modified.csv', (d) => {
        return {
            year: +d.year,
            state: d.state,
            state_po: d.state_po,
            county_fips: d.county_fips,
            county_name: d.county_name,
            dem: +d.dem,
            rep: +d.rep,
            total: +d.total
        };
    }));
    promises.push(d3.json('./states.json'));
    promises.push(d3.json('./counties.json'));

    Promise.all(promises).then((values) => {
        [countyData, states, counties] = values;
        createChart();
        createViz();
    });
}


// --------------------------------------------------------
// map creation functions ---------------------------------
// --------------------------------------------------------
function createViz() {
    const divergingScheme = d3.scaleDiverging([-100, 0, 100], d3.interpolateRdBu);
    createCountyMap(counties, countyData, divergingScheme);
    createCountyBubble(counties, states, countyData);
}

function createChart() {
    let color = d3.scaleOrdinal(['d','r'],[red,blue]),
        title = 'NATIONAL',
        tickSize = 6,
        width = 320,
        demShareStr = `${(demShare * 100).toFixed(1)}%`,
        repShareStr = `${(repShare * 100).toFixed(1)}%`,
        height = 44 + tickSize,
        graphHeight = 30,
        marginTop = 18,
        marginRight = 0,
        marginBottom = 16 + tickSize,
        marginLeft = 0,
        svgHtml = 'svg#d3Chart';

    const svg = d3.select(svgHtml)
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height])
        .style("overflow", "visible")
        .style("display", "block");

    // adjust the bars
    svg.append("g")
        .selectAll("rect")
        .data(color.domain())
        .join("rect")
        .attr("id", (x) => {
            if (x === 'd') return 'demBar';
            else return 'repBar';
        })
        .attr("x", (x) => {
            if (x === 'd') return (width * demShare);
            else return -1;
        })
        .attr("y", marginTop)
        .attr("width", (e) => {
            if (e === 'd') return repShare * width;
            else return demShare * width;
        })
        .attr("height", graphHeight)
        .attr("fill", color);

    // add the title
    svg.append("g")
        .attr("transform", `translate(0,${height - marginBottom})`)
        .call(g => g.select(".domain").remove())
        .call(g => g.append("text")
            .attr("x", marginLeft)
            .attr("y", marginTop + marginBottom - height - 6)
            .attr("fill", "currentColor")
            .attr('id','chartTitle')
            .attr("text-anchor", "start")
            .attr("font-weight", "bold")
            .text(title));

    // add the percentages
    svg.selectAll("g") 
        .append("text")
        .attr("id", (x,i) => {
            if (i === 0) return 'demTxt';
            else return 'repTxt';
        })
        .attr("x", (x, i) => {
            if (i === 0) return (width * demShare)/2;
            else return (width * demShare) + ((width * repShare)/2);
        })
        .attr("y", (x,i) => {
            if (i === 0) return 38;
            else return 10;
        })
        .attr("fill", "white")
        .attr("text-anchor", "middle")
        .attr("font-weight", "bold")
        .text((txt, i) => {
            if (i === 0) return demShareStr;
            else return repShareStr;
        });
}

function adjustChart(name, dems, reps) {
    // let demShare = 0.2,
    //     repShare = 0.8;
    const width = 320;
    
    d3.select('rect#demBar')
        .transition()
        .duration(duration)
        .attr('x', width * dems)
        .attr('width', reps * width);

    d3.select('rect#repBar')
        .transition()
        .duration(duration)
        .attr('x', -1)
        .attr('width',dems * width);

    // add the percentages
    d3.select('text#demTxt')
        .style('font-size',() => {
            if (dems < 0.13) return '.75rem';
            else return '1rem';
        })
        .transition()
        .duration(duration)
        .attr("x", (width * dems) / 2)
        .textTween(() =>{
            const i = d3.interpolate(demShare, dems);
            if (dems < 0.13) {
                return (t) => `${(i(t) * 100).toFixed(1)}`;
            } else {
                return (t) => `${(i(t) * 100).toFixed(1)}%`;
            }
        });
    d3.select('text#repTxt')
        .transition()
        .duration(duration)
        .attr("x", (width * dems) + ((width * reps)/2))
        .textTween(() =>{
            const i = d3.interpolate(repShare, reps);
            return (t) => `${(i(t) * 100).toFixed(1)}%`;
        });

    d3.select('text#chartTitle')
        .text(name);

    demShare = dems;
    repShare = reps;
}

function createCountyBubble(counties, states, countyData) {
    const width = 960;
    const height = 350;
    //create new svg container for the map
    let map = d3.select("div#d3BubbleMap")
        .append("div")
        .classed("svg-container", true) //container class to make it responsive
        .append("svg")
        .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("viewBox", `0 0 ${width} ${height}`)
        //class to make it responsive
        .classed("svg-content-responsive", true);

    // create map
    const countyTopo = topojson.feature(counties, counties.objects.usa_election);
    const stateTopo = topojson.feature(states, states.objects.usa_election_state);
    stateTopo.features = stateTopo.features.filter(e => !e.properties.STATEFIP.includes('-s'));
    const projection = d3.geoAlbersUsa().fitSize([width, height], countyTopo);
    const path = d3.geoPath().projection(projection);

    let centroids = {};
    countyTopo.features.map(e => centroids[e.properties.GEOID] = path.centroid(e));
    
    map.selectAll('.states')
        .data(stateTopo.features)
        .enter()
        .append('path')
        .attr('d', path)
        .style('fill', '#ddd')
        .style('stroke-width', '0.5')
        .style('stroke', 'white');
        
    const radius = d3.scaleSqrt([0, d3.max(countyData, d => d.total)], [0.5, 25]);
    map.append("g")
        .attr("fill-opacity", 0.5)
        .attr("stroke", "#fff")
        .attr("stroke-width", 0.5)
        .selectAll("circle")
        .data(countyData
            .filter(d => centroids[d.county_fips])
            .sort((a, b) => d3.ascending(a.total, b.total)))
        .join("circle")
        .attr("fill", d => {
            if (d.dem > d.rep) return blue;
            else return red;
        })
        .attr("transform", d => `translate(${centroids[d.county_fips]})`)
        .attr("r", d => radius(d.total))
        .on('mouseover', (event, d) => mouseOver(d.county_fips, countyData));

    // legend
    const radiusLegend = d3.scaleSqrt([0, d3.max(countyData, d => d.total)], [0.5, 40]);

    const legend = d3.select('svg#d3BubbleLegend')
        .append('svg')
            .append("g")
            .attr("fill", "black")
            .attr("transform", "translate(50,85)")
            .attr("text-anchor", "middle")
            .style("font", "10px sans-serif")
            .selectAll("g")
            .data([66,2132216,4264365])
            .join("g");

    legend.append("circle")
        .attr("fill", "none")
        .attr("stroke", "#ccc")
        .attr("cy", d => -radius(d))
        .attr("r", radiusLegend);

    legend.append("text")
        .attr('class','texthalo')
        .attr("y", d => {
            if (d === 66) return -25;
            else return -3 * radius(d);
        })
        .attr("dy", "2em")
        .attr('font-weight', 900)
        .text(d => d.toLocaleString());
    legend.append('text')
        .attr('y', -125)
        .attr('dy','5em')
        .attr('font-weight', 900)
        .text('Total Population');
}

function createCountyMap(counties, countyData, divergingScheme) {
    // create legend
    legend({
        color: divergingScheme,
        title: "",
        svgHtml: 'svg#d3ChoroLegend',
        width: 250,
        tickFormat: (_, i) => ['R - 100', '50', '0', '50', '100 - D'][i]
    });
    const width = 960;
    const height = 350;
    //create new svg container for the map
    let map = d3.select("div#d3ChoroMap")
        .append("div")
        .classed("svg-container", true) //container class to make it responsive
        .append("svg")
        //responsive SVG needs these 2 attributes and no width and height attr
        .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("viewBox", `0 0 ${width} ${height}`)
        //class to make it responsive
        .classed("svg-content-responsive", true);

    // create map
    const countyTopo = topojson.feature(counties, counties.objects.usa_election);
    const projection = d3.geoAlbersUsa().fitSize([width, height], countyTopo);
    const path = d3.geoPath().projection(projection);
    
    map.selectAll('.counties')
        .data(countyTopo.features)
        .enter()
        .append('path')
        .attr('d', path)
        .style('fill', d => countyChoropleth(countyData, d.properties.GEOID, divergingScheme))
        .style('stroke-width', '0.5')
        .style('stroke', 'black')
        .on('mouseover', (event, d) => mouseOver(d.properties.GEOID, countyData));
}


function mouseOver(fips, csv) {
    let r = csv.filter(e => e.county_fips === fips)[0];
    let name = `${r.county_name}, ${r.state_po}`;
    let dems = r.dem / r.total;
    let reps = r.rep / r.total;
    adjustChart(name, dems, reps);
}


function createStateMap(map, states, state20, state16) {
    const width = 960;
    const height = 350;
    let stateTopo = topojson.feature(states, states.objects.usa_election_state);
    const projection = d3.geoAlbersUsa().fitSize([width, height], stateTopo);
    const path = d3.geoPath().projection(projection);

    map.selectAll(".regions")
        .data(stateTopo.features)
        .enter()
        .append('path')
        .attr('d', path)
        .style("fill", d => {
            if (year === 2020) return stateWinners(state20, d.properties.STATEFIP);
            else return stateWinners(state16, d.properties.STATEFIP);
        })
        .style("stroke-width", "1")
        .style("stroke", "black");
}

// --------------------------------------------------------
// styling functions --------------------------------------
// --------------------------------------------------------
function countyChoropleth(csv, fips, divergingScheme) {
    let record = csv.filter(e => e.county_fips === fips);
    if (record.length) {
        let r = record[0];
        let repTotal = r.rep/r.total * 100;
        let demTotal = r.dem/r.total * 100;
        return divergingScheme(demTotal - repTotal);
    }
}


function stateWinners(csv, fips) {
    let record = csv.filter(e => e.fips === fips);

    if (record.length) {
        let r = record[0];
        if (r.dem === '-') return red;
        else return blue;
    } else {
        let new_fips = fips.split('-')[0];
        record = csv.filter(e => e.fips === new_fips);
        let demWinner = Number(record[0].dem) > Number(record[0].rep);

        if (fips.includes('-l')) {
            if (demWinner) return blue;
            else return red;
        } else {
            if (demWinner) return red;
            else return blue;
        }
    }
}
