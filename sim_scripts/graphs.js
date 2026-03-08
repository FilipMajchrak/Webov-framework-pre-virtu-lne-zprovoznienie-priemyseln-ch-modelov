window.addEventListener("load", () =>
{
  console.log("graphs.js loaded");

  const canvas = document.getElementById("fpsChart");

  if (!canvas)
  {
    console.warn("fpsChart canvas neexistuje");
    return;
  }

  if (typeof Chart === "undefined")
  {
    console.warn("Chart.js nie je načítaný");
    return;
  }

  const ctx = canvas.getContext("2d");

  window.fpsChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "FPS",
          data: [],
          borderColor: "lime",
          tension: 0.3
        }
      ]
    },
    options: {
      animation: false,
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });

  window.addEventListener("message", (event) =>
  {
    const data = event.data;

    if (!data || data.type !== "fps") return;

    const chart = window.fpsChart;

    chart.data.labels.push(data.time ?? new Date().toLocaleTimeString());
    chart.data.datasets[0].data.push(data.value);

    if (chart.data.labels.length > 20)
    {
      chart.data.labels.shift();
      chart.data.datasets[0].data.shift();
    }

    chart.update();
  });

  console.log("FPS graph pripravený");
});