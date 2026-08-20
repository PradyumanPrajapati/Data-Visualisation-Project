const stateOrder = ["ACT", "NSW", "NT", "Qld", "SA", "Tas", "Vic", "WA"];
const stateColors = [
	"#0f766e",
	"#c2410c",
	"#2563eb",
	"#b45309",
	"#166534",
	"#b91c1c",
	"#1f2937",
	"#7c2d12",
];

const colorScale = d3.scaleOrdinal(stateOrder, stateColors);
const formatComma = d3.format(",");

const carKey = "Car driver, passenger or unknown position";
const vulnerableKeys = ["Motorcyclist", "Pedal cyclist", "Pedestrian"];

const toNumber = (value) => {
	const parsed = +value;
	return Number.isFinite(parsed) ? parsed : 0;
};