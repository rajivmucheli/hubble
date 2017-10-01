var parseDate = d3.timeParse("%Y-%m");

var chartColors =
{
	red: [255, 94, 77],
	orange: [255, 167, 26],
	yellow: [255, 206, 0],
	green: [106, 237, 199],
	blue: [57, 194, 201],
	purple: [248, 102, 185],
	violet: [153, 140, 227],
	grey: [201, 203, 207],
};

var chartColorSequence =
[
	chartColors.blue,
	chartColors.green,
	chartColors.yellow,
	chartColors.orange,
	chartColors.red,
	chartColors.violet,
	chartColors.purple,
];

var barWidth = 35;

var timeSeriesChartDefaults =
{
	scales:
	{
		xAxes:
		[
			{
				type: "time",
				time:
				{
					format: "YYYY-MM-DD",
					tooltipFormat: "D MMMM YYYY",
					minUnit: "day",
				}
			}
		],
		yAxes:
		[
			{
				ticks:
				{
					beginAtZero: true
				}
			}
		]
	},
};

var barChartDefaults =
{
	legend:
	{
		display: true
	},
	maintainAspectRatio: false
};

var stackedBarChartDefaults =
{
	scales:
	{
		xAxes:
		[
			{
				stacked: true
			}
		],
		yAxes:
		[
			{
				stacked: true
			}
		]
	},
	legend:
	{
		display: true
	},
	maintainAspectRatio: false
};

function createHistoryChart(canvas)
{
	var url = $(canvas).data("url");

	d3.tsv(url,
		function(row)
		{
			$.each(Object.keys(row).slice(1),
				function(keyID, key)
				{
					if (row[key] == "")
						row[key] = undefined;
					else
						row[key] = +row[key];
				});

			return row;
		},
		function(error, data)
		{
			if (error)
				throw error;

			var context = canvas.getContext("2d");

			if ($(canvas).data("config") && "aggregate" in $(canvas).data("config") && $(canvas).data("config").aggregate == "weekly")
			{
				aggregatedData = Array();
				data.sort(
					function(row1, row2)
					{
						var date1 = new Date(row1["date"]);
						var date2 = new Date(row2["date"]);
						return date1 - date2;
					});

				currentRow = Object();

				for (var i = 0; i < data.length; i++)
				{
					if (i % 7 == 0)
						$.each(Object.keys(data[i]).slice(1),
							function(keyID, key)
							{
								currentRow[key] = 0;
							});

					currentRow["date"] = data[i]["date"];

					$.each(Object.keys(data[i]).slice(1),
						function(keyID, key)
						{
							currentRow[key] += data[i][key];
						});

					if (i % 7 == 6)
						// Store a copy of the aggregated data
						aggregatedData.push($.extend({}, currentRow));
				}

				data = aggregatedData;
			}

			if ($(canvas).data("config") && "sliceData" in $(canvas).data("config"))
				data = data.slice($(canvas).data("config").sliceData[0], $(canvas).data("config").sliceData[1]);

			var originalDataSeries = Object.keys(data[0]).slice(1);

			if ($(canvas).data("config") && "series" in $(canvas).data("config"))
				var dataSeries = $(canvas).data("config").series;
			else
				var dataSeries = originalDataSeries;

			if ($(canvas).data("config") && "visibleSeries" in $(canvas).data("config"))
				var visibleDataSeries = $(canvas).data("config").visibleSeries;
			else
				var visibleDataSeries = originalDataSeries;

			var chartData = Array();

			var index = 0;

			$.each(dataSeries,
				function(dataSeriesID, dataSeries)
				{
					var color = chartColorSequence[index % chartColorSequence.length];
					var backgroundColorString = "rgba(" + color[0] + ", " + color[1] + ", " + color[2] + ", 0.25)";
					var borderColorString = "rgb(" + color[0] + ", " + color[1] + ", " + color[2] + ")";

					var seriesData =
					{
						label: dataSeries,
						backgroundColor: backgroundColorString,
						borderColor: borderColorString,
						fill: true,
						hidden: (visibleDataSeries.indexOf(dataSeries) == -1) ? true : false,
					}

					seriesData.data = data.map(function(row) {return {x: row.date, y: row[dataSeries]};});
					chartData.push(seriesData);

					index++;
				});

			var chart = new Chart(context,
				{
					type: "line",
					data:
					{
						datasets: chartData
					},
					options: timeSeriesChartDefaults
				});
		});
}

