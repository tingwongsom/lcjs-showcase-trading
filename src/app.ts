// polyfill window.fetch for browsers which don't natively support it.
import 'whatwg-fetch'
import { lightningChart, emptyFill, Themes, ChartXY, LineSeries, AreaRangeSeries, OHLCSeriesTraditional, OHLCFigures, XOHLC, Point, AxisTickStrategies, emptyLine, AreaSeriesTypes, ColorRGBA, SolidFill, SolidLine, UIElementBuilders, CustomTick, UITextBox, UIOrigins, AreaSeriesPositive, UIDraggingModes, translatePoint, UIBackgrounds, FormattingFunctions, UITick, UIElement, AutoCursorModes, UILayoutBuilders, UIElementColumn } from "@arction/lcjs"
import { simpleMovingAverage, exponentialMovingAverage, bollingerBands, relativeStrengthIndex } from '@arction/lcjs-analysis'
import { DataCache, DataRange, DataSourceInfo, OHLCDataFormat } from './dataCache'

// Use theme if provided
const urlParams = new URLSearchParams(window.location.search);
let theme = Themes.darkGold
if (urlParams.get('theme') == 'light')
    theme = Themes.lightNew




// To disable/enable/modify charts inside application, alter values below:

const chartConfigOHLC = {
    show: true,
    verticalSpans: 3,

    /**
     * Simple Moving Average.
     */
    sma: {
        show: true,
        averagingFrameLengthDays: 13, // history data : 13 days.
        averagingFrameLengthIntradayDays: 1 // intraday data : 1 day
    },

    /**
     * Simple Moving Average.
     */
    buytax: {
        show: true,
        averagingFrameLengthDays: 13, // history data : 13 days.
        averagingFrameLengthIntradayDays: 1 // intraday data : 1 day
    },

    /**
     * Exponential Moving Average.
     *
     * Uses same averagingFrameLength as above SMA.
     */
    ema: {
        show: false
    },

    /**
     * Bollinger Bands.
     */
    bollinger: {
        show: true,
        averagingFrameLengthDays: 13, // history data : 13 days.
        averagingFrameLengthIntradayDays: 1 // intraday data : 1 day
    }
}
const chartConfigVolume = {
    show: true,
    verticalSpans: 1
}
const chartConfigRSI = {
    show: true,
    verticalSpans: 1,
    averagingFrameLengthDays: 13, // history data : 13 days.
    averagingFrameLengthIntradayDays: 1 // intraday data : 1 day
}

// For syncing charts horizontally (time domain), a static margin on the left side is chosen as pixels.
const leftMarginPx = 60

// #endregion

// #region ----- Find referenced DOM elements from 'index.html' -----
const domElementIDs = {
    chartContainer: 'trading-chart-container',
    dataSearchInput: 'trading-data-search-input',
    dataSearchActivate: 'trading-data-search-activate',
    dataSearchRange1: 'trading-data-search-range-1',
    dataSearchRange2: 'trading-data-search-range-2',
    dataSearchRange3: 'trading-data-search-range-3'
}
const domElements = new Map<string, HTMLElement>()
Object.keys(domElementIDs).forEach((key) => {
    const domElementID = domElementIDs[key]
    const domElement = document.getElementById(domElementID)
    if (domElement === undefined)
        throw new Error('DOM element not found: ' + domElementID)
    domElements.set(domElementID, domElement)
})

let dataRange = DataRange.Year

//#endregion

// #region ----- Create LCJS components ----

// Dashboard
const chartConfigs = [chartConfigOHLC, chartConfigVolume, chartConfigRSI]
const countRowIndexForChart = (chartIndex: number) => chartConfigs.reduce(
    (sum, chartConfig, i) => sum + (chartConfig.show && i < chartIndex ? chartConfig.verticalSpans : 0),
    0
)

const dashboard = lightningChart().Dashboard({
    theme,
    container: domElementIDs.chartContainer,
    numberOfColumns: 1,
    numberOfRows: countRowIndexForChart(chartConfigs.length),
    disableAnimations: true,
})

