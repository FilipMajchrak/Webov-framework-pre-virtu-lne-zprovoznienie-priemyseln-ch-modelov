function isLightTheme()
{
    return document.body.classList.contains("theme-light");
}

function getChartTextColor()
{
    if (isLightTheme())
    {
        return "#111111";
    }

    return "#ffffff";
}

function getChartGridColorLight()
{
    if (isLightTheme())
    {
        return "rgba(0,0,0,0.08)";
    }

    return "rgba(255,255,255,0.08)";
}

function getChartGridColorStrong()
{
    if (isLightTheme())
    {
        return "rgba(0,0,0,0.15)";
    }

    return "rgba(255,255,255,0.15)";
}

function getChartBorderColor()
{
    if (isLightTheme())
    {
        return "rgba(0,0,0,0.25)";
    }

    return "rgba(255,255,255,0.25)";
}

function getByPath(obj, path)
{
    return path.split(".").reduce((o, k) =>
    {
        return o ? o[k] : undefined;
    }, obj);
}

window.fpsChart = null;
window.modbusChart = null;
window.tickChart = null;
window.renderChart = null;

window.digitalInChart = null;
window.digitalOutChart = null;
window.analogInChart = null;
window.analogOutChart = null;

window.digitalInputPaths = [];
window.digitalOutputPaths = [];
window.analogInputPaths = [];
window.analogOutputPaths = [];

window.lastDigitalSceneSignature = null;
window.lastAnalogSceneSignature = null;

const MAX_POINTS = 20;

const chartColors =
[
    "#ff4d4f",
    "#52c41a",
    "#1677ff",
    "#faad14",
    "#eb2f96",
    "#13c2c2",
    "#722ed1",
    "#fa8c16",
    "#a0d911",
    "#2f54eb",
    "#f759ab",
    "#73d13d",
    "#36cfc9",
    "#9254de",
    "#ffc53d",
    "#ff7875"
];

function getSignalColor(index)
{
    return chartColors[index % chartColors.length];
}

function getSignalDash(index)
{
    if (index % 2 === 0)
    {
        return [];
    }

    return [6, 4];
}

function createDataset(label, index, extra = {})
{
    return {
        label: label,
        data: [],
        borderWidth: 2,
        pointRadius: 0,
        borderColor: getSignalColor(index),
        backgroundColor: getSignalColor(index),
        borderDash: getSignalDash(index),
        ...extra
    };
}

function createBaseChart(canvasId, datasets, options = {})
{
    const canvas = document.getElementById(canvasId);

    if (!canvas)
    {
        console.warn(canvasId + " canvas neexistuje");
        return null;
    }

    if (typeof Chart === "undefined")
    {
        console.warn("Chart.js nie je načítaný");
        return null;
    }

    const textColor = getChartTextColor();
    const gridLight = getChartGridColorLight();
    const gridStrong = getChartGridColorStrong();
    const borderColor = getChartBorderColor();

    const mergedPlugins =
    {
        title:
        {
            display: false,
            color: textColor,
            font:
            {
                size: 14,
                weight: "bold"
            }
        },
        legend:
        {
            display: true,
            position: "bottom",
            labels:
            {
                color: textColor,
                boxWidth: 12,
                padding: 12
            }
        },
        ...options.plugins
    };

    if (options.plugins && options.plugins.title)
    {
        mergedPlugins.title =
        {
            color: textColor,
            font:
            {
                size: 14,
                weight: "bold"
            },
            ...options.plugins.title
        };
    }

    if (options.plugins && options.plugins.legend)
    {
        mergedPlugins.legend =
        {
            display: true,
            position: "bottom",
            ...options.plugins.legend
        };

        if (options.plugins.legend.labels)
        {
            mergedPlugins.legend.labels =
            {
                color: textColor,
                boxWidth: 12,
                padding: 12,
                ...options.plugins.legend.labels
            };
        }
    }

    const mergedX =
    {
        ticks:
        {
            color: textColor
        },
        grid:
        {
            color: gridLight
        },
        border:
        {
            color: borderColor
        }
    };

    const mergedY =
    {
        ...options.y
    };

    if (options.y && options.y.ticks)
    {
        mergedY.ticks =
        {
            color: textColor,
            ...options.y.ticks
        };
    }
    else
    {
        mergedY.ticks =
        {
            color: textColor
        };
    }

    if (options.y && options.y.grid)
    {
        mergedY.grid =
        {
            color: gridStrong,
            ...options.y.grid
        };
    }
    else
    {
        mergedY.grid =
        {
            color: gridStrong
        };
    }

    if (options.y && options.y.border)
    {
        mergedY.border =
        {
            color: borderColor,
            ...options.y.border
        };
    }
    else
    {
        mergedY.border =
        {
            color: borderColor
        };
    }

    return new Chart(canvas.getContext("2d"),
    {
        type: "line",
        data:
        {
            labels: [],
            datasets: datasets
        },
        options:
        {
            animation: false,
            responsive: true,
            maintainAspectRatio: false,
            plugins: mergedPlugins,
            scales:
            {
                x: mergedX,
                y: mergedY
            }
        }
    });
}

