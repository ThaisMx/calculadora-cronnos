String.prototype.capitalize = function () {
  return this.charAt(0).toUpperCase() + this.slice(1)
}
const IRTax = 20
const TAXES = [
  { tax: 1, color: "#f73d00", label: "1% ao Mês (Renda fixa)", irTax: 20 },
  {
    tax: 1,
    color: "#ba00f7",
    label: "1% (Cauteloso)",
    irTax: 20,
    selectText: "1%",
  },
  {
    tax: 2,
    color: "#00baf7",
    label: "2% (Equilibrado)",
    irTax: 20,
    selectText: "2%",
  },
  {
    tax: 3,
    color: "#3ff701",
    label: "3% (Arrojado)",
    irTax: 20,
    selectText: "3%",
    isDefault: true,
  },
]
const INTERVALS = [
  { value: 1, label: "mensal", isDefault: true },
  { value: 2, label: "bimestral" },
  { value: 3, label: "trimestral" },
  { value: 6, label: "semestral" },
  { value: 12, label: "anual" },
]
$(".item__increment button").on("click", changeInputValue)
$(".item__input input").on("change", formatMoneyInput)
$("#interval").on("change", populateIntervalLabel)
$("input, select").on("change", updateResultValues)
$("#duration").on("mousemove", updateDurationText)
$(".item__input input").trigger("change")
$(".item__checkbox input").on("change", function () {
  const input = $(this)
  input.parent().toggleClass("checked")
})
;(function populateTaxSelect() {
  const select = $("#tax")
  const options = TAXES.filter((tax) => tax.selectText !== undefined)
    .map(
      ({ tax, selectText, isDefault = false }) =>
        `<option value="${tax}" ${isDefault ? "selected" : ""}>${
          selectText || tax
        }</option>`
    )
    .join("")
  select.html(options)
})()
;(function populateIntervalSelect() {
  const select = $("#interval")
  const options = INTERVALS.map(
    ({ value, label, isDefault }) =>
      `<option value="${value}" ${
        isDefault ? "selected" : ""
      }>${label.capitalize()}</option>`
  ).join("")
  select.html(options)
  $("#increaseInterval").html(
    INTERVALS.find(({ isDefault }) => isDefault).label
  )
})()
function formatMoneyInput() {
  const input = $(this)
  const value = input.val()
  const formattedValue = formatMoney(value, 0)
  input.val(formattedValue)
  return
}
function changeInputValue() {
  const button = $(this)
  const input = button.closest(".item__input").find("input")
  const step = parseInt(input.attr("step"))
  let value = parseFloat(input.val().replaceAll(".", ""))
  if (!input || !step) return
  if (button.hasClass("more")) value = value + step
  if (button.hasClass("less")) value = value - step > 0 ? value - step : 0
  input.val(value).trigger("change")
}
function formatMoney(amount, decimalCount = 2, decimal = ",", thousands = ".") {
  try {
    decimalCount = Math.abs(decimalCount)
    decimalCount = isNaN(decimalCount) ? 2 : decimalCount
    const negativeSign = amount < 0 ? "-" : ""
    let i = parseInt(
      (amount = Math.abs(Number(amount) || 0).toFixed(decimalCount))
    ).toString()
    let j = i.length > 3 ? i.length % 3 : 0
    return (
      negativeSign +
      (j ? i.substr(0, j) + thousands : "") +
      i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + thousands) +
      (decimalCount
        ? decimal +
          Math.abs(amount - i)
            .toFixed(decimalCount)
            .slice(2)
        : "")
    )
  } catch (e) {
    console.log(e)
  }
}
function formatDuration(duration) {
  return `${duration} ${duration > 1 ? "meses" : "mês"}`
}
function updateDurationText(e) {
  const duration = $(e.target).val()
  const durationText = formatDuration(duration)
  $("#result-duration").html(durationText)
}
function populateIntervalLabel(e) {
  const increaseInterval = $(this).val()
  const intervalLabel = INTERVALS.find(
    ({ value }) => value === parseInt(increaseInterval)
  ).label
  $("#increaseInterval").html(intervalLabel)
}
function mountDataset(
  amount,
  tax,
  interval,
  duration,
  increase,
  decrease,
  irDiscount
) {
  const result = TAXES.map(({ tax }) => ({
    [tax]: compoundInterest(
      amount,
      tax,
      interval,
      duration,
      increase,
      decrease,
      irDiscount
    ),
  })).reduce((acc, cur) => ({ ...acc, ...cur }), {})
  return result
}
function updateResultValues() {
  const interval = parseInt($("#interval").val())
  const duration = parseInt($("#duration").val())
  const tax = parseInt(
    $("#tax").val() || TAXES.find(({ isDefault }) => isDefault).tax
  )
  const amount = parseFloat($("#money").val().replaceAll(".", ""))
  const increase = parseFloat($("#increase").val().replaceAll(".", ""))
  const decrease = parseFloat($("#decrease").val().replaceAll(".", ""))
  const irDiscount = $("#income").is(":checked")
  dataset = mountDataset(
    amount,
    tax,
    interval,
    duration,
    increase,
    decrease,
    irDiscount
  )
  const resultByTax = dataset[tax][dataset[tax].length - 1]
  const resultTax1 = dataset[1][dataset[1].length - 1]
  const diff = ((resultByTax - resultTax1) / Math.abs(resultTax1)) * 100
  $("#result-by-tax").html(formatMoney(resultByTax))
  $("#result-tax-1").html(formatMoney(resultTax1))
  $("#result-duration").html(formatDuration(duration))
  $("#result-diff").html(
    diff.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      style: "percent",
      useGrouping: true,
      currencyDisplay: "symbol",
    })
  )
  $("#switchValue").html(irDiscount ? "Sim" : "Não")
  updateChart()
}
function monthsOfIncrease(duration, interval) {
  let months = []
  for (let i = 1; i <= duration; i += interval) {
    months.push(i)
  }
  return months
}
function compoundInterest(
  amount,
  tax,
  interval = 1,
  duration = 1,
  increase = 0,
  decrease = 0,
  irDiscount = false
) {
  let eachMonth = [amount]
  const _monthWithIncrease = monthsOfIncrease(duration, interval)
  const taxObj = TAXES.find(({ tax: _tax }) => _tax === tax)
  const irTax = taxObj.irTax
  for (let i = 1; i <= duration; i++) {
    const prevMonth = parseInt(eachMonth[i - 1])
    const monthGain = prevMonth * (tax / 100)
    let _irValue = 0
    if (irDiscount && monthGain > 0 && irTax > 0)
      _irValue = monthGain * (IRTax / 100)
    const monthIncrease = _monthWithIncrease.includes(i) ? increase : 0
    eachMonth[i] = prevMonth + (monthGain - _irValue) + monthIncrease - decrease
  }
  return eachMonth
}
const ctx = document.getElementById("myChart").getContext("2d")
const htmlLegendPlugin = {
  id: "htmlLegend",
  afterUpdate(chart, args, options) {
    const legendContainer = $(options.container)
    legendContainer.html("")
    function onClick(datasetIndex) {
      const activeLegends = $(".legends__item.active")
      const visible = chart.isDatasetVisible(datasetIndex)
      if (activeLegends.length <= 1 && visible) return
      chart.setDatasetVisibility(datasetIndex, !visible)
      chart.update()
    }
    const legendWrapper = document.createElement("div")
    legendWrapper.classList.add("legends__items")
    for (let i = 0; i < chart.data.datasets.length; i++) {
      const item = document.createElement("div")
      item.classList.add("legends__item")
      item.dataset.index = i
      item.style.borderColor = chart.data.datasets[i].borderColor
      item.onclick = (e) => onClick(i)
      if (chart.isDatasetVisible(i)) item.classList.add("active")
      const color = document.createElement("div")
      color.classList.add("legends__color")
      color.style.backgroundColor = chart.data.datasets[i].borderColor
      const text = document.createElement("span")
      text.classList.add("legends__text")
      text.innerHTML = chart.data.datasets[i].label
      item.appendChild(color)
      item.appendChild(text)
      legendWrapper.appendChild(item)
    }
    legendContainer.append(legendWrapper)
  },
}
const config = {
  type: "line",
  data: {
    labels: Array.from(
      { length: parseInt($("#duration").val()) + 1 },
      (_, i) => i
    ),
    datasets: TAXES.map((tax, i) => ({
      label: tax.label,
      data: dataset[tax.tax],
      borderColor: tax.color,
      fill: false,
    })),
  },
  options: {
    reponsive: true,
    plugins: {
      htmlLegend: { container: "#legends" },
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: function (context) {
            return `Mês ${context[0].label}`
          },
          label: function (context) {
            return `R$ ${context.parsed.y.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`
          },
        },
      },
    },
    scales: {
      x: {
        title: { display: false, text: "Meses" },
        ticks: {
          maxTicksLimit: 10,
          callback: function (value, index, values) {
            return value <= 1 ? "" : `${value}`
          },
        },
      },
      y: {
        type: "logarithmic",
        title: { display: false },
        ticks: {
          maxTicksLimit: 8,
          callback: function (value, index, values) {
            return `R$ ${value.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`
          },
        },
      },
    },
  },
  plugins: [htmlLegendPlugin],
}
var myChart = new Chart(ctx, config)
function updateChart() {
  if (!myChart) return
  myChart.data.labels = Array.from(
    { length: parseInt($("#duration").val()) + 1 },
    (_, i) => i
  )
  myChart.data.datasets = TAXES.map((tax, i) => ({
    label: tax.label,
    data: dataset[tax.tax],
    borderColor: tax.color,
    fill: false,
  }))
  myChart.update()
}
updateResultValues()