function createList(canvas)
{
	var url = $(canvas).data("url");

	d3.tsv(url,
		function(row)
		{
			$.each(Object.keys(row).slice(1),
				function(keyID, key)
				{
					row[key] = +row[key];
				});

			return row;
		},
		function(error, data)
		{
			if (error)
				throw error;

			if (data.length == 0)
				return;

			var context = canvas.getContext("2d");

			if ($(canvas).data("config") && "sliceData" in $(canvas).data("config"))
				data = data.slice($(canvas).data("config").sliceData[0], $(canvas).data("config").sliceData[1]);

			if ($(canvas).data("config") && "series" in $(canvas).data("config"))
				var types = $(canvas).data("config").series;
			else
				var types = Object.keys(data[0]).slice(1);

			if ($(canvas).data("config") && "visibleSeries" in $(canvas).data("config"))
				var visibleTypes = $(canvas).data("config").visibleSeries;
			else
				var visibleTypes = types;

			var chartData = Array();

			var index = 0;

			$.each(types,
				function(typeID, type)
				{
					var color = chartColorSequence[index % chartColorSequence.length];
					var colorString = "rgb(" + color[0] + ", " + color[1] + ", " + color[2] + ")";

					var seriesData =
					{
						label: type,
						backgroundColor: colorString,
						borderColor: colorString,
						fill: true,
						hidden: (visibleTypes.indexOf(type) == -1) ? true : false,
					}

					seriesData.data = data.map(function(row) {return Object.values(row)[1 + typeID];});
					chartData.push(seriesData);

					index++;
				});

			var repositories = data.map(function(row) {return Object.values(row)[0];});

			$(canvas).attr("height", data.length * barWidth);

			var isStacked = $(canvas).data("config") && "stacked" in $(canvas).data("config") && $(canvas).data("config").stacked;
			var options = isStacked ? stackedBarChartDefaults : barChartDefaults;
			options["legend"]["display"] = (types.length > 1);

			var chart = new Chart(context,
				{
					type: "horizontalBar",
					data:
					{
						labels: repositories,
						datasets: chartData
					},
					options: options
				});
		});
}

function gheHostname() {
	return $(location).prop("hostname").replace(/^(pages\.)/, "");
}

function gheUrl() {
	return $(location).prop("protocol") + "//" + gheHostname();
}

function createTable(table)
{
	var url = $(table).data("url");

	d3.tsv(url,
		function(error, data)
		{
			if (error)
				throw error;

			if (data.length == 0)
				return;

			var header = d3.select(table)
				.append("thead")
				.append("tr")
				.selectAll("th")
					.data(data.columns)
					.enter()
					.append("th")
					.text(function(d) { return d; });

			var rows = d3.select(table)
				.append("tbody")
				.selectAll("tr")
					.data(data)
					.enter()
					.append("tr");

			var cells = rows.selectAll("td")
				.data(function(row) {
					return d3.range(Object.keys(row).length).map(
						function(column, i) {
							return row[Object.keys(row)[i]];
						});
				})
				.enter()
				.append("td")
				.each(function(d, i) {
					var cell = d3.select(this);
					switch (data.columns[i].toLowerCase()) {
						case "user":
						case "organization":
						case "repository":
						case "resource":
						case "fork":
							cell = cell
								.append("a")
								.attr("target", "_blank")
								.attr("href", gheUrl() + "/" + d);
							break;
					}
					cell.text(function(d) { return d; })
				});
		});
}

function drawCoord(orgs, matrix) {
	function fadeRibbon(opacity) {
		return function(active_ribbon, i) {
			ribbons.filter(function(d) { return d != active_ribbon; })
				.transition()
				.style("opacity", opacity);
		};
	}

	function fadeRibbonsWithSameSource(opacity) {
		return function(d, i) {
			ribbons.filter(function(d) { return d.source.index != i && d.target.index != i; })
				.transition()
				.style("opacity", opacity);
		};
	}

	function ribbonTip(d) {
		var tip = d.source.value + " " + orgs[d.source.index] + " member" +
			(d.source.value > 1 ? "s" : "") + " contributed to " + orgs[d.target.index] + ".";
		if (d.target.value > 0) {
			tip = tip + "\n" + " " + orgs[d.target.index] + " member" +
			(d.source.value > 1 ? "s" : "") + " contributed to " + orgs[d.source.index] + ".";
		}
		return tip;
	}

	function chordTip(d) {
		return orgs[d.index];
	}

	// Remove all organizations that have no connections
	var i = orgs.length - 1;
	while (i >= 0) {
		count =   matrix.reduce(function(a, b) { return a + b[i]; }, 0)
		        + matrix[i].reduce(function(a, b) { return a + b; }, 0);
		if (count == 0) {
			matrix.splice(i,1);
			matrix.map(function(x) { return x.splice(i,1); });
			orgs.splice(i, 1);
		}
		i--;
	}

	// Remove all existing elements below the SVG element
	d3.select("svg").selectAll("*").remove();

	var pad = 90;
	var svg = d3.select("svg"),
		width = +svg.attr("width")-2*pad,
		height = +svg.attr("height")-2*pad,
		outerRadius = Math.min(width, height) * 0.5 - 65,
		innerRadius = outerRadius - 50;

	var color = d3.scaleOrdinal(d3.schemeCategory20);

	//Initialize chord diagram
	var chord = d3.chord()
		.padAngle(0.05)
		.sortSubgroups(d3.descending);

	var g = svg.append("g")
		.attr("transform", "translate(" + (width / 2 + pad) + "," + (height / 2 + pad) + ")")
		.datum(chord(matrix));

	// Defines each "group" in the chord diagram
	var group = g.append("g")
		.attr("class", "groups")
		.selectAll("g")
		.data(function(chords) { return chords.groups; })
		.enter().append("g")

	// Draw the radial arcs for each group
	var arc = d3.arc()
		.innerRadius(innerRadius)
		.outerRadius(outerRadius);

	group.append("path")
		.style("fill", function(d) { return color(d.index); })
		.style("stroke", function(d) { return d3.rgb(color(d.index)).darker(); })
		.attr("d", arc)
		.on("mouseover", fadeRibbonsWithSameSource(.1))
		.on("mouseout", fadeRibbonsWithSameSource(1))
		.append("title")
		.text(function(d){return chordTip(d);});

	// Add labels to each group
	group.append("text")
		.attr("dy", ".35em") //width
		.attr("class", "org-label")
		.attr("transform", function(d,i) {
			d.angle = (d.startAngle + d.endAngle) / 2;
			d.name = orgs[i];
			var degree = d.angle * 180 / Math.PI;
			var flip = (degree > 180 ? 90 : -90);
			return "rotate(" + degree + ")" +
				"translate(0," + -1 * (outerRadius + 5) + ")" +
				"rotate(" + flip + ")";
		})
		.style("text-anchor", function(d) { return d.angle > Math.PI ? "end" : null; })
		.text(function(d) { return d.name; });

	// Draw the ribbons that go from group to group
	var ribbon = d3.ribbon()
		.radius(innerRadius);

	var ribbons = g.append("g")
		.attr("class", "ribbons")
		.selectAll("path")
		.data(function(chords) { return chords; })
		.enter().append("path")
			.attr("d", ribbon)
			.style("fill", function(d) { return color(d.source.index); })
			.style("stroke", function(d) { return d3.rgb(color(d.source.index)).darker(); })
			.on("mouseover", fadeRibbon(.1))
			.on("mouseout", fadeRibbon(1));

	ribbons.append("title")
		.text(function(d) { return ribbonTip(d); });
}