function createSteppedChart(canvasId, signalNames, title)
{
    const datasets = signalNames.map((name, index) =>
    {
        return createDataset(name, index,
        {
            stepped: true,
            tension: 0
        });
    });

    return createBaseChart(canvasId, datasets,
    {
        plugins:
        {
            title:
            {
                display: true,
                text: title
            },
            legend:
            {
                display: true,
                position: "bottom"
            }
        },
        y:
        {
            min: 0,
            max: 1,
            ticks:
            {
                stepSize: 1,
                callback(value)
                {
                    if (value === 0)
                    {
                        return "OFF";
                    }

                    if (value === 1)
                    {
                        return "ON";
                    }

                    return value;
                }
            }
        }
    });
}

function createAnalogChart(canvasId, signalNames, title)
{
    const datasets = signalNames.map((name, index) =>
    {
        return createDataset(name, index,
        {
            tension: 0.25
        });
    });

    return createBaseChart(canvasId, datasets,
    {
        plugins:
        {
            title:
            {
                display: true,
                text: title
            },
            legend:
            {
                display: true,
                position: "bottom"
            }
        },
        y:
        {
            beginAtZero: false
        }
    });
}

function createSingleValueChart(canvasId, label, color, yOptions = {})
{
    return createBaseChart(canvasId,
    [
        {
            label: label,
            data: [],
            borderColor: color,
            backgroundColor: color,
            tension: 0.3,
            borderWidth: 2,
            pointRadius: 0
        }
    ],
    {
        plugins:
        {
            legend:
            {
                display: false
            }
        },
        y:
        {
            beginAtZero: true,
            ...yOptions
        }
    });
}

function destroyChart(chartName)
{
    if (window[chartName])
    {
        window[chartName].destroy();
        window[chartName] = null;
    }
}

function cloneChartData(chart)
{
    if (!chart)
    {
        return null;
    }

    return {
        labels: chart.data.labels.slice(),
        datasets: chart.data.datasets.map((dataset) =>
        {
            return {
                ...dataset,
                data: dataset.data.slice()
            };
        })
    };
}

function restoreChartData(chart, snapshot)
{
    if (!chart || !snapshot)
    {
        return;
    }

    chart.data.labels = snapshot.labels.slice();

    chart.data.datasets.forEach((dataset, index) =>
    {
        if (snapshot.datasets[index])
        {
            dataset.data = snapshot.datasets[index].data.slice();
        }
    });

    chart.update();
}

function recreateChartPair(config)
{
    destroyChart(config.inChartRef);
    destroyChart(config.outChartRef);

    window[config.inPathsRef] = config.inputSignals.slice();
    window[config.outPathsRef] = config.outputSignals.slice();

    if (config.inputSignals.length > 0)
    {
        window[config.inChartRef] = config.createFn(
            config.inCanvasId,
            config.inputSignals,
            config.inTitle
        );

        console.log("[" + config.logPrefix + " IN] graf vytvorený pre signály:", config.inputSignals);
    }

    if (config.outputSignals.length > 0)
    {
        window[config.outChartRef] = config.createFn(
            config.outCanvasId,
            config.outputSignals,
            config.outTitle
        );

        console.log("[" + config.logPrefix + " OUT] graf vytvorený pre signály:", config.outputSignals);
    }
}

