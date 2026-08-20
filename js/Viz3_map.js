//  Viz 3 : Choropleth Map

const stateNameToCode = {
	"New South Wales": "NSW",
	"Victoria": "Vic",
	"Queensland": "Qld",
	"South Australia": "SA",
	"Western Australia": "WA",
	"Tasmania": "Tas",
	"Northern Territory": "NT",
	"Australian Capital Territory": "ACT",
};

const viz3State = {
	highlightState: null,
};


function buildSeverityData(states = stateOrder) {
	return rawData.severity.filter((d) => states.includes(d.state));
}


function setupViz3Controls() {
	const resetBtn = document.getElementById("severity-reset");
	if (!resetBtn || resetBtn.dataset.bound) return;
	resetBtn.dataset.bound = "true";
	resetBtn.addEventListener("click", () => {
		viz3State.highlightState = null;
		const selectedList = Array.from(appState.selectedStates);
		const data = buildSeverityData(selectedList);
		drawScatter("#severity-chart", data);
	});
}


function drawScatter(containerId, severityData) {
	setupViz3Controls();

	const container = d3.select(containerId);
	container.selectAll("*").remove();

	if (!severityData || severityData.length === 0) return;

	const highlightState = viz3State.highlightState;

	const bounds = container.node().getBoundingClientRect();
	const width = Math.max(bounds.width, 320);
	const height = 500;

	const svg = container
		.append("svg")
		.attr("width", width)
		.attr("height", height)
		.attr("viewBox", `0 0 ${width} ${height}`)
		.attr("role", "img")
		.attr("aria-label", "Choropleth map of Australia showing bed days per case by state");

	const mapGroup = svg.append("g");

	const severityByState = new Map(rawData.severity.map((d) => [d.state, d]));

	const minVal = d3.min(rawData.severity, (d) => d.bedDaysPerCase);
	const maxVal = d3.max(rawData.severity, (d) => d.bedDaysPerCase);


	const colorMap = d3.scaleSequential()
		.domain([minVal, maxVal])
		.interpolator((t) => d3.interpolateBlues(0.5 + t * 0.5));

	d3.json("data/australia-states.geojson").then((geoData) => {
		const mapHeight = height - 60; // leave room for legend at bottom
		const projection = d3.geoMercator().fitSize([width, mapHeight], geoData);
		const path = d3.geoPath().projection(projection);


		mapGroup.append("g")
			.selectAll("path")
			.data(geoData.features)
			.enter()
			.append("path")
			.attr("d", path)
			.attr("fill", (feature) => {
				const code = stateNameToCode[feature.properties.STATE_NAME];
				const d = severityByState.get(code);
				if (!d || !appState.selectedStates.has(code)) return "#e5e7eb";
				return colorMap(d.bedDaysPerCase);
			})
			.attr("opacity", (feature) => {
				const code = stateNameToCode[feature.properties.STATE_NAME];
				if (highlightState) return code === highlightState ? 1 : 0.35;
				return 1;
			})
			.attr("stroke", (feature) => {
				const code = stateNameToCode[feature.properties.STATE_NAME];
				return highlightState && code === highlightState ? "#111827" : "#fff";
			})
			.attr("stroke-width", (feature) => {
				const code = stateNameToCode[feature.properties.STATE_NAME];
				return highlightState && code === highlightState ? 2.5 : 1;
			})
			.style("cursor", "pointer")
			.on("mouseenter", (event, feature) => {
				const code = stateNameToCode[feature.properties.STATE_NAME];
				const d = severityByState.get(code);
				if (!d) return;
				showTooltip(
					event,
					`<strong>${code}</strong> — ${feature.properties.STATE_NAME}<br/>
					Total injuries: ${formatComma(d.count)}<br/>
					Total bed days: ${formatComma(d.bedDays)}<br/>
					Bed days per case: ${d.bedDaysPerCase.toFixed(2)}`
				);
			})
			.on("mouseleave", () => hideTooltip())
			.on("click", (event, feature) => {
				const code = stateNameToCode[feature.properties.STATE_NAME];
				if (!code) return;
				viz3State.highlightState = viz3State.highlightState === code ? null : code;
				const selectedList = Array.from(appState.selectedStates);
				const data = buildSeverityData(selectedList);
				drawScatter(containerId, data);
			});

		// State labels 
		mapGroup.append("g")
			.selectAll("text")
			.data(geoData.features)
			.enter()
			.append("text")
			.attr("transform", (feature) => {
				const code = stateNameToCode[feature.properties.STATE_NAME];
				const offsets = { ACT: [14, -8], Tas: [0, 0] };
				const centroid = path.centroid(feature);
				const off = offsets[code] || [0, 0];
				return `translate(${centroid[0] + off[0]}, ${centroid[1] + off[1]})`;
			})
			.attr("text-anchor", "middle")
			.attr("dy", "0.35em")
			.attr("font-size", (feature) => {
				const code = stateNameToCode[feature.properties.STATE_NAME];
				return ["ACT", "Tas"].includes(code) ? "11px" : "14px";
			})
			.attr("fill", "#fff")
			.attr("font-weight", "600")
			.attr("pointer-events", "none")
			.text((feature) => {
				const code = stateNameToCode[feature.properties.STATE_NAME];
				const d = severityByState.get(code);
				return d ? `${code} ${d.bedDaysPerCase.toFixed(1)}` : "";
			});

		// Colour legend 
		const legendWidth = 180;
		const legendHeight = 12;
		const legendX = (width - legendWidth) / 2; 
		const legendY = mapHeight + 20;

		const defs = svg.append("defs");
		const gradientId = "severity-gradient";
		const linearGrad = defs.append("linearGradient").attr("id", gradientId);
		linearGrad.selectAll("stop")
			.data(d3.range(0, 1.01, 0.1))
			.enter()
			.append("stop")
			.attr("offset", (d) => `${d * 100}%`)
			.attr("stop-color", (d) => colorMap(minVal + d * (maxVal - minVal)));

		// Legend title
		svg.append("text")
			.attr("x", legendX + legendWidth / 2)
			.attr("y", legendY - 6)
			.attr("text-anchor", "middle")
			.attr("font-size", "11px")
			.attr("fill", "#374151")
			.attr("font-weight", "600")
			.text("Bed Days per case");

		// Gradient bar
		svg.append("rect")
			.attr("x", legendX)
			.attr("y", legendY)
			.attr("width", legendWidth)
			.attr("height", legendHeight)
			.attr("rx", 3)
			.style("fill", `url(#${gradientId})`);

		// Min label
		svg.append("text")
			.attr("x", legendX)
			.attr("y", legendY + legendHeight + 14)
			.attr("text-anchor", "start")
			.attr("font-size", "11px")
			.attr("fill", "#000000")
			.text("Mild");

		// Max label
		svg.append("text")
			.attr("x", legendX + legendWidth)
			.attr("y", legendY + legendHeight + 14)
			.attr("text-anchor", "end")
			.attr("font-size", "11px")
			.attr("fill", "#000000")
			.text("Severe");
	});
}