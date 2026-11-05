import React from "react";
import { useQuery, useUrlState, filters } from "@malloyyo/dashboard";

// Medal globe (Olympic history, 1896-2016). A rotating orthographic globe drawn here in SVG: a graticule, rough
// continent outlines, and one glowing dot per modern country at its centre, sized and coloured by the medals it won
// at the chosen Games. Press play to run through every Games of the season; drag to spin; click a country to centre
// it and open its panel. Imports only React and @malloyyo/dashboard. The coordinates below (country centres, host
// cities, coastlines) are hardcoded geometry; nothing is fetched from outside. Every medal count, year, city, sport
// and event on screen comes from the queries in medal_globe.malloy, which use the model's team-deduplicated
// `medals` / `golds` / `silvers` / `bronzes` measures.

// Country centres [lat, lon], keyed by the model's region.region value.
const CENTROIDS = {
  "Afghanistan": [33.9, 67.7], "Algeria": [28, 2.6], "Argentina": [-34, -64], "Armenia": [40.1, 45], "Australia": [-25.3, 133.8],
  "Austria": [47.5, 14.6], "Azerbaijan": [40.1, 47.6], "Bahamas": [25, -77.4], "Bahrain": [26, 50.6], "Barbados": [13.2, -59.5],
  "Belarus": [53.7, 28], "Belgium": [50.5, 4.5], "Bermuda": [32.3, -64.8], "Botswana": [-22.3, 24.7], "Brazil": [-10.8, -52.9],
  "Bulgaria": [42.7, 25.5], "Burundi": [-3.4, 29.9], "Cameroon": [5.7, 12.7], "Canada": [56, -106], "Chile": [-35.7, -71.5],
  "China": [35, 103], "Colombia": [4.6, -74.1], "Costa Rica": [9.7, -83.8], "Croatia": [45.1, 15.2], "Cuba": [21.5, -79.5],
  "Curacao": [12.2, -69], "Cyprus": [35.1, 33.4], "Czech Republic": [49.8, 15.5], "Denmark": [56.3, 9.5], "Djibouti": [11.8, 42.6],
  "Dominican Republic": [18.7, -70.2], "Ecuador": [-1.8, -78.2], "Egypt": [26.8, 30.8], "Eritrea": [15.2, 39.8], "Estonia": [58.6, 25],
  "Ethiopia": [9.1, 40.5], "Fiji": [-17.7, 178], "Finland": [61.9, 25.7], "France": [46.2, 2.2], "Gabon": [-0.8, 11.6],
  "Georgia": [42.3, 43.4], "Germany": [51.2, 10.4], "Ghana": [7.9, -1], "Greece": [39.1, 21.8], "Grenada": [12.1, -61.7],
  "Guatemala": [15.8, -90.2], "Guyana": [4.9, -58.9], "Haiti": [19, -72.3], "Hungary": [47.2, 19.5], "Iceland": [64.9, -19],
  "India": [21, 78.9], "Indonesia": [-2.5, 118], "Iran": [32.4, 53.7], "Iraq": [33.2, 43.7], "Ireland": [53.4, -8.2],
  "Israel": [31, 34.9], "Italy": [42.8, 12.6], "Ivory Coast": [7.5, -5.5], "Jamaica": [18.1, -77.3], "Japan": [36.2, 138.3],
  "Jordan": [30.6, 36.2], "Kazakhstan": [48, 67], "Kenya": [0, 37.9], "Kosovo": [42.6, 20.9], "Kuwait": [29.3, 47.5],
  "Kyrgyzstan": [41.2, 74.8], "Latvia": [56.9, 24.6], "Lebanon": [33.9, 35.9], "Liechtenstein": [47.2, 9.6], "Lithuania": [55.2, 23.9],
  "Luxembourg": [49.8, 6.1], "Macedonia": [41.6, 21.7], "Malaysia": [4.2, 102], "Mauritius": [-20.3, 57.6], "Mexico": [23.6, -102.5],
  "Moldova": [47.4, 28.4], "Monaco": [43.7, 7.4], "Mongolia": [46.9, 103.8], "Montenegro": [42.7, 19.4], "Morocco": [31.8, -7.1],
  "Mozambique": [-18.7, 35.5], "Namibia": [-22.9, 18.5], "Nepal": [28.4, 84.1], "Netherlands": [52.1, 5.3], "New Zealand": [-41.5, 172.5],
  "Niger": [17.6, 8.1], "Nigeria": [9.1, 8.7], "North Korea": [40.3, 127.5], "Norway": [61.5, 9], "Pakistan": [30.4, 69.3],
  "Panama": [8.5, -80.8], "Paraguay": [-23.4, -58.4], "Peru": [-9.2, -75], "Philippines": [12.9, 121.8], "Poland": [51.9, 19.1],
  "Portugal": [39.4, -8.2], "Puerto Rico": [18.2, -66.6], "Qatar": [25.4, 51.2], "Romania": [45.9, 25], "Russia": [61.5, 96],
  "Saudi Arabia": [23.9, 45.1], "Senegal": [14.5, -14.5], "Serbia": [44, 21], "Singapore": [1.35, 103.8], "Slovakia": [48.7, 19.7],
  "Slovenia": [46.2, 15], "South Africa": [-30.6, 22.9], "South Korea": [36.5, 127.8], "Spain": [40.5, -3.7], "Sri Lanka": [7.9, 80.8],
  "Sudan": [12.9, 30.2], "Suriname": [3.9, -56], "Sweden": [62, 15], "Switzerland": [46.8, 8.2], "Syria": [35, 38.5],
  "Taiwan": [23.7, 121], "Tajikistan": [38.9, 71.3], "Tanzania": [-6.4, 34.9], "Thailand": [15.9, 101], "Togo": [8.6, 0.8],
  "Tonga": [-21.2, -175.2], "Trinidad": [10.7, -61.2], "Tunisia": [34, 9.5], "Turkey": [39, 35.2], "UK": [54, -2.5],
  "USA": [39.8, -98.6], "Uganda": [1.4, 32.3], "Ukraine": [48.4, 31.2], "United Arab Emirates": [23.4, 53.8], "Uruguay": [-32.5, -55.8],
  "Uzbekistan": [41.4, 64.6], "Venezuela": [6.4, -66.6], "Vietnam": [14.1, 108.3], "Virgin Islands, US": [18.3, -64.9],
  "Zambia": [-13.1, 27.8], "Zimbabwe": [-19, 29.2],
};

// Host cities [lat, lon], keyed by the data's city value.
const CITIES = {
  "Albertville": [45.68, 6.39], "Amsterdam": [52.37, 4.9], "Antwerpen": [51.22, 4.4], "Athina": [37.98, 23.73], "Atlanta": [33.75, -84.39],
  "Barcelona": [41.39, 2.17], "Beijing": [39.9, 116.4], "Berlin": [52.52, 13.4], "Calgary": [51.05, -114.07], "Chamonix": [45.92, 6.87],
  "Cortina d'Ampezzo": [46.54, 12.14], "Garmisch-Partenkirchen": [47.49, 11.1], "Grenoble": [45.19, 5.72], "Helsinki": [60.17, 24.94],
  "Innsbruck": [47.27, 11.4], "Lake Placid": [44.28, -73.98], "Lillehammer": [61.12, 10.47], "London": [51.51, -0.13],
  "Los Angeles": [34.05, -118.24], "Melbourne": [-37.81, 144.96], "Mexico City": [19.43, -99.13], "Montreal": [45.5, -73.57],
  "Moskva": [55.76, 37.62], "Munich": [48.14, 11.58], "Nagano": [36.65, 138.18], "Oslo": [59.91, 10.75], "Paris": [48.86, 2.35],
  "Rio de Janeiro": [-22.91, -43.17], "Roma": [41.9, 12.5], "Salt Lake City": [40.76, -111.89], "Sankt Moritz": [46.5, 9.84],
  "Sapporo": [43.06, 141.35], "Sarajevo": [43.86, 18.41], "Seoul": [37.57, 126.98], "Sochi": [43.6, 39.73], "Squaw Valley": [39.2, -120.24],
  "St. Louis": [38.63, -90.2], "Stockholm": [59.33, 18.07], "Sydney": [-33.87, 151.21], "Tokyo": [35.68, 139.69], "Torino": [45.07, 7.69],
  "Vancouver": [49.28, -123.12],
};