const alignChartHorizontally = (chart: ChartXY): void => {
    chart.getDefaultAxisY().setThickness({
        min: 60
    })
}

// #region *** OHLC Chart ***
let chartOHLC: ChartXY | undefined
let seriesOHLC: OHLCSeriesTraditional | undefined
let seriesSMA: LineSeries | undefined
let seriesEMA: LineSeries | undefined
let seriesBollinger: AreaRangeSeries | undefined
let chartOHLCTitle: (UITextBox & UIElement) | undefined

if (chartConfigOHLC.show) {
    chartOHLC = dashboard.createChartXY({
        columnIndex: 0,
        columnSpan: 1,
        rowIndex: countRowIndexForChart(chartConfigs.indexOf(chartConfigOHLC)),
        rowSpan: chartConfigOHLC.verticalSpans
    })
        .setTitleFillStyle(emptyFill)
        // This application uses a custom cursor, which requires disabling the default auto cursor.
        .setAutoCursorMode(AutoCursorModes.disabled)

    alignChartHorizontally(chartOHLC)

    const axisX = chartOHLC.getDefaultAxisX()
    const axisY = chartOHLC.getDefaultAxisY()

    // Create custom title attached to the top of Y Axis.
    chartOHLCTitle = chartOHLC.addUIElement(
        UIElementBuilders.TextBox
            .setBackground(UIBackgrounds.Rectangle),
        {
            x: axisX,
            y: axisY
        }
    )
        .setText('')
        .setPosition({ x: 0, y: 10 })
        .setOrigin(UIOrigins.LeftTop)
        .setDraggingMode(UIDraggingModes.notDraggable)
    axisX.onScaleChange((start, end) => chartOHLCTitle!.setPosition({ x: start, y: axisY.getInterval().end }))
    axisY.onScaleChange((start, end) => chartOHLCTitle!.setPosition({ x: axisX.getInterval().start, y: end }))

    if (chartConfigOHLC.bollinger.show) {
        // Create Bollinger Series.
        seriesBollinger = chartOHLC.addAreaRangeSeries()
            .setName('Bollinger Band')
            .setCursorInterpolationEnabled(false)
            .setMouseInteractions(false)
    }
    if (chartConfigOHLC.sma.show) {
        // Create SMA Series.
        seriesSMA = chartOHLC.addLineSeries({
            dataPattern: {
                pattern: 'ProgressiveX'
            }
        })
            .setName('SMA')
            .setCursorInterpolationEnabled(false)
            .setMouseInteractions(false)
    }
    if (chartConfigOHLC.ema.show) {
        // Create EMA Series.
        seriesEMA = chartOHLC.addLineSeries({
            dataPattern: {
                pattern: 'ProgressiveX'
            }
        })
            .setName('EMA')
            .setCursorInterpolationEnabled(false)
            .setMouseInteractions(false)
    }
    // Create OHLC Series.
    seriesOHLC = chartOHLC.addOHLCSeries({
        positiveFigure: OHLCFigures.Candlestick,
        negativeFigure: OHLCFigures.Candlestick
    })
        .setName('OHLC')
        // Disable auto fitting of Figures (meaning, always show one figure for one input data point).
        .setFigureAutoFitting(false)
        .setMouseInteractions(false)

    // Style.
    if (seriesBollinger) {
        const fill = new SolidFill({color: 
            theme === Themes.darkGold ?
                ColorRGBA(255, 255, 255, 13) :
                ColorRGBA(150, 150, 150, 30)
        })
        const stroke = new SolidLine({
            thickness: 2,
            fillStyle: new SolidFill({
                color: 
                theme === Themes.darkGold ?
                    ColorRGBA(66, 66, 66) :
                    ColorRGBA(200, 200, 200)
            })
        })
        seriesBollinger
            .setHighFillStyle(fill)
            .setLowFillStyle(fill)
            .setHighStrokeStyle(stroke)
            .setLowStrokeStyle(stroke)
    }
    if (seriesSMA) {
        seriesSMA.setStrokeStyle(new SolidLine({
            thickness: 2,
            fillStyle: new SolidFill({
                color: theme === Themes.darkGold ?
                    ColorRGBA(254, 204, 0) :
                    ColorRGBA(255, 160, 0)
            })
        }))
    }
    if (seriesEMA) {
        seriesEMA.setStrokeStyle(new SolidLine({
            thickness: 2,
            fillStyle: new SolidFill({
                color: theme === Themes.darkGold ?
                    ColorRGBA(255, 255, 255) :
                    ColorRGBA(80, 120, 190)
            })
        }))
    }


    // Add Chart Legend.
    const legend = chartOHLC.addLegendBox().add(chartOHLC)
}

