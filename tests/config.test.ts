import { expect, test } from 'vitest'
import { CamoflageHttpConfig, isConfigValid } from '@/core/config'

test('should return false if config is empty', () => {
    // @ts-ignore
    expect(isConfigValid({})).toBe(false)
})
test('should return false if neither http or https config is provided', () => {
    const config: CamoflageHttpConfig = {
        log: {
            enable: false,
            level: 'fatal'
        },
        mocksDir: "./mocks"
    }
    expect(isConfigValid(config)).toBe(false)
})
test('should return false if both http and https are disabled', () => {
    const config: CamoflageHttpConfig = {
        log: {
            enable: false,
            level: 'fatal'
        },
        http: {
            enable: false,
            port: 8080
        },
        https: {
            enable: false,
            port: 8081
        },
        mocksDir: "./mocks"
    }
    expect(isConfigValid(config)).toBe(false)
})
test('should return false if both http and https have the same port', () => {
    const config: CamoflageHttpConfig = {
        log: {
            enable: false,
            level: 'fatal'
        },
        http: {
            enable: true,
            port: 8080
        },
        https: {
            enable: true,
            port: 8080
        },
        mocksDir: "./mocks"
    }
    expect(isConfigValid(config)).toBe(false)
})
test('should return false if cache is enabled but timeInSeconds is not provided', () => {
    const config: CamoflageHttpConfig = {
        log: {
            enable: false,
            level: 'fatal'
        },
        http: {
            enable: true,
            port: 8080,
        },
        cache: {
            enable: true
        },
        mocksDir: "./mocks"
    }
    expect(isConfigValid(config)).toBe(false)
})
test('should return true if timeInSeconds is not provided but cache is disabled', () => {
    const config: CamoflageHttpConfig = {
        log: {
            enable: false,
            level: 'fatal'
        },
        http: {
            enable: true,
            port: 8080,
        },
        cache: {
            enable: false
        },
        mocksDir: "./mocks"
    }
    expect(isConfigValid(config)).toBe(true)
})
test('should return true even if both http and https have the same port but one of them (http/https) is disabled', () => {
    const config: CamoflageHttpConfig = {
        log: {
            enable: false,
            level: 'fatal'
        },
        http: {
            enable: false,
            port: 8080
        },
        https: {
            enable: true,
            port: 8080
        },
        mocksDir: "./mocks"
    }
    expect(isConfigValid(config)).toBe(true)
})
test('should return true if one of http or https are configured', () => {
    const config: CamoflageHttpConfig = {
        log: {
            enable: true,
            level: 'trace'
        },
        http: {
            enable: true,
            port: 8080
        },
        mocksDir: "./mocks"
    }
    expect(isConfigValid(config)).toBe(true)
})
test('should return true if both http or https are configured, enabled and have different ports', () => {
    const config: CamoflageHttpConfig = {
        log: {
            enable: true,
            level: 'trace'
        },
        http: {
            enable: true,
            port: 8080
        },
        https: {
            enable: true,
            port: 8081
        },
        mocksDir: "./mocks"
    }
    expect(isConfigValid(config)).toBe(true)
})