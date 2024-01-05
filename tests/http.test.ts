import { afterAll, beforeAll, expect, test } from 'vitest'
import { CamoflageHttpConfig } from '@/core/config'
import camoflage from '@/index'
import axios from 'axios';

const config: CamoflageHttpConfig = {
    log: {
        enable: false,
        level: 'fatal',
        disableRequestLogs: true
    },
    http: {
        enable: true,
        port: 8080,
    },
    monitoring: true,
    "enableCors": true,
    mocksDir: "./mocks"
}
const camoflage = new camoflage(config)
beforeAll(async () => {
    await camoflage.start()
    // fs.mkdirSync(path.join("mocks", "hello", "world"), { recursive: true })
    // fs.mkdirSync(path.join("mocks", "users"), { recursive: true })
    // fs.writeFileSync(path.join("mocks", "hello", "world", "GET.mock"), helloWorldResponseContent.trim(), "utf-8")
    // fs.writeFileSync(path.join("mocks", "users", "GET.mock"), helloWorldResponseContent.trim(), "utf-8")
})
test('/health endpoint should be available', async () => {
    const response = await axios.get(`http://localhost:${config.http?.port}/health`)
    expect(response.status).toBe(200)
    expect(response.data.status).toBe("up")
})
test("/monitoring should be available when enabled", async () => {
    const response = await axios.get(`http://localhost:${config.http?.port}/monitoring`)
    expect(response.status).toBe(200)
})
test("/hello/world should respond with a json {\"hello\": \"world\"}", async () => {
    const response = await axios.get(`http://localhost:${config.http?.port}/hello/world`)
    expect('hello' in response.data).toBeTruthy()
    expect(response.data['hello']).toBe('world')
})
test("/hello/world1 should respond with 404", async () => {
    const response = await axios.get(`http://localhost:${config.http?.port}/hello/world1`, {
        validateStatus: (status) => {
            return status === 404
        }
    })
    expect(response.status).toBe(404)
})
test("GET /users should be available", async () => {
    const response = await axios.get(`http://localhost:${config.http?.port}/users`)
    expect(response.status).toBe(200)
})
afterAll(() => {
    // fs.unlinkSync(path.join("mocks", "hello", "world", "GET.mock"))
    // fs.rmdirSync(path.join("mocks"), { recursive: true })
    camoflage.stop()
})