// Rough coastlines as flat [lon, lat, lon, lat, ...] rings: decoration only, not data.
const LAND = [
  [-168,66,-162,70,-156,71.3,-140,69.6,-128,70,-115,68.5,-95,68,-85,69.5,-82,66,-88,64,-94,59,-92,57,-85,55.2,-80,52,-79,56,-77,60,-72,62,-65,60,-61,56,-56,52,-60,48,-65,49,-64,45,-70,43.5,-70,41.7,-74,40.5,-76,37,-75.5,35.2,-81,31.5,-80,27,-80.5,25.2,-82.7,28,-84,30,-89,30.2,-94,29.5,-97.3,27.5,-97.5,21.5,-96,19,-91,18.5,-90.4,21,-87,21.5,-88,16,-83.5,15,-83.5,11,-81.5,9,-79.5,9.4,-77.4,8.6,-78,7.5,-80,7.3,-83,8.3,-86,11.5,-88,13.2,-92,14.5,-95,16,-98,16.2,-102,17.8,-105.5,20.5,-105.5,23,-109,26,-112.5,29.5,-114.7,31.5,-112.8,27.5,-110,23.2,-112,24.8,-114,28,-115,30,-117.2,32.6,-120.5,34.5,-122.5,37.5,-124,40.5,-124,46,-124.7,48.4,-123,49,-128,51,-130.5,54.5,-134,58,-140,60,-146,61,-152,59,-158,57,-163,55,-158,58.5,-162,60,-165,62.5,-164,64.5],
  [-77.4,8.6,-75.5,10.5,-72,11.8,-68,10.5,-62,10.7,-60,8.5,-57,6,-52,4.5,-50,1.5,-48.5,-1,-44,-2.5,-39,-3.5,-35,-5.5,-35,-9,-38.5,-13,-39,-17.5,-41,-22,-44,-23,-48.5,-26.5,-48.7,-28.5,-53,-33.5,-56,-34.8,-57.5,-36.5,-57.7,-38.2,-62,-39,-65,-41,-63.5,-42.5,-65.5,-45,-67.5,-46.5,-65.8,-48,-68.5,-50.5,-68.5,-53,-70,-55,-73,-53.5,-75,-50,-74,-45,-73.5,-42,-73.7,-37,-71.5,-32,-71.4,-28,-70.3,-18.5,-75,-15,-77,-12,-79.5,-7.5,-81.2,-5,-80,-1,-80,1,-78.8,1.8,-77.5,4,-77.3,7],
  [-5.9,35.8,-2,35.1,3,36.8,10,37.2,11,35.5,10.2,33.5,15,32.3,19.8,30.5,20.1,32,25,31.9,29,30.9,32.3,31.3,34.2,31.2,34.5,28,32.6,29.9,35.5,24,37.2,21,38.5,18,39.5,15.5,43.3,12.7,44.5,10.4,51.2,11.8,51,10.4,49,6,46,2,42,-1,40.2,-3,39.3,-6,39.5,-10,40.5,-15,37,-17.5,35,-21,35.5,-24,32.6,-26,32.4,-29,30,-31.5,27,-33.7,22,-34.2,18.5,-34.2,17.8,-31,15.2,-27,14.5,-22.5,11.7,-17,12,-13,13.6,-10.5,12.2,-6,9,-1,9.8,3,8.5,4.5,5.5,4.4,1,6,-2,4.8,-7.5,4.4,-12,7,-13.3,9,-15,11,-16.8,13,-17.5,14.7,-16.5,19,-17,21,-15,24.5,-13,27.5,-9.8,29.8,-9.6,32.5,-6.8,34],
  [-9,37,-8.9,42.8,-1.5,43.4,-1.3,46,-4.5,48,-1.5,48.7,1.6,50.2,4,51.4,8,53.5,8.6,57,10.6,57.7,10.5,54.5,14,54,19.5,54.4,21,56.8,24,57.3,23.5,59.5,29.5,60,23,60,21.3,61,21.5,63.5,25.5,65,22,65.8,17.5,62.5,18.8,60,16.5,56.3,12.8,55.6,11,59,8,58,5.3,59,5.1,62,10,64,14,67.5,19,70,25,71,31,70,33,69.3,41,67,43.5,68.5,53,68.7,60,69.8,69,73,73,72.5,80,73.5,87,75,100,77.7,105,77.5,113,73.7,127,73.4,140,72.5,150,71.5,160,70,170,69.8,180,69,180,65,178,64.5,173,61,163,59.8,163,57.5,156.8,51,155.5,55.3,156.8,57.8,150,59.5,142.2,59,135.2,54.8,138.5,54,141.4,52.5,140.4,48.5,135,43.4,131,42.6,129.4,40.7,129.5,36,126.5,34.5,126.2,37.5,124.7,39.8,121.6,39.4,122.1,40.6,121,41,118,39.2,119.2,37,122.5,37,120.8,35.8,119.2,34.4,121.8,31.5,121.8,29.8,119.6,25.3,116.5,22.9,113.5,22.2,110.4,21,109.8,21.5,106.7,20.2,105.6,18.6,108.8,15.5,109.3,11.6,105.2,8.6,104.6,10.4,103,11,100.9,12.6,100,13.4,99.2,10,100.4,7.3,101.3,2.9,103.5,1.4,104.2,1.5,103.4,4.8,102.2,6.2,100.5,8.2,98.4,8,98.6,12.5,97.6,16.5,94.4,16.1,94.2,18.8,92.4,20.7,91.5,22.5,90.6,22.4,88.9,21.6,86.9,20.8,84.5,18.6,82.2,16.6,80.3,15.7,80.3,13,79.8,10.3,78,8.2,76.5,8.9,75.6,11.6,74.6,14.5,73.4,17.3,72.8,20,72.6,21.4,70.4,20.9,68.8,22.3,67.4,23.9,66.5,25.4,61.6,25.2,57.3,25.8,56.5,27.1,54.7,26.5,51.5,27.9,50.1,30.1,48.5,29.9,47.9,29,50.1,26.3,51.6,25.2,51.6,24.1,54,24.1,56.3,26.2,56.6,24.5,58.7,23.5,59.8,22.5,58.5,20.4,55.4,17.6,52.2,15.9,49.6,14.7,45.6,13.3,43.4,12.6,42.6,15,42.8,16.4,41.2,19,39.1,21.3,38.5,23.7,37.5,24.8,35.6,27.4,34.6,28,34.9,29.5,34.3,31.2,34.9,32.8,35.5,34,36,35.8,35.8,36.7,32.5,36.1,30.6,36.7,28.2,36.7,26.3,38.2,26.8,39.5,26.2,40.6,29,41.1,31.1,41.1,33.5,42,36.9,41.3,39.5,41.1,41.6,41.5,39.1,44.4,36.7,45.3,33.5,44.5,32.5,45.4,30.7,46.5,29.6,45.3,28.7,44.3,28,43,28,41.5,26.2,40.9,23.7,40,24,38.2,22.8,36.4,21.1,37.3,20.2,39.6,19.4,41.5,18.5,42.5,15.2,44.2,13.7,45.6,12.3,45.4,12.3,44.6,13.9,42.5,16,41.4,18.5,40.2,16.9,38.9,15.7,38,16.1,39.3,15.4,40,14,40.8,12,41.9,10.2,43.9,8.9,44.4,6.5,43.1,4.6,43.4,3.1,43.1,3.2,41.9,0.8,41,-0.3,39.3,0.1,38.7,-0.7,37.6,-2.1,36.7,-5.4,36,-6.5,36.9],
  [-73,78,-60,82,-30,83.5,-12,81.5,-18,77,-20,70,-26,68,-35,65.5,-42,60,-48,61,-52,64.5,-54,69,-55,72.5,-62,76],
  [-5.7,50,1.4,51.2,1.7,52.7,0,53.5,-1.6,55.5,-2,57.6,-3.3,58.6,-5,58.6,-6.2,56.8,-5.6,55.3,-3,54,-3.2,53.4,-4.6,52.8,-5.2,51.7,-3.3,51.4],
  [-6,52.2,-6.2,53.9,-5.9,55.2,-8.3,55.2,-10,54.2,-9.8,53,-10.3,51.8,-8,51.6],
  [130.9,31.3,131.9,33.8,135.2,33.8,137,34.6,139.8,35,140.8,36,141,38.3,142,39.6,141.3,41.4,139.9,40.6,139.7,38.5,138.5,37.3,136.7,37.2,135.9,35.6,133,35.5,130.9,34,129.8,32.8],
  [140,41.5,141.2,41.8,143.3,42,145.5,43.3,144,44.1,141.6,45.4,141.4,43.3],
  [113.4,-22,114.2,-26.3,115,-29.5,115,-33.6,117.9,-35.1,123.5,-33.9,126,-32.3,131,-31.5,135,-33.8,137.8,-32.6,137.5,-35.3,140,-37.8,144.5,-38.2,146.3,-39,150,-37.5,151.4,-33.5,153.6,-28.2,153,-25.2,150.8,-22.5,146.3,-18.9,145.3,-15,143.5,-14,142.5,-10.7,141.5,-13.5,141.5,-17,139.5,-17.5,135.8,-15,136.9,-12.2,132.6,-11.5,130.2,-13,129.4,-15,126.1,-14,122.2,-17.4,121,-19.5,117,-20.6],
  [172.7,-34.4,174.6,-36.2,178.5,-37.7,177,-39.3,176,-41.3,174.6,-41.2,175,-39.7,173.8,-39.1,174.6,-37],
  [172.7,-40.5,174.2,-41.7,173,-43.7,171.2,-44.4,169,-46.6,166.5,-46,166.6,-45.2,168.3,-44,170.6,-42.9],
  [49.3,-12,50.5,-15.5,49.4,-17.5,47.5,-24.9,45.2,-25.5,43.6,-23.5,43.3,-21.8,44.3,-19.7,44,-17,46.3,-15.8,48,-13.6],
  [109.6,1.8,111,1.6,114,4.5,116,6.9,119,5.2,118,4,117.9,1,116.5,-1.5,116,-3.8,114.5,-3.5,111.5,-3,110.1,-1.7],
  [95.3,5.6,98,4.2,100.4,2.2,104,-1,106,-3.2,105.9,-5.8,104.5,-5.9,102.3,-4,100.5,-1,98.6,1.8],
  [105.2,-6.8,108.5,-6.4,111,-6.4,114.6,-7.7,114.4,-8.7,110,-8.1,106.5,-7.4],
  [131,-1.4,134,-1,138,-1.6,141,-2.6,145,-4.3,147.6,-6,148,-8,150.8,-10.3,147.5,-10.1,143.8,-9,142.6,-9.3,141,-9.1,138,-8.4,137.7,-5.2,134.5,-4,132.3,-4],
  [-84.9,21.9,-82,23.2,-80,23.1,-77.2,21.7,-74.2,20.3,-77.7,19.9,-78.5,21.6,-81.7,22.6],
  [-22.4,63.9,-24,65.5,-22,66.4,-17,66.2,-13.6,65.1,-14.9,64.3,-18.7,63.4],
  [120,18.5,122.2,18.5,122,16,123.9,13.8,122.6,13.4,120.6,14.2,119.9,16.1],
  [120.1,23,121,25.3,121.9,25,120.8,22],
  [-80,63.5,-73,62.4,-65,63,-62,66.5,-68,70,-78,72.5,-90,73.5,-85,70,-80,69.5],
  [-90,76,-75,77.5,-62,81.8,-80,83,-96,80.5,-97,77],
  [-118,69.5,-102,68.5,-101,72,-108,73.5,-118,72.5],
  [80,9.8,81.8,7.5,81.2,6.2,80,6,79.8,8],
];