function recreateDigitalCharts(inputSignals, outputSignals)
{
    recreateChartPair(
    {
        inChartRef: "digitalInChart",
        outChartRef: "digitalOutChart",
        inPathsRef: "digitalInputPaths",
        outPathsRef: "digitalOutputPaths",
        inCanvasId: "digitalInChart",
        outCanvasId: "digitalOutChart",
        inTitle: "Digital Inputs",
        outTitle: "Digital Outputs",
        inputSignals: inputSignals,
        outputSignals: outputSignals,
        createFn: createSteppedChart,
        logPrefix: "DIGITAL"
    });
}

function recreateAnalogCharts(inputSignals, outputSignals)
{
    recreateChartPair(
    {
        inChartRef: "analogInChart",
        outChartRef: "analogOutChart",
        inPathsRef: "analogInputPaths",
        outPathsRef: "analogOutputPaths",
        inCanvasId: "analogInChart",
        outCanvasId: "analogOutChart",
        inTitle: "Analog Inputs",
        outTitle: "Analog Outputs",
        inputSignals: inputSignals,
        outputSignals: outputSignals,
        createFn: createAnalogChart,
        logPrefix: "ANALOG"
    });
}

function trimChart(chart)
{
    if (chart.data.labels.length > MAX_POINTS)
    {
        chart.data.labels.shift();

        chart.data.datasets.forEach((dataset) =>
        {
            dataset.data.shift();
        });
    }
}

function pushMultiSignalData(chart, paths, ioSource, timeLabel, transformValue)
{
    if (!chart)
    {
        return;
    }

    chart.data.labels.push(timeLabel);

    chart.data.datasets.forEach((dataset, index) =>
    {
        const path = paths[index];
        const rawValue = getByPath(ioSource, path);
        dataset.data.push(transformValue(rawValue));
    });

    trimChart(chart);
    chart.update();
}

function pushDigitalData(chart, paths, ioSource, timeLabel)
{
    pushMultiSignalData(chart, paths, ioSource, timeLabel, (value) =>
    {
        return value ? 1 : 0;
    });
}

function pushAnalogData(chart, paths, ioSource, timeLabel)
{
    pushMultiSignalData(chart, paths, ioSource, timeLabel, (value) =>
    {
        const num = Number(value);

        if (Number.isFinite(num))
        {
            return num;
        }

        return 0;
    });
}

function pushSingleValue(chart, value, timeLabel)
{
    if (!chart)
    {
        return;
    }

    chart.data.labels.push(timeLabel);
    chart.data.datasets[0].data.push(value);

    trimChart(chart);
    chart.update();
}

function getSignalPaths(group = {})
{
    return Object.values(group)
        .map((item) =>
        {
            return item.path;
        })
        .filter((path) =>
        {
            return Boolean(path);
        });
}

function initStaticCharts()
{
    destroyChart("fpsChart");
    destroyChart("modbusChart");
    destroyChart("tickChart");
    destroyChart("renderChart");

    window.fpsChart = createSingleValueChart("fpsChart", "FPS", "lime");
    window.modbusChart = createSingleValueChart("modbusChart", "Modbus odozva [ms]", "orange");
    window.tickChart = createSingleValueChart("tickChart", "t[ms]", "red");
    window.renderChart = createSingleValueChart("renderChart","Render time [ms]","cyan",{min:0,max:20});
}

