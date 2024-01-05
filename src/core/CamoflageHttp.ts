import { CamoflageHttpHook, CamoflageHttpConfig, Hooks, isConfigValid } from "./config";
import fs from 'fs';
import path from 'path';
import { log } from "./logger";
import { setupExpressServer } from "../server/router";
import http, { Server } from "http";
import https from "https";
import express from "express";
import type apicache from "apicache";
import type cors from "cors";
import type { ParamsDictionary } from 'express-serve-static-core'
import type { ParsedQs } from 'qs'
import type { Request } from "express";
import Helpers from '@camoflage/helpers'
import { registerCustomHelpers } from "@/helpers";
import spdy from 'spdy';
import { OpenApiValidatorOpts } from "express-openapi-validator/dist/openapi.validator";
import { CompressionOptions } from "compression";

export default class CamoflageHttp {
    private config: CamoflageHttpConfig | null = null;
    private cacheOptions: apicache.Options | null = null
    private corsOptions: cors.CorsOptions | cors.CorsOptionsDelegate<Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>> | null = null
    private app: express.Application | null = null
    private httpServer: Server | null = null
    private httpsServer: Server | null = null
    private http2Server: Server | null = null
    private httpServerOptions: http.ServerOptions | null = null
    private httpsServerOptions: https.ServerOptions | null = null
    private http2ServerOptions: spdy.server.ServerOptions | null = null
    private helpers: Helpers;
    private hooks: Hooks = {};
    private validationOpts: OpenApiValidatorOpts | null = null
    private compressionOpts: CompressionOptions | null = null

    constructor(
        config?: CamoflageHttpConfig,
        httpOptions?: http.ServerOptions,
        httpsOptions?: https.ServerOptions,
        cacheOptions?: apicache.Options,
        corsOptions?: cors.CorsOptions | cors.CorsOptionsDelegate<Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>>,
    ) {
        if (config) {
            const isValid: boolean = isConfigValid(config)
            if (isValid) {
                this.config = config
                log.debug(this.config)
            } else {
                log.error('Invalid config file!');
                process.exit(1)
            }
        }
        if (httpOptions) this.httpServerOptions = httpOptions;
        if (httpsOptions) this.httpsServerOptions = httpsOptions;
        if (cacheOptions) this.cacheOptions = cacheOptions;
        if (corsOptions) this.corsOptions = corsOptions;
        this.helpers = new Helpers()
        registerCustomHelpers(this.helpers)
    }
    public getHelpers = (): Helpers => {
        return this.helpers
    }
    public loadConfigFromJson = (configFilePath: string): void => {
        if (this.config) log.warn("Config was already loaded. This action will overwrite existing config.")
        const absolutePath = path.resolve(configFilePath)
        if (fs.existsSync(absolutePath)) {
            const configData = JSON.parse(fs.readFileSync(absolutePath, 'utf-8')) as CamoflageHttpConfig;
            const isValid: boolean = isConfigValid(configData)
            if (isValid) {
                this.config = configData
                this.config.mocksDir = path.resolve(this.config.mocksDir)
                log.debug(this.config)
            } else {
                log.error('Invalid config file!');
                process.exit(1)
            }
        } else {
            log.error("File not found", path.resolve(absolutePath))
            process.exit(1)
        }
    }
    public setServerOptionsHttp = (options: http.ServerOptions): void => {
        this.httpServerOptions = options
    }
    public setServerOptionsHttps = (options: https.ServerOptions): void => {
        this.httpsServerOptions = options
    }
    public setServerOptionsHttp2 = (options: spdy.server.ServerOptions): void => {
        this.http2ServerOptions = options
    }
    public setupCacheWithOptions = (options: apicache.Options): void => {
        this.cacheOptions = options
    }
    public setupCorsWithOptions = (corsOptions: cors.CorsOptions | cors.CorsOptionsDelegate<Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>>): void => {
        this.corsOptions = corsOptions
    }
    public setupValidationWithOptions = (validationOpts: OpenApiValidatorOpts): void => {
        this.validationOpts = validationOpts
    }
    public setupCompressionWithOptions = (compressionOpts: CompressionOptions): void => {
        this.compressionOpts = compressionOpts
    }
    public addHook = (route: string, event: "onRequest" | "beforeResponse" | "afterResponse", fn: CamoflageHttpHook): void => {
        if (!this.hooks[route]) {
            this.hooks[route] = {};
        }
        if (!this.hooks[route][event]) {
            this.hooks[route][event] = [];
        }
        this.hooks[route][event]?.push(fn);
    }
    public async start(): Promise<void> {
        if (!this.config) {
            log.fatal("Error: Config file MIA. Oh well, can't do much without it. Buh-bye")
            process.exit(1)
        }
        this.app = await setupExpressServer(this.config, this.cacheOptions, this.corsOptions, this.helpers, this.hooks, this.validationOpts, this.compressionOpts)
        if (this.config.http && this.config.http.enable && this.app) {
            if (this.httpServerOptions) {
                this.httpServer = http.createServer(this.httpServerOptions, this.app).listen(this.config.http?.port, () => {
                    log.info(`Ask and ye shall recieve a camoflage-http server with options at [:${this.config?.http?.port}]`)
                })
            } else {
                this.httpServer = http.createServer(this.app).listen(this.config.http?.port, () => {
                    log.info(`Ask and ye shall recieve a camoflage-http server at [:${this.config?.http?.port}]`)
                })
            }
        }
        if (this.config.https && this.config.https.enable && this.app && this.httpsServerOptions) {
            this.httpsServer = https.createServer(this.httpsServerOptions, this.app).listen(this.config.https?.port, () => {
                log.info(`Ask and ye shall recieve a camoflage-https server at [:${this.config?.https?.port}]`)
            })
        }
        if (this.config.http2 && this.config.http2.enable && this.app && this.http2ServerOptions) {
            this.http2Server = spdy.createServer(this.http2ServerOptions, this.app).listen(this.config.http2?.port, () => {
                log.info(`Ask and ye shall recieve a camoflage-http2 server at [:${this.config?.http2?.port}]`)
            })
        }
        if (this.config.https && this.config.https.enable && !this.httpsServerOptions) {
            log.error(`Oops! https server needs its SSL suit. Hint: camoflage.setServerOptionsHttps()`)
        }
        if (this.config.http2 && this.config.http2.enable && !this.http2ServerOptions) {
            log.error(`Oops! http2 server needs its SSL suit. Hint: camoflage.setServerOptionsHttp2()`)
        }
    }
    public async stop(): Promise<void> {
        if (this.httpServer) this.httpServer.close()
        if (this.httpsServer) this.httpsServer.close()
        if (this.http2Server) this.http2Server.close()
    }
    public async restart(): Promise<void> {
        let runningServers = this.getRunningServers()

        if (this.httpServer) this.httpServer.close(() => {
            if (runningServers <= 1) {
                this.start()
            }
        })
        if (this.httpsServer) this.httpsServer.close(() => {
            if (runningServers <= 2) {
                this.start()
            }
        })
        if (this.http2Server) this.http2Server.close(() => {
            if (runningServers <= 3) {
                this.start()
            }
        })
    }
    private getRunningServers = (): number => {
        let count = 0;
        if (this.httpServer) count++
        if (this.httpsServer) count++
        if (this.http2Server) count++
        return count
    }
}