const C = {
  bg: "#04060f", panel: "rgba(13,19,38,.78)", line: "rgba(120,150,220,.16)", fg: "#eef2fb", muted: "#8f9bbd", dim: "#5b6789",
  gold: "#ffc94d", silver: "#c9d3e6", bronze: "#d98b52", accent: "#5fd4ff",
};
const VW = 800, VH = 720, CX = 400, CY = 360, R = 300;
const DEG = Math.PI / 180;
const N = (v) => (v == null || isNaN(Number(v)) ? null : Number(v));
const list = (v) => (Array.isArray(v) ? v : v ? [v] : []);
const int = (v) => (v == null ? "–" : Math.round(v).toLocaleString("en-US"));

// Dot colour ramp by share of the season's largest single-Games haul: cyan -> amber -> white gold.
const STOPS = [[0, [70, 190, 255]], [0.45, [255, 176, 64]], [1, [255, 244, 210]]];
function ramp(t) {
  t = Math.max(0, Math.min(1, t));
  for (let i = 1; i < STOPS.length; i++) {
    const [t1, c1] = STOPS[i], [t0, c0] = STOPS[i - 1];
    if (t <= t1) { const k = (t - t0) / (t1 - t0); return c0.map((x, j) => Math.round(x + (c1[j] - x) * k)); }
  }
  return STOPS[STOPS.length - 1][1];
}
const BUCKETS = [0, 0.2, 0.4, 0.6, 0.8, 1].map((t) => ramp(t));
const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

