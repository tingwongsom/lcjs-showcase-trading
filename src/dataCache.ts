import { DataSource } from "./dataSources"
import { arctionInternalWorldTradingData, arctionInternalAlphaVantage } from "./dataSources/arctionInternal"
import { worldTradingData } from "./dataSources/worldtradingdata"
import { alphaVantage } from "./dataSources/alphaVantage"

export enum DataRange {
  Month,
  Year,
  TenYears
}

export interface DataSourceInfo {
  source: DataSource | 'worldtradingdata.com'
  apiToken?: string
}

interface OHLCWithVolume {
  close: number
  high: number
  low: number
  open: number
  volume: number
}
export type OHLCDataFormat = { [key: string]: OHLCWithVolume }

const fetchData = async (source: DataSourceInfo, symbol, mode, dataRangeQuery) => {
  let dataPromise
  switch (source.source) {
    case DataSource.WorldTradingDataArctionInternal:
      dataPromise = arctionInternalWorldTradingData(mode, dataRangeQuery, symbol, 'desc')
      break
    case 'worldtradingdata.com':
    case DataSource.WorldTradingData:
      {
        /**
         * worldtradingdata.com API Token.
         */
        const apiToken: 'demo' | string = source.apiToken
        dataPromise = worldTradingData(mode, dataRangeQuery, symbol, 'desc', apiToken)
      }
      break
    case DataSource.AlphaVantageArctionInternal:
      dataPromise = arctionInternalAlphaVantage(mode, symbol)
      break
    case DataSource.AlphaVantage:
      {
        /**
         * alphavantage.co API Token.
         */
        const apiToken: 'demo' | string = source.apiToken
        dataPromise = alphaVantage(mode, symbol, apiToken)
      }
      break
    default:
      throw new Error('Unknown data source.')
  }
  return dataPromise
}

export class DataCache {
  private readonly symbol: string
  private readonly dataSource: DataSourceInfo
  private dailyData: OHLCDataFormat
  private intradayData: OHLCDataFormat
  constructor(symbol: string, dataSource: DataSourceInfo) {
    this.symbol = symbol
    this.dataSource = dataSource
    console.log(`Created DataCache for: ${symbol}`)
  }

  async getDailyData(dataRange: DataRange): Promise<OHLCDataFormat> {
    if (this.isDailyDataValid() && this.dailyData) {
      const now = new Date()
      const dataRangeTime = dataRange === DataRange.Year ?
        // 1 Year.
        1 * 365 * 24 * 60 * 60 * 1000 :
        // 10 Years.
        10 * 365 * 24 * 60 * 60 * 1000
      const nBack = new Date(
        now.getTime() +
        (-dataRangeTime)
      )

      const year = nBack.getUTCFullYear()
      const month = nBack.getUTCMonth() + 1
      const date = nBack.getUTCDate()
      const date_from = `${year}-${month >= 10 ? '' : 0}${month}-${date >= 10 ? '' : 0}${date}`
      const data = {}
      // collect the data for the specified range
      Object.keys(this.dailyData).reverse()
        .forEach(key => {
          if (key >= date_from) {
            data[key] = this.dailyData[key]
          }
        })
      return data
    } else {
      // fetch and store data
      const data = await fetchData(this.dataSource, this.symbol, 'history', undefined)

      this.dailyData = data
      return this.getDailyData(dataRange)
    }
  }

  async getIntraDayData(): Promise<OHLCDataFormat> {
    if (this.isIntradayDataValid() && this.intradayData) {
      const data = {}
      // collect the data for the specified range
      Object.keys(this.intradayData).reverse()
        .forEach(key => {
          data[key] = this.intradayData[key]
        })
      return data
    } else {
      // fetch and store data
      const data = await fetchData(this.dataSource, this.symbol, 'intraday', undefined)

      this.intradayData = data
      return this.getIntraDayData()
    }
  }

  isDailyDataValid(): boolean {
    return !!this.dailyData
  }

  isIntradayDataValid(): boolean {
    return !!this.intradayData
  }
}
