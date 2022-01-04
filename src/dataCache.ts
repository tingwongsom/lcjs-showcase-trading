
export enum DataRange {
  Month,
  Year,
  TenYears
}

export interface DataSourceInfo {
  source: null
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
  throw new Error('Unsupported.')
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
    throw new Error('Unsupported.')
  }

  async getIntraDayData(): Promise<OHLCDataFormat> {
    throw new Error('Unsupported.')
  }

  isDailyDataValid(): boolean {
    return !!this.dailyData
  }

  isIntradayDataValid(): boolean {
    return !!this.intradayData
  }
}