// #endregion

// #region *** Volume Chart ***
let chartVolume: ChartXY | undefined
let seriesVolume: AreaSeriesPositive | undefined
let chartVolumeTitle: UITextBox | undefined

if (chartConfigVolume.show) {
    chartVolume = dashboard.createChartXY({
        columnIndex: 0,
        columnSpan: 1,
        rowIndex: countRowIndexForChart(chartConfigs.indexOf(chartConfigVolume)),
        rowSpan: chartConfigVolume.verticalSpans
    })
        .setTitleFillStyle(emptyFill)
        // This application uses a custom cursor, which requires disabling the default auto cursor.
        .setAutoCursorMode(AutoCursorModes.disabled)

    alignChartHorizontally(chartVolume)

    const axisX = chartVolume.getDefaultAxisX()
    const axisY = chartVolume.getDefaultAxisY()

    // Volume data has a lot of quantity, so better use label formatting with metric units (K, M, etc.).
    axisY.setTickStrategy(AxisTickStrategies.Numeric, (styler) => styler
        .setFormattingFunction(FormattingFunctions.NumericUnits)
    )

    // Create custom title attached to the top of Y Axis.
    const chartVolumeTitle = chartVolume.addUIElement(
        UIElementBuilders.TextBox
            .setBackground(UIBackgrounds.Rectangle),
        {
            x: axisX,
            y: axisY
        }
    )
        .setText('Volume')
        .setPosition({ x: 0, y: 10 })
        .setOrigin(UIOrigins.LeftTop)
        .setDraggingMode(UIDraggingModes.notDraggable)
    axisX.onScaleChange((start, end) => chartVolumeTitle.setPosition({ x: start, y: axisY.getInterval().end }))
    axisY.onScaleChange((start, end) => chartVolumeTitle.setPosition({ x: axisX.getInterval().start, y: end }))

    // Create Volume Series.
    seriesVolume = chartVolume.addAreaSeries({
        type: AreaSeriesTypes.Positive
    })
        .setName('Volume')
        .setCursorInterpolationEnabled(false)
        .setMouseInteractions(false)

    // Add Chart Legend.
    const legend = chartVolume.addLegendBox().add(chartVolume)
}

// #endregion

// #region *** RSI Chart ***
let chartRSI: ChartXY | undefined
let seriesRSI: LineSeries | undefined
let chartRSITitle: UITextBox | undefined
let ticksRSI: CustomTick[] = []
let tickRSIThresholdLow: CustomTick | undefined
let tickRSIThresholdHigh: CustomTick | undefined

