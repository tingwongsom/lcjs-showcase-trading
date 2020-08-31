export const alphaVantage = (
  mode: 'history' | 'intraday',
  symbol: string,
  apiToken: string
) => {
  switch (mode) {
    case 'intraday':
      return fetch(`https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${symbol}&outputsize=full&interval=15min&apikey=${apiToken}`)
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
      return fetch(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=full&apikey=${apiToken}`)
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
