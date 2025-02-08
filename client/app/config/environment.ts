const isDevelopment = process.env.NODE_ENV === 'development'

export const config = {
  wsUrl: isDevelopment 
    ? 'ws://localhost:8000'
    : 'wss://finance-anal-app-7b869ffc19b6.herokuapp.com',
  httpUrl: isDevelopment
    ? 'http://localhost:8000'
    : 'https://finance-anal-app-7b869ffc19b6.herokuapp.com'
}