if (chartConfigRSI.show) {
    chartRSI = dashboard.createChartXY({
        columnIndex: 0,
        columnSpan: 1,
        rowIndex: countRowIndexForChart(chartConfigs.indexOf(chartConfigRSI)),
        rowSpan: chartConfigRSI.verticalSpans
    })
        .setTitleFillStyle(emptyFill)
        // This application uses a custom cursor, which requires disabling the default auto cursor.
        .setAutoCursorMode(AutoCursorModes.disabled)

    alignChartHorizontally(chartRSI)

    const axisX = chartRSI.getDefaultAxisX()
    const axisY = chartRSI.getDefaultAxisY()

    // Create custom title attached to the top of Y Axis.
    const chartRSITitle = chartRSI.addUIElement(
        UIElementBuilders.TextBox
            .setBackground(UIBackgrounds.Rectangle),
        {
            x: axisX,
            y: axisY
        }
    )
        .setText('RSI')
        .setPosition({ x: 0, y: 10 })
        .setOrigin(UIOrigins.LeftTop)
        .setDraggingMode(UIDraggingModes.notDraggable)
    axisX.onScaleChange((start, end) => chartRSITitle.setPosition({ x: start, y: axisY.getInterval().end }))
    axisY.onScaleChange((start, end) => chartRSITitle.setPosition({ x: axisX.getInterval().start, y: end }))

    // Create RSI Series.
    seriesRSI = chartRSI.addLineSeries({
        dataPattern: {
            pattern:'ProgressiveX'
        }
    })
        .setName('RSI')
        .setCursorInterpolationEnabled(false)
        .setMouseInteractions(false)

    // Use manually placed ticks for RSI Y Axis, to better indicate common thresholds of 30% and 70%.
    axisY
        .setTickStrategy(AxisTickStrategies.Empty)
        // RSI interval always from 0 to 100.
        .setInterval(0, 100)
        .setScrollStrategy(undefined)

    ticksRSI.push(axisY.addCustomTick(UIElementBuilders.AxisTick)
        .setValue(0)
        // Disable gridline for this tick.
        .setGridStrokeLength(0)
    )
    ticksRSI.push(axisY.addCustomTick(UIElementBuilders.AxisTick)
        .setValue(100)
        // Disable gridline for this tick.
        .setGridStrokeLength(0)
    )
    tickRSIThresholdLow = axisY.addCustomTick(UIElementBuilders.AxisTick)
        .setValue(30)
    ticksRSI.push(tickRSIThresholdLow)
    tickRSIThresholdHigh = axisY.addCustomTick(UIElementBuilders.AxisTick)
        .setValue(70)
    ticksRSI.push(tickRSIThresholdHigh)

    // Style
    tickRSIThresholdLow.setGridStrokeStyle(new SolidLine({
        thickness: 2,
        fillStyle: new SolidFill({color: ColorRGBA( 28, 231, 69 )})
    }))

    tickRSIThresholdHigh.setGridStrokeStyle(new SolidLine({
        thickness: 2,
        fillStyle: new SolidFill({color: ColorRGBA( 219, 40, 68 )})
    }))

    seriesRSI.setStrokeStyle(new SolidLine({
        thickness: 2,
        fillStyle: new SolidFill({color: 
            theme === Themes.darkGold ?
                ColorRGBA(255, 255, 255) :
                ColorRGBA(80,120,190)
        })
    }))

    // Add Chart Legend.
    const legend = chartRSI.addLegendBox().add(chartRSI)
}
// #endregion

const allCharts = [chartOHLC, chartVolume, chartRSI]
const topChart = allCharts.find(chart => chart !== undefined)
const bottomChart = allCharts.reverse().find(chart => chart !== undefined)

// Add top padding to very first Chart, so nothing is hidden by data-search input.
topChart.setPadding({ top: 20 })
// Remove bottom padding of very last Chart, to save space.
bottomChart.setPadding({ bottom: 0 })

// #region *** Setup X Axes ***

// Setup X Axes' so that only the bottom axis has ticks (date time).
allCharts.forEach(chart => {
    const axisX = chart.getDefaultAxisX()
    if (chart === bottomChart) {
        axisX
            .setTickStrategy(AxisTickStrategies.DateTime)
    } else {
        axisX
            .setTickStrategy(AxisTickStrategies.Empty)
            .setStrokeStyle(emptyLine)
    }
})


// Synchronize all X Axes.
let isAxisXScaleChangeActive = false
const syncAxisXEventHandler = (axis, start, end) => {
   if (isAxisXScaleChangeActive) return
   isAxisXScaleChangeActive = true

   // Find all other X Axes.
   const otherAxes = allCharts
      .map(chart => chart.getDefaultAxisX())
      .filter(axis2 => axis2 !== axis)

   // Sync other X Axis intervals.  
   otherAxes.forEach((axis) => axis
      .setInterval(start, end, false, true)
   )

   isAxisXScaleChangeActive = false
}
allCharts.forEach(chart => chart.getDefaultAxisX().onScaleChange((start, end) => syncAxisXEventHandler(chart.getDefaultAxisX(), start, end)))

// #endregion

