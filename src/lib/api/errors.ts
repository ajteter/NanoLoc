import type { TranslationKey } from '@/lib/i18n/dictionaries';

export const apiErrorMessages = {
    ACTIVITY_LOAD_FAILED: 'Failed to load activity',
    AI_CONFIG_MISSING: 'Missing AI configuration',
    CURRENT_PASSWORD_INCORRECT: 'Current password is incorrect',
    CURRENT_PASSWORD_REQUIRED: 'Current password is required',
    DUPLICATE_CHECK_FAILED: 'Duplicate check failed',
    ERROR_LOG_LOAD_FAILED: 'Failed to load error log',
    EXPORT_FAILED: 'Failed to generate CSV',
    IMPORT_FAILED: 'Import failed',
    INTERNAL_ERROR: 'Internal Server Error',
    INVALID_FORMAT: 'Invalid format',
    INVALID_SCREENSHOT_PATH: 'Invalid screenshot path',
    LANGUAGE_NOT_CONFIGURED: 'Language is not configured for this project',
    MISSING_LANGUAGE: 'Missing lang parameter',
    MISSING_TRANSLATION_FIELDS: 'Missing required fields',
    NEW_PASSWORD_TOO_SHORT: 'New password must be at least 6 characters',
    NO_FILE_UPLOADED: 'No file uploaded',
    NO_SCREENSHOT_UPLOADED: 'No screenshot uploaded',
    NO_TARGET_LANGUAGES: 'No target languages configured',
    NOT_FOUND: 'Not found',
    NOTHING_TO_UPDATE: 'Nothing to update',
    PROFILE_UPDATE_FAILED: 'Failed to update profile',
    PROJECT_CREATE_FAILED: 'Failed to create project',
    PROJECT_DELETE_FAILED: 'Failed to delete project',
    PROJECT_NOT_FOUND: 'Project not found',
    PROJECT_UPDATE_FAILED: 'Failed to update project',
    REGISTRATION_FAILED: 'Registration failed',
    SCREENSHOT_DELETE_FAILED: 'Failed to delete screenshot',
    SCREENSHOT_LOAD_FAILED: 'Failed to load screenshot',
    SCREENSHOT_NOT_FOUND: 'Screenshot not found',
    SCREENSHOT_TOO_LARGE: 'Screenshot is too large',
    SCREENSHOT_UPLOAD_FAILED: 'Failed to upload screenshot',
    SESSION_USER_MISSING: 'Session missing user ID',
    TERM_CLEAR_FAILED: 'Failed to clear translations',
    TERM_CREATE_FAILED: 'Failed to create term',
    TERM_DELETE_FAILED: 'Failed to delete term',
    TERM_KEY_EXISTS: 'Term with this key already exists',
    TERM_NOT_FOUND: 'Term not found',
    TERM_UPDATE_FAILED: 'Failed to update term',
    TEXTS_MUST_BE_ARRAY: 'texts must be an array',
    TRANSLATION_FAILED: 'Translation failed',
    UNAUTHORIZED: 'Unauthorized',
    UNSUPPORTED_FILE_FORMAT: 'Unsupported file format',
    UNSUPPORTED_IMAGE_TYPE: 'Unsupported image type',
    USER_EXISTS: 'User already exists',
    USER_NOT_FOUND: 'User not found',
    VALIDATION_ERROR: 'Invalid request data',
    XML_LANG_REQUIRED: 'XML format requires a lang parameter',
} as const;

export type ApiErrorCode = keyof typeof apiErrorMessages;

export type ApiErrorBody = {
    error: string;
    code: ApiErrorCode;
    details?: unknown;
};

type ValidationIssue = {
    path: PropertyKey[];
    message: string;
};

export class AppError extends Error {
    readonly code: ApiErrorCode;
    readonly status: number;
    readonly details?: unknown;

    constructor(code: ApiErrorCode, options: { message?: string; status?: number; details?: unknown } = {}) {
        super(options.message ?? apiErrorMessages[code]);
        this.name = 'AppError';
        this.code = code;
        this.status = options.status ?? getApiErrorStatus(code);
        this.details = options.details;
    }
}

