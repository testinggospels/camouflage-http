import fs from 'fs'
import path from 'path'
import os from 'os'
import type express from 'express'
import { log } from '@/core/logger'
import { CamoflageResponse } from '@/core/config'

export const responseBuilder = (mockFilePath: string, helpers: any, request: express.Request, response: express.Response): CamoflageResponse => {
    let delay = 0;
    let fileContent = fs.readFileSync(path.resolve(mockFilePath), "utf-8").trim()
    fileContent = checkRandomAndPickOne(fileContent)
    const EOL = getEOL(fileContent)
    const content: string = helpers.parse(fileContent, { request, response, log })
    const [headersStr, bodyStr] = content.split(EOL + EOL, 2);
    const [statusLine, ...headersArr] = headersStr.split(EOL);
    const [_protocol, statusCode, _statusText] = statusLine.split(' ');
    const headers: Record<string, string> = {}
    headersArr.forEach((header: any) => {
        const [key, value] = header.split(':');
        if (key === "Response-Delay") {
            delay = parseInt(value.trim())
        } else {
            headers[key.trim()] = value.trim()
        }
    })
    const body: string = bodyStr;
    if (body.includes("file_helper_return")) {
        const filePath = body.split(";")[1]
        return {
            statusCode: parseInt(statusCode),
            delay,
            headers,
            isFile: true,
            filePath
        }
    }
    return {
        statusCode: parseInt(statusCode),
        delay,
        headers,
        body
    }
}
const getEOL = (source: string) => {
    const cr = source.split("\r").length;
    const lf = source.split("\n").length;
    const crlf = source.split("\r\n").length;

    if (cr + lf === 0) {
        log.warn(`No valid new line found in the mock file. Using OS default: ${os.EOL}`);
        return os.EOL;
    }
    if (crlf === cr && crlf === lf) {
        log.debug("Using new line as \\r\\n");
        return "\r\n";
    }
    if (cr > lf) {
        log.debug("Using new line as \\r");
        return "\r";
    } else {
        log.debug("Using new line as \\n");
        return "\n";
    }
};
const checkRandomAndPickOne = (content: string): string => {
    if (content.includes("====")) {
        let contentArr = content.split("====")
        return contentArr[Math.floor(Math.random() * contentArr.length)]
    }
    return content
}