// #region *** Setup a Custom Data cursor ***

// Create UI elements for custom cursor.
const resultTable = dashboard
   .addUIElement<UIElementColumn>(
      UILayoutBuilders.Column,
      dashboard.engine.scale
   )
   .setMouseInteractions(false)
   .setOrigin(UIOrigins.LeftBottom)
   .setBackground((background) => background
      // Style same as Theme result table.
      .setFillStyle(dashboard.getTheme().resultTableFillStyle)
      .setStrokeStyle(dashboard.getTheme().resultTableStrokeStyle)
   )

// UITextBox builder for creating text inside ResultTable with automatically shared style.
const resultTableTextBuilder = UIElementBuilders.TextBox
   // Style same as Theme result table text.
   .addStyler(textBox => textBox
      .setTextFillStyle(dashboard.getTheme().resultTableTextFillStyle)
   )

// CustomTick on the bottom X Axis.
const tickX = bottomChart
   .getDefaultAxisX()
   .addCustomTick()

// ConstantLines on other X Axes than the bottom one.
const constantLinesX = allCharts
    .filter(chart => chart !== bottomChart)
    .map(chart => chart.getDefaultAxisX().addConstantLine()
        .setMouseInteractions(false)
        // Style according to Theme custom tick grid stroke.
        .setStrokeStyle(theme.customTickGridStrokeStyle as SolidLine) // TODO IMMEDIATE
    )

// TextBoxes for each cursor property along single X location.
const CursorValueLabel = () => resultTable.addElement<UITextBox>(resultTableTextBuilder)
    .setText('')
const cursorValueLabels = {
    'datetime': CursorValueLabel(),
    'open': CursorValueLabel(),
    'high': CursorValueLabel(),
    'low': CursorValueLabel(),
    'close': CursorValueLabel(),
    'sma': CursorValueLabel(),
    'ema': CursorValueLabel(),
    'volume': CursorValueLabel(),
    'rsi': CursorValueLabel()
}

const setCustomCursorVisible = (visible) => {
   if (!visible) {
      resultTable.dispose()
      tickX.dispose()
      constantLinesX.forEach((el) => el.dispose())
   } else {
      resultTable.restore()
      tickX.restore()
      constantLinesX.forEach((el) => el.restore())
   }
}
setCustomCursorVisible(false)

const parseCursorValueLabelText = (prefix: string, value: string): string => {
    // Maintain static length (approx.) of prefix by adding whitespaces when necessary.
    while (prefix.length < 10) {
        prefix += ' '
    }
    return prefix + value
}


