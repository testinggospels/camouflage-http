import bunyan, { LogLevel } from "bunyan"
import { z, ZodError } from "zod"
import { log } from "./logger"
import type express from 'express'

export interface CamoflageResponse {
    statusCode: number;
    delay: number;
    headers?: Record<string, string>;
    body?: string;
    isFile?: boolean;
    filePath?: string;
}
export type CamoflageHttpHook = (req: express.Request, res: express.Response, camoflageResponse?: CamoflageResponse) => void;
export type HookEvent = "onRequest" | "beforeResponse" | "afterResponse";
export interface Hooks {
    [route: string]: {
        [event in HookEvent]?: CamoflageHttpHook[];
    };
}
export interface CamoflageHttpConfig {
    log: LogConfig
    http?: HttpConfig
    https?: HttpsConfig
    http2?: Http2Config
    monitoring?: boolean
    cache?: CacheOptions
    enableCors?: boolean
    validation?: ValidationConfig
    compression?: boolean
    mocksDir: string
}
interface ValidationConfig {
    enable: boolean
    apiSpec?: string
    validateRequests?: boolean
    validateResponses?: boolean
}
interface LogConfig {
    enable: boolean
    level: LogLevel
    disableRequestLogs?: boolean
}
interface CacheOptions {
    enable: boolean
    timeInSeconds?: number
}
interface HttpConfig {
    enable: boolean
    port: number

}
interface HttpsConfig extends HttpConfig {

}
interface Http2Config extends HttpConfig {

}
const cacheSchema = z.object({
    enable: z.boolean(),
    timeInSeconds: z.number().optional()
})
const httpSchema = z.object({
    enable: z.boolean(),
    port: z.number()
});
const httpsSchema = z.object({
    enable: z.boolean(),
    port: z.number()
});
const http2Schema = z.object({
    enable: z.boolean(),
    port: z.number()
});
const logSchema = z.object({
    enable: z.boolean(),
    level: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]),
});
const validationConfigSchema = z.object({
    enable: z.boolean(),
    apiSpec: z.string().optional(),
    validateRequests: z.boolean().optional(),
    validateResponses: z.boolean().optional(),
});
const camoflageConfigSchema = z.object({
    log: logSchema,
    http: httpSchema.optional(),
    https: httpsSchema.optional(),
    http2: http2Schema.optional(),
    monitoring: z.boolean().optional(),
    cache: cacheSchema.optional(),
    enableCors: z.boolean().optional(),
    validation: validationConfigSchema.optional(),
    compression: z.boolean().optional(),
    mocksDir: z.string()
}).refine(data => {
    if (!data.log.enable) {
        log.level(bunyan.FATAL + 1)
    } else {
        log.level(data.log.level)
    }
    return true
}, {})
    .refine(data => data.http || data.https || data.http2, {
        message: "At least one of, 'http', 'https' or 'http2' must be provided in config.",
    }).refine(data => data.http?.enable || data.https?.enable || data.http2?.enable, {
        message: "At least one of, 'http', 'https' or 'http2' must be enabled in config.",
    }).refine(data => {
        if (data.http && data.https) {
            if (data.http.enable && data.https.enable) {
                if (data.http.port === data.https.port) {
                    return false
                }
            }
        }
        if (data.http && data.http2) {
            if (data.http.enable && data.http2.enable) {
                if (data.http.port === data.http2.port) {
                    return false
                }
            }
        }
        if (data.https && data.http2) {
            if (data.https.enable && data.http2.enable) {
                if (data.https.port === data.http2.port) {
                    return false
                }
            }
        }
        return true
    }, {
        message: `Use different ports each protocol http, https and http2`
    }).refine(data => {
        if (data.cache && data.cache.enable) {
            if (!data.cache.timeInSeconds) return false
        }
        return true
    }, { message: "Provide cache.timeInSeconds when cache.enable=true" });

export const isConfigValid = (config: CamoflageHttpConfig): boolean => {
    try {
        camoflageConfigSchema.parse(config);
        return true;
    } catch (error) {
        if (error instanceof ZodError) {
            error.issues.forEach(issue => {
                log.error(`${issue.code} - ${issue.path.join(",")} ${issue.message}`)
            })
        } else {
            log.error(error)
        }
        return false
    }
}