function visualizeOrgsWithTopConnections(orgs, matrix, quota) {
	// Calculate the number of connections that we would need to visualize
	// if we only visualize connections larger than the threshold
	var threshold = 0;
	do {
		var lastConnections = connections;
		var connections = matrix
			.map(function(x) { return x.map(function(y) { return y > threshold ? 1 : 0; }) })
			.reduce(function(xa, xb) {
				if (isNaN(xa)) xa = xa.reduce(function(ya, yb) { return ya + yb; }, 0);
				if (isNaN(xb)) xb = xb.reduce(function(ya, yb) { return ya + yb; }, 0);
				return xa + xb
			}, 0);
		threshold++;
	} while (connections > quota && lastConnections != connections)

	// Clear all organizations that with a connections count less than the threshold
	matrix = matrix.map(function(x) { return x.map(function(y) { return y >= threshold ? y : 0; }) });

	drawCoord(orgs, matrix);
}

function visualizeSingleOrg(orgs, matrix, orgID) {
	for (var x = matrix.length - 1; x >= 0; x--) {
		for (var y = matrix[0].length - 1; y >= 0; y--) {
			if (x != orgID && y != orgID)
				matrix[x][y] = 0;
		}
	}

	drawCoord(orgs, matrix);
}

function createCollaborationChart(canvas)
{
	var url = $(canvas).data("url");

	d3.text(url,
		function(text)
		{
			const quota = 50;
			var data = d3.tsvParseRows(text);
			var orgs = data.shift();
			var matrix = data.map(function(x) { return x.map(function(y) { return +y; }) });

			function menuChanged() {
				var data = d3.tsvParseRows(text);
				var orgs = data.shift();
				var matrix = data.map(function(x) { return x.map(function(y) { return +y; }) });

				if (d3.event && +d3.event.target.value >= 0) {
					visualizeSingleOrg(orgs, matrix, +d3.event.target.value);
				} else {
					visualizeOrgsWithTopConnections(orgs, matrix, quota);
				}
			}

			var menuItems = [{ value:-1, name:`Top ${quota} Connections` }].concat(
				orgs.map(function(x, i) { return { value:i, name:x }; })
			);
			var select = d3.select("select")
				.attr("class","select")
				.on("change", menuChanged)
				.selectAll("option")
				.data(menuItems).enter()
				.append("option")
					.attr("value", function (d) { return d.value; })
					.text(function (d) { return d.name; })

			menuChanged();
		}
	);
}

$(window).bind("load", function()
{
	Chart.defaults.global.defaultFontFamily = "'Open Sans', sans-serif";

	var charts = $(".chart");

	charts.each(
		function(index, canvas)
		{
			switch ($(canvas).attr("data-type"))
			{
				case "history":
					return createHistoryChart(canvas);
				case "list":
					return createList(canvas);
			}
		});
});

$(window).bind("load", function()
{
	var tables = $(".table");
	tables.each(
		function(index, table)
		{
			return createTable(table);
		});
});

$(window).bind("load", function()
{
	var collabs = $(".collaboration");

	collabs.each(
		function(index, collab)
		{
			return createCollaborationChart(collab);
		});
});