function projector(lon0, lat0) {
  const s0 = Math.sin(lat0 * DEG), c0 = Math.cos(lat0 * DEG);
  return (lon, lat) => {
    const l = (lon - lon0) * DEG, p = lat * DEG;
    const cp = Math.cos(p), sp = Math.sin(p), cl = Math.cos(l);
    return [CX + R * cp * Math.sin(l), CY - R * (c0 * sp - s0 * cp * cl), s0 * sp + c0 * cp * cl];
  };
}
function linePath(pts, P) {
  let d = "", pen = false;
  for (const [lo, la] of pts) {
    const [x, y, z] = P(lo, la);
    if (z > 0) { d += (pen ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1); pen = true; } else pen = false;
  }
  return d;
}
function ringPath(flat, P) {
  let d = "", any = false;
  for (let i = 0; i < flat.length; i += 2) {
    let [x, y, z] = P(flat[i], flat[i + 1]);
    if (z > 0) any = true;
    else { const dx = x - CX, dy = y - CY, m = Math.hypot(dx, dy) || 1; x = CX + (dx / m) * R; y = CY + (dy / m) * R; }
    d += (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
  }
  return any ? d + "Z" : "";
}
const GRAT = (() => {
  const lines = [];
  for (let lon = -180; lon < 180; lon += 15) { const p = []; for (let la = -90; la <= 90; la += 3) p.push([lon, la]); lines.push(p); }
  for (let la = -75; la <= 75; la += 15) { const p = []; for (let lo = -180; lo <= 180; lo += 3) p.push([lo, la]); lines.push(p); }
  return lines;
})();
const STARS = (() => {
  let s = 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: 140 }, () => [rnd() * VW, rnd() * VH, rnd() * 1.1 + 0.2, rnd() * 0.6 + 0.15]);
})();
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const CSS = `
.mg { box-sizing: border-box; min-height: 100vh; color: ${C.fg}; padding: 12px 22px 12px;
  background: radial-gradient(900px 700px at 36% 52%, #0c1a3a 0%, #060a18 55%, ${C.bg} 100%) ${C.bg};
  font-family: "Inter", "SF Pro Display", "Segoe UI", system-ui, -apple-system, sans-serif; overflow-x: hidden; }
.mg *, .mg *::before, .mg *::after { box-sizing: border-box; }
.mg-top { display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; flex-wrap: wrap; }
.mg-eyebrow { font-size: 10.5px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: ${C.gold}; margin: 0 0 4px; }
.mg h1 { margin: 0; font-size: 26px; font-weight: 780; letter-spacing: -.02em; line-height: 1.1; }
.mg-sub { margin: 4px 0 0; color: ${C.muted}; font-size: 13px; max-width: 70ch; line-height: 1.45; }
.mg-seg { display: inline-flex; background: rgba(255,255,255,.05); border: 1px solid ${C.line}; border-radius: 999px; padding: 3px; }
.mg-seg button { background: none; border: 0; color: ${C.muted}; font: inherit; font-size: 13px; font-weight: 650; padding: 7px 16px; border-radius: 999px; cursor: pointer; }
.mg-seg button.on { background: linear-gradient(180deg, #ffd56b, #f0a92e); color: #1a1204; box-shadow: 0 0 18px rgba(255,190,70,.35); }
.mg-seg button.on.w { background: linear-gradient(180deg, #a6e6ff, #4fb6f0); color: #04121c; box-shadow: 0 0 18px rgba(95,212,255,.35); }
.mg-grid { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(330px, 1fr); gap: 16px; margin-top: 4px; align-items: start; }
.mg-stage { position: relative; min-width: 0; }
.mg-globe { display: block; width: 100%; height: auto; height: calc(100vh - 200px); min-height: 330px; max-width: 100%; touch-action: none; cursor: grab; user-select: none; }
.drag .mg-globe { cursor: grabbing; }
.mg-dot { cursor: pointer; }
.mg-dot circle.core { transition: r .55s cubic-bezier(.2,.8,.2,1); }
.mg-dot circle.halo { transition: r .55s cubic-bezier(.2,.8,.2,1); }
.mg-ring { animation: mgPulse 1.6s ease-out infinite; transform-box: fill-box; transform-origin: center; }
@keyframes mgPulse { 0% { opacity: .95; transform: scale(1); } 100% { opacity: 0; transform: scale(2.1); } }
.mg-host { animation: mgPulse 2.2s ease-out infinite; transform-box: fill-box; transform-origin: center; }
.mg-games { position: absolute; left: 6px; top: 4px; pointer-events: none; }
.mg-games .yr { font-size: 64px; font-weight: 800; letter-spacing: -.04em; line-height: .95; font-variant-numeric: tabular-nums;
  background: linear-gradient(180deg, #fff, #9fb2dc); -webkit-background-clip: text; background-clip: text; color: transparent; }
.mg-games .city { font-size: 15px; font-weight: 650; margin-top: 4px; }
.mg-games .facts { font-size: 12px; color: ${C.muted}; margin-top: 4px; font-variant-numeric: tabular-nums; }
.mg-games .facts b { color: ${C.fg}; }
.mg-sizekey { position: absolute; left: 8px; bottom: 6px; display: flex; align-items: flex-end; gap: 12px; font-size: 11px; color: ${C.muted}; pointer-events: none; }
.mg-sizekey span { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.mg-tip { position: absolute; pointer-events: none; transform: translate(-50%, calc(-100% - 14px)); background: rgba(6,10,24,.92);
  border: 1px solid ${C.line}; border-radius: 10px; padding: 7px 10px; font-size: 12px; white-space: nowrap; box-shadow: 0 10px 30px rgba(0,0,0,.5); }
.mg-tip b { font-size: 13px; }
.mg-hint { position: absolute; right: 8px; top: 8px; font-size: 11.5px; color: ${C.muted}; pointer-events: none; text-align: right; line-height: 1.5; }
.mg-time { display: flex; align-items: flex-end; gap: 14px; margin-top: 2px; background: ${C.panel}; border: 1px solid ${C.line}; border-radius: 16px; padding: 7px 14px 5px; }
.mg-play { flex: none; width: 46px; height: 46px; border-radius: 50%; border: 0; cursor: pointer; display: grid; place-items: center;
  background: radial-gradient(circle at 35% 30%, #ffe08a, #f0a92e 70%); box-shadow: 0 0 0 4px rgba(255,190,70,.14), 0 0 24px rgba(255,190,70,.4); }
.mg-play.w { background: radial-gradient(circle at 35% 30%, #c8f0ff, #4fb6f0 70%); box-shadow: 0 0 0 4px rgba(95,212,255,.14), 0 0 24px rgba(95,212,255,.4); }
.mg-play:hover { filter: brightness(1.08); }
.mg-ticks { flex: 1; min-width: 0; display: flex; align-items: flex-end; gap: 3px; height: 50px; }
.mg-tick { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; cursor: pointer; }
.mg-tick i { display: block; width: 100%; max-width: 18px; border-radius: 3px 3px 0 0; background: rgba(140,165,220,.28); transition: background .3s, box-shadow .3s; }
.mg-tick:hover i { background: rgba(170,195,250,.5); }
.mg-tick.on i { background: ${C.gold}; box-shadow: 0 0 12px rgba(255,200,80,.7); }
.mg-tick.on.w i { background: ${C.accent}; box-shadow: 0 0 12px rgba(95,212,255,.7); }
.mg-tick.past i { background: rgba(200,175,120,.45); }
.mg-tick.past.w i { background: rgba(120,190,230,.45); }
.mg-tick em { font-style: normal; font-size: 9.5px; color: ${C.dim}; margin-top: 3px; font-variant-numeric: tabular-nums; height: 12px; }
.mg-tick.on em { color: ${C.fg}; font-weight: 700; }
.mg-timelbl { font-size: 10.5px; color: ${C.dim}; letter-spacing: .08em; text-transform: uppercase; margin-bottom: 4px; }
.mg-card { background: ${C.panel}; border: 1px solid ${C.line}; border-radius: 18px; padding: 14px 16px; min-width: 0; backdrop-filter: blur(6px); max-height: calc(100vh - 110px); overflow-y: auto; scrollbar-width: thin; scrollbar-color: rgba(120,150,220,.25) transparent;
  box-shadow: 0 24px 60px rgba(0,0,0,.45); display: flex; flex-direction: column; animation: mgIn .45s cubic-bezier(.2,.8,.2,1) both; }
@keyframes mgIn { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: none; } }
.mg-lbl { font-size: 10.5px; font-weight: 700; letter-spacing: .15em; text-transform: uppercase; color: ${C.muted}; margin: 0 0 8px; }
.mg-card h2 { margin: 0; font-size: 26px; font-weight: 780; letter-spacing: -.02em; }
.mg-row { display: grid; grid-template-columns: 18px minmax(0, 1fr) 30px 30px 30px 38px; gap: 6px; align-items: center; padding: 4px 6px; border-radius: 8px;
  cursor: pointer; font-size: 13px; font-variant-numeric: tabular-nums; animation: mgRow .4s ease both; }
.mg-row:hover { background: rgba(255,255,255,.05); }
.mg-row .n { color: ${C.dim}; font-size: 11px; }
.mg-row .c { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mg-row .g, .mg-row .s, .mg-row .b { text-align: right; }
.mg-row .t { text-align: right; font-weight: 700; }
.mg-row.head { cursor: default; font-size: 10.5px; color: ${C.dim}; text-transform: uppercase; letter-spacing: .08em; animation: none; }
.mg-row.head:hover { background: none; }
@keyframes mgRow { from { opacity: 0; transform: translateX(8px); } to { opacity: 1; transform: none; } }
.mg-pip { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-left: 4px; vertical-align: 1px; }
.mg-big { display: flex; gap: 18px; margin: 10px 0 4px; flex-wrap: wrap; }
.mg-big div b { display: block; font-size: 30px; font-weight: 800; letter-spacing: -.03em; line-height: 1; font-variant-numeric: tabular-nums; }
.mg-big div span { font-size: 11.5px; color: ${C.muted}; }
.mg-medals { display: flex; gap: 10px; font-size: 13px; font-variant-numeric: tabular-nums; margin: 6px 0 10px; }
.mg-medals span { display: inline-flex; align-items: center; gap: 5px; }
.mg-medals i { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.mg-sec { margin-top: 9px; }
.mg-spark { display: block; width: 100%; height: 78px; }
.mg-sbar { display: grid; grid-template-columns: minmax(0, 120px) minmax(0, 1fr) 34px; gap: 8px; align-items: center; font-size: 12.5px; padding: 3px 0; }
.mg-sbar .nm { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mg-sbar .tr { height: 10px; border-radius: 5px; background: rgba(255,255,255,.05); overflow: hidden; display: flex; }
.mg-sbar .tr i { display: block; height: 100%; animation: mgGrow .6s cubic-bezier(.2,.8,.2,1) both; transform-origin: left; }
@keyframes mgGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
.mg-sbar .v { text-align: right; font-variant-numeric: tabular-nums; color: ${C.muted}; }
.mg-ev { display: flex; justify-content: space-between; gap: 10px; font-size: 12.5px; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,.04); }
.mg-ev span:first-child { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mg-ev span:last-child { flex: none; font-variant-numeric: tabular-nums; color: ${C.muted}; }
.mg-close { float: right; background: none; border: 1px solid ${C.line}; color: ${C.muted}; border-radius: 999px; padding: 4px 11px; font-size: 11.5px; cursor: pointer; }
.mg-close:hover { color: ${C.fg}; }
.mg-note { font-size: 11px; color: ${C.dim}; line-height: 1.5; margin: auto 0 0; padding-top: 12px; }
.mg-msg { color: ${C.muted}; font-size: 12.5px; }
.mg-err { color: #ff7a8a; font-size: 12.5px; white-space: pre-wrap; }
@media (max-width: 980px) { .mg-grid { grid-template-columns: minmax(0, 1fr); } .mg-globe { max-height: none; } }
@media (max-width: 560px) { .mg { padding: 14px 16px; } .mg h1 { font-size: 23px; } .mg-games .yr { font-size: 44px; } .mg-tick em { display: none; } }
`;

