const tooltip = d3.select("body").append("div").attr("class", "tooltip");
const appState = {
	selectedStates: new Set(stateOrder),
	yearRange: [2011, 2021],
	yearMin: 2011,
	yearMax: 2021,
};

const elements = {
	stateFilters: document.getElementById("state-filters"),
	stateSelectAll: document.getElementById("state-select-all"),
	yearStart: document.getElementById("year-start"),
	yearEnd: document.getElementById("year-end"),
	yearLabel: document.getElementById("year-label"),
	yearReset: document.getElementById("year-reset"),
};

let updateCharts = () => {};
const rawData = { trend: [], users: [], severity: [] };

// Loads all three CSVs in parallel
Promise.all([
	d3.csv("data/viz1_state_totals.csv"),
	d3.csv("data/viz2_road_user.csv"),
	d3.csv("data/viz3_severity.csv"),
]).then(([rawTrend, rawUsers, rawSeverity]) => {
	const trendData = rawTrend
		.map((d) => ({
			year: +d["calendar year"],
			state: d["state or territory"],
			count: toNumber(
				d["Sum(count of cases excluding died in hospitals within 30 days)"]
			),
		}))
		.filter((d) => d.year && d.state);

	const userData = rawUsers
		.map((d) => ({
			user: d["road user"],
			state: d["state or territory (#1)"],
			count: toNumber(
				d["Sum(count of cases excluding died in hospitals within 30 days (#1))"]
			),
		}))
		.filter((d) => d.user && d.state);

	const severityData = rawSeverity
		.map((d) => ({
			state: d["state or territory"],
			count: toNumber(d["Sum(count of cases excluding died in hospitals within 30 days)"]),
			bedDays: toNumber(d["Sum(bed days excluding died in hospitals within 30 days)"]),
			bedDaysPerCase: toNumber(d["new column"]),
		}))
		.filter((d) => d.state);

	rawData.trend = trendData;
	rawData.users = userData;
	rawData.severity = severityData;

	setupFilters(trendData);
	setupTrendLegend();
	setupComparisonLegend();

	// Redraws all three charts based on current appState redrawn on every filter change
	updateCharts = () => {


		if (trendState.highlightState && !appState.selectedStates.has(trendState.highlightState)) {
			trendState.highlightState = null;
		}
		if (viz2State.highlightState && !appState.selectedStates.has(viz2State.highlightState)) {
			viz2State.highlightState = null;
		}
		if (viz3State.highlightState && !appState.selectedStates.has(viz3State.highlightState)) {
			viz3State.highlightState = null;
		}

		const { filteredTrend, filteredUsers } = getFilteredData();
		const selectedList = Array.from(appState.selectedStates);
		const comparisonData = buildComparisonData(filteredUsers, selectedList);
		const severityData = buildSeverityData(selectedList);

		updateTrendLegendVisibility();

		drawTrend("#trend-chart", filteredTrend);
		drawGrouped("#compare-chart", comparisonData);
		drawScatter("#severity-chart", severityData);
	};

	updateCharts();

	let resizeTimer;
	window.addEventListener("resize", () => {
		window.clearTimeout(resizeTimer);
		resizeTimer = window.setTimeout(updateCharts, 120);
	});
});


function updateTrendLegendVisibility() {
	syncTrendState();
	const highlightState = trendState.highlightState;
	const isActive = (state) => {
		if (highlightState) return state === highlightState;
		return trendState.visibleStates.has(state);
	};

	const legend = d3.select("#trend-legend");
	legend.selectAll("button")
		.style("display", (d) => appState.selectedStates.has(d) ? null : "none")
		.classed("is-off", (d) => !isActive(d))
		.attr("aria-pressed", (d) => (isActive(d) ? "true" : "false"));
}


function setupFilters(trendData) {
	const [minYear, maxYear] = d3.extent(trendData, (d) => d.year);
	appState.yearMin = minYear || appState.yearMin;
	appState.yearMax = maxYear || appState.yearMax;
	appState.yearRange = [appState.yearMin, appState.yearMax];

	if (elements.yearStart && elements.yearEnd) {
		elements.yearStart.min = appState.yearMin;
		elements.yearStart.max = appState.yearMax;
		elements.yearStart.value = appState.yearRange[0];
		elements.yearEnd.min = appState.yearMin;
		elements.yearEnd.max = appState.yearMax;
		elements.yearEnd.value = appState.yearRange[1];
	}

	updateYearLabel();
	buildStateFilters();
	bindFilterEvents();
}

// Dynamically builds one checkbox per state and injects them into the filter panel
function buildStateFilters() {
	if (!elements.stateFilters) {
		return;
	}

	elements.stateFilters.innerHTML = "";
	stateOrder.forEach((state) => {
		const label = document.createElement("label");
		label.className = "state-filter";

		const input = document.createElement("input");
		input.type = "checkbox";
		input.value = state;
		input.checked = appState.selectedStates.has(state);
		input.addEventListener("change", () => {
			toggleStateSelection(state, input.checked);
		});

		const text = document.createElement("span");
		text.textContent = state;

		label.appendChild(input);
		label.appendChild(text);
		elements.stateFilters.appendChild(label);
	});
}


