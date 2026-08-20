// Viz 1 : Trend Line Chart


const trendState = {
	visibleStates: new Set(stateOrder),
	highlightState: null,
	_manuallyHidden: new Set(),
};

function syncTrendState() {
	for (const state of trendState.visibleStates) {
		if (!appState.selectedStates.has(state)) {
			trendState.visibleStates.delete(state);
		}
	}
	for (const state of appState.selectedStates) {
		if (!trendState.visibleStates.has(state) && !trendState._manuallyHidden.has(state)) {
			trendState.visibleStates.add(state);
		}
	}
}

// Builds the legend buttons for the trend chart and binds click and reset interactions
function setupTrendLegend() {
	syncTrendState();
	const legend = d3.select("#trend-legend");
	legend
		.selectAll("button")
		.data(stateOrder)
		.join("button")
		.attr("type", "button")
		.attr("class", "legend-item")
		.style("--swatch", (d) => colorScale(d))
		.text((d) => d)
		.style("display", (d) => appState.selectedStates.has(d) ? null : "none")
		.on("click", (event, state) => {
			if (trendState.visibleStates.has(state)) {
				if (trendState.visibleStates.size > 1) {
					trendState.visibleStates.delete(state);
					trendState._manuallyHidden.add(state);
				}
			} else {
				trendState.visibleStates.add(state);
				trendState._manuallyHidden.delete(state);
			}
			updateTrendLegendVisibility();
			const { filteredTrend } = getFilteredData();
			drawTrend("#trend-chart", filteredTrend);
		});

	updateTrendLegendVisibility();

	const resetButton = document.getElementById("trend-reset");
	if (resetButton && !resetButton.dataset.bound) {
		resetButton.dataset.bound = "true";
		resetButton.addEventListener("click", () => {
			trendState.visibleStates = new Set(appState.selectedStates);
			trendState._manuallyHidden = new Set();
			trendState.highlightState = null;
			updateTrendLegendVisibility();
			const { filteredTrend } = getFilteredData();
			drawTrend("#trend-chart", filteredTrend);
		});
	}
}

// Drawing line chart
function drawTrend(containerId, trendData) {
	const container = d3.select(containerId);
	container.selectAll("*").remove();
	const highlightState = trendState.highlightState;

	const bounds = container.node().getBoundingClientRect();
	const width = Math.max(bounds.width, 320);
	const height = 360;
	const margin = { top: 28, right: 22, bottom: 40, left: 54 };
	const innerWidth = width - margin.left - margin.right;
	const innerHeight = height - margin.top - margin.bottom;

	const svg = container
		.append("svg")
		.attr("width", width)
		.attr("height", height)
		.attr("viewBox", `0 0 ${width} ${height}`)
		.attr("role", "img")
		.attr("aria-label", "Hospitalised injuries by state over time");

	const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

	const x = d3.scaleLinear()
		.domain(d3.extent(trendData, (d) => d.year))
		.range([0, innerWidth]);

	const y = d3.scaleLinear()
		.domain([0, d3.max(trendData, (d) => d.count) || 0])
		.nice()
		.range([innerHeight, 0]);

	g.append("g").attr("class", "grid")
		.call(d3.axisLeft(y).ticks(5).tickSize(-innerWidth).tickFormat(""));

	g.append("g").attr("class", "axis")
		.attr("transform", `translate(0,${innerHeight})`)
		.call(d3.axisBottom(x).ticks(6).tickFormat(d3.format("d")));

	g.append("g").attr("class", "axis")
		.call(d3.axisLeft(y).ticks(5));

	const line = d3.line()
		.x((d) => x(d.year))
		.y((d) => y(d.count));

	const dataByState = d3.group(trendData, (d) => d.state);

	g.append("g")
		.selectAll("path")
		.data(stateOrder)
		.enter()
		.append("path")
		.attr("fill", "none")
		.attr("stroke", (state) => colorScale(state))
		.attr("stroke-width", (state) => highlightState === state ? 3 : 2.2)
		.attr("opacity", (state) => {
			const isVisible = trendState.visibleStates.has(state) || state === highlightState;
			if (!highlightState) return isVisible ? 0.95 : 0.08;
			if (state === highlightState) return 1;
			return isVisible ? 0.15 : 0.04;
		})
		.style("cursor", "pointer")
		.attr("d", (state) => {
			const rows = dataByState.get(state) || [];
			return line(rows.sort((a, b) => a.year - b.year));
		})
		.on("click", (event, state) => {
			trendState.highlightState = trendState.highlightState === state ? null : state;
			updateTrendLegendVisibility();
			drawTrend(containerId, trendData);
		});

	g.append("g")
		.selectAll("circle")
		.data(trendData)
		.enter()
		.append("circle")
		.attr("cx", (d) => x(d.year))
		.attr("cy", (d) => y(d.count))
		.attr("r", 5)
		.attr("fill", (d) => colorScale(d.state))
		.attr("opacity", 0)
		.attr("pointer-events", (d) =>
			trendState.visibleStates.has(d.state) || d.state === highlightState ? "all" : "none"
		)
		.on("mouseenter", (event, d) => {
			d3.select(event.currentTarget).attr("opacity", 1);
			showTooltip(event, `${d.state} ${d.year}<br/>${formatComma(d.count)} cases`);
		})
		.on("mouseleave", (event) => {
			d3.select(event.currentTarget).attr("opacity", 0);
			hideTooltip();
		});

	g.append("text").attr("class", "axis-label")
		.attr("x", innerWidth / 2).attr("y", innerHeight + 34)
		.attr("text-anchor", "middle").text("Calendar year");

	g.append("text").attr("class", "axis-label")
		.attr("x", -innerHeight / 2).attr("y", -40)
		.attr("text-anchor", "middle").attr("transform", "rotate(-90)")
		.text("Hospitalised injuries (count)");
}