function Globe({ games, season, maxM, sel, onPick, rotRef, hover, setHover }) {
  const P = projector(rotRef.current.lon, rotRef.current.lat);
  const regs = list(games && games.by_region);
  const byName = new Map(regs.map((r) => [r.region, r]));
  const k = 36 / Math.sqrt(Math.max(1, maxM));
  const rOf = (m) => (m > 0 ? 2.4 + Math.sqrt(m) * k : 0);
  const names = Object.keys(CENTROIDS);
  const dots = names.map((name) => {
    const [la, lo] = CENTROIDS[name];
    const [x, y, z] = P(lo, la);
    const row = byName.get(name);
    const m = row ? N(row.medals) || 0 : 0;
    return { name, x, y, z, m, row, r: rOf(m) };
  }).sort((a, b) => b.r - a.r);
  const top = new Set(regs.filter((r) => CENTROIDS[r.region]).slice(0, 7).map((r) => r.region));
  const host = list(games && games.cities);
  // Labels: selected, hovered, then the biggest hauls; skip any that would overlap one already placed.
  const order = [sel, hover, ...regs.slice(0, 12).map((r) => r.region)].filter((n, i, a) => n && a.indexOf(n) === i);
  const byDot = new Map(dots.map((d) => [d.name, d]));
  const boxes = [], labels = [];
  for (const n of order) {
    if (labels.length >= 6) break;
    const d = byDot.get(n);
    if (!d || d.m <= 0 || d.z <= 0.3) continue;
    const w = Math.max(n.length * 10.5, 92) + 6, h = 42;
    for (const side of [1, -1]) {
      const x = side > 0 ? d.x + d.r + 7 : d.x - d.r - 7;
      const box = side > 0 ? [x, d.y - 20, x + w, d.y - 20 + h] : [x - w, d.y - 20, x, d.y - 20 + h];
      if (box[0] < 4 || box[2] > VW - 4) continue;
      if (boxes.some((b) => !(box[2] < b[0] || box[0] > b[2] || box[3] < b[1] || box[1] > b[3]))) continue;
      boxes.push(box); labels.push({ d, x, anchor: side > 0 ? "start" : "end" }); break;
    }
  }
  return (
    <svg className="mg-globe" viewBox={`0 0 ${VW} ${VH}`} role="img" aria-label="Globe of Olympic medals by country">
      <defs>
        <radialGradient id="mg-ocean" cx="42%" cy="38%" r="70%">
          <stop offset="0%" stopColor="#14306a" /><stop offset="55%" stopColor="#0b1a3e" /><stop offset="100%" stopColor="#050b1f" />
        </radialGradient>
        <radialGradient id="mg-atmo" cx={CX} cy={CY} r={R + 46} gradientUnits="userSpaceOnUse">
          <stop offset={(R - 6) / (R + 46)} stopColor="rgba(80,170,255,0)" />
          <stop offset={(R + 2) / (R + 46)} stopColor="rgba(90,175,255,.42)" />
          <stop offset="1" stopColor="rgba(80,170,255,0)" />
        </radialGradient>
        <radialGradient id="mg-shine" cx="34%" cy="28%" r="60%">
          <stop offset="0%" stopColor="rgba(160,200,255,.16)" /><stop offset="100%" stopColor="rgba(160,200,255,0)" />
        </radialGradient>
        {BUCKETS.map((c, i) => (
          <radialGradient key={i} id={`mg-h${i}`}>
            <stop offset="0%" stopColor={rgb(c, 0.75)} /><stop offset="35%" stopColor={rgb(c, 0.3)} /><stop offset="100%" stopColor={rgb(c, 0)} />
          </radialGradient>
        ))}
        <clipPath id="mg-clip"><circle cx={CX} cy={CY} r={R} /></clipPath>
      </defs>
      {STARS.map(([x, y, r, o], i) => <circle key={i} cx={x} cy={y} r={r} fill="#cfe0ff" opacity={o} />)}
      <circle cx={CX} cy={CY} r={R + 46} fill="url(#mg-atmo)" />
      <circle cx={CX} cy={CY} r={R} fill="url(#mg-ocean)" />
      <g clipPath="url(#mg-clip)">
        {LAND.map((ring, i) => { const d = ringPath(ring, P); return d ? <path key={i} d={d} fill="rgba(70,110,190,.22)" stroke="rgba(130,170,240,.35)" strokeWidth="0.8" strokeLinejoin="round" /> : null; })}
        {GRAT.map((pts, i) => <path key={i} d={linePath(pts, P)} fill="none" stroke="rgba(120,160,240,.13)" strokeWidth="0.7" />)}
      </g>
      <circle cx={CX} cy={CY} r={R} fill="url(#mg-shine)" stroke="rgba(140,190,255,.35)" strokeWidth="1" />
      {host.map((c) => {
        const ll = CITIES[c.city]; if (!ll) return null;
        const [x, y, z] = P(ll[1], ll[0]); if (z < 0.05) return null;
        return (
          <g key={c.city} style={{ pointerEvents: "none" }} opacity={Math.min(1, z * 4)}>
            <circle className="mg-host" cx={x} cy={y} r={7} fill="none" stroke="#ffffff" strokeWidth="1.4" />
            <circle cx={x} cy={y} r={2.2} fill="#ffffff" />
          </g>
        );
      })}
      {dots.map((d) => {
        const vis = d.z > -0.02;
        const op = vis ? Math.min(1, Math.max(0, d.z * 5)) : 0;
        const t = Math.sqrt(d.m / Math.max(1, maxM));
        const col = ramp(t);
        const b = Math.round(Math.min(1, t) * 5);
        const isSel = sel === d.name;
        return (
          <g key={d.name} className="mg-dot" opacity={op} style={{ pointerEvents: op > 0.2 && d.m > 0 ? "auto" : "none" }}
            onClick={(e) => { e.stopPropagation(); onPick(d.name, true); }}
            onPointerEnter={() => setHover(d.name)} onPointerLeave={() => setHover((h) => (h === d.name ? null : h))}>
            <circle className="halo" cx={d.x} cy={d.y} style={{ r: d.r * 2.7 }} fill={`url(#mg-h${b})`} />
            <circle className="core" cx={d.x} cy={d.y} style={{ r: d.r }} fill={rgb(col, 0.92)} stroke="rgba(255,255,255,.7)" strokeWidth={d.r > 6 ? 1 : 0.6} />
            {isSel && d.m > 0 ? <circle className="mg-ring" cx={d.x} cy={d.y} r={d.r + 4} fill="none" stroke="#fff" strokeWidth="2" /> : null}
          </g>
        );
      })}
      {labels.map(({ d, x, anchor }) => (
        <g key={"l" + d.name} style={{ pointerEvents: "none" }} opacity={Math.min(1, (d.z - 0.3) * 4)}>
          <text x={x} y={d.y - 3} textAnchor={anchor} fontSize="19" fontWeight="750" fill="#fff" stroke="rgba(4,8,20,.9)" strokeWidth="4" paintOrder="stroke">{d.name}</text>
          <text x={x} y={d.y + 16} textAnchor={anchor} fontSize="16" fontWeight="650" fill={C.gold} stroke="rgba(4,8,20,.9)" strokeWidth="4" paintOrder="stroke"
            style={{ fontVariantNumeric: "tabular-nums" }}>{int(d.m)} medals</text>
        </g>
      ))}
      <g transform={`translate(18 ${VH - 16})`} style={{ pointerEvents: "none" }}>
        {[1, 10, 25, 50, 100].filter((m) => m <= maxM).reduce((acc, m) => {
          const r = rOf(m), x = acc.x + r;
          acc.els.push(<g key={m}><circle cx={x} cy={-r - 20} r={r} fill="none" stroke={C.muted} strokeWidth="1.2" />
            <text x={x} y={-2} textAnchor="middle" fontSize="15" fill={C.muted}>{m}</text></g>);
          acc.x = x + r + 16; return acc;
        }, { x: 0, els: [] }).els}
        <text x={0} y={-(2 * rOf(Math.min(100, maxM)) + 32)} fontSize="15" fill={C.muted}>Medals at one Games</text>
      </g>
      {(() => {
        const d = hover && byDot.get(hover), row = hover && byName.get(hover);
        if (!d || !row || d.z <= 0.05) return null;
        const w = 250, h = 54, x = Math.max(6, Math.min(VW - w - 6, d.x - w / 2)), y = Math.max(6, d.y - d.r - h - 12);
        return (
          <g style={{ pointerEvents: "none" }}>
            <rect x={x} y={y} width={w} height={h} rx="10" fill="rgba(6,10,24,.94)" stroke="rgba(120,150,220,.3)" />
            <text x={x + 12} y={y + 22} fontSize="17" fontWeight="750" fill="#fff">{hover} <tspan fill={C.muted} fontWeight="500">· {int(N(row.medals))} medals</tspan></text>
            <text x={x + 12} y={y + 43} fontSize="15" fontWeight="600" style={{ fontVariantNumeric: "tabular-nums" }}>
              <tspan fill={C.gold}>{int(N(row.golds))} gold</tspan><tspan fill={C.dim}> · </tspan><tspan fill={C.silver}>{int(N(row.silvers))} silver</tspan><tspan fill={C.dim}> · </tspan><tspan fill={C.bronze}>{int(N(row.bronzes))} bronze</tspan>
            </text>
          </g>
        );
      })()}
    </svg>
  );
}

