function renderChart(containerSelector, width, height, months, data) {

    var colorThresholdsPctOfTotal = [
        { threshold: 0.75, color: "#5e4fa2" },  // deep blue
        { threshold: 0.85, color: "#3288bd" },  // blue
        { threshold: 0.90, color: "#66c2a5" },  // light blue
        { threshold: 1.00, color: "#abdda4" },  // light green
        { threshold: 1.15, color: "#e6f598" },  // light green/yellow
        { threshold: 1.25, color: "#ffffbf" },  // light yellow
        { threshold: 1.40, color: "#fee08b" },  // yellow
        { threshold: 1.55, color: "#fdae61" },  // light orange
        { threshold: 1.70, color: "#f46d43" },  // orange
        { threshold: 1.90, color: "#d53e4f" },  // light red
        { threshold: 2.00, color: "#9e0142" }   // dark red
    ];

    var colorThresholdsMultipliers = [
        { multiplier: 1, color: "#5e4fa2" },      // deep blue
        { multiplier: 1.133, color: "#3288bd" },  // blue
        { multiplier: 1.2, color: "#66c2a5" },    // light blue
        { multiplier: 1.333, color: "#abdda4" },  // light green
        { multiplier: 1.533, color: "#e6f598" },  // light green/yellow
        { multiplier: 1.666, color: "#ffffbf" },  // light yellow
        { multiplier: 1.866, color: "#fee08b" },  // yellow
        { multiplier: 2.066, color: "#fdae61" },  // light orange
        { multiplier: 2.266, color: "#f46d43" },  // orange
        { multiplier: 2.533, color: "#d53e4f" },  // light red
        { multiplier: 2.666, color: "#9e0142" },  // dark red
    ];

    // Scaler that works directly with pctOfTotal value
    //var gradientScaler = getPctOfTotalScaler(colorThresholdsPctOfTotal);

    // Scaler that works with multiplied("obfuscated") pctOfTotal value
    var gradientScaler = getMultiplierScaler(colorThresholdsMultipliers, 0.75);
    var circosChart = new Circos({
        container: containerSelector,
        width: width,
        height: height
    });
    var svg = d3.select(containerSelector + ' svg');
    var defs = svg.append('defs');
    var desaturationFilter = appendSaturationFilter(defs, 'desaturate', 0.5);
    var activeYear = data.years[data.years.length - 1].year;
    var monthColor = { color: '#ffffff' };
    var gradientDictionary = {};
    var yearButtonSpacing = 28;
    var yearButtonSize = 24;
    var yearButtonTrueHeight = yearButtonSize * 0.7;

    circosChart.layout(
        months,
        {
            innerRadius: width / 2 - 80,
            outerRadius: width / 2 - 30,
            ticks: { display: false },
            cornerRadius: 4,
            gap: 0.02,
            labels: {
                position: 'center',
                display: true,
                size: 16,
                color: '#fff',
                radialOffset: 20
            }
        }
    );

    appendMonthBackgrounds(circosChart);
    appendChart(circosChart);
    circosChart.render();
    appendYearButtons();

    function appendGradient(defs, id, segments, scale) {
        var startValue = segments[0].value;
        var endValue = segments[segments.length - 1].value;
        if (scale) {
            startValue = d3.scaleLog()(startValue);
            endValue = d3.scaleLog()(endValue);
        }

        var startColor = gradientScaler(startValue);
        var endColor = gradientScaler(endValue);

        var gradient = defs.append('linearGradient')
            .attr('id', id)
            .attr('x1', '0%')
            .attr('y1', '41%')
            .attr('x2', '100%')
            .attr('y2', '59%');

        gradient.append('stop')
            .attr('class', 'start')
            .attr('offset', '0%')
            .attr('stop-color', startColor);

        gradient.append('stop')
            .attr('class', 'end')
            .attr('offset', '100%')
            .attr('stop-color', endColor);

        return 'url(#' + id + ')';
    }

    function appendSaturationFilter(defs, id, value) {
        var filter = defs.append('filter')
            .attr('id', id)
            .attr('filterUnits', 'objectBoundingBox');

        filter.append('feColorMatrix')
            .attr('type', 'saturate')
            .attr('in', 'SourceGraphic')
            .attr('values', value);

        return 'url(#' + id + ')';
    }

    function appendMonthBackgrounds(circosChart) {
        months.forEach(function (month) {
            circosChart.line('background' + month.id, [{ block_id: month.id, position: 0, value: 0 }], {
                outerRadius: 0.98,
                innerRadius: 0.7,
                min: data.minValue - 0.05,
                max: data.maxValue,
                backgrounds: [{
                    color: monthColor.color,
                    opacity: 0.03
                }]
            });
        });
    }

    function appendLineFill(circosChart, lineFillClass, segments, gradientUrl, isLastYear) {
        var lineFillConfig = {
            min: data.minValue - 0.05,
            max: data.maxValue,
            outerRadius: 0.98,
            innerRadius: 0.7,
            logScale: true,
            color: gradientUrl,
            fill: true,
            fillColor: gradientUrl
        };

        if (!isLastYear) {
            lineFillConfig['opacity'] = 0.3;
            lineFillConfig['filter'] = desaturationFilter;
        }

        circosChart.line(lineFillClass, segments, lineFillConfig);
    }

    function appendLineAccent(circosChart, lineAccentClass, segments, gradientUrl) {
        circosChart.line(lineAccentClass, segments, {
            min: data.minValue - 0.05,
            max: data.maxValue,
            outerRadius: 0.98,
            innerRadius: 0.7,
            logScale: true,
            color: gradientUrl,
            strokeColor: gradientUrl,
            thickness: 2
        });
    }

    function appendTooltip(circosChart, tooltipClass, tooltipSegments) {
        circosChart.line(tooltipClass, tooltipSegments, {
            min: data.minValue - 0.05,
            max: data.maxValue,
            outerRadius: 0.98,
            innerRadius: 0.7,
            logScale: true,
            color: '#000',
            fillColor: '#000',
            fill: true,
            events: {
                'click.tooltip': function (datum) {
                    if (activeYear === datum[0].year) {
                        return;
                    }

                    activeYear = datum[0].year;
                    onActiveYearChanged();
                },
                'mouseover.tooltip': function (datum) {
                    if (datum[0].year === activeYear) {
                        return;
                    }

                    d3.selectAll('.linefill' + datum[0].year + ' path')
                        .attr('opacity', 0.4);
                },
                'mouseout.tooltip': function (datum) {
                    if (datum[0].year === activeYear) {
                        return;
                    }

                    d3.selectAll('.linefill' + datum[0].year + ' path')
                        .attr('opacity', 0.3);
                }
            },
            tooltipContent: function (datum, index) {
                datum = datum[0];
                var periodStartStr = formatDate(datum.startDate);
                var periodEndStr = formatDate(datum.endDate);
                var totalCases = formatNumber(datum.totalCases);
                var numDiagnosed = formatNumber(datum.numDiagnosed);

                return '<h5>' + periodStartStr + ' - ' + periodEndStr + '</h5>'
                    + '<h6>Total Cases: <i>' + totalCases + '</i></h6>'
                    + '<h6>Diagnosed: <i>' + numDiagnosed + ' (' + datum.pctOfTotal + '%)</i></h6>';
            }
        });
    }

    function appendTooltips(circosChart, dataEntry, segments) {
        var tooltipSegments = [];
        for (var j = 0; j < segments.length; j++) {
            var isFirstSegment = j === 0;
            var isLastSegment = j === segments.length - 1;
            var currentTooltipSegments = [];
            var segment = segments[j];

            var startSegment = mergeObjects({}, segment, { position: segment.start });
            if (!isFirstSegment) {
                startSegment.value = tooltipSegments[tooltipSegments.length - 1].value;
            }

            tooltipSegments.push(startSegment);
            currentTooltipSegments.push(startSegment);

            if (!isFirstSegment) {
                var midSegment = mergeObjects({}, segment);

                tooltipSegments.push(midSegment);
                currentTooltipSegments.push(midSegment);
            }

            if (!isLastSegment) {
                var endSegment = mergeObjects({}, segment, {
                    position: segment.end,
                    value: d3.scaleLinear()
                        .domain([segment.position, segments[j + 1].position])
                        .range([segment.value, segments[j + 1].value])
                        (segment.end)
                });

                tooltipSegments.push(endSegment);
                currentTooltipSegments.push(endSegment);
            }

            var tooltipClass = 'tooltip tooltip' + dataEntry.year + ' tooltip' + j + segments[0].block_id + dataEntry.year;
            appendTooltip(circosChart, tooltipClass, currentTooltipSegments);
        }
    }

    function appendChart(circosChart) {
        for (var i = 0; i < data.years.length; i++) {
            var isLastYear = i === data.years.length - 1;
            var dataEntry = data.years[i];
            var segmentGroups = dataEntry.segments.reduce(function (prev, curr) {
                prev[curr.block_id] = prev[curr.block_id] || [];
                prev[curr.block_id].push(curr);
                return prev;
            }, {});

            for (var id in segmentGroups) {
                var segments = segmentGroups[id];
                var gradientUrl = appendGradient(defs, 'gradient' + id + dataEntry.year, segments, false);
                gradientDictionary[gradientUrl] = true;

                var background = circosChart.tracks['background' + id].conf.backgrounds[0];
                background.opacity = 0.1;
                background.color = gradientUrl;

                var lineFillClass = 'linefill' + dataEntry.year + ' linefill' + segments[0].block_id + dataEntry.year;
                appendLineFill(circosChart, lineFillClass, segments, gradientUrl, isLastYear);

                var lineAccentClass = 'accentline' + dataEntry.year + ' accentline' + segments[0].block_id + dataEntry.year;
                appendLineAccent(circosChart, lineAccentClass, segments, gradientUrl);

                appendTooltips(circosChart, dataEntry, segments);
            }
        }
    }

    function appendYearButtons() {
        var svg = d3.select(containerSelector + ' svg .all');
        var yearButton = svg.selectAll('g.yearButton')
            .data(data.years)
            .enter()
            .append('g')
            .attr('class', function (datum) { return 'yearButton yearButton' + datum.year; });

        yearButton.append('text')
            .text(function (datum) { return datum.year; })
            .attr('font-size', yearButtonSize)
            .attr('fill', '#fdfdfd')
            .attr('letter-spacing', 2.5)
            .attr('text-anchor', 'middle')
            .attr('opacity', function (datum) { return datum.year === activeYear ? 1 : 0.3; })
            .attr('dy', function (datum, index) {
                var offset = getYearButtonOffset(index);

                return offset + yearButtonTrueHeight;
            });

        yearButton.append('path')
            .attr('stroke', '#fff')
            .attr('stroke-width', '2')
            .attr('opacity', function (datum) { return datum.year === activeYear ? 0.2 : 0 })
            .attr('d', function (datum, index) {
                var offset = getYearButtonOffset(index);
                var lineY = offset + yearButtonTrueHeight / 2;

                return 'M -50 ' + lineY + ' H -38';
            });

        yearButton.append('path')
            .attr('stroke', '#fff')
            .attr('stroke-width', '2')
            .attr('opacity', function (datum) { return datum.year === activeYear ? 0.2 : 0 })
            .attr('d', function (datum, index) {
                var offset = getYearButtonOffset(index);
                var lineY = offset + yearButtonTrueHeight / 2;

                return 'M 38 ' + lineY + ' H 50';
            });

        yearButton.append('rect')
            .attr('class', 'mouseCapturer')
            .attr('fill', '#ffffff')
            .attr('opacity', 0)
            .attr('width', '60')
            .attr('height', '27')
            .attr('x', '-30')
            .attr('y', function (datum, index) {
                var offset = getYearButtonOffset(index);

                return offset - 6;
            })
            .on('click.yearButton', function (datum) {
                if (datum.year === activeYear) {
                    return;
                }

                activeYear = datum.year;
                onActiveYearChanged();
            })
            .on('mouseover.yearButton', function (datum) {
                if (datum.year === activeYear) {
                    return;
                }

                d3.select(this.parentNode)
                    .select('text')
                    .attr('opacity', 0.6);
            })
            .on('mouseout.yearButton', function (datum) {
                if (datum.year === activeYear) {
                    return;
                }

                d3.select(this.parentNode)
                    .select('text')
                    .attr('opacity', 0.3);
            });
    }

    function formatDate(date) {
        return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }

    function formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    function getPctOfTotalScaler(colorThresholdsPctOfTotal) {
        var thresholds = [];
        var colors = [];

        for (var i = 0; i < colorThresholdsPctOfTotal.length; i++) {
            var colorThreshold = colorThresholdsPctOfTotal[i];

            thresholds.push(colorThreshold.threshold);
            colors.push(colorThreshold.color);
        }

        return d3.scaleLinear()
            .domain(thresholds)
            .range(colors)
            .clamp(true);
    }

    function getMultiplierScaler(colorThresholdsMultipliers, baseThreshold) {
        var thresholds = [];
        var colors = [];

        for (let i = 0; i < colorThresholdsMultipliers.length; i++) {
            const colorThreshold = colorThresholdsMultipliers[i];

            thresholds.push(baseThreshold * colorThreshold.multiplier);
            colors.push(colorThreshold.color);
        }

        return d3.scaleLinear()
            .domain(thresholds)
            .range(colors)
            .clamp(true);
    }

    function getYearButtonOffset(buttonIndex) {
        var totalYears = data.years.length;
        var totalHeight = (totalYears * yearButtonTrueHeight) + (totalYears - 1) * yearButtonSpacing;
        var offset = buttonIndex * (yearButtonTrueHeight + yearButtonSpacing) - totalHeight / 2;

        return offset;
    }

    function mergeObjects() {
        if (arguments.length === 0) {
            return;
        }

        if (arguments.length === 1) {
            return arguments[0];
        }

        for (var i = 1; i < arguments.length; i++) {
            for (key in arguments[i]) {
                arguments[0][key] = arguments[i][key];
            }
        }

        return arguments[0];
    }

    function onActiveYearChanged() {
        d3.selectAll('.linefill' + activeYear + ' .line > path')
            .transition()
            .duration(300)
            .attr('opacity', '1')
            .style('filter', 'none');
        d3.selectAll('.linefill' + activeYear + ', .accentline' + activeYear + ', .tooltip' + activeYear)
            .raise();

        var nonActiveYears = data.years
            .filter(function (yearEntry) { return yearEntry.year !== activeYear })
            .map(function (yearEntry) { return yearEntry.year });

        nonActiveYears.forEach(function (year) {
            d3.selectAll('.linefill' + year + ' .line > path')
                .transition()
                .duration(200)
                .attr('opacity', '0.3')
                .transition()
                .duration(0)
                .style('filter', desaturationFilter);
        });

        months.forEach(function (month) {
            var desiredGradientUrl = 'url(#gradient' + month.id + activeYear + ')';
            if (!gradientDictionary[desiredGradientUrl]) {
                return;
            }

            d3.select('.background' + month.id + ' .background')
                .attr('fill', desiredGradientUrl);
        });

        d3.select('.yearButton' + activeYear + ' > text')
            .attr('opacity', 1);

        d3.selectAll('.yearButton' + activeYear + ' path')
            .attr('opacity', 0.2);

        nonActiveYears.forEach(function (year) {
            d3.select('.yearButton' + year + ' > text')
                .attr('opacity', 0.3);

            d3.selectAll('.yearButton' + year + ' path')
                .attr('opacity', 0);
        });
    }
}
