import bunyan from 'bunyan'
import bformat from 'bunyan-format'
const formatOut = bformat({ outputMode: 'short' })
export const log = bunyan.createLogger({
    name: "camoflage-http",
    stream: formatOut
})