const apiErrorCodeSet = new Set<ApiErrorCode>(Object.keys(apiErrorMessages) as ApiErrorCode[]);

export function isApiErrorCode(value: unknown): value is ApiErrorCode {
    return typeof value === 'string' && apiErrorCodeSet.has(value as ApiErrorCode);
}

export const legacyMessageToApiErrorCode: Record<string, ApiErrorCode> = {
    'Current password is incorrect': 'CURRENT_PASSWORD_INCORRECT',
    'Current password is required': 'CURRENT_PASSWORD_REQUIRED',
    'Failed to clear translations': 'TERM_CLEAR_FAILED',
    'Failed to create project': 'PROJECT_CREATE_FAILED',
    'Failed to create term': 'TERM_CREATE_FAILED',
    'Failed to delete project': 'PROJECT_DELETE_FAILED',
    'Failed to delete screenshot': 'SCREENSHOT_DELETE_FAILED',
    'Failed to delete term': 'TERM_DELETE_FAILED',
    'Failed to generate CSV': 'EXPORT_FAILED',
    'Failed to load error log': 'ERROR_LOG_LOAD_FAILED',
    'Failed to load screenshot': 'SCREENSHOT_LOAD_FAILED',
    'Failed to update profile': 'PROFILE_UPDATE_FAILED',
    'Failed to update project': 'PROJECT_UPDATE_FAILED',
    'Failed to update term': 'TERM_UPDATE_FAILED',
    'Failed to upload screenshot': 'SCREENSHOT_UPLOAD_FAILED',
    'Import failed': 'IMPORT_FAILED',
    'Internal Server Error': 'INTERNAL_ERROR',
    'Invalid format. Use "json" or "xml".': 'INVALID_FORMAT',
    'Invalid screenshot path': 'INVALID_SCREENSHOT_PATH',
    'Language is not configured for this project': 'LANGUAGE_NOT_CONFIGURED',
    'Missing lang parameter': 'MISSING_LANGUAGE',
    'Missing required fields: projectId, texts, targetLang': 'MISSING_TRANSLATION_FIELDS',
    'New password must be at least 6 characters': 'NEW_PASSWORD_TOO_SHORT',
    'No file uploaded': 'NO_FILE_UPLOADED',
    'No screenshot uploaded': 'NO_SCREENSHOT_UPLOADED',
    'No target languages configured': 'NO_TARGET_LANGUAGES',
    'Not found': 'NOT_FOUND',
    'Nothing to update': 'NOTHING_TO_UPDATE',
    'Project not found': 'PROJECT_NOT_FOUND',
    'Registration failed': 'REGISTRATION_FAILED',
    'Screenshot is too large. Maximum upload size is 5MB.': 'SCREENSHOT_TOO_LARGE',
    'Screenshot not found': 'SCREENSHOT_NOT_FOUND',
    'Session missing user ID': 'SESSION_USER_MISSING',
    'Term not found': 'TERM_NOT_FOUND',
    'Term with this key already exists': 'TERM_KEY_EXISTS',
    'Translation failed': 'TRANSLATION_FAILED',
    'Unauthorized': 'UNAUTHORIZED',
    'Unsupported image type. Use PNG, JPG, JPEG, or WEBP.': 'UNSUPPORTED_IMAGE_TYPE',
    'User already exists': 'USER_EXISTS',
    'User not found': 'USER_NOT_FOUND',
    'XML format requires a "lang" parameter.': 'XML_LANG_REQUIRED',
    'texts must be an array': 'TEXTS_MUST_BE_ARRAY',
};

