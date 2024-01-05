import path from 'path'
import fs from 'fs'
import { log } from '@/core/logger';

export const FileHelper = (context: any) => {
    if (!context.hash.path) {
        return null;
    }
    const filePath = path.resolve(context.hash.path)
    if (fs.existsSync(filePath)) {
        log.debug(`Found file: ${filePath}`)
        return `file_helper_return=${filePath}`;
    }
    return null
}