function MedalTable({ games, onPick }) {
  const rows = list(games.by_region).slice().sort((a, b) => (N(b.golds) - N(a.golds)) || (N(b.silvers) - N(a.silvers)) || (N(b.bronzes) - N(a.bronzes))).slice(0, 10);
  return (
    <div>
      <div className="mg-row head"><span /><span>Country</span><span className="g">G</span><span className="s">S</span><span className="b">B</span><span className="t">Total</span></div>
      {rows.map((r, i) => (
        <div className="mg-row" key={r.region} style={{ animationDelay: `${i * 25}ms` }} onClick={() => onPick(r.region, false)}>
          <span className="n">{i + 1}</span><span className="c">{r.region}</span>
          <span className="g" style={{ color: C.gold }}>{int(N(r.golds))}</span>
          <span className="s" style={{ color: C.silver }}>{int(N(r.silvers))}</span>
          <span className="b" style={{ color: C.bronze }}>{int(N(r.bronzes))}</span>
          <span className="t">{int(N(r.medals))}</span>
        </div>
      ))}
    </div>
  );
}

function OverTime({ seasonGames, region, year, onYear }) {
  const pts = seasonGames.map((g) => {
    const r = list(g.by_region).find((x) => x.region === region);
    return { year: N(g.year), g: r ? N(r.golds) : 0, s: r ? N(r.silvers) : 0, b: r ? N(r.bronzes) : 0, m: r ? N(r.medals) : 0 };
  });
  const max = Math.max(1, ...pts.map((p) => p.m));
  const W = 400, H = 92, bw = W / Math.max(1, pts.length);
  return (
    <svg className="mg-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      {pts.map((p, i) => {
        const x = i * bw + bw * 0.15, w = bw * 0.7, sc = (H - 14) / max;
        const hb = p.b * sc, hs = p.s * sc, hg = p.g * sc, on = p.year === year;
        return (
          <g key={p.year} onClick={() => onYear(p.year)} style={{ cursor: "pointer" }}>
            <title>{`${p.year}: ${p.m} medals (${p.g} gold, ${p.s} silver, ${p.b} bronze)`}</title>
            <rect x={i * bw} y="0" width={bw} height={H} fill={on ? "rgba(255,255,255,.07)" : "transparent"} />
            <rect x={x} y={H - 12 - hb} width={w} height={hb} fill={C.bronze} opacity={on ? 1 : 0.75} />
            <rect x={x} y={H - 12 - hb - hs} width={w} height={hs} fill={C.silver} opacity={on ? 1 : 0.75} />
            <rect x={x} y={H - 12 - hb - hs - hg} width={w} height={hg} fill={C.gold} opacity={on ? 1 : 0.8} />
            {on || i === 0 || i === pts.length - 1 ? <text x={i === 0 ? 1 : i === pts.length - 1 ? W - 1 : i * bw + bw / 2} y={H - 1} fontSize="9" textAnchor={i === 0 ? "start" : i === pts.length - 1 ? "end" : "middle"} fill={on ? "#fff" : C.dim}>{p.year}</text> : null}
          </g>
        );
      })}
    </svg>
  );
}

