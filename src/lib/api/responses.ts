import { NextResponse } from 'next/server';
import {
    buildApiErrorBody,
    getApiErrorStatus,
    normalizeApiError,
    normalizeValidationError,
    type ApiErrorCode,
} from '@/lib/api/errors';

type ValidationIssue = {
    path: PropertyKey[];
    message: string;
};

export function jsonError(
    code: ApiErrorCode,
    options: { status?: number; message?: string; details?: unknown } = {}
) {
    const body = buildApiErrorBody(code, {
        message: options.message,
        details: options.details,
    });

    return NextResponse.json(body, { status: options.status ?? getApiErrorStatus(code) });
}

export function jsonValidationError(issues: ValidationIssue[]) {
    return NextResponse.json(normalizeValidationError(issues), { status: 400 });
}

export function jsonErrorFromUnknown(error: unknown, fallbackCode: ApiErrorCode = 'INTERNAL_ERROR') {
    const body = normalizeApiError(error, fallbackCode);
    return NextResponse.json(body, { status: getApiErrorStatus(body.code) });
}