// Implement custom cursor logic with events.
allCharts.forEach((chart, i) => {
    chart.onSeriesBackgroundMouseMove((_, event) => {
        // Get mouse location in web page
        const mouseLocationClient = {
            x: event.clientX,
            y: event.clientY,
        }

        // Translate mouse location to LCJS coordinate system for solving data points from series, and translating to Axes.
        const mouseLocationEngine = chart.engine.clientLocation2Engine(
            mouseLocationClient.x,
            mouseLocationClient.y
        )

        // Translate mouse location to X Axis.
        const mouseLocationAxisX = translatePoint(mouseLocationEngine, dashboard.engine.scale, {
            x: bottomChart.getDefaultAxisX(),
            y: bottomChart.getDefaultAxisY(),
        }).x

        // Solve closest series data points from location.
        const dpOHLC = seriesOHLC && seriesOHLC.solveNearestFromScreen(mouseLocationEngine)
        const dpSMA = seriesSMA && seriesSMA.solveNearestFromScreen(mouseLocationEngine)
        const dpEMA = seriesEMA && seriesEMA.solveNearestFromScreen(mouseLocationEngine)
        const dpVolume = seriesVolume && seriesVolume.solveNearestFromScreen(mouseLocationEngine)
        const dpRSI = seriesRSI && seriesRSI.solveNearestFromScreen(mouseLocationEngine)

        // Set cursor value labels displayed text.
        cursorValueLabels.datetime.setText(bottomChart.getDefaultAxisX().formatValue(mouseLocationAxisX))
        if (dpOHLC) {
            cursorValueLabels.open.setText(parseCursorValueLabelText('Open', chartOHLC.getDefaultAxisY().formatValue(dpOHLC.ohlcSegment.getOpen())))
            cursorValueLabels.high.setText(parseCursorValueLabelText('High', chartOHLC.getDefaultAxisY().formatValue(dpOHLC.ohlcSegment.getHigh())))
            cursorValueLabels.low.setText(parseCursorValueLabelText('Low', chartOHLC.getDefaultAxisY().formatValue(dpOHLC.ohlcSegment.getLow())))
            cursorValueLabels.close.setText(parseCursorValueLabelText('Close', chartOHLC.getDefaultAxisY().formatValue(dpOHLC.ohlcSegment.getClose())))
        } else {
            cursorValueLabels.open.setText('')
            cursorValueLabels.high.setText('')
            cursorValueLabels.low.setText('')
            cursorValueLabels.close.setText('')
        }
        if (dpSMA) {
            cursorValueLabels.sma.setText(parseCursorValueLabelText('SMA', chartOHLC.getDefaultAxisY().formatValue(dpSMA.location.y)))
        } else {
            cursorValueLabels.sma.setText('')
        }
        if (dpEMA) {
            cursorValueLabels.ema.setText(parseCursorValueLabelText('EMA', chartOHLC.getDefaultAxisY().formatValue(dpEMA.location.y)))
        } else {
            cursorValueLabels.ema.setText('')
        }
        if (dpVolume) {
            cursorValueLabels.volume.setText(parseCursorValueLabelText('Volume', chartVolume.getDefaultAxisY().formatValue(dpVolume.location.y)))
        } else {
            cursorValueLabels.volume.setText('')
        }
        if (dpRSI) {
            cursorValueLabels.rsi.setText(parseCursorValueLabelText('RSI', chartRSI.getDefaultAxisY().formatValue(dpRSI.location.y)))
        } else {
            cursorValueLabels.rsi.setText('')
        }

        // Display and position cursor.
        setCustomCursorVisible(true)
        resultTable.setPosition({
            x: mouseLocationEngine.x,
            y: mouseLocationEngine.y,
        })
        tickX.setValue(mouseLocationAxisX)
        constantLinesX.forEach(line => line.setValue(mouseLocationAxisX))
    })
    chart.onSeriesBackgroundMouseLeave((_, e) => {
        setCustomCursorVisible(false)
    })
    chart.onSeriesBackgroundMouseDragStart((_, e) => {
        setCustomCursorVisible(false)
    })
})

// #endregion

// #endregion

// #region ----- Implement logic for supplying incoming trading data to LCJS components -----