function CountryPanel({ region, season, year, games, seasonGames, sportsRows, onClose, onYear }) {
  const givens = React.useMemo(() => ({ REGION: filters.oneOf(region) }), [region]);
  const q = useQuery({ query: "mg_country", givens, skip: !region });
  const cRow = list(q.rows).find((r) => r.region === region && r.season === season);
  const here = list(games && games.by_region).find((r) => r.region === region);
  const allTime = seasonGames.reduce((a, g) => { const r = list(g.by_region).find((x) => x.region === region); return a + (r ? N(r.medals) : 0); }, 0);
  const sports = sportsRows.filter((r) => r.region === region && r.season === season).slice(0, 5);
  const smax = Math.max(1, ...sports.map((s) => N(s.medals)));
  const yrRow = cRow ? list(cRow.over_time).find((o) => N(o.year) === year) : null;
  return (
    <div className="mg-card" key={region + season}>
      <div><button className="mg-close" onClick={onClose}>Back to medal table</button><p className="mg-lbl">{season} Olympics</p></div>
      <h2>{region}</h2>
      <div className="mg-big">
        <div><b style={{ color: C.gold }}>{int(allTime)}</b><span>{season} medals, all Games</span></div>
        <div><b>{here ? int(N(here.medals)) : 0}</b><span>medals in {year}</span></div>
        <div><b style={{ color: C.muted }}>{yrRow ? int(N(yrRow.athletes)) : q.loading ? "…" : "–"}</b><span>athletes sent in {year}</span></div>
      </div>
      {here ? (
        <div className="mg-medals">
          <span><i style={{ background: C.gold }} />{int(N(here.golds))} gold</span>
          <span><i style={{ background: C.silver }} />{int(N(here.silvers))} silver</span>
          <span><i style={{ background: C.bronze }} />{int(N(here.bronzes))} bronze</span>
        </div>
      ) : <p className="mg-msg">No medals at the {year} {season} Games.</p>}
      <div className="mg-sec">
        <p className="mg-lbl">Medals at every {season} Games</p>
        <OverTime seasonGames={seasonGames} region={region} year={year} onYear={onYear} />
      </div>
      <div className="mg-sec">
        <p className="mg-lbl">Top sports, all {season} Games</p>
        {sports.map((s, i) => (
          <div className="mg-sbar" key={s.sport}>
            <span className="nm">{s.sport}</span>
            <span className="tr">
              <i style={{ width: `${(N(s.golds) / smax) * 100}%`, background: C.gold, animationDelay: `${i * 40}ms` }} />
              <i style={{ width: `${(N(s.silvers) / smax) * 100}%`, background: C.silver, animationDelay: `${i * 40 + 60}ms` }} />
              <i style={{ width: `${(N(s.bronzes) / smax) * 100}%`, background: C.bronze, animationDelay: `${i * 40 + 120}ms` }} />
            </span>
            <span className="v">{int(N(s.medals))}</span>
          </div>
        ))}
      </div>
      <div className="mg-sec">
        <p className="mg-lbl">Most-medalled events, all {season} Games</p>
        {q.error ? <p className="mg-err">Could not load: {String(q.error.message || q.error)}</p> : null}
        {q.loading && !cRow ? <p className="mg-msg">Loading events…</p> : null}
        {cRow ? list(cRow.top_events).slice(0, 4).map((e) => (
          <div className="mg-ev" key={e.event}>
            <span title={e.event}>{e.event}</span>
            <span>{int(N(e.medals))} medals · <span style={{ color: C.gold }}>{int(N(e.golds))} gold</span></span>
          </div>
        )) : null}
      </div>
    </div>
  );
}