export function getApiErrorStatus(code: ApiErrorCode): number {
    switch (code) {
        case 'UNAUTHORIZED':
        case 'SESSION_USER_MISSING':
            return 401;
        case 'CURRENT_PASSWORD_INCORRECT':
            return 403;
        case 'NOT_FOUND':
        case 'PROJECT_NOT_FOUND':
        case 'SCREENSHOT_NOT_FOUND':
        case 'TERM_NOT_FOUND':
        case 'USER_NOT_FOUND':
            return 404;
        case 'TERM_KEY_EXISTS':
        case 'USER_EXISTS':
            return 409;
        case 'INTERNAL_ERROR':
        case 'ACTIVITY_LOAD_FAILED':
        case 'DUPLICATE_CHECK_FAILED':
        case 'ERROR_LOG_LOAD_FAILED':
        case 'EXPORT_FAILED':
        case 'IMPORT_FAILED':
        case 'PROFILE_UPDATE_FAILED':
        case 'PROJECT_CREATE_FAILED':
        case 'PROJECT_DELETE_FAILED':
        case 'PROJECT_UPDATE_FAILED':
        case 'REGISTRATION_FAILED':
        case 'SCREENSHOT_DELETE_FAILED':
        case 'SCREENSHOT_LOAD_FAILED':
        case 'SCREENSHOT_UPLOAD_FAILED':
        case 'TERM_CLEAR_FAILED':
        case 'TERM_CREATE_FAILED':
        case 'TERM_DELETE_FAILED':
        case 'TERM_UPDATE_FAILED':
        case 'TRANSLATION_FAILED':
            return 500;
        default:
            return 400;
    }
}

export function getValidationErrorMessage(issues: ValidationIssue[]) {
    const issue = issues[0];
    if (!issue) return apiErrorMessages.VALIDATION_ERROR;

    const field = issue.path.join('.');
    return field ? `${field}: ${issue.message}` : issue.message;
}

export function buildApiErrorBody(
    code: ApiErrorCode,
    options: { message?: string; details?: unknown } = {}
): ApiErrorBody {
    return {
        error: options.message ?? apiErrorMessages[code],
        code,
        ...(options.details !== undefined ? { details: options.details } : {}),
    };
}

export function normalizeApiError(error: unknown, fallbackCode: ApiErrorCode = 'INTERNAL_ERROR'): ApiErrorBody {
    if (error instanceof AppError) {
        return buildApiErrorBody(error.code, { message: error.message, details: error.details });
    }

    const message = getApiErrorMessage(error);
    const code = getApiErrorCode(error) ?? fallbackCode;

    if (message && getApiErrorCode(error)) {
        return buildApiErrorBody(code, { message });
    }

    return buildApiErrorBody(code, {
        details: message ? { message } : undefined,
    });
}

export function normalizeValidationError(issues: ValidationIssue[]): ApiErrorBody {
    return buildApiErrorBody('VALIDATION_ERROR', {
        message: getValidationErrorMessage(issues),
        details: issues,
    });
}

export function toActionError(error: unknown, fallbackCode: ApiErrorCode): ApiErrorBody {
    return normalizeApiError(error, fallbackCode);
}

export function toValidationActionError(issues: ValidationIssue[]): ApiErrorBody {
    return normalizeValidationError(issues);
}

export function getApiErrorMessage(error: unknown): string | null {
    if (typeof error === 'string') return error;
    if (error instanceof Error) return error.message;
    if (!error || typeof error !== 'object') return null;

    const maybeError = (error as { error?: unknown }).error;
    return typeof maybeError === 'string' ? maybeError : null;
}

export function getApiErrorCode(error: unknown): ApiErrorCode | null {
    if (error instanceof AppError) return error.code;
    if (error && typeof error === 'object') {
        const maybeCode = (error as { code?: unknown }).code;
        if (isApiErrorCode(maybeCode)) return maybeCode;
    }

    const message = getApiErrorMessage(error);
    return message ? legacyMessageToApiErrorCode[message] ?? null : null;
}

