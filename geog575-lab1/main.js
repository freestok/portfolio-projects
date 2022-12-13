import { getToolUI } from './html.js';

// global variables
let stat = 'ap2019';
let initialExt;
let housing, legendContainer;
let checked = true;
let year = 2019;

$(document).ready(() => {
    // set-up map and basemap
    const map = L.map('map').setView([39.47, -97.02], 4);
    initialExt = map.getBounds();
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
        maxZoom: 16
    }).addTo(map);

    // TODO style this
    // https://leafletjs.com/reference-1.7.1.html#path-option
    let polyStyle = {
        fill: true,
        color: '#808080',
        opacity: 0
    }

    fetchJSON('./urban_boundaries.json').then((data) => {
        L.geoJSON(data, {
            style: polyStyle,
            interactive: false
        }).addTo(map);
    });

    // add data to the map
    fetchJSON('./urban_final.json').then((data) => {
        console.log('data', data);
        housing = L.geoJSON(data, {
            pointToLayer: (feature, latlng) => {
                return L.circleMarker(latlng, {
                    fillColor: '#d8626b',
                    color: '#d8626b',
                    radius: getRadius(feature.properties[stat]),
                    weight: 1,
                    fillOpacity: 0.6
                }) 
            }
        }).addTo(map);

        updateSymbology();
        createLegend(map);
    });



    // ------------------- legend --------------------------
    // TODO make this work like in the sample
    let toolHtml = getToolUI();
    createTool(toolHtml, map);

    // ------------------- slider ----------------------------
    let yearVal = $('#yearRange').val();
    console.log(yearVal);
    $('#yearLabel').text(String(yearVal));

    // ------------------- listeners ------------------------
    $('input[type=range]').on('input', (e) => {
        let yearVal = $(e.target).val();
        year = yearVal;
        $('#yearLabel').text(String(yearVal));
        const dropdowns = $('.dropdown-item.active');
        let type = dropdowns[0];
        stat = `${type.id[0]}p${year}`;
        updateSymbology();
    });
    
    $('.dropdown-item').on('click', (e) => {
        const dropdowns = $('.dropdown-item.active');
        let type = dropdowns[0];
        $(type).removeClass('active');
        type = e.target;
        $(type).addClass('active');
        $('#house-type').html(type.innerText);
        stat = `${type.id[0]}p${year}`;
        updateSymbology();
        createLegend(map);
    });

    $('#symbolCheck').on('click', (e) => {
        console.log('symbol click');
        checked = e.target.checked;
        updateSymbology();
        createLegend(map);
    });

    $('#houseIcon').on('click', () => map.fitBounds(initialExt));
});

function updateSymbology() {
    console.log('updating');
    housing.eachLayer((layer) => {
        const props = layer.feature.properties;
        let name = props.name.replace(' (2010)','');
        let year = stat.substr(stat.length - 4);
        let statName = stat
            .replace('op','Owner Cost Burdened Households')
            .replace('ap', 'All Cost Burdened Households')
            .replace('rp', 'Renter Cost Burdened Households')
            .replace(/\d{4}$/, '');
        let householdType = statName.split(' ')[0];

        // X in 10
        let in10 = Math.round(props[stat] * 10);
        let remainder = 10 - in10;
        let in10Msg = ''
        
        for (let i=0; i < in10; i++) {
            in10Msg += '<i class="bi bi-person-fill"></i>'
        }
        for (let i=0; i < remainder; i++) {
            in10Msg += '<i class="bi bi-person"></i>'
        }

        let popupContent;
        if (householdType == 'All') {
            popupContent = `
            <div id="tooltip">
                <h5>${statName}  - ${year}</h5>
                ${Math.round(props[stat] * 100)}% of ${householdType.toLocaleLowerCase()} households in <b>${name}</b> are cost burdened.<br><br>
                That means about ${in10} out of 10 households are cost burdened.<br>
                ${in10Msg}
            </div>
        `
        } else {
            popupContent = `
            <div id="tooltip">
                <h5>${statName}  - ${year}</h5>
                ${Math.round(props[stat] * 100)}% of ${householdType.toLocaleLowerCase()} households in <b>${name}</b> are cost burdened.<br><br>
                That means about ${in10} out of 10 ${householdType.toLocaleLowerCase()} households are cost burdened.<br>
                ${in10Msg}
            </div>
        `
        }

        layer.bindPopup(popupContent);
        // if not mobile, then tooltip
        if (!/Mobi|Android/i.test(navigator.userAgent)) {
            layer.bindTooltip(popupContent);
        }

        if (checked) {
            layer.setRadius(getRadius(props[stat]));
        } else {
            layer.setRadius(props[stat] * 30);
        }
        
    });
}