// Owns the per-frame redraw so only the globe re-renders while it spins, not the panels.
function LiveGlobe(props) {
  const { anim, rotRef } = props;
  const [, setTick] = React.useState(0);
  // Animation loop: auto-rotate, tween to a picked country, or follow a drag.
  React.useEffect(() => {
    let raf, last = performance.now();
    const step = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const a = anim.current, rot = rotRef.current;
      const moving = !!(a.tween || a.drag || a.auto);
      if (a.tween) {
        const t = Math.min(1, (now - a.tween.t0) / a.tween.ms), e = ease(t);
        rot.lon = a.tween.from.lon + a.tween.dLon * e; rot.lat = a.tween.from.lat + (a.tween.to.lat - a.tween.from.lat) * e;
        if (t >= 1) a.tween = null;
      } else if (a.auto && !a.drag) {
        rot.lon -= dt * 9;
      }
      if (rot.lon > 180) rot.lon -= 360; if (rot.lon < -180) rot.lon += 360;
      if (moving) setTick((x) => (x + 1) % 1e6);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <Globe {...props} />;
}

export default function Dashboard() {
  const q = useQuery({ query: "medal_globe" });
  const sq = useQuery({ query: "mg_sports" });
  const [season, setSeason] = useUrlState("season", "Summer");
  const [sel, setSel] = useUrlState("country", "");
  const [year, setYear] = React.useState(null);
  const [playing, setPlaying] = React.useState(false);
  const [hover, setHover] = React.useState(null);
  const [dragging, setDragging] = React.useState(false);
  const rotRef = React.useRef({ lon: -38, lat: 26 });
  const anim = React.useRef({ auto: true, tween: null, drag: null, moved: false });
  const stageRef = React.useRef(null);

  React.useEffect(() => {
    try {
      document.body.style.background = C.bg; document.body.style.margin = "0";
      // The page is already dark: ask colour-inverting browser extensions (Dark Reader) to leave it alone.
      if (!document.querySelector('meta[name="darkreader-lock"]')) {
        const m = document.createElement("meta"); m.name = "darkreader-lock"; document.head.appendChild(m);
      }
    } catch (e) { /* frame */ }
  }, []);

  const all = list(q.rows);
  const seasonGames = React.useMemo(() => all.filter((g) => g.season === season).sort((a, b) => N(a.year) - N(b.year)), [all, season]);
  const years = seasonGames.map((g) => N(g.year));
  const yr = years.includes(year) ? year : years[years.length - 1];
  const games = seasonGames.find((g) => N(g.year) === yr);
  const maxM = React.useMemo(() => Math.max(1, ...seasonGames.flatMap((g) => list(g.by_region).map((r) => N(r.medals) || 0))), [seasonGames]);
  const gmax = Math.max(1, ...seasonGames.map((g) => N(g.medals) || 0));
  const W = season === "Winter";


  // Play: step through the season's Games.
  React.useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setYear((cur) => {
        const ys = years; const i = ys.indexOf(ys.includes(cur) ? cur : ys[ys.length - 1]);
        if (i >= ys.length - 1) { setPlaying(false); return ys[ys.length - 1]; }
        return ys[i + 1];
      });
    }, 600);
    return () => clearInterval(id);
  }, [playing, years.join(",")]);

  const centerOn = (name) => {
    const ll = CENTROIDS[name]; if (!ll) return;
    const from = { ...rotRef.current }; const to = { lon: ll[1], lat: Math.max(-45, Math.min(50, ll[0])) };
    let dLon = to.lon - from.lon; if (dLon > 180) dLon -= 360; if (dLon < -180) dLon += 360;
    anim.current.tween = { from, to, dLon, t0: performance.now(), ms: 950 };
  };
  const pick = (name, fromClick) => {
    if (fromClick && anim.current.moved) return;
    anim.current.auto = false; setSel(name); centerOn(name);
  };
  const close = () => { setSel(""); anim.current.auto = true; };
  React.useEffect(() => { if (sel && CENTROIDS[sel]) { anim.current.auto = false; centerOn(sel); } }, []); // eslint-disable-line

  const onDown = (e) => {
    anim.current.drag = { x: e.clientX, y: e.clientY, lon: rotRef.current.lon, lat: rotRef.current.lat };
    anim.current.moved = false; anim.current.tween = null; setDragging(true);
    const w = (stageRef.current && stageRef.current.getBoundingClientRect().width) || VW;
    const sc = (VW / w) * 0.32;
    const move = (ev) => {
      const d = anim.current.drag; if (!d) return;
      const dx = ev.clientX - d.x, dy = ev.clientY - d.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) { anim.current.moved = true; anim.current.auto = false; }
      rotRef.current.lon = d.lon - dx * sc; rotRef.current.lat = Math.max(-70, Math.min(70, d.lat + dy * sc));
    };
    const up = () => {
      anim.current.drag = null; setDragging(false);
      if (!sel && anim.current.moved) setTimeout(() => { if (!anim.current.drag) anim.current.auto = true; }, 1600);
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };

  const togglePlay = () => {
    if (playing) { setPlaying(false); return; }
    if (yr === years[years.length - 1]) setYear(years[0]);
    setPlaying(true);
  };

  const cities = list(games && games.cities).map((c) => c.city);
  const sportsRows = list(sq.rows);

  return (
    <div className="mg">
      <style>{CSS}</style>
      <div className="mg-top">
        <div>
          <p className="mg-eyebrow">Olympic Games · {years.length ? `${years[0]}–${years[years.length - 1]}` : "1896–2016"}</p>
          <h1>Where the medals went</h1>
          <p className="mg-sub">Every country's medals at every Games, as a dot at its center. Press play to watch the Games unfold, drag to spin the globe, click a country to open it.</p>
        </div>
        <div className="mg-seg">
          <button className={season === "Summer" ? "on" : ""} onClick={() => { setPlaying(false); setSeason("Summer"); }}>Summer</button>
          <button className={season === "Winter" ? "on w" : ""} onClick={() => { setPlaying(false); setSeason("Winter"); }}>Winter</button>
        </div>
      </div>

      {q.error ? <p className="mg-err">Could not load: {String(q.error.message || q.error)}</p> : null}

      <div className="mg-grid">
        <div>
          <div className="mg-stage" ref={stageRef} onPointerDown={onDown}>
            {q.loading && !all.length ? <p className="mg-msg" style={{ padding: 40 }}>Loading every Games…</p> : (
              <div className={dragging ? "drag" : ""}>
                <LiveGlobe anim={anim} games={games} season={season} maxM={maxM} sel={sel} onPick={pick} rotRef={rotRef} hover={hover} setHover={setHover} />
              </div>
            )}
            {games ? (
              <div className="mg-games">
                <div className="yr">{yr}</div>
                <div className="city">{cities.join(" & ")}</div>
                <div className="facts"><b>{int(N(games.medals))}</b> medals · <b>{int(N(games.nocs))}</b> teams · <b>{int(N(games.athletes))}</b> athletes</div>
              </div>
            ) : null}
            <div className="mg-hint">Drag to spin<br />Click a country</div>
          </div>
          <div className="mg-time">
            <button className={`mg-play${W ? " w" : ""}`} onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}>
              {playing ? (
                <svg width="16" height="16" viewBox="0 0 16 16"><rect x="3" y="2" width="3.6" height="12" rx="1" fill="#1a1204" /><rect x="9.4" y="2" width="3.6" height="12" rx="1" fill="#1a1204" /></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16"><path d="M4 2.2 L14 8 L4 13.8 Z" fill="#1a1204" /></svg>
              )}
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="mg-timelbl">{season} Games · bar height = medals awarded</div>
              <div className="mg-ticks">
                {seasonGames.map((g) => {
                  const y = N(g.year), on = y === yr;
                  return (
                    <div key={y} className={`mg-tick${on ? " on" : y < yr ? " past" : ""}${W ? " w" : ""}`} onClick={() => { setPlaying(false); setYear(y); }}
                      title={`${y}: ${int(N(g.medals))} medals awarded`}>
                      <i style={{ height: `${Math.max(3, (N(g.medals) / gmax) * 42)}px` }} />
                      <em>{on || (y % 20 === 0 && Math.abs(y - yr) > 6) ? `'${String(y).slice(2)}` : ""}</em>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {sel ? (
          <CountryPanel region={sel} season={season} year={yr} games={games} seasonGames={seasonGames} sportsRows={sportsRows}
            onClose={close} onYear={(y) => { setPlaying(false); setYear(y); }} />
        ) : (
          <div className="mg-card" key={"t" + season}>
            <p className="mg-lbl">Medal table · {yr} {season}</p>
            <h2>{cities.join(" & ") || "…"}</h2>
            <p className="mg-msg" style={{ margin: "4px 0 10px" }}>Ranked by golds. Click a country to see its story.</p>
            {games ? <MedalTable games={games} onPick={pick} /> : null}
            <p className="mg-note">Team medals count once (the model's medals measure: one per Games, event, team and medal), so a relay gold is one gold, not four. Countries are modern regions: the Soviet Union shows as Russia, East and West Germany as Germany. Includes 1906 Athens and the 1912–1948 Art Competitions, as the model does. Athlete names are not in the model, so there is no athlete list.</p>
          </div>
        )}
      </div>
    </div>
  );
}