export const apiErrorTranslationKeys = {
    ACTIVITY_LOAD_FAILED: 'apiError.activityLoadFailed',
    AI_CONFIG_MISSING: 'apiError.aiConfigMissing',
    CURRENT_PASSWORD_INCORRECT: 'apiError.currentPasswordIncorrect',
    CURRENT_PASSWORD_REQUIRED: 'apiError.currentPasswordRequired',
    DUPLICATE_CHECK_FAILED: 'apiError.duplicateCheckFailed',
    ERROR_LOG_LOAD_FAILED: 'apiError.errorLogLoadFailed',
    EXPORT_FAILED: 'apiError.exportFailed',
    IMPORT_FAILED: 'apiError.importFailed',
    INTERNAL_ERROR: 'apiError.internal',
    INVALID_FORMAT: 'apiError.invalidFormat',
    INVALID_SCREENSHOT_PATH: 'apiError.invalidScreenshotPath',
    LANGUAGE_NOT_CONFIGURED: 'apiError.languageNotConfigured',
    MISSING_LANGUAGE: 'apiError.missingLanguage',
    MISSING_TRANSLATION_FIELDS: 'apiError.missingTranslationFields',
    NEW_PASSWORD_TOO_SHORT: 'apiError.newPasswordTooShort',
    NO_FILE_UPLOADED: 'apiError.noFileUploaded',
    NO_SCREENSHOT_UPLOADED: 'apiError.noScreenshotUploaded',
    NO_TARGET_LANGUAGES: 'apiError.noTargetLanguages',
    NOT_FOUND: 'apiError.notFound',
    NOTHING_TO_UPDATE: 'apiError.nothingToUpdate',
    PROFILE_UPDATE_FAILED: 'apiError.profileUpdateFailed',
    PROJECT_CREATE_FAILED: 'apiError.projectCreateFailed',
    PROJECT_DELETE_FAILED: 'apiError.projectDeleteFailed',
    PROJECT_NOT_FOUND: 'apiError.projectNotFound',
    PROJECT_UPDATE_FAILED: 'apiError.projectUpdateFailed',
    REGISTRATION_FAILED: 'apiError.registrationFailed',
    SCREENSHOT_DELETE_FAILED: 'apiError.screenshotDeleteFailed',
    SCREENSHOT_LOAD_FAILED: 'apiError.screenshotLoadFailed',
    SCREENSHOT_NOT_FOUND: 'apiError.screenshotNotFound',
    SCREENSHOT_TOO_LARGE: 'apiError.screenshotTooLarge',
    SCREENSHOT_UPLOAD_FAILED: 'apiError.screenshotUploadFailed',
    SESSION_USER_MISSING: 'apiError.sessionUserMissing',
    TERM_CLEAR_FAILED: 'apiError.termClearFailed',
    TERM_CREATE_FAILED: 'apiError.termCreateFailed',
    TERM_DELETE_FAILED: 'apiError.termDeleteFailed',
    TERM_KEY_EXISTS: 'apiError.termKeyExists',
    TERM_NOT_FOUND: 'apiError.termNotFound',
    TERM_UPDATE_FAILED: 'apiError.termUpdateFailed',
    TEXTS_MUST_BE_ARRAY: 'apiError.textsMustBeArray',
    TRANSLATION_FAILED: 'apiError.translationFailed',
    UNAUTHORIZED: 'apiError.unauthorized',
    UNSUPPORTED_FILE_FORMAT: 'apiError.unsupportedFileFormat',
    UNSUPPORTED_IMAGE_TYPE: 'apiError.unsupportedImageType',
    USER_EXISTS: 'apiError.userExists',
    USER_NOT_FOUND: 'apiError.userNotFound',
    VALIDATION_ERROR: 'apiError.validation',
    XML_LANG_REQUIRED: 'apiError.xmlLangRequired',
} satisfies Record<ApiErrorCode, TranslationKey>;

export function getLocalizedApiError(
    error: unknown,
    t: (key: TranslationKey) => string,
    fallback?: string
) {
    const code = getApiErrorCode(error);
    if (code) return t(apiErrorTranslationKeys[code]);

    return getApiErrorMessage(error) || fallback || t('apiError.internal');
}

export async function readApiErrorBody(response: Response): Promise<unknown> {
    const contentType = response.headers.get('content-type') || '';

    try {
        if (contentType.includes('application/json')) {
            return await response.json();
        }

        const text = await response.text();
        return text ? { error: text } : null;
    } catch {
        return null;
    }
}
