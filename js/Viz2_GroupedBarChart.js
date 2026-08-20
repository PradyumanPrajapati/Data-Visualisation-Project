// ── Viz 2 : Grouped Bar Chart ─────────────────────────────────────────────
// Two toggle modes:
//   "grouped"    → Car occupants vs all Vulnerable (non-car combined)
//   "individual" → All 8 road user types, togglable via legend


const viz2State = {
	mode: "grouped",
	selectedRoadUser: new Set(),
	highlightState: null,  
};

// All 8 road user types that are in the dataset
const allRoadUsers = [
	"Car driver, passenger or unknown position",
	"Motorcyclist",
	"Pedal cyclist",
	"Pedestrian",
	"Bus occupant",
	"Pick-up truck or van occupant",
	"Heavy transport driver, passenger or unknown position",
	"Other or unknown",
];

// Displaying labels for each road user type
const userLabels = {
	"Car driver, passenger or unknown position": "Car occupant",
	"Motorcyclist": "Motorcyclist",
	"Pedal cyclist": "Pedal cyclist",
	"Pedestrian": "Pedestrian",
	"Bus occupant": "Bus occupant",
	"Pick-up truck or van occupant": "Pick-up / van",
	"Heavy transport driver, passenger or unknown position": "Heavy transport",
	"Other or unknown": "Other / unknown",
};

// Colours for each Road user type
const userColors = {
	"Car driver, passenger or unknown position": "#0f766e",
	"Motorcyclist": "#b45309",
	"Pedal cyclist": "#2563eb",
	"Pedestrian": "#ff0000",
	"Bus occupant": "#df15b4",
	"Pick-up truck or van occupant": "#0369a1",
	"Heavy transport driver, passenger or unknown position": "#59ce11",
	"Other or unknown": "#625e5e",
};

// Colours For Grouped Mode
const groupedColors = {
	car: "#0f766e",
	vulnerable: "#b45309",
};

// All Road user type active for the chart by default
viz2State.selectedRoadUser = new Set(allRoadUsers);


function setupComparisonLegend() {
	renderViz2Legend();
}


function renderViz2Legend() {
	const legend = d3.select("#compare-legend");
	legend.selectAll("*").remove();

	if (viz2State.mode === "grouped") {
		const items = [
			{ label: "Car occupants", color: groupedColors.car },
			{ label: "Vulnerable road users", color: groupedColors.vulnerable },
		];
		legend
			.selectAll("div")
			.data(items)
			.join("div")
			.attr("class", "legend-item")
			.style("--swatch", (d) => d.color)
			.text((d) => d.label);
	} else {
	
		legend
			.selectAll("button")
			.data(allRoadUsers)
			.join("button")
			.attr("type", "button")
			.attr("class", "legend-item")
			.classed("is-off", (d) => !viz2State.selectedRoadUser.has(d))
			.attr("aria-pressed", (d) =>
				viz2State.selectedRoadUser.has(d) ? "true" : "false"
			)
			.style("--swatch", (d) => userColors[d])
			.text((d) => userLabels[d])
			.on("click", (event, userType) => {
				if (viz2State.selectedRoadUser.has(userType)) {
					if (viz2State.selectedRoadUser.size > 1) {
						viz2State.selectedRoadUser.delete(userType);
					}
				} else {
					viz2State.selectedRoadUser.add(userType);
				}

				legend
					.selectAll("button")
					.classed("is-off", (d) => !viz2State.selectedRoadUser.has(d))
					.attr("aria-pressed", (d) =>
						viz2State.selectedRoadUser.has(d) ? "true" : "false"
					);
				const { filteredUsers } = getFilteredData();
				const selectedList = Array.from(appState.selectedStates);
				const comparisonData = buildComparisonData(filteredUsers, selectedList);
				drawGrouped("#compare-chart", comparisonData);
			});
	}
}


function setupViz2Toggles() {
	const container = document.getElementById("viz2_toggle");
	if (!container || container.dataset.bound) return;
	container.dataset.bound = "true";

	const buttons = container.querySelectorAll("button[data-mode]");
	buttons.forEach((btn) => {
		btn.addEventListener("click", () => {
			viz2State.mode = btn.dataset.mode;

			if (viz2State.mode === "individual") {
				viz2State.selectedRoadUser = new Set(allRoadUsers);
			}

			buttons.forEach((b) =>
				b.classList.toggle("toggle-active", b.dataset.mode === viz2State.mode)
			);

			renderViz2Legend();

			const { filteredUsers } = getFilteredData();
			const selectedList = Array.from(appState.selectedStates);
			const comparisonData = buildComparisonData(filteredUsers, selectedList);
			drawGrouped("#compare-chart", comparisonData);
		});
	});

	buttons.forEach((b) =>
		b.classList.toggle("toggle-active", b.dataset.mode === viz2State.mode)
	);


	const resetBtn = document.getElementById("compare-reset");
	if (resetBtn && !resetBtn.dataset.bound) {
		resetBtn.dataset.bound = "true";
		resetBtn.addEventListener("click", () => {
			viz2State.selectedRoadUser = new Set(allRoadUsers);
			viz2State.highlightState = null;

			renderViz2Legend();

			const { filteredUsers } = getFilteredData();
			const selectedList = Array.from(appState.selectedStates);
			const comparisonData = buildComparisonData(filteredUsers, selectedList);
			drawGrouped("#compare-chart", comparisonData);
		});
	}
}

