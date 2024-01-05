import fs from 'fs'
import path from 'path'
import type express from 'express';
import { log } from '@/core/logger';
import { CamoflageHttpConfig, Hooks } from '@/core/config';
import { responseBuilder } from './responseBuilder';
import { CamoflageResponse } from '@/core/config';
import Helpers from '@camoflage/helpers';

export const registerRoutes = (
    app: express.Application,
    currentPath: string,
    helpers: Helpers,
    config: CamoflageHttpConfig,
    hooks: Hooks
) => {
    fs.readdirSync(currentPath).forEach((file) => {
        const fullPath = path.join(currentPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            registerRoutes(app, fullPath, helpers, config, hooks);
        } else {
            const routerURL = path.parse(fullPath);
            const supportedMethods = ["get", "post", "put", "delete", "patch", "head", "options", "trace"];
            const method = routerURL.base.replace(".mock", "").toLowerCase() as "get" | "post" | "put" | "delete" | "patch" | "head" | "options" | "trace";
            if (supportedMethods.includes(method)) {
                handler(`${routerURL.dir}`, method, app, config, helpers, hooks);
            } else {
                log.error(`Method ${method} not supported`);
            }
        }
    });
};
const handler = (
    fullPath: string,
    method: "get" | "post" | "put" | "delete" | "patch" | "head" | "options" | "trace",
    app: express.Application,
    config: CamoflageHttpConfig,
    helpers: Helpers,
    hooks: Hooks
) => {
    const url = fullPath.replace(config.mocksDir, "")
    log.info(`Loading route: GET - ${url}`)
    app.route(url).all(async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        const onRequestHooks = hooks[req.route.path]?.onRequest || [];
        const afterResponseHooks = hooks[req.route.path]?.afterResponse || [];
        if (onRequestHooks.length > 0) {
            for (let i = 0; i < onRequestHooks.length; i++) {
                if (!res.headersSent) {
                    await onRequestHooks[i](req, res)
                    if (i == onRequestHooks.length - 1) {
                        next()
                    }
                }
            }
        } else {
            next()
        }
        res.on('finish', () => {
            if (afterResponseHooks.length > 0) {
                afterResponseHooks.forEach(async (hook) => {
                    try {
                        await hook(req, res)
                    } catch (error) {
                        log.error(error)
                    }
                })
            }
        })
    })
    app.route(url)[method](async (req: express.Request, res: express.Response) => {
        const beforeResponseHooks = hooks[req.route.path]?.beforeResponse || [];
        const mockFilePath = path.resolve(`${fullPath}/GET.mock`)
        const camoflageResponse: CamoflageResponse = responseBuilder(mockFilePath, helpers, req, res)
        if (beforeResponseHooks.length > 0) {
            for (let i = 0; i < beforeResponseHooks.length; i++) {
                if (!res.headersSent) {
                    await beforeResponseHooks[i](req, res, camoflageResponse)
                }
            }
        }
        if (!res.headersSent) {
            res.set(camoflageResponse.headers)
            await sleep(camoflageResponse.delay)
            if (camoflageResponse.isFile && camoflageResponse.filePath) {
                res.status(camoflageResponse.statusCode).sendFile(camoflageResponse.filePath)
            } else {
                res.status(camoflageResponse.statusCode).send(camoflageResponse.body)
            }
        }
    })
}
const sleep = (ms: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};