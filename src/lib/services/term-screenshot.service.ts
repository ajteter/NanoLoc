import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/api/errors';

const UPLOAD_ROOT = path.join(process.cwd(), 'data', 'uploads', 'term-screenshots');
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_EDGE = 1200;
const WEBP_QUALITY = 75;
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

function toPosixPath(filePath: string) {
    return filePath.split(path.sep).join('/');
}

function resolveStoredPath(storedPath: string) {
    const resolved = path.resolve(process.cwd(), storedPath);
    const root = path.resolve(UPLOAD_ROOT);

    if (resolved !== root && !resolved.startsWith(root + path.sep)) {
        throw new AppError('INVALID_SCREENSHOT_PATH');
    }

    return resolved;
}

export async function deleteScreenshotFileByPath(storedPath?: string | null) {
    if (!storedPath) return;

    try {
        await fs.unlink(resolveStoredPath(storedPath));
    } catch (error) {
        const code = typeof error === 'object' && error && 'code' in error ? error.code : undefined;
        if (code !== 'ENOENT') {
            console.warn('Failed to delete screenshot file:', error);
        }
    }
}

export async function deleteProjectScreenshotDirectory(projectId: string) {
    const projectDir = resolveStoredPath(
        toPosixPath(path.join('data', 'uploads', 'term-screenshots', projectId))
    );

    try {
        await fs.rm(projectDir, { recursive: true, force: true });
    } catch (error) {
        console.warn('Failed to delete project screenshot directory:', error);
    }
}

export async function saveTermScreenshot({
    projectId,
    keyId,
    file,
    userId,
}: {
    projectId: string;
    keyId: string;
    file: File;
    userId: string;
}) {
    if (!ALLOWED_TYPES.has(file.type)) {
        throw new AppError('UNSUPPORTED_IMAGE_TYPE');
    }

    if (file.size > MAX_UPLOAD_BYTES) {
        throw new AppError('SCREENSHOT_TOO_LARGE');
    }

    const term = await prisma.translationKey.findFirst({
        where: { id: keyId, projectId },
        select: {
            id: true,
            screenshotPath: true,
        },
    });

    if (!term) {
        throw new AppError('TERM_NOT_FOUND');
    }

    const input = Buffer.from(await file.arrayBuffer());
    const output = await sharp(input)
        .rotate()
        .resize({
            width: MAX_IMAGE_EDGE,
            height: MAX_IMAGE_EDGE,
            fit: 'inside',
            withoutEnlargement: true,
        })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();

    const relativeDir = path.join('data', 'uploads', 'term-screenshots', projectId);
    const absoluteDir = path.join(process.cwd(), relativeDir);
    await fs.mkdir(absoluteDir, { recursive: true });

    const relativePath = toPosixPath(path.join(relativeDir, `${keyId}-${Date.now()}.webp`));
    const absolutePath = resolveStoredPath(relativePath);

    await fs.writeFile(absolutePath, output);

    try {
        const updatedTerm = await prisma.translationKey.update({
            where: { id: keyId },
            data: {
                screenshotPath: relativePath,
                screenshotMimeType: 'image/webp',
                screenshotSize: output.length,
                screenshotUpdatedAt: new Date(),
                lastModifiedById: userId,
            },
            select: {
                id: true,
                stringName: true,
                screenshotPath: true,
                screenshotMimeType: true,
                screenshotSize: true,
                screenshotUpdatedAt: true,
            },
        });

        await deleteScreenshotFileByPath(term.screenshotPath);
        return updatedTerm;
    } catch (error) {
        await deleteScreenshotFileByPath(relativePath);
        throw error;
    }
}

export async function removeTermScreenshot({
    projectId,
    keyId,
    userId,
}: {
    projectId: string;
    keyId: string;
    userId: string;
}) {
    const term = await prisma.translationKey.findFirst({
        where: { id: keyId, projectId },
        select: {
            id: true,
            screenshotPath: true,
        },
    });

    if (!term) {
        throw new AppError('TERM_NOT_FOUND');
    }

    const updatedTerm = await prisma.translationKey.update({
        where: { id: keyId },
        data: {
            screenshotPath: null,
            screenshotMimeType: null,
            screenshotSize: null,
            screenshotUpdatedAt: null,
            lastModifiedById: userId,
        },
        select: {
            id: true,
            stringName: true,
        },
    });

    await deleteScreenshotFileByPath(term.screenshotPath);
    return updatedTerm;
}

export async function getTermScreenshot(projectId: string, keyId: string) {
    const term = await prisma.translationKey.findFirst({
        where: { id: keyId, projectId },
        select: {
            screenshotPath: true,
            screenshotMimeType: true,
            screenshotSize: true,
            screenshotUpdatedAt: true,
        },
    });

    if (!term?.screenshotPath) {
        return null;
    }

    const absolutePath = resolveStoredPath(term.screenshotPath);
    const data = await fs.readFile(absolutePath);

    return {
        data,
        mimeType: term.screenshotMimeType || 'image/webp',
        size: term.screenshotSize || data.length,
        updatedAt: term.screenshotUpdatedAt,
    };
}