function refreshChartsForTheme()
{
    const fpsSnapshot = cloneChartData(window.fpsChart);
    const modbusSnapshot = cloneChartData(window.modbusChart);
    const tickSnapshot = cloneChartData(window.tickChart);
    const digitalInSnapshot = cloneChartData(window.digitalInChart);
    const digitalOutSnapshot = cloneChartData(window.digitalOutChart);
    const analogInSnapshot = cloneChartData(window.analogInChart);
    const analogOutSnapshot = cloneChartData(window.analogOutChart);

    initStaticCharts();
    restoreChartData(window.fpsChart, fpsSnapshot);
    restoreChartData(window.modbusChart, modbusSnapshot);
    restoreChartData(window.tickChart, tickSnapshot);

    if (window.digitalInputPaths.length > 0 || window.digitalOutputPaths.length > 0)
    {
        recreateDigitalCharts(window.digitalInputPaths, window.digitalOutputPaths);
        restoreChartData(window.digitalInChart, digitalInSnapshot);
        restoreChartData(window.digitalOutChart, digitalOutSnapshot);
    }

    if (window.analogInputPaths.length > 0 || window.analogOutputPaths.length > 0)
    {
        recreateAnalogCharts(window.analogInputPaths, window.analogOutputPaths);
        restoreChartData(window.analogInChart, analogInSnapshot);
        restoreChartData(window.analogOutChart, analogOutSnapshot);
    }
}

function handleSceneMap(map)
{
    const digitalInputSignals = getSignalPaths(map.inputCoils);
    const digitalOutputSignals = getSignalPaths(map.outputCoils);
    const analogInputSignals = getSignalPaths(map.inputRegisters);
    const analogOutputSignals = getSignalPaths(map.outputRegisters);

    const digitalSignature = JSON.stringify(
    {
        in: digitalInputSignals,
        out: digitalOutputSignals
    });

    const analogSignature = JSON.stringify(
    {
        in: analogInputSignals,
        out: analogOutputSignals
    });

    if (
        (digitalInputSignals.length > 0 || digitalOutputSignals.length > 0) &&
        digitalSignature !== window.lastDigitalSceneSignature
    )
    {
        window.lastDigitalSceneSignature = digitalSignature;
        recreateDigitalCharts(digitalInputSignals, digitalOutputSignals);
    }

    if (
        (analogInputSignals.length > 0 || analogOutputSignals.length > 0) &&
        analogSignature !== window.lastAnalogSceneSignature
    )
    {
        window.lastAnalogSceneSignature = analogSignature;
        recreateAnalogCharts(analogInputSignals, analogOutputSignals);
    }
}

function handleSceneIO(data)
{
    const timeLabel = data.time ?? new Date().toLocaleTimeString();

    pushDigitalData(window.digitalInChart, window.digitalInputPaths, data.IO, timeLabel);
    pushDigitalData(window.digitalOutChart, window.digitalOutputPaths, data.IO, timeLabel);

    pushAnalogData(window.analogInChart, window.analogInputPaths, data.IO, timeLabel);
    pushAnalogData(window.analogOutChart, window.analogOutputPaths, data.IO, timeLabel);
}

function handleMessage(event)
{
    const data = event.data;
    //console.log("GRAPH MESSAGE:", event.data);

    if (!data)
    {
        return;
    }

    if (data.type === "fps")
    {
        pushSingleValue(
            window.fpsChart,
            data.value,
            data.time ?? new Date().toLocaleTimeString()
        );
        return;
    }

    if (data.type === "modbus")
    {
        pushSingleValue(
            window.modbusChart,
            data.value,
            data.time ?? new Date().toLocaleTimeString()
        );
        return;
    }

    if (data.type === "sceneMap" && data.map)
    {
        handleSceneMap(data.map);
        return;
    }

    if (data.type === "DataIOScene")
    {
        handleSceneIO(data);
    }

    if (data.type === "system")
    {
        pushSingleValue(
            window.tickChart,
            data.stats.tickDurationMs,
            data.time ?? new Date().toLocaleTimeString()
        );
        return;
    }

    if (data.type === "render")
    {
        pushSingleValue(
            window.renderChart,
            data.value,
            data.time ?? new Date().toLocaleTimeString()
        );
        return;
    }
}

window.addEventListener("load", () =>
{
    console.log("graphs.js loaded");

    if (typeof Chart === "undefined")
    {
        console.warn("Chart.js nie je načítaný");
        return;
    }

    initStaticCharts();
    window.addEventListener("message", handleMessage);

    const observer = new MutationObserver(() =>
    {
        refreshChartsForTheme();
    });

    observer.observe(document.body,
    {
        attributes: true,
        attributeFilter: ["class"]
    });

    console.log("Digital + Analog IN/OUT graph pripravený");
});