function buildComparisonData(userData, states = stateOrder) {
	const byState = d3.group(userData, (d) => d.state);

	if (viz2State.mode === "grouped") {
		return states.map((state) => {
			const rows = byState.get(state) || [];
			const car = d3.sum(
				rows.filter((d) => d.user === carKey),
				(d) => d.count
			);
			const vulnerable = d3.sum(
				rows.filter((d) => vulnerableKeys.includes(d.user)),
				(d) => d.count
			);
			return {
				state,
				categories: [
					{ key: "car", label: "Car occupants", value: car, color: groupedColors.car },
					{ key: "vulnerable", label: "Vulnerable road users", value: vulnerable, color: groupedColors.vulnerable },
				],
			};
		});
	} else {
		const activeTypes = allRoadUsers.filter((t) =>
			viz2State.selectedRoadUser.has(t)
		);
		return states.map((state) => {
			const rows = byState.get(state) || [];
			const categories = activeTypes.map((userType) => ({
				key: userType,
				label: userLabels[userType],
				value: d3.sum(
					rows.filter((d) => d.user === userType),
					(d) => d.count
				),
				color: userColors[userType],
			}));
			return { state, categories };
		});
	}
}


function drawGrouped(containerId, comparisonData) {
	setupViz2Toggles();

	const container = d3.select(containerId);
	container.selectAll("*").remove();

	if (!comparisonData || comparisonData.length === 0) return;
	const highlightState = viz2State.highlightState;  // local only

	const bounds = container.node().getBoundingClientRect();
	const width = Math.max(bounds.width, 320);
	const height = 380;
	const margin = { top: 24, right: 18, bottom: 60, left: 60 };
	const innerWidth = width - margin.left - margin.right;
	const innerHeight = height - margin.top - margin.bottom;

	const svg = container
		.append("svg")
		.attr("width", width)
		.attr("height", height)
		.attr("viewBox", `0 0 ${width} ${height}`)
		.attr("role", "img")
		.attr("aria-label", "Grouped bar chart comparing road user types by state");

	const g = svg
		.append("g")
		.attr("transform", `translate(${margin.left},${margin.top})`);

	const categories = comparisonData[0].categories;
	const states = comparisonData.map((d) => d.state);

	const x0 = d3
		.scaleBand()
		.domain(states)
		.range([0, innerWidth])
		.paddingInner(0.22);

	const x1 = d3
		.scaleBand()
		.domain(categories.map((d) => d.key))
		.range([0, x0.bandwidth()])
		.padding(0.1);

	const maxVal =
		d3.max(comparisonData, (d) => d3.max(d.categories, (c) => c.value)) || 0;

	const y = d3
		.scaleLinear()
		.domain([0, maxVal])
		.nice()
		.range([innerHeight, 0]);

	// Grid lines
	g.append("g")
		.attr("class", "grid")
		.call(d3.axisLeft(y).ticks(5).tickSize(-innerWidth).tickFormat(""));

	// X axis
	g.append("g")
		.attr("class", "axis")
		.attr("transform", `translate(0,${innerHeight})`)
		.call(d3.axisBottom(x0).tickSizeOuter(0));

	// Y axis
	g.append("g")
		.attr("class", "axis")
		.call(d3.axisLeft(y).ticks(5).tickFormat(d3.format("~s")));

	// State groups
	const stateGroups = g
		.selectAll("g.state-group")
		.data(comparisonData)
		.enter()
		.append("g")
		.attr("class", "state-group")
		.attr("transform", (d) => `translate(${x0(d.state)},0)`);

	// Bars
	stateGroups
		.selectAll("rect")
		.data((d) => d.categories.map((c) => ({ ...c, state: d.state })))
		.enter()
		.append("rect")
		.attr("x", (d) => x1(d.key))
		.attr("y", (d) => y(d.value))
		.attr("width", x1.bandwidth())
		.attr("height", (d) => Math.max(0, innerHeight - y(d.value)))
		.attr("fill", (d) => d.color)
		.attr("opacity", (d) =>
			highlightState
				? d.state === highlightState
					? 1
					: 0.25
				: 0.9
		)
		.attr("stroke", (d) =>
			highlightState && d.state === highlightState ? "#111827" : "none"
		)
		.attr("stroke-width", (d) =>
			highlightState && d.state === highlightState ? 1.5 : 0
		)
		.attr("rx", 3)
		.style("cursor", "pointer")
		.on("mouseenter", (event, d) => {
			showTooltip(
				event,
				`<strong>${d.state}</strong> — ${d.label}<br/>${formatComma(d.value)} cases`
			);
		})
		.on("mouseleave", () => hideTooltip())
		.on("click", (event, d) => {
		
			viz2State.highlightState = viz2State.highlightState === d.state ? null : d.state;
			const { filteredUsers } = getFilteredData();
			const selectedList = Array.from(appState.selectedStates);
			const comparisonData = buildComparisonData(filteredUsers, selectedList);
			drawGrouped(containerId, comparisonData);
		});

	// Axis labels
	g.append("text")
		.attr("class", "axis-label")
		.attr("x", innerWidth / 2)
		.attr("y", innerHeight + 48)
		.attr("text-anchor", "middle")
		.text("State or Territory");

	g.append("text")
		.attr("class", "axis-label")
		.attr("x", -innerHeight / 2)
		.attr("y", -46)
		.attr("text-anchor", "middle")
		.attr("transform", "rotate(-90)")
		.text("Hospitalised Injuries (count)");
}