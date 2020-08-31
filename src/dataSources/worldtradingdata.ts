export const worldTradingData = (mode: 'history' | 'intraday', dataRangeQuery: string, symbol: string, sort: string, apiToken: string) => {
  return fetch(`https://www.worldtradingdata.com/api/v1/${mode}?${dataRangeQuery}&symbol=${symbol}&sort=${sort}&api_token=${apiToken}`)
    .then((response) => response.json())
}