let dataExists = false
const renderOHLCData = (name: string, data: OHLCDataFormat): void => {
    dataExists = true

    // #region *** Map trading data to LCJS format ***
    const xohlcValues: XOHLC[] = []
    const volumeValues: Point[] = []
    
    const tStart = window.performance.now()
    const dataDateTimes = Object.keys(data)
    const dataDateTimesLen = dataDateTimes.length
    const dataDates = []
    for (let i = 0; i < dataDateTimesLen; i++) {
        const dateTimeStr = dataDateTimes[i]
        const ohlcValuesStr = data[dateTimeStr]
        const date = new Date(dateTimeStr)
        // DateTime data is placed as EcmaScript epoch timestamp (number).
        const x = date.getTime()
        const o = Number(ohlcValuesStr.open)
        const h = Number(ohlcValuesStr.high)
        const l = Number(ohlcValuesStr.low)
        const c = Number(ohlcValuesStr.close)
        const volume = Number(ohlcValuesStr.volume)
        xohlcValues.push([x, o, h, l, c])
        volumeValues.push({ x, y: volume })
        dataDates.push(date)
    }
    const xohlcValuesLen = xohlcValues.length
    const volumeValuesLen = volumeValues.length

    // #endregion

    // Translate configured averaging frame length from days to data points for trading data indicators calculation.
    const averagingFrameLength = dataRange === DataRange.Month ? 'averagingFrameLengthIntradayDays' : 'averagingFrameLengthDays'
    let firstDays = []
    let dataPointsPerDay: number
    for (let i = 0; i < dataDateTimesLen; i++) {
        const date = dataDates[i].getDate()
        if (firstDays.length === 0)
            firstDays[0] = { date, x: i }
        else {
            if (firstDays.length === 1) {
                if (date !== firstDays[0].date)
                    firstDays[1] = { date, x: i }
            } else {
                if (date !== firstDays[1].date) {
                    dataPointsPerDay = i - firstDays[1].x
                    break
                }
            }
        }
    }
    
    console.log(`Prepared data in ${((window.performance.now() - tStart) / 1000).toFixed(1)} s`)
    console.log(`${xohlcValuesLen} XOHLC values, ${volumeValuesLen} Volume values.`)


    // #region *** Push data to LCJS series ***

    if (seriesOHLC) {
        seriesOHLC
            .clear()
            .add(xohlcValues)
    }

    if (seriesSMA) {
        // Compute SMA values from XOHLC values using data-analysis library.
        const smaValues = simpleMovingAverage(xohlcValues, Math.round(chartConfigOHLC.sma[averagingFrameLength] * dataPointsPerDay))
        seriesSMA
            .clear()
            .add(smaValues)
    }

    if (seriesEMA) {
        // Compute EMA values from XOHLC values using data-analysis library.
        const emaValues = exponentialMovingAverage(xohlcValues, Math.round(chartConfigOHLC.sma[averagingFrameLength] * dataPointsPerDay))
        seriesEMA
            .clear()
            .add(emaValues)
    }

    if (seriesBollinger) {
        // Compute Bollinger bands points.
        const bollingerBandPoints = bollingerBands(xohlcValues, Math.round(chartConfigOHLC.bollinger[averagingFrameLength] * dataPointsPerDay))
        seriesBollinger
            .clear()
            .add(bollingerBandPoints)
    }

    if (seriesVolume) {
        // To visualize Volume values as Histogram bars, map 'volumeValues' and add step values between data-points.
        const histogramBarValues: Point[] = []
        let prev: Point | undefined
        for (let i = 0; i < volumeValuesLen; i++) {
            const cur = volumeValues[i]
            // Add step between previous value and cur value.
            if (prev) {
                histogramBarValues.push({ x: prev.x, y: cur.y })
            }
            histogramBarValues.push(cur)
            prev = cur
        }

        seriesVolume
            .clear()
            .add(histogramBarValues)
    }

    if (seriesRSI) {
        // Compute RSI values from XOHLC values using data-analysis library.
        const rsiValues = relativeStrengthIndex(xohlcValues, Math.round(chartConfigRSI[averagingFrameLength] * dataPointsPerDay))
        seriesRSI
            .clear()
            .add(rsiValues)
    }

    // Immediately fit new data to view along.
    bottomChart.getDefaultAxisX()
        .fit(false)
        .setThickness({min: 40})
    allCharts.forEach(chart => chart.getDefaultAxisY().fit(false))

    // #endregion

    // Set title of OHLC Chart to show name data.
    if (chartOHLCTitle) {
        chartOHLCTitle.setText(`${name}`)
    }
    // Also set name of OHLC Series.
    if (seriesOHLC) {
        seriesOHLC.setName(name)
    }


}

// #endregion

// #region ----- REST logic for fetching data -----

const maxAveragingFrameLength = Math.max(
    chartConfigOHLC.sma.averagingFrameLengthDays,
    chartConfigOHLC.bollinger.averagingFrameLengthDays,
    chartConfigRSI.averagingFrameLengthDays
)

// Function that handles event where data search failed.
const dataSearchFailed = (searchSymbol: string) => {
}

const dataCaches: Map<string, DataCache> = new Map()

// Define function that searches OHLC data.
const searchData = () => {
    throw new Error('Unsupported.')
}


// #endregion



// Render static data initially (1 year history of AAPL, taken on 26th September 2019).
// This is a temporary solution for while the API token is limited to an amount of searches.
const temporaryStaticData = require('./my-static-data.json')
renderOHLCData('Project-C Ticker', temporaryStaticData)
