import { RequestHelper } from "./Capture"
import { FileHelper } from "./File"
import { StateHelper } from "./State"

export const registerCustomHelpers = (helpers: any) => {
    helpers.addHelper("capture", RequestHelper)
    helpers.addHelper("file", FileHelper)
    helpers.addHelper("state", StateHelper)
}