function bindFilterEvents() {
	if (elements.stateSelectAll && !elements.stateSelectAll.dataset.bound) {
		elements.stateSelectAll.dataset.bound = "true";
		elements.stateSelectAll.addEventListener("click", () => {
			appState.selectedStates = new Set(stateOrder);
			if (typeof trendState !== "undefined") trendState.visibleStates = new Set(stateOrder);
			syncStateControls();
			updateCharts();
		});
	}

	const handleYearInput = () => {
		const start = Number(elements.yearStart?.value || appState.yearRange[0]);
		const end = Number(elements.yearEnd?.value || appState.yearRange[1]);
		const safeStart = Math.min(start, end);
		const safeEnd = Math.max(start, end);

		if (elements.yearStart && elements.yearEnd) {
			elements.yearStart.value = safeStart;
			elements.yearEnd.value = safeEnd;
		}

		appState.yearRange = [safeStart, safeEnd];
		updateYearLabel();
		updateCharts();
	};

	if (elements.yearStart && !elements.yearStart.dataset.bound) {
		elements.yearStart.dataset.bound = "true";
		elements.yearStart.addEventListener("input", handleYearInput);
	}

	if (elements.yearEnd && !elements.yearEnd.dataset.bound) {
		elements.yearEnd.dataset.bound = "true";
		elements.yearEnd.addEventListener("input", handleYearInput);
	}

	if (elements.yearReset && !elements.yearReset.dataset.bound) {
		elements.yearReset.dataset.bound = "true";
		elements.yearReset.addEventListener("click", () => {
			appState.yearRange = [appState.yearMin, appState.yearMax];
			if (elements.yearStart && elements.yearEnd) {
				elements.yearStart.value = appState.yearRange[0];
				elements.yearEnd.value = appState.yearRange[1];
			}
			updateYearLabel();
			updateCharts();
		});
	}
}

// Adds or removes a state from appState.selectedStates and redraws all charts
function toggleStateSelection(state, isSelected) {
	if (isSelected) {
		appState.selectedStates.add(state);
	} else {
		appState.selectedStates.delete(state);
	}
	if (appState.selectedStates.size === 0) {
		appState.selectedStates = new Set(stateOrder);
	}
	syncStateControls();
	updateCharts();
}


function syncStateControls() {
	if (!elements.stateFilters) {
		return;
	}
	const inputs = elements.stateFilters.querySelectorAll("input[type='checkbox']");
	inputs.forEach((input) => {
		input.checked = appState.selectedStates.has(input.value);
	});
}

// Updates the displayed year range label above the sliders
function updateYearLabel() {
	if (elements.yearLabel) {
		elements.yearLabel.textContent = `${appState.yearRange[0]}-${appState.yearRange[1]}`;
	}
}


function getFilteredData() {
	const [startYear, endYear] = appState.yearRange;
	const filteredTrend = rawData.trend.filter(
		(d) =>
			appState.selectedStates.has(d.state) &&
			d.year >= startYear &&
			d.year <= endYear
	);
	const filteredUsers = rawData.users.filter((d) =>
		appState.selectedStates.has(d.state)
	);
	return { filteredTrend, filteredUsers };
}


// Toggles highlighted on a single state in the trend chart
function toggleHighlightTrend(state) {
	if (!state) return;
	trendState.highlightState = trendState.highlightState === state ? null : state;
	const { filteredTrend } = getFilteredData();
	drawTrend("#trend-chart", filteredTrend);
}

// Toggles highlighted on a single state in the comparison bar chart
function toggleHighlightViz2(state) {
	if (!state) return;
	viz2State.highlightState = viz2State.highlightState === state ? null : state;
	const { filteredUsers } = getFilteredData();
	const selectedList = Array.from(appState.selectedStates);
	const comparisonData = buildComparisonData(filteredUsers, selectedList);
	drawGrouped("#compare-chart", comparisonData);
}

// Toggles highlighted on a single state in the choropleth map
function toggleHighlightViz3(state) {
	if (!state) return;
	viz3State.highlightState = viz3State.highlightState === state ? null : state;
	const selectedList = Array.from(appState.selectedStates);
	const severityData = buildSeverityData(selectedList);
	drawScatter("#severity-chart", severityData);
}

// Clears any highlight on the severity map
function clearHighlightViz3() {
	viz3State.highlightState = null;
	const selectedList = Array.from(appState.selectedStates);
	const severityData = buildSeverityData(selectedList);
	drawScatter("#severity-chart", severityData);
}

// Positions and shows the shared tooltip at the cursor location
function showTooltip(event, html) {
	tooltip
		.html(html)
		.style("left", `${event.clientX + 12}px`)
		.style("top", `${event.clientY - 28}px`)
		.classed("show", true);
}

// Hides the shared tooltip
function hideTooltip() {
	tooltip.classed("show", false);
}