async function fetchJSON(url) {
    const response = await fetch(url);
    return await response.json();
}

//  add the data
// {'ap': {'min': 0.23, 'max': 0.53}, 'op': {'min': 0.16, 'max': 0.48}, 'rp': {'min': 0.41, 'max': 0.64}
function getRadius(x) {
    if (stat.includes('a')) {
        if (x <= .25) return 5
        else if (x <= .35) return 10
        else if (x <= .45) return 15
        else return 20
    } else if (stat.includes('o')) {
        if (x <= .2) return 5
        else if (x <= .3) return 10
        else if (x <= .4) return 15
        else return 20
    } else if (stat.includes('r')) {
        if (x <= .45) return 5
        else if (x <= .50) return 10
        else if (x <= .55) return 15
        else return 20
    }
}

function getRadiusLegend() {
    const statType = stat[0];
    const labels = {
        'a':['≤ 25%','≤ 35%','≤ 45%','> 45%'],
        'o': ['≤ 20%','≤ 30%','≤ 40%','> 40%'],
        'r': ['≤ 45%','≤ 50%','≤ 55%','> 55%']
    }
    return labels[statType]
}

// legend functions ------------------------------
function createLegend(map) {
    $(legendContainer).remove();
    let legend = L.control({ position: 'bottomright' });
    legend.onAdd = () => {
        legendContainer = L.DomUtil.create("div", "legend");
        let symbolsContainer = L.DomUtil.create("div", "symbolsContainer");
        let legendCircle;
        let lastRadius = 0;
        let currentRadius;
        let margin;

        $(legendContainer).append("<h4 id='legendTitle'>% Burdened</h4>");
        
        let sizes, classes;
        if (checked) {
            classes = getRadiusLegend();
            sizes = [15, 30, 45, 60];
        } else {
            classes = ['16%', '37%', '64%']
            sizes = [30, 45, 60];
        }
        
        for (let circle in classes) {
            legendCircle = L.DomUtil.create("div", "legendCircle");
            currentRadius = sizes[circle];
            margin = -currentRadius - lastRadius;
            $(legendCircle).attr("style", "width: " + currentRadius * 2 +
                "px; height: " + currentRadius * 2 +
                "px; margin-left: " + margin + "px");
            $(legendCircle).append("<span class='legendValue'>" + classes[circle] + "</span>");
            $(symbolsContainer).append(legendCircle);
            lastRadius = currentRadius;
        }
        $(legendContainer).append(symbolsContainer);
        return legendContainer;
    };

    legend.addTo(map);

    // disable dragging when cursor enters the container
    legend.getContainer().addEventListener('mouseover', function () {
        map.dragging.disable();
    });

    // Re-enable dragging when user's cursor leaves the element
    legend.getContainer().addEventListener('mouseout', function () {
        map.dragging.enable();
    });
} // end createLegend();


function createTool(html, map) {
    let control = L.control({ position: 'topright' });
    control.onAdd = () => {
        let divContainer = L.DomUtil.create("div", "legend");

        $(divContainer).append(html);
        return divContainer;
    };

    control.addTo(map);

    // disable dragging when cursor enters the container
    control.getContainer().addEventListener('mouseover', function () {
        map.dragging.disable();
    });

    // Re-enable dragging when user's cursor leaves the element
    control.getContainer().addEventListener('mouseout', function () {
        map.dragging.enable();
    });
} // end creatTool();