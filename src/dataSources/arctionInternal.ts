const WORLD_TRADING_DATA_BASE_URL = `https://trading-data-facade.azurewebsites.net/?source=WorldTradingData`

export const arctionInternalWorldTradingData = (mode: 'history' | 'intraday', dataRangeQuery: string, symbol: string, sort: string) => {
  return fetch(`${WORLD_TRADING_DATA_BASE_URL}&mode=${mode}&${dataRangeQuery}&symbol=${symbol}&sort=${sort}`, {
    mode: 'cors'
  })
    .then((response) => response.json())
}

const ALPHA_VANTAGE_BASE_URL = `https://trading-data-facade.azurewebsites.net/?source=AlphaVantage`

export const arctionInternalAlphaVantage = (mode: 'history' | 'intraday', symbol: string) => {
  switch (mode) {
    case 'intraday':
      return fetch(`${ALPHA_VANTAGE_BASE_URL}&mode=${mode}&symbol=${symbol}`)
        .then((response) => response.json())
        .then((data) => {
          const d = data['Time Series (15min)']
          const keys = Object.keys(d)
          for (let i = 0; i < keys.length; i++) {
            d[keys[i]] = {
              open: d[keys[i]]['1. open'],
              high: d[keys[i]]['2. high'],
              low: d[keys[i]]['3. low'],
              close: d[keys[i]]['4. close'],
              volume: d[keys[i]]['5. volume']
            }
          }
          return d
        })
    case 'history':
      return fetch(`${ALPHA_VANTAGE_BASE_URL}&mode=${mode}&symbol=${symbol}`)
        .then((response) => response.json())
        .then((data) => {
          const d = data['Time Series (Daily)']
          const keys = Object.keys(d)
          for (let i = 0; i < keys.length; i++) {
            d[keys[i]] = {
              open: d[keys[i]]['1. open'],
              high: d[keys[i]]['2. high'],
              low: d[keys[i]]['3. low'],
              close: d[keys[i]]['4. close'],
              volume: d[keys[i]]['5. volume']
            }
          }
          return d
        })
  }
}
